const express = require('express');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth.routes');
const accountRoutes = require('./routes/account.routes');

const app = express();

// Middleware to parse JSON requests
app.use(express.json());

// Middleware to parse cookies
app.use(cookieParser());

// Use the auth routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);


module.exports = app;