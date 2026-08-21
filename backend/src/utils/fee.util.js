/**
 * Accurate Financial Arithmetic Helpers
 */
function roundToTwoDecimals(num) {
    return Math.round((Number(num) + Number.EPSILON) * 100) / 100
}

/**
 * Calculates transaction fee and breakdowns accurately based on environment configuration.
 * Prevents JavaScript floating-point representation anomalies (e.g. 10.49999999).
 * 
 * Invariant: totalAmount = netAmount + feeAmount
 * 
 * @param {number} transferAmount - The intended transfer amount entered by user
 * @param {boolean} feeDeductedFromAmount - If true, fee is deducted from amount (net = amount - fee).
 *                                         If false, fee is surcharged on top (total = amount + fee, net = amount). Default: true
 * @returns {{ totalAmount: number, feeAmount: number, netAmount: number, feeRate: number, feeType: string }}
 */
function calculateFee(transferAmount, feeDeductedFromAmount = true) {
    const rawAmount = Number(transferAmount)
    if (isNaN(rawAmount) || rawAmount <= 0) {
        throw new Error("Transfer amount must be a positive number")
    }

    const feeType = (process.env.FEE_TYPE || "percentage").toLowerCase()
    const feeRate = Number(process.env.FEE_RATE) || 1.5 // Default 1.5%
    const minFee = Number(process.env.MIN_FEE) || 0
    const maxFee = Number(process.env.MAX_FEE) || Infinity

    let calculatedFee = 0

    if (feeType === "flat") {
        calculatedFee = feeRate
    } else {
        // Percentage fee calculation with 2-decimal precision
        calculatedFee = (rawAmount * feeRate) / 100
    }

    // Apply minimum and maximum fee thresholds
    calculatedFee = Math.max(minFee, Math.min(maxFee, calculatedFee))
    const feeAmount = roundToTwoDecimals(calculatedFee)

    let totalAmount = 0
    let netAmount = 0

    if (feeDeductedFromAmount) {
        if (rawAmount <= feeAmount) {
            throw new Error(`Transfer amount must be greater than platform fee (${feeAmount})`)
        }
        totalAmount = roundToTwoDecimals(rawAmount)
        netAmount = roundToTwoDecimals(totalAmount - feeAmount)
    } else {
        netAmount = roundToTwoDecimals(rawAmount)
        totalAmount = roundToTwoDecimals(netAmount + feeAmount)
    }

    return {
        totalAmount,
        feeAmount,
        netAmount,
        feeRate,
        feeType
    }
}

module.exports = {
    roundToTwoDecimals,
    calculateFee
}
