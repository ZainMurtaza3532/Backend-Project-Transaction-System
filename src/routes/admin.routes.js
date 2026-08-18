const { Router } = require("express")
const authMiddleware = require("../middleware/auth.middleware")
const adminController = require("../controllers/admin.controller")

const adminRoutes = Router()

/**
 * - GET /api/admin/all-users
 * - Fetch all users (admin only)
 * - Protected Route
 */
adminRoutes.get(
    "/all-users",
    authMiddleware.authMiddleware,
    authMiddleware.isAdmin,
    adminController.getAllUsers
)

module.exports = adminRoutes
