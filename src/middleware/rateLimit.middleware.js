const rateLimit = require("express-rate-limit")

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000

/**
 * Strict limiter for login — mitigates brute-force password guessing.
 * 5 attempts per IP per 15-minute window.
 */
const loginLimiter = rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many login attempts from this IP, please try again after 15 minutes."
    }
})

/**
 * Lenient global limiter for all /api routes — mitigates general DDoS/abuse.
 * 100 requests per IP per 15-minute window.
 */
const globalApiLimiter = rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many requests from this IP, please try again after 15 minutes."
    }
})

module.exports = {
    loginLimiter,
    globalApiLimiter
}
