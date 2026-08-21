const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const tokenBlackListModel = require("../models/blackList.model")

async function authMiddleware(req, res, next) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[ 1 ]

    if (!token) {
        return res.status(401).json({
            message: "Unauthorized access, token is missing"
        })
    }

    const isBlacklisted = await tokenBlackListModel.findOne({ token })

    if (isBlacklisted) {
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await userModel.findById(decoded.userId)

        if (!user) {
            return res.status(401).json({
                message: "Unauthorized access, user no longer exists"
            })
        }

        req.user = user
        return next()
    } catch (err) {
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        })
    }
}

async function authSystemUserMiddleware(req, res, next) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[ 1 ]

    if (!token) {
        return res.status(401).json({
            message: "Unauthorized access, token is missing"
        })
    }

    const isBlacklisted = await tokenBlackListModel.findOne({ token })

    if (isBlacklisted) {
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await userModel.findById(decoded.userId).select("+systemUser")

        if (!user || !user.systemUser) {
            return res.status(403).json({
                message: "Forbidden access, not a system user"
            })
        }

        req.user = user
        return next()
    } catch (err) {
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        })
    }
}

/**
 * Dynamic Role-Based Access Control (RBAC) Middleware Factory
 * @param {...string} allowedRoles - List of authorized roles (e.g. 'auditor', 'super_admin')
 */
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You do not have the required permissions."
            })
        }

        const userRole = req.user.role
        const hasAccess =
            allowedRoles.includes(userRole) ||
            (userRole === "admin" && (allowedRoles.includes("auditor") || allowedRoles.includes("super_admin")))

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You do not have the required permissions."
            })
        }

        return next()
    }
}

// Legacy helper pointing to authorizeRoles
const isAdmin = authorizeRoles("admin", "super_admin")

/**
 * Account Status Middleware: Blocks frozen accounts from transacting
 */
function checkNotFrozen(req, res, next) {
    if (req.user && req.user.isFrozen === true) {
        return res.status(403).json({
            message: "Your account is temporarily frozen. Please contact support."
        })
    }

    return next()
}

module.exports = {
    authMiddleware,
    authSystemUserMiddleware,
    authorizeRoles,
    isAdmin,
    checkNotFrozen
}