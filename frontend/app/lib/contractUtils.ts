/**
 * Contract Utility Functions
 *
 * Helper functions for interacting with the deployed smart contracts
 */

import { createPublicClient, createWalletClient, http, custom, formatEther } from "viem";
import type { Address, WalletClient, PublicClient } from "viem";
import { RONIN_SAIGON_TESTNET, DEPLOYED_CONTRACTS } from "@/app/config/contracts";
import MainABI from "@/app/abis/Main.json";
import VaultABI from "@/app/abis/NativeRewardVault.json";

/**
 * Create a public client for reading from the blockchain
 */
export function getPublicClient(): PublicClient {
  return createPublicClient({
    chain: {
      id: RONIN_SAIGON_TESTNET.chainId,
      name: RONIN_SAIGON_TESTNET.name,
      nativeCurrency: { name: "RON", symbol: "RON", decimals: 18 },
      rpcUrls: {
        default: { http: [RONIN_SAIGON_TESTNET.rpcUrl] },
        public: { http: [RONIN_SAIGON_TESTNET.rpcUrl] },
      },
    },
    transport: http(RONIN_SAIGON_TESTNET.rpcUrl),
  });
}

/**
 * Get registration price from the vault contract
 */
export async function getRegistrationPrice(): Promise<bigint> {
  const publicClient = getPublicClient();

  try {
    const price = await publicClient.readContract({
      address: DEPLOYED_CONTRACTS.nativeRewardVault,
      abi: VaultABI,
      functionName: "registrationPrice",
    });

    return price as bigint;
  } catch (error) {
    console.error("Error reading registration price:", error);
    throw new Error("Failed to fetch registration price");
  }
}

/**
 * Get registration price in human-readable format (ETH)
 */
export async function getRegistrationPriceFormatted(): Promise<string> {
  const price = await getRegistrationPrice();
  return formatEther(price);
}

/**
 * Check if a user is registered
 */
export async function isUserRegistered(userAddress: Address): Promise<boolean> {
  const publicClient = getPublicClient();

  try {
    const isRegistered = await publicClient.readContract({
      address: DEPLOYED_CONTRACTS.main,
      abi: MainABI,
      functionName: "isRegistered",
      args: [userAddress],
    });

    return isRegistered as boolean;
  } catch (error) {
    console.error("Error checking registration status:", error);
    return false;
  }
}

/**
 * Get vault balance for reward distribution
 */
export async function getVaultBalance(): Promise<{ balanceWei: bigint; balanceFormatted: string }> {
  const publicClient = getPublicClient();

  try {
    const balance = await publicClient.getBalance({
      address: DEPLOYED_CONTRACTS.nativeRewardVault,
    });

    return {
      balanceWei: balance,
      balanceFormatted: formatEther(balance)
    };
  } catch (error) {
    console.error("Error reading vault balance:", error);
    throw new Error("Failed to fetch vault balance");
  }
}

/**
 * Register a user with optional sponsors
 *
 * @param walletClient - The wallet client to send the transaction
 * @param userAddress - The user's wallet address
 * @param bigSponsor - Big sponsor address (optional, use 0x0 for none)
 * @param smallSponsor - Small sponsor address (optional, use 0x0 for none)
 */
