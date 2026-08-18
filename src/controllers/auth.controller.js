const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const emailService = require("../services/email.service")
const tokenBlackListModel = require("../models/blackList.model")

/**
* - user register controller
* - POST /api/auth/register
*/
async function userRegisterController(req, res) {
    const { email, password, name } = req.body

    const isExists = await userModel.findOne({
        email: email
    })

    if (isExists) {
        return res.status(422).json({
            message: "User already exists with email.",
            status: "failed"
        })
    }

    const user = await userModel.create({
        email, password, name
    })

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })

    res.cookie("token", token)

    res.status(201).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        },
        token
    })

    await emailService.sendRegistrationEmail(user.email, user.name)
}

/**
 * - User Login Controller
 * - POST /api/auth/login
  */

async function userLoginController(req, res) {
    const { email, password } = req.body

    const user = await userModel.findOne({ email }).select("+password")

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

    res.cookie("token", token)

    res.status(200).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        },
        token
    })

}


/**
 * - User Logout Controller
 * - POST /api/auth/logout
  */
async function userLogoutController(req, res) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[ 1 ]

    if (!token) {
        return res.status(200).json({
            message: "User logged out successfully"
        })
    }



    await tokenBlackListModel.create({
        token: token
    })

    res.clearCookie("token")

    res.status(200).json({
        message: "User logged out successfully"
    })

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

        return res.status(200).json({
            message: "Profile updated successfully",
            user: {
                _id: user._id,
                email: user.email,
                name: user.name
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
    userLogoutController,
    updateProfileController
}