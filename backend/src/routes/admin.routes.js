const { Router } = require("express")
const { authMiddleware, isAdmin, authorizeRoles } = require("../middleware/auth.middleware")
const adminController = require("../controllers/admin.controller")

const adminRoutes = Router()

/**
 * GET /api/admin/all-users
 * Fetch all users (admin only)
 * Protected Route
 */
adminRoutes.get(
    "/all-users",
    authMiddleware,
    isAdmin,
    adminController.getAllUsers
)

/**
 * PUT /api/admin/users/:id/freeze
 * Freeze/Unfreeze user account (admin only)
 * Protected Route
 */
adminRoutes.put(
    "/users/:id/freeze",
    authMiddleware,
    isAdmin,
    adminController.toggleFreezeUserController
)

/**
 * GET /api/admin/audit-logs
 * Fetch paginated audit logs (auditor or admin only)
 * Protected Route
 */
adminRoutes.get(
    "/audit-logs",
    authMiddleware,
    authorizeRoles("auditor", "admin", "super_admin"),
    adminController.getAuditLogsController
)

/**
 * POST /api/admin/transactions/:id/reverse
 * Create Reversal Entry for a transaction (admin or super_admin)
 * Protected Route
 */
adminRoutes.post(
    "/transactions/:id/reverse",
    authMiddleware,
    authorizeRoles("admin", "super_admin"),
    adminController.reverseTransactionController
)

/**
 * DELETE /api/admin/users/:id
 * Strictly allowed ONLY for Super Admin
 * Protected Route
 */
adminRoutes.delete(
    "/users/:id",
    authMiddleware,
    authorizeRoles("super_admin"),
    adminController.deactivateUserSuperAdminController
)

module.exports = adminRoutes
