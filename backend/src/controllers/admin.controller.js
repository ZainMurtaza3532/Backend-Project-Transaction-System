const mongoose = require("mongoose")
const userModel = require("../models/user.model")
const auditLogModel = require("../models/auditLog.model")
const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const { logUserActivity } = require("../services/audit.service")
const { sendWebhook } = require("../services/webhook.service")

/**
 * - Get all users
 * - GET /api/admin/all-users
 */
async function getAllUsers(req, res) {
    try {
        const users = await userModel.find().select("-password -systemUser")

        return res.status(200).json({
            message: "Users fetched successfully",
            users
        })
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch users"
        })
    }
}

/**
 * - Toggle user account freeze/unfreeze status
 * - PUT /api/admin/users/:id/freeze
 */
async function toggleFreezeUserController(req, res) {
    try {
        const { id } = req.params

        const user = await userModel.findById(id)

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            })
        }

        // Toggle freeze status
        user.isFrozen = !user.isFrozen
        await user.save()

        return res.status(200).json({
            message: `User account has been ${user.isFrozen ? "frozen" : "unfrozen"} successfully`,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isFrozen: user.isFrozen
            }
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Failed to toggle account freeze status"
        })
    }
}

/**
 * - Get Paginated System Audit Logs
 * - GET /api/admin/audit-logs
 */
async function getAuditLogsController(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1)
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20))
        const skip = (page - 1) * limit
        const { action, userId } = req.query

        const filter = {}
        if (action) filter.action = action.toUpperCase()
        if (userId) filter.user = userId

        const [totalRecords, logs] = await Promise.all([
            auditLogModel.countDocuments(filter),
            auditLogModel
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("user", "name email role isFrozen")
        ])

        const totalPages = Math.ceil(totalRecords / limit)

        return res.status(200).json({
            success: true,
            data: logs,
            pagination: {
                totalRecords,
                totalPages,
                currentPage: page,
                limit
            }
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch audit logs"
        })
    }
}

/**
 * - Enforce Immutable Ledger Reversal Entry
 * - POST /api/admin/transactions/:id/reverse
 */
async function reverseTransactionController(req, res) {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        const { id } = req.params

        // 1. Find the original transaction within the session
        const originalTransaction = await transactionModel.findById(id).session(session)

        if (!originalTransaction) {
            await session.abortTransaction()
            session.endSession()
            return res.status(404).json({
                success: false,
                message: "Original transaction not found."
            })
        }

        // 2. Reversal eligibility validations
        if (originalTransaction.isReversed) {
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success: false,
                message: "Transaction has already been reversed."
            })
        }

        if (originalTransaction.status !== "COMPLETED") {
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success: false,
                message: "Only COMPLETED transactions can be reversed."
            })
        }

        if (originalTransaction.type === "reversal") {
            await session.abortTransaction()
            session.endSession()
            return res.status(400).json({
                success: false,
                message: "A reversal entry cannot be reversed again."
            })
        }

        // 3. Step A: Create Reversal Transaction (swapping sender and receiver)
        const reversalTransaction = new transactionModel({
            fromAccount: originalTransaction.toAccount,
            toAccount: originalTransaction.fromAccount,
            amount: originalTransaction.amount,
            type: "reversal",
            originalTransactionId: originalTransaction._id,
            status: "COMPLETED",
            idempotencyKey: `rev_${originalTransaction._id}_${Date.now()}`
        })

        await reversalTransaction.save({ session })

        // 4. Step B: Post Double-Entry Ledger adjustments
        // Deduct from original receiver (DEBIT)
        const debitEntry = new ledgerModel({
            account: originalTransaction.toAccount,
            amount: originalTransaction.amount,
            transaction: reversalTransaction._id,
            type: "DEBIT"
        })
        await debitEntry.save({ session })

        // Credit to original sender (CREDIT)
        const creditEntry = new ledgerModel({
            account: originalTransaction.fromAccount,
            amount: originalTransaction.amount,
            transaction: reversalTransaction._id,
            type: "CREDIT"
        })
        await creditEntry.save({ session })

        // 5. Step C: Mark original transaction as reversed
        originalTransaction.isReversed = true
        originalTransaction.status = "REVERSED"
        await originalTransaction.save({ session })

        // Commit ACID transaction
        await session.commitTransaction()
        session.endSession()

        // 6. Asynchronously record audit log and trigger webhooks
        logUserActivity(req, req.user._id, "FUND_TRANSFER", {
            event: "TRANSACTION_REVERSAL",
            originalTransactionId: originalTransaction._id,
            reversalTransactionId: reversalTransaction._id,
            amount: originalTransaction.amount
        })

        sendWebhook(req.user._id, "transaction.failed", {
            event: "transaction.reversed",
            originalTransactionId: originalTransaction._id,
            reversalTransactionId: reversalTransaction._id,
            amount: originalTransaction.amount
        })

        return res.status(200).json({
            success: true,
            message: "Transaction reversed successfully. Reversal entry created and ledger balanced.",
            originalTransaction,
            reversalTransaction
        })
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction()
        }
        session.endSession()

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to reverse transaction"
        })
    }
}

/**
 * DELETE /api/admin/users/:id
 * Super Admin Only
 * Deactivates/freezes a user account
 */
async function deactivateUserSuperAdminController(req, res) {
    try {
        const { id } = req.params

        if (id === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "Super admin cannot deactivate their own account."
            })
        }

        const user = await userModel.findById(id)

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            })
        }

        user.isFrozen = true
        await user.save()

        logUserActivity(req, req.user._id, "ACCOUNT_FREEZE", {
            action: "SUPER_ADMIN_DEACTIVATION",
            targetUserId: user._id,
            targetUserEmail: user.email
        })

        return res.status(200).json({
            success: true,
            message: `User ${user.email} has been deactivated by Super Admin.`,
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                isFrozen: user.isFrozen
            }
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to deactivate user"
        })
    }
}

module.exports = {
    getAllUsers,
    toggleFreezeUserController,
    getAuditLogsController,
    reverseTransactionController,
    deactivateUserSuperAdminController
}

