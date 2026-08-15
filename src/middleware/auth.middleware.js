const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');

async function authMiddleware (req, res, next) {
    // Note: To use req.cookies.token, ensure you have require('cookie-parser') set up in server.js
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized access, token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // FIX: Change decoded.userId to decoded.id
        const user = await userModel.findById(decoded.id);

        // Extra safety check in case the user was deleted from the database
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized access, user no longer exists' });
        }

        req.user = user;
        return next();

    } catch(err){
        return res.status(401).json({ message: 'Unauthorized access, invalid token' });
    }
}

module.exports = {
    authMiddleware
}