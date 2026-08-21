const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const emailService = require("../services/email.service")
const tokenBlackListModel = require("../models/blackList.model")
const accountModel = require("../models/account.model")
const { logUserActivity } = require("../services/audit.service")

/**
* - user register controller
* - POST /api/auth/register
*/
async function userRegisterController(req, res) {
    try {
        const { email, password, name } = req.body

        if (!email || !password || !name) {
            return res.status(400).json({
                message: "Name, email, and password are required.",
                status: "failed"
            })
        }

        const isExists = await userModel.findOne({ email: email.toLowerCase() })

        if (isExists) {
            return res.status(422).json({
                message: "User already exists with email.",
                status: "failed"
            })
        }

        const user = await userModel.create({
            email, password, name
        })

        // Automatically create a default account for the new user
        const defaultAccount = await accountModel.create({
            user: user._id,
            currency: "PKR",
            status: "ACTIVE"
        })

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 3 * 24 * 60 * 60 * 1000
        })

        res.status(201).json({
            message: "Registration successful",
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                role: user.role || "user"
            },
            account: defaultAccount,
            token
        })

        emailService.sendRegistrationEmail(user.email, user.name).catch(() => {})
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Registration failed"
        })
    }
}

/**
 * - User Login Controller
 * - POST /api/auth/login
 */
async function userLoginController(req, res) {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            })
        }

        const user = await userModel.findOne({ email: email.toLowerCase() }).select("+password")

        if (!user) {
            return res.status(401).json({
                message: "Email or password is INVALID"
            })
        }

        const isValidPassword = await user.comparePassword(password)

        if (!isValidPassword) {
            return res.status(401).json({
                message: "Email or password is INVALID"
            })
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 3 * 24 * 60 * 60 * 1000
        })

        logUserActivity(req, user._id, "LOGIN", { email: user.email })

        return res.status(200).json({
            message: "Login successful",
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                role: user.role || "user"
            },
            token
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Login failed"
        })
    }
}

/**
 * - Get Logged-in User Info
 * - GET /api/auth/me
 */
async function getMeController(req, res) {
    try {
        const user = await userModel.findById(req.user._id)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        return res.status(200).json({
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                role: user.role || "user"
            }
        })
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch user profile" })
    }
}

/**
 * - User Logout Controller
 * - POST /api/auth/logout
 */
async function userLogoutController(req, res) {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(" ")[ 1 ]

        if (token) {
            await tokenBlackListModel.create({
                token: token
            }).catch(() => {})
        }

        res.clearCookie("token")

        res.status(200).json({
            message: "User logged out successfully"
        })
    } catch (error) {
        return res.status(500).json({
            message: "Logout failed"
        })
    }
}

/**
 * - Update user profile
 * - PUT /api/auth/update-profile
 */
async function updateProfileController(req, res) {
    try {
        const { name, oldPassword, newPassword } = req.body

        const isUpdatingName = name !== undefined && name !== null && name.trim() !== ""
        const isUpdatingPassword = newPassword !== undefined && newPassword !== null && newPassword !== ""

        if (!isUpdatingName && !isUpdatingPassword) {
            return res.status(400).json({
                message: "Provide name and/or newPassword to update profile"
            })
        }

        if (isUpdatingPassword && !oldPassword) {
            return res.status(400).json({
                message: "oldPassword is required when changing password"
            })
        }

        const user = await userModel.findById(req.user._id).select("+password")

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            })
        }

        if (isUpdatingName) {
            user.name = name.trim()
        }

        if (isUpdatingPassword) {
            const isValidPassword = await user.comparePassword(oldPassword)

            if (!isValidPassword) {
                return res.status(401).json({
                    message: "Old password is incorrect"
                })
            }

            user.password = newPassword
        }

        await user.save()

        if (isUpdatingPassword) {
            logUserActivity(req, user._id, "PASSWORD_CHANGE", {
                nameUpdated: isUpdatingName
            })
        } else if (isUpdatingName) {
            logUserActivity(req, user._id, "PROFILE_UPDATE", {
                newName: user.name
            })
        }

        return res.status(200).json({
            message: "Profile updated successfully",
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                role: user.role || "user"
            }
        })
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: error.message
            })
        }

        return res.status(500).json({
            message: "Failed to update profile"
        })
    }
}

module.exports = {
    userRegisterController,
    userLoginController,
    getMeController,
    userLogoutController,
    updateProfileController
}