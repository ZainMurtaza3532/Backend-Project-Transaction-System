const { Router } = require("express")
const { authMiddleware, checkNotFrozen, authorizeRoles } = require("../middleware/auth.middleware")
const transactionController = require("../controllers/transaction.controller")

const transactionRoutes = Router()

/**
 * GET /api/transactions/stream
 * Real-time SSE event stream
 */
transactionRoutes.get("/stream", authMiddleware, transactionController.streamTransactions)

/**
 * GET /api/transactions/all
 * Auditor & Super Admin Route: Global ledger inspection
 */
transactionRoutes.get(
    "/all",
    authMiddleware,
    authorizeRoles("auditor", "super_admin"),
    transactionController.getAllTransactionsAuditorController
)

/**
 * GET /api/transactions/statement/download
 * Download bank statement in PDF or CSV format (Protected)
 * Query Params: ?format=pdf | ?format=csv (default: pdf)
 */
transactionRoutes.get(
    "/statement/download",
    authMiddleware,
    transactionController.downloadStatementController
)

/**
 * POST /api/transactions/
 * Direct transfer (Protected & Account must not be frozen)
 */
transactionRoutes.post(
    "/",
    authMiddleware,
    checkNotFrozen,
    transactionController.createTransaction
)

/**
 * POST /api/transactions/initiate
 * 2-Step Transfer Step 1: Request OTP (Protected & Account must not be frozen)
 */
transactionRoutes.post(
    "/initiate",
    authMiddleware,
    checkNotFrozen,
    transactionController.initiateTransfer
)

/**
 * POST /api/transactions/verify
 * 2-Step Transfer Step 2: Verify OTP and Execute (Protected & Account must not be frozen)
 */
transactionRoutes.post(
    "/verify",
    authMiddleware,
    checkNotFrozen,
    transactionController.verifyTransfer
)

/**
 * GET /api/transactions/history
 * Paginated transaction history with filters & search
 */
transactionRoutes.get("/history", authMiddleware, transactionController.getTransactionHistory)

/**
 * GET /api/transactions/stats
 * Visual statistics summary
 */
transactionRoutes.get("/stats", authMiddleware, transactionController.getTransactionStats)

module.exports = transactionRoutes