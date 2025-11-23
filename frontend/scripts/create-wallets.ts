import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

interface WalletInfo {
  id: number;
  address: string;
  network: string;
  type: string;
  createdAt: string;
}

async function createWallets() {
  try {
    console.log("Initializing CDP Client...");
    const cdp = new CdpClient();

    const wallets: WalletInfo[] = [];
    const walletsDir = path.join(process.cwd(), "wallets-data");

    // Create wallets directory if it doesn't exist
    if (!fs.existsSync(walletsDir)) {
      fs.mkdirSync(walletsDir, { recursive: true });
    }

    console.log("\n🚀 Creating 3 EVM Server Wallets on Base Sepolia...\n");

    // Create 3 wallets
    for (let i = 1; i <= 3; i++) {
      console.log(`Creating Wallet ${i}...`);

      const account = await cdp.evm.createAccount();

      const walletInfo: WalletInfo = {
        id: i,
        address: account.address,
        network: "base-sepolia",
        type: "EVM",
        createdAt: new Date().toISOString(),
      };

      wallets.push(walletInfo);

      console.log(`✅ Wallet ${i} created successfully!`);
      console.log(`   Address: ${account.address}`);
      console.log(`   Network: base-sepolia\n`);

      // Optional: Request testnet funds for each wallet
      try {
        console.log(`   Requesting testnet ETH for Wallet ${i}...`);
        const faucetResponse = await cdp.evm.requestFaucet({
          address: account.address,
          network: "base-sepolia",
          token: "eth",
        });
        console.log(`   💰 Faucet transaction: https://sepolia.basescan.org/tx/${faucetResponse.transactionHash}\n`);
      } catch (faucetError: any) {
        console.log(`   ⚠️  Faucet request failed (rate limit or other issue): ${faucetError.message}\n`);
      }
    }

    // Save all wallet information to a JSON file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const walletsFilePath = path.join(walletsDir, `wallets-${timestamp}.json`);

    fs.writeFileSync(
      walletsFilePath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          network: "base-sepolia",
          wallets: wallets,
        },
        null,
        2
      )
    );

    console.log("=" .repeat(60));
    console.log("✨ All wallets created successfully!");
    console.log("=" .repeat(60));
    console.log(`📁 Wallet information saved to: ${walletsFilePath}`);
    console.log("\n📊 Summary:");
    console.log(`   Total wallets created: ${wallets.length}`);
    console.log(`   Network: base-sepolia`);
    console.log("\n💡 Important Notes:");
    console.log("   - These wallets are managed by your CDP Wallet Secret");
    console.log("   - You can retrieve them anytime using the CDP SDK");
    console.log("   - Wallet addresses are stored in the JSON file");
    console.log("   - Keep your CDP_WALLET_SECRET secure!");
    console.log("=" .repeat(60));

    // Also create a simple CSV for easy viewing
    const csvPath = path.join(walletsDir, `wallets-${timestamp}.csv`);
    const csvContent = [
      "ID,Address,Network,Type,Created At",
      ...wallets.map(w => `${w.id},${w.address},${w.network},${w.type},${w.createdAt}`)
    ].join("\n");

    fs.writeFileSync(csvPath, csvContent);
    console.log(`📄 CSV file saved to: ${csvPath}\n`);

    return wallets;
  } catch (error: any) {
    console.error("❌ Error creating wallets:", error.message);
    if (error.response) {
      console.error("API Response:", error.response.data);
    }
    process.exit(1);
  }
}

// Run the script
createWallets()
  .then(() => {
    console.log("✅ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
