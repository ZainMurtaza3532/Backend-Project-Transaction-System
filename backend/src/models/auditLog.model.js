const mongoose = require("mongoose")

const auditLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
            index: true
        },
        action: {
            type: String,
            required: true,
            enum: [
                "LOGIN",
                "LOGOUT",
                "PASSWORD_CHANGE",
                "PROFILE_UPDATE",
                "FUND_TRANSFER",
                "FAUCET_DEPOSIT",
                "ACCOUNT_FREEZE"
            ],
            index: true
        },
        ipAddress: {
            type: String,
            default: "unknown"
        },
        userAgent: {
            type: String,
            default: "unknown"
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: { createdAt: true, updatedAt: false }
    }
)

// Index for fast chronological queries per user or action
auditLogSchema.index({ createdAt: -1 })
auditLogSchema.index({ user: 1, createdAt: -1 })

const auditLogModel = mongoose.model("audit_log", auditLogSchema)

module.exports = auditLogModel
