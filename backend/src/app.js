const express = require("express")
const path = require("path")
const fs = require("fs")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const { globalApiLimiter } = require("./middleware/rateLimit.middleware")

const app = express()

/**
 * Enable CORS with credentials for local & production frontends
 */
app.use(
    cors({
        origin: function (origin, callback) {
            callback(null, true)
        },
        credentials: true,
        methods: [ "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS" ],
        allowedHeaders: [ "Content-Type", "Authorization", "X-Requested-With", "Accept" ]
    })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

/**
 * Health check endpoint
 */
app.get("/api/health", (req, res) => {
    res.json({
        status: "healthy",
        service: "Ledger Transaction Banking Service",
        timestamp: new Date().toISOString()
    })
})

/**
 * Global rate limit for all API routes (except health and SSE streams)
 */
app.use("/api", (req, res, next) => {
    if (req.path === "/transactions/stream" || req.path === "/health") {
        return next()
    }
    return globalApiLimiter(req, res, next)
})

/**
 * Mount API Routes
 */
const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/account.routes")
const transactionRoutes = require("./routes/transaction.routes")
const adminRoutes = require("./routes/admin.routes")

app.use("/api/auth", authRouter)
app.use("/api/accounts", accountRouter)
app.use("/api/transactions", transactionRoutes)
app.use("/api/admin", adminRoutes)

/**
 * Serve frontend static assets (prefers React production build if available)
 */
const distPath = path.resolve(__dirname, "../../frontend/dist")
const staticPath = fs.existsSync(distPath) ? distPath : path.resolve(__dirname, "../../frontend")
app.use(express.static(staticPath))

/**
 * Catch-all fallback for SPA & 404 handler (Express 5 compatible)
 */
app.use((req, res) => {
    if (req.path.startsWith("/api")) {
        return res.status(404).json({ message: "API endpoint not found" })
    }
    res.sendFile(path.join(staticPath, "index.html"))
})

module.exports = app