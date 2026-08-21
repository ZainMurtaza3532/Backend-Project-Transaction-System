const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [ true, "Email is required for creating a user" ],
        trim: true,
        lowercase: true,
        match: [ /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid Email address" ],
        unique: [ true, "Email already exists." ]
    },
    name: {
        type: String,
        required: [ true, "Name is required for creating an account" ]
    },
    password: {
        type: String,
        required: [ true, "Password is required for creating an account" ],
        minlength: [ 6, "password should contain more than 6 character" ],
        select: false
    },
    systemUser: {
        type: Boolean,
        default: false,
        immutable: true,
        select: false
    },
    role: {
        type: String,
        enum: {
            values: [ "user", "auditor", "admin", "super_admin" ],
            message: "Role must be either user, auditor, admin, or super_admin"
        },
        default: "user"
    },
    isFrozen: {
        type: Boolean,
        default: false
    },
    // Risk Management & Compliance Transfer Limits
    transferLimits: {
        daily: {
            type: Number,
            default: 50000,
            min: [0, "Daily limit cannot be negative"]
        },
        weekly: {
            type: Number,
            default: 200000,
            min: [0, "Weekly limit cannot be negative"]
        },
        monthly: {
            type: Number,
            default: 500000,
            min: [0, "Monthly limit cannot be negative"]
        }
    }
}, {
    timestamps: true
})

userSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return
    }

    const hash = await bcrypt.hash(this.password, 10)
    this.password = hash
})

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password)
}

const userModel = mongoose.model("user", userSchema)

module.exports = userModel