/**
 * Blob Project Action Provider
 *
 * Custom AgentKit action provider for creating and managing projects on The Blob platform
 */

import { z } from "zod";
import { customActionProvider, type EvmWalletProvider } from "@coinbase/agentkit";
import type { Address } from "viem";
import { DEPLOYED_CONTRACTS } from "@/app/config/contracts";
import MainABI from "@/app/abis/Main.json";

/**
 * Schema for creating a project
 *
 * Note: This creates the project ON-CHAIN. The project should already exist in the database.
 */
const CreateProjectSchema = z.object({
  projectKey: z.string().describe("Unique project identifier (use the user's wallet address)"),
  assigneeAddress: z.string().describe("The user's wallet address who will work on this project"),
  title: z.string().describe("Project title/name"),
  description: z.string().describe("Detailed project description and deliverables"),
  budgetRON: z.number().describe("Project budget in RON tokens (will be converted to wei)"),
  durationDays: z.number().default(7).describe("Project duration in days (default 7 days)"),
}).describe("Create a project on The Blob platform - assigns work to a user with budget and deadline");

/**
 * Create the Blob Project Action Provider
 */
export function blobProjectActionProvider() {
  return customActionProvider([
    /**
     * Create a new project on-chain
     */
    {
      name: "create_project_onchain",
      description: `Create a complete project on The Blob platform (database + blockchain).

      This action AUTOMATICALLY handles the full workflow:
      1. Creates the project in the database first
      2. Gets the database ID from the response
      3. Registers the project on-chain with budget and deadline
      4. Returns success confirmation with transaction hash

      You provide:
      - Project key (user's wallet address)
      - Assignee address (user's wallet address)
      - Title, description
      - Budget in RON (auto-converted to wei)
      - Duration in days (auto-converted to timestamps)

      The tool handles the rest automatically!

      Note: The agent's wallet must be the contract owner to create projects on-chain.`,
      schema: CreateProjectSchema,
      invoke: async (walletProvider: EvmWalletProvider, args: z.infer<typeof CreateProjectSchema>) => {
        const { projectKey, assigneeAddress, title, description, budgetRON, durationDays } = args;

        console.log('📋 Creating project (database + blockchain):', {
          key: projectKey,
          assignee: assigneeAddress,
          title,
          budget: budgetRON,
          duration: durationDays
        });

        // STEP 1: Create project in database first to get the dbId
        console.log('💾 Step 1: Creating project in database...');
        let dbId: number;

        try {
          const dbResponse = await fetch('http://localhost:3000/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contractKey: projectKey,
              assigneeAddress: assigneeAddress,
              title: title,
              description: description,
            }),
          });

          if (!dbResponse.ok) {
            const errorData = await dbResponse.json();
            throw new Error(`Database creation failed: ${errorData.message || dbResponse.statusText}`);
          }

          const dbData = await dbResponse.json();
          dbId = dbData.project.id;

          console.log('✅ Project created in database with ID:', dbId);
        } catch (dbError: any) {
          console.error('❌ Failed to create project in database:', dbError);
          return `❌ Failed to create project in database: ${dbError.message}

Please make sure the database is accessible and try again.`;
        }

        const publicClient = await walletProvider.getPublicClient();
        const walletClient = await walletProvider.getWalletClient();

        // Get the wallet's address
        const [walletAddress] = await walletClient.getAddresses();

        // Convert budget from RON to wei
        const budgetWei = BigInt(Math.floor(budgetRON * 1e18));

        // Calculate deadlines
        const now = Math.floor(Date.now() / 1000);
        const beginDeadline = now; // Start now
        const endDeadline = now + (durationDays * 24 * 60 * 60); // Add duration in seconds

        // Note: We're using a zero address for the multisig since we don't have it set up yet
        // In production, you'd want to deploy a multisig contract first
        const zeroAddress = "0x0000000000000000000000000000000000000000" as Address;

        // STEP 2: Create project on-chain with the dbId from database
        console.log('⛓️  Step 2: Registering project on blockchain...');

        try {
          // Create project on-chain
          const hash = await walletClient.writeContract({
            address: DEPLOYED_CONTRACTS.main,
            abi: MainABI,
            functionName: "createProject",
            args: [
              projectKey as Address,           // Project key (unique identifier)
              assigneeAddress as Address,       // Assignee (who will work on it)
              BigInt(beginDeadline),           // Begin deadline (uint64)
              BigInt(endDeadline),             // End deadline (uint64)
              BigInt(dbId),                    // Database ID
              budgetWei,                       // Total reward in wei
              zeroAddress                       // Multisig (not implemented yet)
            ],
            account: walletAddress,
          });

          console.log('✅ Project created on-chain:', hash);

          // Wait for confirmation
          await publicClient.waitForTransactionReceipt({ hash });

          const deadlineDate = new Date(endDeadline * 1000).toISOString().split('T')[0];

          return `✅ Project "${title}" created successfully!

📋 Project Details:
- Assignee: ${assigneeAddress}
- Budget: ${budgetRON} RON
- Deadline: ${deadlineDate} (${durationDays} days)
- Database ID: ${dbId}
- Blockchain TX: ${hash}

💰 The ${budgetRON} RON will be released when you submit your work and it's approved by the council.

🚀 You can start working on this project now! Good luck!`;
        } catch (error: any) {
          console.error('❌ Failed to create project on-chain:', error);

          // Check if it's a permission error
          if (error.message?.includes('only owner')) {
            return `❌ Error: Only the contract owner can create projects on-chain. Current wallet (${walletAddress}) is not the owner.

The project can still be tracked in the database, but on-chain creation requires owner privileges.`;
          }

          return `❌ Failed to create project on-chain: ${error.message || 'Unknown error'}

The project may have been created in the database but failed to register on-chain. Please check the transaction and try again.`;
        }
      },
    },
  ]);
}