export async function registerUser(
  walletClient: WalletClient,
  userAddress: Address,
  bigSponsor?: Address,
  smallSponsor?: Address
): Promise<Address> {
  // Get the registration price
  const registrationPrice = await getRegistrationPrice();

  // Use zero address for optional sponsors
  const zeroAddress = "0x0000000000000000000000000000000000000000" as Address;
  const bigSponsorAddr = bigSponsor || zeroAddress;
  const smallSponsorAddr = smallSponsor || zeroAddress;

  try {
    console.log('Calling registerUser with:', {
      contract: DEPLOYED_CONTRACTS.main,
      user: userAddress,
      bigSponsor: bigSponsorAddr,
      smallSponsor: smallSponsorAddr,
      value: registrationPrice.toString(),
    });

    // Send the registration transaction directly
    const hash = await walletClient.writeContract({
      address: DEPLOYED_CONTRACTS.main,
      abi: MainABI,
      functionName: "registerUser",
      args: [userAddress, bigSponsorAddr, smallSponsorAddr],
      value: registrationPrice,
      account: userAddress,
      chain: {
        id: RONIN_SAIGON_TESTNET.chainId,
        name: RONIN_SAIGON_TESTNET.name,
        nativeCurrency: { name: "RON", symbol: "RON", decimals: 18 },
        rpcUrls: {
          default: { http: [RONIN_SAIGON_TESTNET.rpcUrl] },
          public: { http: [RONIN_SAIGON_TESTNET.rpcUrl] },
        },
      },
    });

    console.log('Transaction submitted:', hash);
    return hash;
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
}

/**
 * Wait for a transaction to be confirmed
 */
export async function waitForTransaction(hash: Address): Promise<void> {
  const publicClient = getPublicClient();
  await publicClient.waitForTransactionReceipt({ hash });
}

/**
 * Get contract information for display
 */
export function getContractInfo() {
  return {
    main: DEPLOYED_CONTRACTS.main,
    vault: DEPLOYED_CONTRACTS.nativeRewardVault,
    users: DEPLOYED_CONTRACTS.users,
    projectRegistry: DEPLOYED_CONTRACTS.projectRegistry,
  };
}

/**
 * Get current treasury balance and allocation info
 */
export async function getTreasuryInfo() {
  const publicClient = getPublicClient();

  try {
    // Read vault data
    const [totalAssets, totalShares, allocatedShares, unallocatedShares] = await Promise.all([
      publicClient.readContract({
        address: DEPLOYED_CONTRACTS.nativeRewardVault,
        abi: VaultABI,
        functionName: 'totalAssets',
      }),
      publicClient.readContract({
        address: DEPLOYED_CONTRACTS.nativeRewardVault,
        abi: VaultABI,
        functionName: 'totalSupply',
      }),
      publicClient.readContract({
        address: DEPLOYED_CONTRACTS.nativeRewardVault,
        abi: VaultABI,
        functionName: 'totalAllocatedShares',
      }),
      publicClient.readContract({
        address: DEPLOYED_CONTRACTS.nativeRewardVault,
        abi: VaultABI,
        functionName: 'unallocatedShares',
      }),
    ]);

    // Convert to human-readable format
    const totalRON = parseFloat(formatEther(totalAssets as bigint));
    const totalSharesNum = Number(totalShares);
    const allocatedSharesNum = Number(allocatedShares);
    const unallocatedSharesNum = Number(unallocatedShares);

    const allocatedRON = totalSharesNum > 0
      ? (totalRON * allocatedSharesNum) / totalSharesNum
      : 0;
    const availableRON = totalSharesNum > 0
      ? (totalRON * unallocatedSharesNum) / totalSharesNum
      : totalRON;

    return {
      totalAssets: totalRON,
      allocatedAssets: allocatedRON,
      availableAssets: availableRON,
      totalShares: totalSharesNum,
      allocatedShares: allocatedSharesNum,
      unallocatedShares: unallocatedSharesNum,
      utilizationRate: totalRON > 0 ? (allocatedRON / totalRON) * 100 : 0,
    };
  } catch (error) {
    console.error('Error reading treasury info:', error);
    throw error;
  }
}

/**
 * Get user's vault shares
 */
export async function getUserShares(userAddress: Address) {
  const publicClient = getPublicClient();

  try {
    const shares = await publicClient.readContract({
      address: DEPLOYED_CONTRACTS.nativeRewardVault,
      abi: VaultABI,
      functionName: 'userShares',
      args: [userAddress],
    });

    return Number(shares);
  } catch (error) {
    console.error('Error reading user shares:', error);
    throw error;
  }
}

/**
 * Calculate recommended project budget based on available treasury
 * Returns safe budget ranges considering treasury health
 */
export function calculateBudgetRecommendations(treasuryInfo: Awaited<ReturnType<typeof getTreasuryInfo>>) {
  const { availableAssets, utilizationRate } = treasuryInfo;

  // Safety thresholds
  const MIN_RESERVE_PERCENTAGE = 20; // Keep 20% in reserve
  const MAX_SINGLE_PROJECT_PERCENTAGE = 15; // Max 15% of total for one project

  // Calculate safe available amount
  const safeAvailable = availableAssets * (1 - MIN_RESERVE_PERCENTAGE / 100);

  // Calculate budget tiers
  const maxBudget = Math.min(
    safeAvailable,
    treasuryInfo.totalAssets * (MAX_SINGLE_PROJECT_PERCENTAGE / 100)
  );

  return {
    // Conservative budgets for low-risk projects
    conservative: {
      min: Math.max(0.01, maxBudget * 0.05), // 5% of max or 0.01 RON
      max: Math.max(0.05, maxBudget * 0.10), // 10% of max or 0.05 RON
    },
    // Moderate budgets for standard projects
    moderate: {
      min: Math.max(0.05, maxBudget * 0.10),
      max: Math.max(0.15, maxBudget * 0.30),
    },
    // Premium budgets for high-value projects
    premium: {
      min: Math.max(0.15, maxBudget * 0.30),
      max: Math.max(0.30, maxBudget * 0.60),
    },
    // Absolute maximum
    absolute: {
      max: maxBudget,
    },
    // Context
    treasuryHealth: {
      total: treasuryInfo.totalAssets,
      available: safeAvailable,
      utilizationRate,
      status:
        utilizationRate > 80 ? 'critical' :
        utilizationRate > 60 ? 'high' :
        utilizationRate > 40 ? 'moderate' :
        'healthy',
    },
  };
}

/**
 * Format treasury info for agent context
 */
export function formatTreasuryForAgent(treasuryInfo: Awaited<ReturnType<typeof getTreasuryInfo>>) {
  const budgets = calculateBudgetRecommendations(treasuryInfo);

  return `
TREASURY STATUS (Real-time on-chain data from Ronin Saigon Testnet):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Treasury: ${treasuryInfo.totalAssets.toFixed(4)} RON
Already Allocated: ${treasuryInfo.allocatedAssets.toFixed(4)} RON (${treasuryInfo.utilizationRate.toFixed(1)}% used)
Available for Projects: ${treasuryInfo.availableAssets.toFixed(4)} RON

Treasury Health: ${budgets.treasuryHealth.status.toUpperCase()}
${budgets.treasuryHealth.status === 'critical' ? '⚠️ CRITICAL: Treasury nearly depleted - suggest only tiny projects or focus on fundraising' :
  budgets.treasuryHealth.status === 'high' ? '⚠️ HIGH UTILIZATION: Be very conservative with budgets' :
  budgets.treasuryHealth.status === 'moderate' ? '✓ MODERATE: Standard project budgets acceptable' :
  '✓ HEALTHY: Can support premium projects'}

BUDGET RECOMMENDATIONS (in RON):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 Conservative Projects: ${budgets.conservative.min.toFixed(4)} - ${budgets.conservative.max.toFixed(4)} RON
   (Small tasks, quick turnaround, proven contributors)

🟡 Moderate Projects: ${budgets.moderate.min.toFixed(4)} - ${budgets.moderate.max.toFixed(4)} RON
   (Standard features, experienced builders, clear deliverables)

🔴 Premium Projects: ${budgets.premium.min.toFixed(4)} - ${budgets.premium.max.toFixed(4)} RON
   (High-impact work, expert skills, strategic value)

🚫 ABSOLUTE MAX: ${budgets.absolute.max.toFixed(4)} RON per project
   (Reserve for exceptional opportunities only)

CRITICAL RULES FOR BUDGETING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. NEVER promise more than ${budgets.absolute.max.toFixed(4)} RON for a single project
2. ALWAYS verify available budget before suggesting amounts
3. Be transparent: "Based on current treasury (${treasuryInfo.availableAssets.toFixed(4)} RON available)..."
4. If treasury is low, suggest smaller projects OR discuss fundraising
5. Factor in treasury health when evaluating project scope
6. Remember: Allocated funds are ALREADY PROMISED to other projects

Example phrasing:
"I checked the treasury and we have ${treasuryInfo.availableAssets.toFixed(4)} RON available. For this project, I'm thinking ${budgets.moderate.min.toFixed(4)}-${budgets.moderate.max.toFixed(4)} RON would be fair. What do you think?"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}
