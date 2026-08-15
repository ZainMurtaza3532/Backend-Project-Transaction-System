const accountModel = require('../models/account.model');

async function createAccount(req, res) {
    try {
        const user = req.user;

        // 1. Safety Check: Ensure the user exists before reading ._id
        if (!user) {
            return res.status(401).json({ 
                message: 'Unauthorized: No user found. Please ensure you are logged in.' 
            });
        }

        // 2. You will also need to pass the other required fields from your schema
        // like accountNumber, accountType, balance, and currency.
        const { accountNumber, accountType, balance, currency } = req.body;

        const account = await accountModel.create({
            user: user._id, // Changed from userId to user to match your schema
            accountNumber,
            accountType,
            balance,
            currency
        });

        res.status(201).json({ message: 'Account created successfully', account });
    } catch (error) {
        // Handle Mongoose validation errors or duplicate keys gracefully
        res.status(400).json({ message: error.message, error });
    }
}

module.exports = {
    createAccount
}