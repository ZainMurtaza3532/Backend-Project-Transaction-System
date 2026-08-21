const crypto = require("crypto")
const bcrypt = require("bcryptjs")
const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const eventService = require("../services/event.service")
const mongoose = require("mongoose")

const OTP_EXPIRY_MINUTES = 10

/**
 * SSE Stream subscription endpoint
 * GET /api/transactions/stream
 */
function streamTransactions(req, res) {
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.setHeader("Access-Control-Allow-Origin", "*")

    // Send initial handshake
    res.write(`data: ${JSON.stringify({ type: "CONNECTED", message: "SSE connected" })}\n\n`)

    if (req.user && req.user._id) {
        eventService.addClient(req.user._id, res)
    }

    // Keep connection alive with heartbeat comment every 25 seconds
    const heartbeat = setInterval(() => {
        res.write(": heartbeat\n\n")
    }, 25000)

    req.on("close", () => {
        clearInterval(heartbeat)
    })
}

/**
 * Direct Instant Transfer
 * POST /api/transactions/
 */
async function createTransaction(req, res) {
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "fromAccount, toAccount, amount and idempotencyKey are required"
        })
    }

    const transferAmount = Number(amount)
    if (isNaN(transferAmount) || transferAmount <= 0) {
        return res.status(400).json({
            message: "Amount must be a positive number"
        })
    }

    if (fromAccount === toAccount) {
        return res.status(400).json({
            message: "fromAccount and toAccount must be different"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
        user: req.user._id
    })

    const toUserAccount = await accountModel.findOne({
        _id: toAccount
    }).populate("user")

    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({
            message: "Invalid fromAccount or toAccount"
        })
    }

    // Check Idempotency
    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })

    if (isTransactionAlreadyExists) {
        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactionAlreadyExists
            })
        }
        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is still processing"
            })
        }
        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(400).json({
                message: "Previous transaction failed. Please retry with a new key."
            })
        }
    }

    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Both fromAccount and toAccount must be ACTIVE to process transaction"
        })
    }

    const balance = await fromUserAccount.getBalance()
    if (balance < transferAmount) {
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${transferAmount}`
        })
    }

    let transaction
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        transaction = (
            await transactionModel.create(
                [
                    {
                        fromAccount,
                        toAccount,
                        amount: transferAmount,
                        idempotencyKey,
                        status: "PENDING"
                    }
                ],
                { session }
            )
        )[ 0 ]

        // Debit sender
        await ledgerModel.create(
            [
                {
                    account: fromAccount,
                    amount: transferAmount,
                    transaction: transaction._id,
                    type: "DEBIT"
                }
            ],
            { session }
        )

        // Credit receiver
        await ledgerModel.create(
            [
                {
                    account: toAccount,
                    amount: transferAmount,
                    transaction: transaction._id,
                    type: "CREDIT"
                }
            ],
            { session }
        )

        transaction.status = "COMPLETED"
        await transaction.save({ session })

        await session.commitTransaction()
        session.endSession()

        // Notify both parties in real time
        const newSenderBalance = await fromUserAccount.getBalance()
        eventService.notifyUser(req.user._id, {
            type: "TRANSFER_COMPLETED",
            transaction,
            newBalance: newSenderBalance
        })

        if (toUserAccount.user && toUserAccount.user._id) {
            const newReceiverBalance = await toUserAccount.getBalance()
            eventService.notifyUser(toUserAccount.user._id, {
                type: "FUNDS_RECEIVED",
                transaction,
                newBalance: newReceiverBalance
            })
        }

        emailService.sendTransactionEmail(req.user.email, req.user.name, transferAmount, toAccount).catch(() => {})

        return res.status(201).json({
            message: "Transaction completed successfully",
            transaction: transaction,
            newBalance: newSenderBalance
        })
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction()
        }
        session.endSession()
        return res.status(500).json({
            message: error.message || "Transaction processing failed"
        })
    }
}

/**
 * Step 1: Initiate a fund transfer with OTP
 * POST /api/transactions/initiate
 */
async function initiateTransfer(req, res) {
    try {
        const { fromAccount, toAccount, amount, idempotencyKey } = req.body

        if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
            return res.status(400).json({
                message: "fromAccount, toAccount, amount and idempotencyKey are required"
            })
        }

        const transferAmount = Number(amount)
        if (isNaN(transferAmount) || transferAmount <= 0) {
            return res.status(400).json({
                message: "Amount must be a positive number"
            })
        }

        if (fromAccount === toAccount) {
            return res.status(400).json({
                message: "fromAccount and toAccount must be different"
            })
        }

        const existingTransaction = await transactionModel.findOne({ idempotencyKey })

        if (existingTransaction) {
            if (existingTransaction.status === "COMPLETED") {
                return res.status(200).json({
                    message: "Transaction already processed",
                    transactionId: existingTransaction._id
                })
            }
            if (existingTransaction.status === "PENDING") {
                return res.status(200).json({
                    message: "Transfer already initiated — verify the OTP sent to your email",
                    transactionId: existingTransaction._id
                })
            }
            return res.status(409).json({
                message: "A transaction with this idempotencyKey already exists and cannot be retried"
            })
        }

        const fromUserAccount = await accountModel.findOne({
            _id: fromAccount,
            user: req.user._id
        })

        const toUserAccount = await accountModel.findOne({ _id: toAccount })

        if (!fromUserAccount || !toUserAccount) {
            return res.status(400).json({
                message: "Invalid fromAccount or toAccount"
            })
        }

        if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
            return res.status(400).json({
                message: "Both fromAccount and toAccount must be ACTIVE to process transaction"
            })
        }

        const balance = await fromUserAccount.getBalance()

        if (balance < transferAmount) {
            return res.status(400).json({
                message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${transferAmount}`
            })
        }

        const plainOtp = crypto.randomInt(100000, 1000000).toString()
        const hashedOtp = await bcrypt.hash(plainOtp, 10)
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

        const transaction = await transactionModel.create({
            fromAccount,
            toAccount,
            amount: transferAmount,
            idempotencyKey,
            status: "PENDING",
            otp: hashedOtp,
            otpExpires
        })

        emailService.sendTransferOtpEmail(
            req.user.email,
            req.user.name,
            plainOtp,
            transferAmount,
            toAccount
        ).catch(() => {})

        return res.status(201).json({
            message: `OTP sent to ${req.user.email}. Verify to complete the transfer.`,
            transactionId: transaction._id,
            demoOtp: process.env.NODE_ENV === "development" ? plainOtp : undefined
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Failed to initiate transfer"
        })
    }
}

