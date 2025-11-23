import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";

dotenv.config();

/**
 * WalletManager - A helper class to manage multiple CDP wallets
 *
 * This shows how you would typically organize wallet usage in your app
 */
export class WalletManager {
  private cdp: CdpClient;
  private wallets: Map<string, string>;

  constructor() {
    this.cdp = new CdpClient();

    // Load wallet addresses from environment
    this.wallets = new Map([
      ['treasury', process.env.CDP_WALLET_1_ADDRESS!],
      ['rewards', process.env.CDP_WALLET_2_ADDRESS!],
      ['operations', process.env.CDP_WALLET_3_ADDRESS!],
    ]);
  }

  /**
   * Get wallet address by role/name
   */
  getWalletAddress(walletName: 'treasury' | 'rewards' | 'operations'): `0x${string}` {
    const address = this.wallets.get(walletName);
    if (!address) {
      throw new Error(`Wallet ${walletName} not found`);
    }
    return address as `0x${string}`;
  }

  /**
   * Send tokens from a specific wallet
   */
  async sendFromWallet(
    walletName: 'treasury' | 'rewards' | 'operations',
    to: `0x${string}`,
    amount: bigint,
    network: string = 'base-sepolia'
  ) {
    const fromAddress = this.getWalletAddress(walletName);

    console.log(`Sending from ${walletName} wallet (${fromAddress})`);

    const result = await this.cdp.evm.sendTransaction({
      address: fromAddress, // ← This is how you choose the wallet!
      transaction: {
        to: to,
        value: amount,
      },
      network: network as any,
    });

    return result;
  }

  /**
   * Get balance of a specific wallet
   */
  async getBalance(
    walletName: 'treasury' | 'rewards' | 'operations',
    network: string = 'base-sepolia'
  ) {
    const address = this.getWalletAddress(walletName);

    // You would use viem or another library to check balance
    console.log(`Checking balance for ${walletName}: ${address} on ${network}`);

    // Implementation depends on your needs
    return address;
  }

  /**
   * List all available wallets
   */
  listWallets() {
    console.log("\n📋 Available Wallets:");
    this.wallets.forEach((address, name) => {
      console.log(`   ${name}: ${address}`);
    });
  }
}

// Example usage
async function main() {
  console.log("=".repeat(60));
  console.log("Wallet Manager Demo");
  console.log("=".repeat(60));

  const walletManager = new WalletManager();

  // List all wallets
  walletManager.listWallets();

  // Example: Send rewards from the rewards wallet
  console.log("\n" + "=".repeat(60));
  console.log("Scenario 1: Sending rewards to a user");
  console.log("=".repeat(60));

  try {
    const userAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
    const rewardAmount = BigInt(1000000000000000); // 0.001 ETH

    console.log(`Sending ${rewardAmount} wei to ${userAddress}`);

    const tx = await walletManager.sendFromWallet(
      'rewards', // ← Choose which wallet to use by name!
      userAddress,
      rewardAmount
    );

    console.log(`✅ Reward sent! TX: ${tx.transactionHash}`);
  } catch (error: any) {
    console.log(`⚠️  Failed: ${error.message}`);
  }

  // Example: Treasury operations
  console.log("\n" + "=".repeat(60));
  console.log("Scenario 2: Treasury payment");
  console.log("=".repeat(60));

  try {
    const vendorAddress = "0x0000000000000000000000000000000000000001";
    const paymentAmount = BigInt(5000000000000000); // 0.005 ETH

    console.log(`Paying vendor ${vendorAddress}`);

    const tx = await walletManager.sendFromWallet(
      'treasury', // ← Different wallet for treasury operations!
      vendorAddress,
      paymentAmount
    );

    console.log(`✅ Payment sent! TX: ${tx.transactionHash}`);
  } catch (error: any) {
    console.log(`⚠️  Failed: ${error.message}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("Key Points:");
  console.log("=".repeat(60));
  console.log(`
✓ One CDP_WALLET_SECRET controls all wallets
✓ You choose which wallet by specifying its ADDRESS
✓ Organize wallets by purpose (treasury, rewards, etc.)
✓ Each wallet has its own balance and transaction history
✓ Same address works across all EVM chains

This is how you would integrate it in your app:
1. Store wallet addresses in .env (already done!)
2. Create a WalletManager class (this file)
3. Use walletManager.sendFromWallet() to choose which wallet
4. The CDP SDK handles all the signing automatically
  `);
}

if (require.main === module) {
  main()
    .then(() => {
      console.log("\n✅ Demo completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Demo failed:", error);
      process.exit(1);
    });
}
