const express = require("express")
const cookieParser = require("cookie-parser")
const { globalApiLimiter } = require("./middleware/rateLimit.middleware")

const app = express()

/**
 * Trust the first proxy hop (e.g. Nginx, Render, Vercel, Heroku).
 * Without this, req.ip is the proxy's address — every user shares one IP
 * and rate limiting either blocks everyone or no one.
 * Set to 1 so Express only trusts X-Forwarded-For from your known reverse proxy,
 * reducing the risk of clients spoofing their IP to bypass limits.
 */
app.set("trust proxy", 1)

app.use(express.json())
app.use(cookieParser())

/**
 * Global rate limit for all API routes
 */
app.use("/api", globalApiLimiter)

/**
 * - Routes required
 */
const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/account.routes")
const transactionRoutes = require("./routes/transaction.routes")
const adminRoutes = require("./routes/admin.routes")

/**
 * - Use Routes
 */

app.get("/", (req, res) => {
    res.send("Ledger Service is up and running")
})

app.use("/api/auth", authRouter)
app.use("/api/accounts", accountRouter)
app.use("/api/transactions", transactionRoutes)
app.use("/api/admin", adminRoutes)

module.exports = app