/**
 * Step 2: Verify OTP and execute transfer
 * POST /api/transactions/verify
 */
async function verifyTransfer(req, res) {
    const session = await mongoose.startSession()
    let transactionInProgress = false

    try {
        const { transactionId, otp } = req.body

        if (!transactionId || !otp) {
            return res.status(400).json({
                message: "transactionId and otp are required"
            })
        }

        const userAccounts = await accountModel.find({ user: req.user._id }).select("_id")
        const accountIds = userAccounts.map((account) => account._id)

        const transaction = await transactionModel
            .findOne({
                _id: transactionId,
                fromAccount: { $in: accountIds },
                status: "PENDING"
            })
            .select("+otp +otpExpires")

        if (!transaction) {
            return res.status(404).json({
                message: "Pending transaction not found"
            })
        }

        if (!transaction.otpExpires || transaction.otpExpires < new Date()) {
            await transactionModel.findByIdAndUpdate(transaction._id, {
                status: "FAILED",
                $unset: { otp: 1, otpExpires: 1 }
            })

            return res.status(400).json({
                message: "OTP has expired. Please initiate a new transfer."
            })
        }

        const isOtpValid = await bcrypt.compare(otp.toString(), transaction.otp)

        if (!isOtpValid) {
            return res.status(401).json({
                message: "Invalid OTP code provided"
            })
        }

        const fromUserAccount = await accountModel.findById(transaction.fromAccount)
        const toUserAccount = await accountModel.findById(transaction.toAccount).populate("user")

        if (!fromUserAccount || !toUserAccount) {
            return res.status(400).json({
                message: "Associated accounts no longer exist"
            })
        }

        if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
            return res.status(400).json({
                message: "Both accounts must be ACTIVE to complete the transfer"
            })
        }

        const balance = await fromUserAccount.getBalance()

        if (balance < transaction.amount) {
            await transactionModel.findByIdAndUpdate(transaction._id, {
                status: "FAILED",
                $unset: { otp: 1, otpExpires: 1 }
            })

            return res.status(400).json({
                message: `Insufficient balance. Current balance is ${balance}.`
            })
        }

        session.startTransaction()
        transactionInProgress = true

        await ledgerModel.create(
            [
                {
                    account: transaction.fromAccount,
                    amount: transaction.amount,
                    transaction: transaction._id,
                    type: "DEBIT"
                }
            ],
            { session }
        )

        await ledgerModel.create(
            [
                {
                    account: transaction.toAccount,
                    amount: transaction.amount,
                    transaction: transaction._id,
                    type: "CREDIT"
                }
            ],
            { session }
        )

        const completedTransaction = await transactionModel.findOneAndUpdate(
            { _id: transaction._id, status: "PENDING" },
            {
                status: "COMPLETED",
                $unset: { otp: 1, otpExpires: 1 }
            },
            { session, new: true }
        )

        await session.commitTransaction()
        session.endSession()

        const newSenderBalance = await fromUserAccount.getBalance()

        eventService.notifyUser(req.user._id, {
            type: "TRANSFER_COMPLETED",
            transaction: completedTransaction,
            newBalance: newSenderBalance
        })

        if (toUserAccount.user && toUserAccount.user._id) {
            const newReceiverBalance = await toUserAccount.getBalance()
            eventService.notifyUser(toUserAccount.user._id, {
                type: "FUNDS_RECEIVED",
                transaction: completedTransaction,
                newBalance: newReceiverBalance
            })
        }

        emailService.sendTransactionEmail(
            req.user.email,
            req.user.name,
            transaction.amount,
            transaction.toAccount
        ).catch(() => {})

        return res.status(200).json({
            message: "Transfer completed successfully",
            transaction: completedTransaction,
            newBalance: newSenderBalance
        })
    } catch (error) {
        if (transactionInProgress && session.inTransaction()) {
            await session.abortTransaction()
        }
        session.endSession()

        return res.status(500).json({
            message: error.message || "Transfer verification failed. Please try again."
        })
    }
}

