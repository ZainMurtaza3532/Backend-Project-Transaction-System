const express = require("express")
const authController = require("../controllers/auth.controller")
const authMiddleware = require("../middleware/auth.middleware")
const { loginLimiter } = require("../middleware/rateLimit.middleware")

const router = express.Router()

/* POST /api/auth/register */
router.post("/register", authController.userRegisterController)

/* POST /api/auth/login */
router.post("/login", loginLimiter, authController.userLoginController)

/* GET /api/auth/me */
router.get("/me", authMiddleware.authMiddleware, authController.getMeController)

/* POST /api/auth/logout */
router.post("/logout", authController.userLogoutController)

/* PUT /api/auth/update-profile */
router.put("/update-profile", authMiddleware.authMiddleware, authController.updateProfileController)

module.exports = router