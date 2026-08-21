const rateLimit = require("express-rate-limit")

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000

/**
 * Login rate limiter
 */
const loginLimiter = rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    message: {
        message: "Too many login attempts from this IP, please try again after 15 minutes."
    }
})

/**
 * Global API rate limiter
 */
const globalApiLimiter = rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    max: 10000,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    message: {
        message: "Too many requests from this IP, please try again after 15 minutes."
    }
})

module.exports = {
    loginLimiter,
    globalApiLimiter
}
