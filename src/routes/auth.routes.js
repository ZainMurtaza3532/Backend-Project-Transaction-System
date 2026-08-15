const express = require('express');
const { registerUser } = require('../controllers/auth.controller');
const { loginUser } = require('../controllers/auth.controller');

const router = express.Router();

// @route   POST /api/auth/register
router.post("/register", registerUser);

// @route   POST /api/auth/login
router.post("/login", loginUser);

module.exports = router;