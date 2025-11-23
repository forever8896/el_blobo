/**
 * Blob Registration Action Provider
 *
 * Custom AgentKit action provider for user registration on The Blob platform
 */

import { z } from "zod";
import { customActionProvider, type EvmWalletProvider } from "@coinbase/agentkit";
import type { Address } from "viem";
import { DEPLOYED_CONTRACTS } from "@/app/config/contracts";
import MainABI from "@/app/abis/Main.json";
import VaultABI from "@/app/abis/NativeRewardVault.json";

/**
 * Schema for checking user registration status
 */
const CheckRegistrationSchema = z.object({
  userAddress: z.string().describe("The user's wallet address to check"),
}).describe("Check if a user is registered on The Blob platform");

/**
 * Schema for getting registration price
 */
const GetRegistrationPriceSchema = z.object({}).describe(
  "Get the current registration price for The Blob platform"
);

/**
 * Schema for registering a user
 */
const RegisterUserSchema = z.object({
  userAddress: z.string().describe("The user's wallet address (must be msg.sender)"),
  bigSponsor: z
    .string()
    .optional()
    .describe("Big sponsor address (optional, use 0x0000000000000000000000000000000000000000 for none)"),
  smallSponsor: z
    .string()
    .optional()
    .describe("Small sponsor address (optional, use 0x0000000000000000000000000000000000000000 for none)"),
}).describe("Register a user on The Blob platform with optional sponsors");

/**
 * Create the Blob Registration Action Provider
 */
export function blobRegistrationActionProvider() {
  return customActionProvider([
    /**
     * Check if user is registered
     */
    {
      name: "check_registration",
      description:
        "Check if a wallet address is registered on The Blob platform. Returns true if registered, false otherwise.",
      schema: CheckRegistrationSchema,
      invoke: async (walletProvider: EvmWalletProvider, args: z.infer<typeof CheckRegistrationSchema>) => {
        const { userAddress } = args;

        const publicClient = await walletProvider.getPublicClient();

        const isRegistered = await publicClient.readContract({
          address: DEPLOYED_CONTRACTS.main,
          abi: MainABI,
          functionName: "isRegistered",
          args: [userAddress as Address],
        });

        return `✅ Registration status for ${userAddress}: ${isRegistered ? 'REGISTERED' : 'NOT REGISTERED'}`;
      },
    },

    /**
     * Get registration price
     */
    {
      name: "get_registration_price",
      description:
        "Get the current registration price for The Blob platform. Returns the price in wei and formatted in RON.",
      schema: GetRegistrationPriceSchema,
      invoke: async (walletProvider: EvmWalletProvider, _args: Record<string, never>) => {
        const publicClient = await walletProvider.getPublicClient();

        const priceWei = await publicClient.readContract({
          address: DEPLOYED_CONTRACTS.nativeRewardVault,
          abi: VaultABI,
          functionName: "registrationPrice",
        });

        const priceRon = Number(priceWei as bigint) / 1e18;

        return `💰 Current registration price: ${priceRon} RON (${(priceWei as bigint).toString()} wei)`;
      },
    },

    /**
     * Register user
     */
    {
      name: "register_user",
      description:
        "Register a user on The Blob platform. Requires payment of the registration fee. Optionally accepts sponsor addresses for referral system.",
      schema: RegisterUserSchema,
      invoke: async (walletProvider: EvmWalletProvider, args: z.infer<typeof RegisterUserSchema>) => {
        const { userAddress, bigSponsor, smallSponsor } = args;

        const publicClient = await walletProvider.getPublicClient();
        const walletClient = await walletProvider.getWalletClient();

        // Get registration price
        const registrationPrice = await publicClient.readContract({
          address: DEPLOYED_CONTRACTS.nativeRewardVault,
          abi: VaultABI,
          functionName: "registrationPrice",
        });

        // Use zero address for optional sponsors
        const zeroAddress = "0x0000000000000000000000000000000000000000" as Address;
        const bigSponsorAddr = (bigSponsor as Address) || zeroAddress;
        const smallSponsorAddr = (smallSponsor as Address) || zeroAddress;

        // Send registration transaction
        const hash = await walletClient.writeContract({
          address: DEPLOYED_CONTRACTS.main,
          abi: MainABI,
          functionName: "registerUser",
          args: [userAddress as Address, bigSponsorAddr, smallSponsorAddr],
          value: registrationPrice as bigint,
          account: userAddress as Address,
        });

        // Wait for confirmation
        await publicClient.waitForTransactionReceipt({ hash });

        return `✅ Successfully registered user ${userAddress} on The Blob platform!\nTransaction: ${hash}\nRegistration Price: ${Number(registrationPrice as bigint) / 1e18} RON`;
      },
    },
  ]);
}
