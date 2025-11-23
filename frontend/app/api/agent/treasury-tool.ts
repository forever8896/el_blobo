import { tool } from 'ai';
import { z } from 'zod';
import { getTreasuryInfo, formatTreasuryForAgent } from '@/app/lib/contractUtils';

/**
 * Treasury balance tool for the AI agent
 * Allows the agent to fetch real-time on-chain treasury data when asked
 */
export const getTreasuryBalanceTool = tool({
  description: `Fetches the current real-time balance of the treasury vault from the Ronin blockchain.

  Call this tool IMMEDIATELY when the user asks ANY question about:
  - "what is the balance"
  - "treasury balance"
  - "how much money"
  - "available funds"
  - "can we afford"
  - "budget"

  This returns LIVE on-chain data in RON (Ronin tokens).`,

  parameters: z.object({}), // No parameters needed

  execute: async () => {
    console.log('🏦 Treasury tool called! Fetching live blockchain data...');

    try {
      // Fetch real-time treasury data from blockchain
      const treasuryInfo = await getTreasuryInfo();

      console.log('✅ Treasury data fetched:', {
        total: treasuryInfo.totalAssets,
        available: treasuryInfo.availableAssets,
        allocated: treasuryInfo.allocatedAssets,
      });

      // Format for agent understanding
      const formattedContext = formatTreasuryForAgent(treasuryInfo);

      const result = {
        success: true,
        totalAssets: `${treasuryInfo.totalAssets.toFixed(4)} RON`,
        availableAssets: `${treasuryInfo.availableAssets.toFixed(4)} RON`,
        allocatedAssets: `${treasuryInfo.allocatedAssets.toFixed(4)} RON`,
        utilizationRate: `${treasuryInfo.utilizationRate.toFixed(1)}%`,
        message: `Treasury vault contains ${treasuryInfo.totalAssets.toFixed(4)} RON total, with ${treasuryInfo.availableAssets.toFixed(4)} RON available for new projects.`,
        fullDetails: formattedContext,
      };

      console.log('📤 Returning treasury data to agent:', result.message);
      return result;
    } catch (error) {
      console.error('❌ Error fetching treasury in tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch treasury info',
        message: 'Unable to fetch treasury data from blockchain. The contract may not be accessible.'
      };
    }
  },
} as any);
