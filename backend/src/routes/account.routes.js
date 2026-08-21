const express = require("express")
const authMiddleware = require("../middleware/auth.middleware")
const accountController = require("../controllers/account.controller")

const router = express.Router()

/**
 * POST /api/accounts/
 * Create a new account
 */
router.post("/", authMiddleware.authMiddleware, accountController.createAccountController)

/**
 * GET /api/accounts/
 * Get all accounts of the logged-in user with balance
 */
router.get("/", authMiddleware.authMiddleware, accountController.getUserAccountsController)

/**
 * GET /api/accounts/directory
 * Get public active directory for recipient selection
 */
router.get("/directory", authMiddleware.authMiddleware, accountController.getDirectoryController)

/**
 * POST /api/accounts/faucet
 * Fund account via instant testing faucet / deposit
 */
router.post("/faucet", authMiddleware.authMiddleware, accountController.fundAccountFaucetController)

/**
 * GET /api/accounts/balance/:accountId
 * Get account balance
 */
router.get("/balance/:accountId", authMiddleware.authMiddleware, accountController.getAccountBalanceController)

module.exports = router