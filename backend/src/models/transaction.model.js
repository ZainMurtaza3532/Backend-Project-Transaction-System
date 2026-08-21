const mongoose = require("mongoose")

const transactionSchema = new mongoose.Schema(
    {
        fromAccount: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "account",
            required: [true, "Transaction must be associated with a from account"],
            index: true,
            immutable: true
        },
        toAccount: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "account",
            required: [true, "Transaction must be associated with a to account"],
            index: true,
            immutable: true
        },
        amount: {
            type: Number,
            required: [true, "Amount is required for creating a transaction"],
            min: [0, "Transaction amount cannot be negative"],
            immutable: true
        },
        // Complete Financial Transparency Fields
        totalAmount: {
            type: Number,
            required: [true, "Total amount is required"],
            min: [0, "Total amount cannot be negative"],
            default: function () {
                return this.amount
            },
            immutable: true
        },
        feeAmount: {
            type: Number,
            required: true,
            min: [0, "Fee amount cannot be negative"],
            default: 0,
            immutable: true
        },
        netAmount: {
            type: Number,
            required: [true, "Net amount is required"],
            min: [0, "Net amount cannot be negative"],
            default: function () {
                return (this.amount || 0) - (this.feeAmount || 0)
            },
            immutable: true
        },
        idempotencyKey: {
            type: String,
            required: [true, "Idempotency Key is required for creating a transaction"],
            index: true,
            unique: true,
            immutable: true
        },
        type: {
            type: String,
            enum: {
                values: ["standard", "reversal"],
                message: "Type must be either standard or reversal"
            },
            default: "standard"
        },
        isReversed: {
            type: Boolean,
            default: false,
            index: true
        },
        originalTransactionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "transaction",
            default: null,
            index: true
        },
        status: {
            type: String,
            enum: {
                values: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
                message: "Status can be either PENDING, COMPLETED, FAILED or REVERSED"
            },
            default: "PENDING"
        },
        otp: {
            type: String,
            select: false
        },
        otpExpires: {
            type: Date,
            select: false
        }
    },
    {
        timestamps: true
    }
)

/**
 * Enforce strict immutability: Block all deletion operations on transactions
 */
function preventTransactionDeletion() {
    throw new Error("Financial records are immutable. Deletion is strictly prohibited.")
}

transactionSchema.pre("deleteOne", preventTransactionDeletion)
transactionSchema.pre("deleteMany", preventTransactionDeletion)
transactionSchema.pre("findOneAndDelete", preventTransactionDeletion)
transactionSchema.pre("findOneAndReplace", preventTransactionDeletion)
transactionSchema.pre("remove", preventTransactionDeletion)

const transactionModel = mongoose.model("transaction", transactionSchema)

module.exports = transactionModel