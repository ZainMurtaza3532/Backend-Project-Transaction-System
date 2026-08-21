const crypto = require("crypto")
const bcrypt = require("bcryptjs")
const { Parser } = require("json2csv")
const PDFDocument = require("pdfkit")
const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const eventService = require("../services/event.service")
const { logUserActivity } = require("../services/audit.service")
const { sendWebhook } = require("../services/webhook.service")
const { calculateFee } = require("../utils/fee.util")
const { getOrCreateSystemAccount } = require("./account.controller")
const { checkTransferLimits } = require("../services/limit.service")
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
    let session = null

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

        // Calculate accurate platform fee breakdown
        const { totalAmount, feeAmount, netAmount } = calculateFee(transferAmount)

        // Fetch or resolve Admin Revenue Wallet
        let adminAccount = null
        if (process.env.ADMIN_WALLET_ID) {
            adminAccount = await accountModel.findById(process.env.ADMIN_WALLET_ID)
        }
        if (!adminAccount) {
            const sys = await getOrCreateSystemAccount()
            adminAccount = sys.systemAccount
        }

        const balance = await fromUserAccount.getBalance()
        if (balance < totalAmount) {
            return res.status(400).json({
                message: `Insufficient balance. Current balance is ${balance}. Required total amount (including fee of ${feeAmount}) is ${totalAmount}`
            })
        }

        // Risk Management: Validate compliance transfer limits (Daily, Weekly, Monthly)
        await checkTransferLimits(req.user._id, totalAmount)

        session = await mongoose.startSession()
        session.startTransaction()

        const transaction = (
            await transactionModel.create(
                [
                    {
                        fromAccount,
                        toAccount,
                        amount: totalAmount,
                        totalAmount,
                        feeAmount,
                        netAmount,
                        idempotencyKey,
                        status: "PENDING"
                    }
                ],
                { session }
            )
        )[ 0 ]

        // Step A: Deduct totalAmount from Sender (DEBIT)
        await ledgerModel.create(
            [
                {
                    account: fromAccount,
                    amount: totalAmount,
                    transaction: transaction._id,
                    type: "DEBIT"
                }
            ],
            { session }
        )

        // Step B: Add netAmount to Receiver (CREDIT)
        await ledgerModel.create(
            [
                {
                    account: toAccount,
                    amount: netAmount,
                    transaction: transaction._id,
                    type: "CREDIT"
                }
            ],
            { session }
        )

        // Step C: Add feeAmount to Admin Wallet (CREDIT)
        if (feeAmount > 0 && adminAccount) {
            await ledgerModel.create(
                [
                    {
                        account: adminAccount._id,
                        amount: feeAmount,
                        transaction: transaction._id,
                        type: "CREDIT"
                    }
                ],
                { session }
            )
        }

        transaction.status = "COMPLETED"
        await transaction.save({ session })

        await session.commitTransaction()
        session.endSession()
        session = null

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

        logUserActivity(req, req.user._id, "FUND_TRANSFER", {
            transactionId: transaction._id,
            fromAccount: fromUserAccount._id,
            toAccount: toUserAccount._id,
            amount: transferAmount,
            type: "DIRECT_TRANSFER"
        })

        // Dispatch asynchronous signed webhooks
        sendWebhook(req.user._id, "transaction.success", {
            transactionId: transaction._id,
            type: "DEBIT",
            amount: transferAmount,
            currency: fromUserAccount.currency,
            fromAccount: fromUserAccount._id,
            toAccount: toUserAccount._id,
            status: transaction.status,
            createdAt: transaction.createdAt
        })

        if (toUserAccount.user && toUserAccount.user._id) {
            sendWebhook(toUserAccount.user._id, "transaction.success", {
                transactionId: transaction._id,
                type: "CREDIT",
                amount: transferAmount,
                currency: toUserAccount.currency,
                fromAccount: fromUserAccount._id,
                toAccount: toUserAccount._id,
                status: transaction.status,
                createdAt: transaction.createdAt
            })
        }

        return res.status(201).json({
            message: "Transaction completed successfully",
            transaction: transaction,
            newBalance: newSenderBalance
        })
    } catch (error) {
        if (session && session.inTransaction()) {
            await session.abortTransaction()
        }
        if (session) {
            session.endSession()
        }

        const statusCode = error.statusCode || 500
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Transaction processing failed",
            code: error.code,
            details: error.details
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

        // Calculate fee breakdown
        const { totalAmount, feeAmount, netAmount } = calculateFee(transferAmount)

        const balance = await fromUserAccount.getBalance()
        if (balance < totalAmount) {
            return res.status(400).json({
                message: `Insufficient balance. Current balance is ${balance}. Required amount (including fee of ${feeAmount}) is ${totalAmount}`
            })
        }

        // Risk Management: Validate compliance transfer limits (Daily, Weekly, Monthly)
        await checkTransferLimits(req.user._id, totalAmount)

        const plainOtp = crypto.randomInt(100000, 1000000).toString()
        const hashedOtp = await bcrypt.hash(plainOtp, 10)
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

        const transaction = await transactionModel.create({
            fromAccount,
            toAccount,
            amount: totalAmount,
            totalAmount,
            feeAmount,
            netAmount,
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
        const requiredTotal = transaction.totalAmount || transaction.amount

        if (balance < requiredTotal) {
            await transactionModel.findByIdAndUpdate(transaction._id, {
                status: "FAILED",
                $unset: { otp: 1, otpExpires: 1 }
            })

            return res.status(400).json({
                message: `Insufficient balance. Current balance is ${balance}. Required total is ${requiredTotal}.`
            })
        }

        // Fetch or resolve Admin Revenue Wallet
        let adminAccount = null
        if (process.env.ADMIN_WALLET_ID) {
            adminAccount = await accountModel.findById(process.env.ADMIN_WALLET_ID)
        }
        if (!adminAccount) {
            const sys = await getOrCreateSystemAccount()
            adminAccount = sys.systemAccount
        }

        session.startTransaction()
        transactionInProgress = true

        const feeAmount = transaction.feeAmount || 0
        const netAmount = transaction.netAmount || (transaction.amount - feeAmount)

        // Step A: Deduct totalAmount from Sender (DEBIT)
        await ledgerModel.create(
            [
                {
                    account: transaction.fromAccount,
                    amount: requiredTotal,
                    transaction: transaction._id,
                    type: "DEBIT"
                }
            ],
            { session }
        )

        // Step B: Add netAmount to Receiver (CREDIT)
        await ledgerModel.create(
            [
                {
                    account: transaction.toAccount,
                    amount: netAmount,
                    transaction: transaction._id,
                    type: "CREDIT"
                }
            ],
            { session }
        )

        // Step C: Add feeAmount to Admin Wallet (CREDIT)
        if (feeAmount > 0 && adminAccount) {
            await ledgerModel.create(
                [
                    {
                        account: adminAccount._id,
                        amount: feeAmount,
                        transaction: transaction._id,
                        type: "CREDIT"
                    }
                ],
                { session }
            )
        }

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

        logUserActivity(req, req.user._id, "FUND_TRANSFER", {
            transactionId: completedTransaction._id,
            fromAccount: fromUserAccount._id,
            toAccount: toUserAccount._id,
            amount: transaction.amount,
            type: "OTP_TRANSFER"
        })

        // Dispatch asynchronous signed webhooks
        sendWebhook(req.user._id, "transaction.success", {
            transactionId: completedTransaction._id,
            type: "DEBIT",
            amount: transaction.amount,
            currency: fromUserAccount.currency,
            fromAccount: fromUserAccount._id,
            toAccount: toUserAccount._id,
            status: completedTransaction.status,
            createdAt: completedTransaction.createdAt
        })

        if (toUserAccount.user && toUserAccount.user._id) {
            sendWebhook(toUserAccount.user._id, "transaction.success", {
                transactionId: completedTransaction._id,
                type: "CREDIT",
                amount: transaction.amount,
                currency: toUserAccount.currency,
                fromAccount: fromUserAccount._id,
                toAccount: toUserAccount._id,
                status: completedTransaction.status,
                createdAt: completedTransaction.createdAt
            })
        }

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
        const normalizedType = type ? type.toUpperCase() : "ALL"

        if (normalizedType === "DEBIT") {
            filter.fromAccount = { $in: accountIds }
        } else if (normalizedType === "CREDIT") {
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
            success: true,
            message: "Transaction history fetched successfully",
            data: transactions,
            pagination: {
                totalRecords,
                totalPages,
                currentPage: page,
                limit
            },
            totalRecords,
            totalPages,
            currentPage: page,
            limit
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
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

/**
 * GET /api/transactions/statement/download
 * Query Params: ?format=pdf | ?format=csv (default: pdf)
 * Generates and downloads bank statement for the last 30 days
 */
async function downloadStatementController(req, res) {
    try {
        const format = (req.query.format || "pdf").toLowerCase()
        const userId = req.user._id

        // 1. Calculate the date for 30 days ago
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        // 2. Find all accounts belonging to the logged-in user
        const userAccounts = await accountModel.find({ user: userId }).select("_id accountNumber currency")
        const accountIds = userAccounts.map((acc) => acc._id)

        if (accountIds.length === 0) {
            return res.status(404).json({
                message: "No accounts found for this user."
            })
        }

        // 3. Find transactions in the last 30 days where user is sender or receiver
        const transactions = await transactionModel
            .find({
                $or: [
                    { fromAccount: { $in: accountIds } },
                    { toAccount: { $in: accountIds } }
                ],
                createdAt: { $gte: thirtyDaysAgo }
            })
            .sort({ createdAt: -1 })
            .populate({
                path: "fromAccount",
                select: "accountNumber currency user",
                populate: { path: "user", select: "name email" }
            })
            .populate({
                path: "toAccount",
                select: "accountNumber currency user",
                populate: { path: "user", select: "name email" }
            })

        // 4. Return 404 if no transactions exist in the last 30 days
        if (!transactions || transactions.length === 0) {
            return res.status(404).json({
                message: "No transactions found for the last 30 days."
            })
        }

        // Helper structure for statement rows
        const statementRecords = transactions.map((tx) => {
            const fromAccId = tx.fromAccount?._id ? tx.fromAccount._id.toString() : tx.fromAccount?.toString()
            const isDebit = accountIds.some((id) => id.toString() === fromAccId)
            const type = isDebit ? "DEBIT" : "CREDIT"

            const counterpartyName = isDebit
                ? (tx.toAccount?.user?.name || "Recipient Account")
                : (tx.fromAccount?.user?.name || "Sender / Treasury")

            const counterpartyAccount = isDebit
                ? (tx.toAccount?.accountNumber || tx.toAccount?._id || "N/A")
                : (tx.fromAccount?.accountNumber || tx.fromAccount?._id || "N/A")

            const currency = tx.fromAccount?.currency || tx.toAccount?.currency || "PKR"

            return {
                id: tx._id.toString(),
                date: new Date(tx.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }),
                type,
                amount: `${type === "CREDIT" ? "+" : "-"}${tx.amount} ${currency}`,
                rawAmount: tx.amount,
                currency,
                counterparty: `${counterpartyName} (${counterpartyAccount})`,
                status: tx.status,
                idempotencyKey: tx.idempotencyKey || "N/A"
            }
        })

        // 5. CSV Generation (using json2csv)
        if (format === "csv") {
            const fields = [
                { label: "Transaction ID", value: "id" },
                { label: "Date", value: "date" },
                { label: "Type", value: "type" },
                { label: "Amount", value: "amount" },
                { label: "Counterparty", value: "counterparty" },
                { label: "Status", value: "status" }
            ]

            const json2csvParser = new Parser({ fields })
            const csv = json2csvParser.parse(statementRecords)

            res.setHeader("Content-Type", "text/csv")
            res.setHeader("Content-Disposition", `attachment; filename=statement_${Date.now()}.csv`)

            return res.status(200).send(csv)
        }

        // 6. PDF Generation (Direct streaming to response using pdfkit)
        if (format === "pdf") {
            res.setHeader("Content-Type", "application/pdf")
            res.setHeader("Content-Disposition", `attachment; filename=statement_${Date.now()}.pdf`)

            const doc = new PDFDocument({ margin: 40, size: "A4" })

            // Pipe PDF stream directly into the Express response
            doc.pipe(res)

            // Header Section
            doc.fontSize(20).font("Helvetica-Bold").fillColor("#10B981").text("NOVA LEDGER BANKING", { align: "left" })
            doc.fontSize(10).font("Helvetica").fillColor("#64748B").text("Official Account Statement — Last 30 Days", { align: "left" })
            doc.moveDown(1)

            // Account Details Card
            doc.rect(40, 95, 515, 65).fillAndStroke("#F8FAFC", "#E2E8F0")
            doc.fontSize(10).font("Helvetica-Bold").fillColor("#0F172A").text(`Account Holder: ${req.user.name}`, 55, 105)
            doc.fontSize(9).font("Helvetica").fillColor("#475569").text(`Email: ${req.user.email}`, 55, 120)
            doc.fontSize(9).font("Helvetica").fillColor("#475569").text(`Generated On: ${new Date().toLocaleString()}`, 55, 135)
            doc.fontSize(9).font("Helvetica").fillColor("#475569").text(`Period: Last 30 Days`, 350, 105)
            doc.fontSize(9).font("Helvetica").fillColor("#475569").text(`Total Entries: ${statementRecords.length}`, 350, 120)

            doc.moveDown(4)

            // Table Header Bar
            const tableTop = 180
            doc.rect(40, tableTop - 5, 515, 20).fill("#0F172A")
            doc.fontSize(9).font("Helvetica-Bold").fillColor("#FFFFFF")
            doc.text("Date", 50, tableTop)
            doc.text("Type", 140, tableTop)
            doc.text("Counterparty", 200, tableTop)
            doc.text("Amount", 400, tableTop, { width: 80, align: "right" })
            doc.text("Status", 490, tableTop, { width: 60, align: "right" })

            let yPosition = tableTop + 25

            // Loop through transactions
            statementRecords.forEach((item, index) => {
                // Check if page limit reached
                if (yPosition > 750) {
                    doc.addPage()
                    yPosition = 50
                }

                // Alternate background shading
                if (index % 2 === 0) {
                    doc.rect(40, yPosition - 4, 515, 20).fill("#F1F5F9")
                }

                doc.fontSize(8).font("Helvetica").fillColor("#334155")
                doc.text(item.date, 50, yPosition, { width: 85 })

                // Color coded type
                if (item.type === "CREDIT") {
                    doc.font("Helvetica-Bold").fillColor("#16A34A").text(item.type, 140, yPosition)
                } else {
                    doc.font("Helvetica-Bold").fillColor("#DC2626").text(item.type, 140, yPosition)
                }

                doc.font("Helvetica").fillColor("#334155").text(item.counterparty, 200, yPosition, { width: 190, ellipsis: true })
                doc.font("Helvetica-Bold").fillColor(item.type === "CREDIT" ? "#16A34A" : "#DC2626").text(item.amount, 400, yPosition, { width: 80, align: "right" })
                doc.font("Helvetica").fillColor("#475569").text(item.status, 490, yPosition, { width: 60, align: "right" })

                yPosition += 22
            })

            // Footer note
            doc.fontSize(8).font("Helvetica-Oblique").fillColor("#94A3B8").text(
                "This statement is computer generated and is valid without signature.",
                40,
                790,
                { align: "center", width: 515 }
            )

            // Finalize PDF stream
            doc.end()
            return
        }

        return res.status(400).json({
            message: "Invalid format requested. Supported formats are 'pdf' and 'csv'."
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Failed to generate bank statement"
        })
    }
}

/**
 * GET /api/transactions/all
 * Auditor & Super Admin Only
 * Fetches all global transactions across the entire system
 */
async function getAllTransactionsAuditorController(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1)
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20))
        const skip = (page - 1) * limit

        const [totalRecords, transactions] = await Promise.all([
            transactionModel.countDocuments(),
            transactionModel
                .find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({
                    path: "fromAccount",
                    select: "accountNumber currency user",
                    populate: { path: "user", select: "name email" }
                })
                .populate({
                    path: "toAccount",
                    select: "accountNumber currency user",
                    populate: { path: "user", select: "name email" }
                })
        ])

        return res.status(200).json({
            success: true,
            data: transactions,
            pagination: {
                totalRecords,
                totalPages: Math.ceil(totalRecords / limit),
                currentPage: page,
                limit
            }
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch global transactions"
        })
    }
}

module.exports = {
    createTransaction,
    initiateTransfer,
    verifyTransfer,
    getTransactionHistory,
    getTransactionStats,
    streamTransactions,
    downloadStatementController,
    getAllTransactionsAuditorController
}


