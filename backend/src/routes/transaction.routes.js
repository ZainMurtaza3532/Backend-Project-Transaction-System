const { Router } = require("express")
const authMiddleware = require("../middleware/auth.middleware")
const transactionController = require("../controllers/transaction.controller")

const transactionRoutes = Router()

/**
 * GET /api/transactions/stream
 * Real-time SSE event stream
 */
transactionRoutes.get("/stream", authMiddleware.authMiddleware, transactionController.streamTransactions)

/**
 * POST /api/transactions/
 * Direct transfer
 */
transactionRoutes.post("/", authMiddleware.authMiddleware, transactionController.createTransaction)

/**
 * POST /api/transactions/initiate
 * 2-Step Transfer Step 1: Request OTP
 */
transactionRoutes.post("/initiate", authMiddleware.authMiddleware, transactionController.initiateTransfer)

/**
 * POST /api/transactions/verify
 * 2-Step Transfer Step 2: Verify OTP and Execute
 */
transactionRoutes.post("/verify", authMiddleware.authMiddleware, transactionController.verifyTransfer)

/**
 * GET /api/transactions/history
 * Paginated transaction history with filters & search
 */
transactionRoutes.get("/history", authMiddleware.authMiddleware, transactionController.getTransactionHistory)

/**
 * GET /api/transactions/stats
 * Visual statistics summary
 */
transactionRoutes.get("/stats", authMiddleware.authMiddleware, transactionController.getTransactionStats)

module.exports = transactionRoutes