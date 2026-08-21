/**
 * Calculates exact UTC start timestamps for Daily, Weekly, and Monthly boundaries.
 * Guarantees cross-timezone and server consistency.
 * 
 * @param {Date} [referenceDate=new Date()] - Reference timestamp
 * @returns {{ startOfDay: Date, startOfWeek: Date, startOfMonth: Date, now: Date }}
 */
function getTransferLimitBoundaries(referenceDate = new Date()) {
    const now = new Date(referenceDate)

    // 1. Start of Day (UTC 00:00:00.000)
    const startOfDay = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0
    ))

    // 2. Start of Week (UTC Monday 00:00:00.000 - ISO week)
    // In JavaScript, getUTCDay() returns 0 for Sunday, 1 for Monday, etc.
    const dayOfWeek = now.getUTCDay()
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // distance back to Monday
    const startOfWeek = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + diffToMonday,
        0, 0, 0, 0
    ))

    // 3. Start of Month (UTC 1st of Month 00:00:00.000)
    const startOfMonth = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        1,
        0, 0, 0, 0
    ))

    return {
        startOfDay,
        startOfWeek,
        startOfMonth,
        now
    }
}

module.exports = {
    getTransferLimitBoundaries
}
