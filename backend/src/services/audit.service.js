const auditLogModel = require("../models/auditLog.model")

/**
 * Reusable helper to record audit logs asynchronously
 * @param {import('express').Request} req - Express request object
 * @param {string|import('mongoose').Types.ObjectId} userId - User ID
 * @param {string} action - Action enum value (e.g. 'LOGIN', 'PASSWORD_CHANGE', 'FUND_TRANSFER')
 * @param {object} details - Additional contextual metadata
 */
function logUserActivity(req, userId, action, details = {}) {
    // Fire and forget without awaiting or blocking the response cycle
    setImmediate(async () => {
        try {
            if (!userId) return

            // Extract client IP address (supporting proxies & load balancers)
            const ipAddress =
                (req.headers && req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) ||
                req.socket?.remoteAddress ||
                req.ip ||
                "unknown"

            // Extract client browser / device user agent
            const userAgent =
                (req.get && req.get("User-Agent")) ||
                (req.headers && req.headers["user-agent"]) ||
                "unknown"

            await auditLogModel.create({
                user: userId,
                action,
                ipAddress,
                userAgent,
                details
            })
        } catch (error) {
            // Log to console but never crash or interfere with main application flow
            console.error("[AuditService] Failed to record audit log:", error.message)
        }
    })
}

module.exports = {
    logUserActivity
}
