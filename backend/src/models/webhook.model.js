const mongoose = require("mongoose")
const crypto = require("crypto")

const webhookSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
            index: true
        },
        targetUrl: {
            type: String,
            required: [true, "targetUrl is required for webhook subscription"],
            trim: true,
            match: [/^https?:\/\/.+/, "targetUrl must be a valid HTTP or HTTPS URL"]
        },
        secretKey: {
            type: String,
            required: true,
            default: () => "whsec_" + crypto.randomBytes(24).toString("hex")
        },
        events: {
            type: [String],
            required: true,
            enum: [
                "transaction.success",
                "transaction.failed",
                "transaction.pending",
                "account.frozen",
                "faucet.deposited"
            ],
            default: ["transaction.success"]
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    {
        timestamps: true
    }
)

// Index for fast dispatch queries
webhookSchema.index({ userId: 1, isActive: 1, events: 1 })

const webhookModel = mongoose.model("webhook", webhookSchema)

module.exports = webhookModel
