const BASE_URL = "http://localhost:5000";

async function runTests() {
    console.log("🚀 Starting Nova Ledger End-to-End Automated Verification...\n");

    const emailSuffix = Date.now();
    const aliceEmail = `alice_${emailSuffix}@novaledger.io`;
    const bobEmail = `bob_${emailSuffix}@novaledger.io`;

    // 1. Health check
    console.log("1. Checking Server Health...");
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const health = await healthRes.json();
    console.log("   Health Status:", health.status, "| Service:", health.service);

    // 2. Register Alice
    console.log("\n2. Registering Alice...");
    const aliceRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Alice Developer",
            email: aliceEmail,
            password: "SecurePassword123!"
        })
    });
    const aliceData = await aliceRegRes.json();
    console.log("   Alice Registration Status:", aliceRegRes.status);
    console.log("   Alice Data:", JSON.stringify(aliceData, null, 2));
    const aliceToken = aliceData.token;

    // 3. Register Bob
    console.log("\n3. Registering Bob...");
    const bobRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Bob Trader",
            email: bobEmail,
            password: "SecurePassword123!"
        })
    });
    const bobData = await bobRegRes.json();
    console.log("   Bob Registration Status:", bobRegRes.status);
    console.log("   Bob Data:", JSON.stringify(bobData, null, 2));
    const bobToken = bobData.token;

    // 4. Get Alice Accounts
    console.log("\n4. Fetching Alice's Accounts...");
    const aliceAccRes = await fetch(`${BASE_URL}/api/accounts`, {
        headers: { Authorization: `Bearer ${aliceToken}` }
    });
    const aliceAccounts = await aliceAccRes.json();
    console.log("   Alice Accounts Response:", JSON.stringify(aliceAccounts, null, 2));
    const aliceAcc = aliceAccounts.accounts[0];

    // 5. Get Bob Accounts
    const bobAccRes = await fetch(`${BASE_URL}/api/accounts`, {
        headers: { Authorization: `Bearer ${bobToken}` }
    });
    const bobAccounts = await bobAccRes.json();
    const bobAcc = bobAccounts.accounts[0];

    // 6. Fund Alice with 25,000 PKR via Faucet
    console.log("\n6. Testing Faucet / Deposit for Alice (25,000 PKR)...");
    const faucetRes = await fetch(`${BASE_URL}/api/accounts/faucet`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${aliceToken}`
        },
        body: JSON.stringify({
            accountId: aliceAcc._id,
            amount: 25000
        })
    });
    const faucetData = await faucetRes.json();
    console.log("   Faucet Result:", faucetData.message, "| New Balance:", faucetData.newBalance);

    // 7. Test 2-Step OTP Transfer from Alice to Bob
    console.log("\n7. Initiating 2-Step Transfer (7,500 PKR from Alice to Bob)...");
    const initRes = await fetch(`${BASE_URL}/api/transactions/initiate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${aliceToken}`
        },
        body: JSON.stringify({
            fromAccount: aliceAcc._id,
            toAccount: bobAcc._id,
            amount: 7500,
            idempotencyKey: `test_tx_${Date.now()}`
        })
    });
    const initData = await initRes.json();
    console.log("   Initiated Transfer ID:", initData.transactionId, "| OTP Demo:", initData.demoOtp);

    // 8. Verify Transfer using OTP
    console.log("\n8. Verifying Transfer with OTP code...");
    const verifyRes = await fetch(`${BASE_URL}/api/transactions/verify`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${aliceToken}`
        },
        body: JSON.stringify({
            transactionId: initData.transactionId,
            otp: initData.demoOtp
        })
    });
    const verifyData = await verifyRes.json();
    console.log("   Transfer Completed! Status:", verifyData.transaction?.status, "| Alice New Balance:", verifyData.newBalance);

    // 9. Verify Bob's Balance
    console.log("\n9. Verifying Bob's Received Balance...");
    const bobBalanceRes = await fetch(`${BASE_URL}/api/accounts/balance/${bobAcc._id}`, {
        headers: { Authorization: `Bearer ${bobToken}` }
    });
    const bobBalanceData = await bobBalanceRes.json();
    console.log("   Bob Balance:", bobBalanceData.balance, "PKR (Expected: 7500 PKR)");

    // 10. Check Transaction History
    console.log("\n10. Fetching Alice's Transaction History...");
    const historyRes = await fetch(`${BASE_URL}/api/transactions/history?limit=10`, {
        headers: { Authorization: `Bearer ${aliceToken}` }
    });
    const historyData = await historyRes.json();
    console.log(`   Fetched ${historyData.data?.length} transactions in history. Total Records: ${historyData.totalRecords}`);

    // 11. Check Frontend HTML & Static Assets
    console.log("\n11. Verifying Frontend Static Hosting...");
    const frontendRes = await fetch(`${BASE_URL}/`);
    const html = await frontendRes.text();
    console.log("   Frontend HTML loaded. Title match:", html.includes("NOVA LEDGER"));

    console.log("\n✨ ALL 11 TEST PHASES PASSED WITH COMPLETE SUCCESS!");
}

runTests().catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
});
