const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");

async function registerUser(req, res) {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // We just pass the plain password now, because your user.model.js 
        // will automatically hash it before saving it to the database!
        const newUser = await userModel.create({ 
            username, 
            email, 
            password 
        });
        
        const token = jwt.sign(
            { id: newUser._id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '3d' }
        );
        
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict', 
            maxAge: 3 * 24 * 60 * 60 * 1000, 
        });

        return res.status(201).json({ 
            message: "User registered successfully", 
            user: {
                _id: newUser._id,
                username: newUser.username,
                email: newUser.email
            }, 
            token 
        });

    } catch (error) {
        console.error("Registration Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}


async function loginUser(req, res) {
    try {
        const { email, password } = req.body;

        // 1. Validate that the user actually sent both fields
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // 2. FIX: Add .select('+password') so Mongoose actually returns the hash to bcrypt!
        const user = await userModel.findOne({ email }).select('+password');

        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Now user.password actually exists, so this will work perfectly:
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '3d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            message: "User logged in successfully",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email
            },
            token
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}



module.exports = {
    registerUser,
    loginUser
};