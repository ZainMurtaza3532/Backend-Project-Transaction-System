const mongoose = require("mongoose")
const accountModel = require("../models/account.model")
const userModel = require("../models/user.model")
const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const eventService = require("../services/event.service")

/**
 * Helper to ensure a System Treasury Account exists for funding/faucets
 */
async function getOrCreateSystemAccount() {
    let systemUser = await userModel.findOne({ systemUser: true })
    if (!systemUser) {
        systemUser = await userModel.findOne({ email: "system@ledger.internal" })
    }
    if (!systemUser) {
        systemUser = await userModel.create({
            email: "system@ledger.internal",
            name: "Central Ledger Treasury",
            password: "SystemPassword123!Secure",
            systemUser: true,
            role: "admin"
        })
    }

    let systemAccount = await accountModel.findOne({ user: systemUser._id })
    if (!systemAccount) {
        systemAccount = await accountModel.create({
            user: systemUser._id,
            currency: "PKR",
            status: "ACTIVE"
        })
    }

    return { systemUser, systemAccount }
}

/**
 * Create a new account for the logged-in user
 */
async function createAccountController(req, res) {
    try {
        const user = req.user
        const currency = (req.body.currency || "PKR").toUpperCase()

        const account = await accountModel.create({
            user: user._id,
            currency: currency,
            status: "ACTIVE"
        })

        const balance = await account.getBalance()

        const result = {
            ...account.toObject(),
            balance
        }

        eventService.notifyUser(user._id, {
            type: "ACCOUNT_CREATED",
            account: result
        })

        res.status(201).json({
            message: "Account created successfully",
            account: result
        })
    } catch (error) {
        res.status(500).json({
            message: error.message || "Failed to create account"
        })
    }
}

/**
 * Get all accounts of the logged-in user with computed balances
 */
async function getUserAccountsController(req, res) {
    try {
        const accounts = await accountModel.find({ user: req.user._id }).sort({ createdAt: 1 })

        // Compute balance for each account in parallel
        const accountsWithBalance = await Promise.all(
            accounts.map(async (acc) => {
                const balance = await acc.getBalance()
                return {
                    ...acc.toObject(),
                    balance
                }
            })
        )

        res.status(200).json({
            message: "Accounts retrieved successfully",
            accounts: accountsWithBalance
        })
    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve accounts"
        })
    }
}

/**
 * Get balance for a specific account
 */
async function getAccountBalanceController(req, res) {
    try {
        const { accountId } = req.params

        const account = await accountModel.findOne({
            _id: accountId,
            user: req.user._id
        })

        if (!account) {
            return res.status(404).json({
                message: "Account not found"
            })
        }

        const balance = await account.getBalance()

        res.status(200).json({
            accountId: account._id,
            status: account.status,
            currency: account.currency,
            balance: balance
        })
    } catch (error) {
        res.status(500).json({
            message: "Failed to get account balance"
        })
    }
}

/**
 * Get public account directory for recipient lookup
 */
async function getDirectoryController(req, res) {
    try {
        const currentUserId = req.user._id

        // Fetch active accounts belonging to other registered users
        const accounts = await accountModel
            .find({
                user: { $ne: currentUserId },
                status: "ACTIVE"
            })
            .populate("user", "name email")
            .limit(50)

        const directory = accounts
            .filter((acc) => acc.user && !acc.user.systemUser && acc.user.email !== "system@ledger.internal")
            .map((acc) => ({
                accountId: acc._id,
                currency: acc.currency,
                userName: acc.user.name,
                userEmail: acc.user.email
            }))

        res.status(200).json({
            message: "Directory fetched successfully",
            directory
        })
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch account directory"
        })
    }
}

/**
 * Faucet / Deposit simulation endpoint
 */
async function fundAccountFaucetController(req, res) {
    const session = await mongoose.startSession()
    try {
        const { accountId, amount } = req.body
        const depositAmount = Number(amount) || 1000

        if (depositAmount <= 0 || depositAmount > 1000000) {
            return res.status(400).json({
                message: "Deposit amount must be between 1 and 1,000,000"
            })
        }

        const toUserAccount = await accountModel.findOne({
            _id: accountId,
            user: req.user._id
        })

        if (!toUserAccount) {
            return res.status(404).json({
                message: "Target account not found or does not belong to you"
            })
        }

        if (toUserAccount.status !== "ACTIVE") {
            return res.status(400).json({
                message: "Account must be ACTIVE to receive funds"
            })
        }

        const { systemAccount } = await getOrCreateSystemAccount()

        session.startTransaction()

        const idempotencyKey = `faucet_${toUserAccount._id}_${Date.now()}_${Math.random().toString(36).substring(7)}`

        const transaction = (
            await transactionModel.create(
                [
                    {
                        fromAccount: systemAccount._id,
                        toAccount: toUserAccount._id,
                        amount: depositAmount,
                        idempotencyKey,
                        status: "COMPLETED"
                    }
                ],
                { session }
            )
        )[ 0 ]

        // Debit Treasury
        await ledgerModel.create(
            [
                {
                    account: systemAccount._id,
                    amount: depositAmount,
                    transaction: transaction._id,
                    type: "DEBIT"
                }
            ],
            { session }
        )

        // Credit User Account
        await ledgerModel.create(
            [
                {
                    account: toUserAccount._id,
                    amount: depositAmount,
                    transaction: transaction._id,
                    type: "CREDIT"
                }
            ],
            { session }
        )

        await session.commitTransaction()
        session.endSession()

        const newBalance = await toUserAccount.getBalance()

        eventService.notifyUser(req.user._id, {
            type: "DEPOSIT_SUCCESS",
            accountId: toUserAccount._id,
            amount: depositAmount,
            newBalance
        })

        return res.status(200).json({
            message: `Successfully deposited ${depositAmount} ${toUserAccount.currency} into your account!`,
            transactionId: transaction._id,
            newBalance
        })
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction()
        }
        session.endSession()
        return res.status(500).json({
            message: error.message || "Faucet deposit failed"
        })
    }
}

module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController,
    getDirectoryController,
    fundAccountFaucetController,
    getOrCreateSystemAccount
}