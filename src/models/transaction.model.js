const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({

    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, 'From account is required for creating a transaction'],
        index: true
    },
    toAccount:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, 'To account is required for creating a transaction'],
        index: true
    },

    status:{
        type: String,
        enum:{
            values: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
        }
    }

})