const userModel = require("../models/user.model")

/**
 * - Get all users
 * - GET /api/admin/all-users
 */
async function getAllUsers(req, res) {
    try {
        const users = await userModel.find().select("-password -systemUser")

        return res.status(200).json({
            message: "Users fetched successfully",
            users
        })
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch users"
        })
    }
}

module.exports = {
    getAllUsers
}
