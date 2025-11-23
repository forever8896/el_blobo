import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";
import { parseEther } from "viem";

dotenv.config();

async function demonstrateWalletUsage() {
  console.log("=".repeat(60));
  console.log("CDP Wallet Selection Demo");
  console.log("=".repeat(60));

  const cdp = new CdpClient();

  // Get wallet addresses from .env
  const wallet1Address = process.env.CDP_WALLET_1_ADDRESS!;
  const wallet2Address = process.env.CDP_WALLET_2_ADDRESS!;
  const wallet3Address = process.env.CDP_WALLET_3_ADDRESS!;

  console.log("\n📋 Available Wallets:");
  console.log(`   Wallet 1: ${wallet1Address}`);
  console.log(`   Wallet 2: ${wallet2Address}`);
  console.log(`   Wallet 3: ${wallet3Address}`);

  // Example 1: Use Wallet 1 to send a transaction
  console.log("\n" + "=".repeat(60));
  console.log("Example 1: Using Wallet 1 to send a transaction");
  console.log("=".repeat(60));

  try {
    const tx1 = await cdp.evm.sendTransaction({
      address: wallet1Address, // ← This selects which wallet to use!
      transaction: {
        to: "0x0000000000000000000000000000000000000000",
        value: parseEther("0.000001"),
      },
      network: "base-sepolia",
    });
    console.log(`✅ Wallet 1 sent transaction: ${tx1.transactionHash}`);
  } catch (error: any) {
    console.log(`⚠️  Transaction failed: ${error.message}`);
  }

  // Example 2: Use Wallet 2 to send a different transaction
  console.log("\n" + "=".repeat(60));
  console.log("Example 2: Using Wallet 2 to send a transaction");
  console.log("=".repeat(60));

  try {
    const tx2 = await cdp.evm.sendTransaction({
      address: wallet2Address, // ← Different address = different wallet!
      transaction: {
        to: "0x0000000000000000000000000000000000000001",
        value: parseEther("0.000001"),
      },
      network: "base-sepolia",
    });
    console.log(`✅ Wallet 2 sent transaction: ${tx2.transactionHash}`);
  } catch (error: any) {
    console.log(`⚠️  Transaction failed: ${error.message}`);
  }

  // Example 3: Use Wallet 3 on a different network (Ronin testnet)
  console.log("\n" + "=".repeat(60));
  console.log("Example 3: Using Wallet 3 on Ronin Testnet (Saigon)");
  console.log("=".repeat(60));

  // Note: This wallet has the SAME address on all EVM chains
  // but you need to specify which network to use
  console.log(`   Same address on Ronin: ${wallet3Address}`);
  console.log(`   (Would need to fund it on Ronin first)`);

  // Example 4: Dynamic wallet selection based on logic
  console.log("\n" + "=".repeat(60));
  console.log("Example 4: Dynamic Wallet Selection");
  console.log("=".repeat(60));

  function selectWallet(walletNumber: 1 | 2 | 3): string {
    const wallets = {
      1: wallet1Address,
      2: wallet2Address,
      3: wallet3Address,
    };
    return wallets[walletNumber];
  }

  // Use wallet based on some business logic
  const selectedWallet = selectWallet(2); // Choose wallet 2
  console.log(`   Selected wallet for this operation: ${selectedWallet}`);

  // Example 5: Using all wallets in a loop
  console.log("\n" + "=".repeat(60));
  console.log("Example 5: Batch Operations with All Wallets");
  console.log("=".repeat(60));

  const allWallets = [wallet1Address, wallet2Address, wallet3Address];

  for (let i = 0; i < allWallets.length; i++) {
    const walletAddress = allWallets[i];
    console.log(`\n   Processing Wallet ${i + 1}: ${walletAddress}`);

    // You could send transactions, check balances, etc.
    // Each iteration uses a different wallet!
  }

  console.log("\n" + "=".repeat(60));
  console.log("Key Takeaways:");
  console.log("=".repeat(60));
  console.log(`
1. ALL wallets are managed by your CDP_WALLET_SECRET
2. You select which wallet to use by specifying the ADDRESS
3. The same address works on ALL EVM chains (but needs separate funding)
4. You can use wallets dynamically based on your app's logic
5. Each wallet operates independently with its own balance

Example Use Cases:
- Wallet 1: User rewards/airdrops
- Wallet 2: Game treasury/fees
- Wallet 3: NFT minting operations
  `);
}

// Run the demo
demonstrateWalletUsage()
  .then(() => {
    console.log("\n✅ Demo completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Demo failed:", error);
    process.exit(1);
  });
