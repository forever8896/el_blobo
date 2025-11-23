/**
 * Contract Deployment Configuration
 *
 * Ronin Saigon Testnet Deployments
 */

import type { Address } from "viem";

export const RONIN_SAIGON_TESTNET = {
  chainId: 2021,
  name: "Ronin Saigon Testnet",
  rpcUrl: "https://saigon-testnet.roninchain.com/rpc",
} as const;

export const DEPLOYED_CONTRACTS = {
  deployer: "0x848a2C9C56c9073DB4813c7D80Ac4B324a5A4361" as Address,
  projectRegistry: "0xf66469dC4112d002699ABA54D23f03D63bAB188E" as Address,
  nativeRewardVault: "0x89aF510f0C6f679D0f5a8e9FD6298621C89568E9" as Address,
  users: "0xAd8fD11B0c4274405bCc8026FE283c86ef969eeB" as Address,
  main: "0x41F32C871c6d5d77208E86467d8f9Aa2B254Aae1" as Address,
} as const;

// NOTE: Registration price and vault balance are READ FROM ON-CHAIN via contractUtils.ts
// Do not use hardcoded values - always call getRegistrationPrice() and getTreasuryInfo()
