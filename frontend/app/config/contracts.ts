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
  projectRegistry: "0xA9cB4Bed378b6A5CC240236031E269126c62DCBF" as Address,
  nativeRewardVault: "0x0EB5a9A4a7B4002F7F7807c04DB40e7319baD1EB" as Address,
  users: "0x64c2e5717a8921f509F003F25519cDE46Fc9Ade2" as Address,
  main: "0x0B5dC6664133ecf8C9DdB06518f945a8bD0D85Ae" as Address,
} as const;

// NOTE: Registration price and vault balance are READ FROM ON-CHAIN via contractUtils.ts
// Do not use hardcoded values - always call getRegistrationPrice() and getTreasuryInfo()
