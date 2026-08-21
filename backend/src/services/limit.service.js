const transactionModel = require("../models/transaction.model")
const accountModel = require("../models/account.model")
const userModel = require("../models/user.model")
const { getTransferLimitBoundaries } = require("../utils/date.util")

/**
 * Validates whether a requested transfer amount complies with the user's Daily, Weekly, and Monthly transfer limits.
 * Uses high-performance single-pass MongoDB Aggregation with conditional sums.
 * 
 * @param {string|mongoose.Types.ObjectId} userId - The sender's User ID
 * @param {number} requestedAmount - The intended transfer amount
 * @returns {Promise<{ isAllowed: boolean, currentUsage: { dailyTotal: number, weeklyTotal: number, monthlyTotal: number }, limits: { daily: number, weekly: number, monthly: number } }>}
 */
async function checkTransferLimits(userId, requestedAmount) {
    const amount = Number(requestedAmount)
    if (isNaN(amount) || amount <= 0) {
        const error = new Error("Transfer amount must be a positive number")
        error.statusCode = 400
        throw error
    }

    // 1. Fetch User and Custom/Default Transfer Limits
    const user = await userModel.findById(userId).select("transferLimits role")
    if (!user) {
        const error = new Error("Sender user account not found")
        error.statusCode = 404
        throw error
    }

    const limits = {
        daily: user.transferLimits?.daily ?? 50000,
        weekly: user.transferLimits?.weekly ?? 200000,
        monthly: user.transferLimits?.monthly ?? 500000
    }

    // 2. Fetch all Account IDs belonging to this user
    const accounts = await accountModel.find({ user: userId }).select("_id")
    const accountIds = accounts.map((acc) => acc._id)

    if (accountIds.length === 0) {
        return {
            isAllowed: true,
            currentUsage: { dailyTotal: 0, weeklyTotal: 0, monthlyTotal: 0 },
            limits
        }
    }

    // 3. Obtain exact UTC time boundaries
    const { startOfDay, startOfWeek, startOfMonth } = getTransferLimitBoundaries()

    // 4. High-Performance Single-Pass Aggregation Pipeline
    const [aggregated] = await transactionModel.aggregate([
        {
            $match: {
                fromAccount: { $in: accountIds },
                status: "COMPLETED",
                type: { $ne: "reversal" },
                createdAt: { $gte: startOfMonth }
            }
        },
        {
            $group: {
                _id: null,
                dailyTotal: {
                    $sum: {
                        $cond: [
                            { $gte: ["$createdAt", startOfDay] },
                            { $ifNull: ["$totalAmount", "$amount"] },
                            0
                        ]
                    }
                },
                weeklyTotal: {
                    $sum: {
                        $cond: [
                            { $gte: ["$createdAt", startOfWeek] },
                            { $ifNull: ["$totalAmount", "$amount"] },
                            0
                        ]
                    }
                },
                monthlyTotal: {
                    $sum: { $ifNull: ["$totalAmount", "$amount"] }
                }
            }
        }
    ])

    const currentUsage = aggregated || {
        dailyTotal: 0,
        weeklyTotal: 0,
        monthlyTotal: 0
    }

    // 5. Daily Limit Verification
    const projectedDaily = currentUsage.dailyTotal + amount
    if (projectedDaily > limits.daily) {
        const remainingDaily = Math.max(0, limits.daily - currentUsage.dailyTotal)
        const error = new Error(
            `Daily transfer limit of ${limits.daily.toLocaleString()} exceeded. Current usage: ${currentUsage.dailyTotal.toLocaleString()}, Remaining quota: ${remainingDaily.toLocaleString()}, Requested: ${amount.toLocaleString()}`
        )
        error.statusCode = 400
        error.code = "DAILY_LIMIT_EXCEEDED"
        error.details = {
            limitType: "daily",
            limit: limits.daily,
            currentUsage: currentUsage.dailyTotal,
            remainingQuota: remainingDaily,
            requestedAmount: amount
        }
        throw error
    }

    // 6. Weekly Limit Verification
    const projectedWeekly = currentUsage.weeklyTotal + amount
    if (projectedWeekly > limits.weekly) {
        const remainingWeekly = Math.max(0, limits.weekly - currentUsage.weeklyTotal)
        const error = new Error(
            `Weekly transfer limit of ${limits.weekly.toLocaleString()} exceeded. Current usage: ${currentUsage.weeklyTotal.toLocaleString()}, Remaining quota: ${remainingWeekly.toLocaleString()}, Requested: ${amount.toLocaleString()}`
        )
        error.statusCode = 400
        error.code = "WEEKLY_LIMIT_EXCEEDED"
        error.details = {
            limitType: "weekly",
            limit: limits.weekly,
            currentUsage: currentUsage.weeklyTotal,
            remainingQuota: remainingWeekly,
            requestedAmount: amount
        }
        throw error
    }

    // 7. Monthly Limit Verification
    const projectedMonthly = currentUsage.monthlyTotal + amount
    if (projectedMonthly > limits.monthly) {
        const remainingMonthly = Math.max(0, limits.monthly - currentUsage.monthlyTotal)
        const error = new Error(
            `Monthly transfer limit of ${limits.monthly.toLocaleString()} exceeded. Current usage: ${currentUsage.monthlyTotal.toLocaleString()}, Remaining quota: ${remainingMonthly.toLocaleString()}, Requested: ${amount.toLocaleString()}`
        )
        error.statusCode = 400
        error.code = "MONTHLY_LIMIT_EXCEEDED"
        error.details = {
            limitType: "monthly",
            limit: limits.monthly,
            currentUsage: currentUsage.monthlyTotal,
            remainingQuota: remainingMonthly,
            requestedAmount: amount
        }
        throw error
    }

    return {
        isAllowed: true,
        currentUsage,
        limits
    }
}

module.exports = {
    checkTransferLimits
}
