const express = require("express")
const authController = require("../controllers/auth.controller")
const authMiddleware = require("../middleware/auth.middleware")

const router = express.Router()


/* POST /api/auth/register */
router.post("/register", authController.userRegisterController)


/* POST /api/auth/login */
router.post("/login",authController.userLoginController)

/**
 * - POST /api/auth/logout
 */
router.post("/logout", authController.userLogoutController)

/**
 * - PUT /api/auth/update-profile
 * - Update logged-in user's name and/or password
 * - Protected Route
 */
router.put("/update-profile", authMiddleware.authMiddleware, authController.updateProfileController)

module.exports = router