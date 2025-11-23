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
  projectRegistry: "0xa972eC8D5A508E73237e96E13c2fCe2B9b4c07C1" as Address,
  nativeRewardVault: "0x559d4a81e50df2141Fa5Fa6e61BA1207F139a7A7" as Address,
  users: "0x78515E569aE95e861a26e49F75B21d08E582cF16" as Address,
  main: "0x46F59fF2F2ea9A2f5184B63c947346cF7171F1C3" as Address,
} as const;

// NOTE: Registration price and vault balance are READ FROM ON-CHAIN via contractUtils.ts
// Do not use hardcoded values - always call getRegistrationPrice() and getTreasuryInfo()
