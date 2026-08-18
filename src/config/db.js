const mongoose = require("mongoose");

const connectToDB = async () => {
    try {
        // Ensure process.env.MONGO_URI matches the variable name in your .env file
        await mongoose.connect(process.env.MONGO_URI); 
        console.log("MongoDB Connected Successfully!");
    } catch (error) {
        // This will print the exact reason the database fails to connect!
        console.error("Database connection error:", error.message);
        process.exit(1);
    }
};

// Export the function directly so server.js can use it
module.exports = connectToDB;