/**
 * Get paginated transaction history with rich search & filter
 * GET /api/transactions/history
 */
async function getTransactionHistory(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1)
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10))
        const skip = (page - 1) * limit
        const { type, search, status, accountId } = req.query

        const userAccounts = await accountModel.find({ user: req.user._id }).select("_id")
        let accountIds = userAccounts.map((account) => account._id)

        if (accountId && accountIds.some((id) => id.toString() === accountId.toString())) {
            accountIds = [ accountId ]
        }

        if (accountIds.length === 0) {
            return res.status(200).json({
                message: "Transaction history fetched successfully",
                data: [],
                totalRecords: 0,
                totalPages: 0,
                currentPage: page,
                limit
            })
        }

        let filter = {}

        if (type === "DEBIT") {
            filter.fromAccount = { $in: accountIds }
        } else if (type === "CREDIT") {
            filter.toAccount = { $in: accountIds }
        } else {
            filter.$or = [
                { fromAccount: { $in: accountIds } },
                { toAccount: { $in: accountIds } }
            ]
        }

        if (status && status !== "ALL") {
            filter.status = status.toUpperCase()
        }

        if (search && search.trim() !== "") {
            const term = search.trim()
            if (mongoose.Types.ObjectId.isValid(term)) {
                filter.$and = [
                    { $or: filter.$or || [ { fromAccount: { $in: accountIds } }, { toAccount: { $in: accountIds } } ] },
                    {
                        $or: [
                            { _id: term },
                            { fromAccount: term },
                            { toAccount: term }
                        ]
                    }
                ]
                delete filter.$or
            } else if (!isNaN(Number(term))) {
                filter.amount = Number(term)
            }
        }

        const [ totalRecords, transactions ] = await Promise.all([
            transactionModel.countDocuments(filter),
            transactionModel
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({
                    path: "fromAccount",
                    populate: { path: "user", select: "name email" }
                })
                .populate({
                    path: "toAccount",
                    populate: { path: "user", select: "name email" }
                })
        ])

        const totalPages = Math.ceil(totalRecords / limit)

        return res.status(200).json({
            message: "Transaction history fetched successfully",
            data: transactions,
            totalRecords,
            totalPages,
            currentPage: page,
            limit
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Failed to fetch transaction history"
        })
    }
}

/**
 * Get visual stats summary
 * GET /api/transactions/stats
 */
async function getTransactionStats(req, res) {
    try {
        const userAccounts = await accountModel.find({ user: req.user._id }).select("_id")
        const accountIds = userAccounts.map((a) => a._id)

        if (accountIds.length === 0) {
            return res.status(200).json({
                stats: {
                    totalDebits: 0,
                    totalCredits: 0,
                    totalTransactions: 0,
                    completedCount: 0,
                    recentDaily: []
                }
            })
        }

        // Ledger totals
        const ledgerStats = await ledgerModel.aggregate([
            { $match: { account: { $in: accountIds } } },
            {
                $group: {
                    _id: "$type",
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ])

        let totalDebits = 0
        let totalCredits = 0
        ledgerStats.forEach((s) => {
            if (s._id === "DEBIT") totalDebits = s.totalAmount
            if (s._id === "CREDIT") totalCredits = s.totalAmount
        })

        const totalTransactions = await transactionModel.countDocuments({
            $or: [ { fromAccount: { $in: accountIds } }, { toAccount: { $in: accountIds } } ]
        })

        const completedCount = await transactionModel.countDocuments({
            status: "COMPLETED",
            $or: [ { fromAccount: { $in: accountIds } }, { toAccount: { $in: accountIds } } ]
        })

        // Recent 7 days breakdown
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const recentDaily = await transactionModel.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo },
                    status: "COMPLETED",
                    $or: [ { fromAccount: { $in: accountIds } }, { toAccount: { $in: accountIds } } ]
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ])

        return res.status(200).json({
            stats: {
                totalDebits,
                totalCredits,
                totalTransactions,
                completedCount,
                recentDaily
            }
        })
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch transaction stats"
        })
    }
}

module.exports = {
    createTransaction,
    initiateTransfer,
    verifyTransfer,
    getTransactionHistory,
    getTransactionStats,
    streamTransactions
}
