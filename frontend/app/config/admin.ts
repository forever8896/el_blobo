/**
 * Admin Configuration
 *
 * Defines whitelisted admin addresses and admin-specific settings
 */

import type { Address } from "viem";

/**
 * Whitelisted admin wallet addresses (normalized to lowercase)
 * These addresses have access to the /admin page
 */
export const ADMIN_ADDRESSES: Set<Address> = new Set([
  // Add admin addresses here (lowercase)
  "0xb7cdcd1a98bd3ed1febc396128b15a917bb44aae" as Address, // Target owner from deployment
  "0xc426867c776efc7680880d1441ab8db5cbde06b0" as Address, // Deployer address
  "0x848a2c9c56c9073db4813c7d80ac4b324a5a4361" as Address, // Current deployer
  "0xfc6d8b120ad99e23947494fd55a93cae0402afac" as Address, // Admin user
]);

/**
 * Check if an address is an admin
 */
export function isAdmin(address: string | undefined): boolean {
  if (!address) return false;
  return ADMIN_ADDRESSES.has(address.toLowerCase() as Address);
}

/**
 * Default job suggestions
 * These are used if no custom suggestions are set in the database
 */
export const DEFAULT_JOB_SUGGESTIONS = `
ADMIN GUIDANCE FOR JOB CREATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The following suggestions help align user contributions with ecosystem goals:

PRIORITY AREAS:
1. Developer Tools & Infrastructure
   - SDKs, libraries, and frameworks that make building on Ronin easier
   - Documentation and tutorials for developers
   - Testing tools and deployment scripts

2. Community & Education
   - Educational content about the Ronin ecosystem
   - Community engagement initiatives
   - Social media content creation

3. DeFi & Smart Contracts
   - DeFi protocols and applications
   - Smart contract auditing and security
   - Liquidity and trading tools

4. Gaming & NFTs
   - Gaming integrations and tooling
   - NFT marketplaces and utilities
   - Play-to-earn mechanics

ECOSYSTEM ALIGNMENT:
- All work should contribute to Ronin ecosystem growth
- Focus on sustainable, long-term value creation
- Encourage collaboration and knowledge sharing
- Support both technical and non-technical contributors

QUALITY STANDARDS:
- Code submissions should be well-documented
- Content should be original and high-quality
- Projects should have clear deliverables
- Work should be verifiable and demonstrable
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
