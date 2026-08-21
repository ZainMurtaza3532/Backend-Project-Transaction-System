const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = require("./src/app");
const connectToDB = require("./src/config/db");

// Connect to MongoDB
connectToDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`  NOVA LEDGER BANKING PLATFORM SERVER RUNNING      `);
    console.log(`  URL: http://localhost:${PORT}                   `);
    console.log(`  Health API: http://localhost:${PORT}/api/health `);
    console.log(`===================================================`);
});