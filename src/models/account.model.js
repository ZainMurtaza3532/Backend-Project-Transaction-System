const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  accountNumber: {
    type: String,
    required: [true, 'Account number is required for creating an account'],
    unique: true, // Fix: unique is a boolean index builder, not a validator
  },
  accountType: {
    type: String,
    required: [true, 'Account type is required for creating an account'],
    enum: {
      values: ['checking', 'savings'],
      message: 'Invalid account type. Please choose either "checking" or "savings".'
    }
  },
  balance: {
    type: Number,
    required: [true, 'Balance is required for creating an account'],
    min: [0, 'Balance cannot be negative']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required for creating an account'],
    index: true, // Create an index for faster queries
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive'],
      message: 'Invalid status. Please choose either "active" or "inactive".'
    }
  },
  currency: {
    type: String,
    required: [true, 'Currency is required for creating an account'],
    default: 'Pkr',
    enum: {
      values: ['Pkr', 'USD', 'EUR', 'GBP'],
      message: 'Invalid currency. Please choose a valid currency.'
    }
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

// FIX: Deleted the duplicate accountSchema.index() line that was here

const Account = mongoose.model('Account', accountSchema);
module.exports = Account;