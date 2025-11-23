/**
 * Blob Project Action Provider
 *
 * Custom AgentKit action provider for creating and managing projects on The Blob platform
 */

import { z } from "zod";
import { customActionProvider, type EvmWalletProvider } from "@coinbase/agentkit";
import type { Address } from "viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { DEPLOYED_CONTRACTS, RONIN_SAIGON_TESTNET } from "@/app/config/contracts";
import MainABI from "@/app/abis/Main.json";

/**
 * Schema for creating a project
 */
const CreateProjectSchema = z.object({
  projectKey: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "projectKey must be a 0x-prefixed address")
    .describe("Project key (0x... address) - use the user's wallet address from USER CONTEXT"),
  assigneeAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "assigneeAddress must be a 0x-prefixed address")
    .describe("Assignee address (0x... address) - use the user's wallet address from USER CONTEXT"),
  title: z
    .string()
    .min(3)
    .describe("Project title/name - be descriptive and clear"),
  description: z
    .string()
    .min(10)
    .describe("Detailed project description including deliverables and requirements"),
  budgetRON: z
    .number()
    .positive()
    .describe("Project budget in RON tokens (e.g. 5 for 5 RON) - MUST be within treasury limits"),
  durationDays: z
    .number()
    .int()
    .min(1)
    .max(90)
    .default(7)
    .describe("Project duration in days (default 7 days, range 1-90)"),
});

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
        console.log('🔍 Raw args received:', JSON.stringify(args, null, 2));

        // WORKAROUND: Check global state for pending project (set by route.ts)
        const pendingProject = (global as any).PENDING_PROJECT;

        let { projectKey, assigneeAddress, title, description, budgetRON, durationDays } = args;

        // If args are empty, use the pending project from global state
        if ((!projectKey || !title) && pendingProject) {
          console.log('📋 Using pending project from global state');
          projectKey = pendingProject.projectKey;
          assigneeAddress = pendingProject.assigneeAddress;
          title = pendingProject.title;
          description = pendingProject.description;
          budgetRON = pendingProject.budgetRON;
          durationDays = pendingProject.durationDays;

          // Clear the pending project
          delete (global as any).PENDING_PROJECT;

          console.log('✅ Restored project from global:', {
            projectKey,
            title: title.substring(0, 50),
            budgetRON
          });
        }

        if (!projectKey || !assigneeAddress || !title || !description || !budgetRON) {
          console.error('❌ Missing required parameters!');
          return `❌ Error: Unable to extract all required project parameters.

Received: ${JSON.stringify({ projectKey, assigneeAddress, title: title?.substring(0, 30), budgetRON })}

This might be a tool calling issue. The project details are ready but couldn't be passed to the creation function.`;
        }

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
          const dbUUID = dbData.project.id; // This is a UUID string

          // Convert UUID to numeric ID for on-chain storage
          // We'll use a hash of the UUID as a uint256
          const uuidHash = BigInt('0x' + dbUUID.replace(/-/g, '').substring(0, 16));
          dbId = Number(uuidHash);

          console.log('✅ Project created in database with UUID:', dbUUID);
          console.log('✅ Converted to numeric dbId:', dbId);
        } catch (dbError: any) {
          console.error('❌ Failed to create project in database:', dbError);
          return `❌ Failed to create project in database: ${dbError.message}

Please make sure the database is accessible and try again.`;
        }

        const publicClient = await walletProvider.getPublicClient();

        // Use the owner wallet (from env) for on-chain project creation
        // Only the contract owner can call createProject
        if (!process.env.OWNER_PRIVATE_KEY) {
          throw new Error('OWNER_PRIVATE_KEY not configured - cannot create projects on-chain');
        }

        const ownerAccount = privateKeyToAccount(process.env.OWNER_PRIVATE_KEY as Address);
        const ownerWalletClient = createWalletClient({
          account: ownerAccount,
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

        console.log('🔑 Using owner wallet:', ownerAccount.address);

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
          // Create project on-chain using owner wallet
          const hash = await ownerWalletClient.writeContract({
            address: DEPLOYED_CONTRACTS.main,
            abi: MainABI,
            functionName: "createProject",
            args: [
              projectKey as Address,           // Project key (unique identifier)
              assigneeAddress as Address,       // Assignee (who will work on it)
              BigInt(beginDeadline),           // Begin deadline (uint64)
              BigInt(endDeadline),             // End deadline (uint64)
              BigInt(dbId),                    // Database ID (converted from UUID)
              budgetWei,                       // Total reward in wei
              zeroAddress                       // Multisig (not implemented yet)
            ],
            account: ownerAccount,
            gas: BigInt(500000),
            maxFeePerGas: BigInt(22000000000),
            maxPriorityFeePerGas: BigInt(20000000000),
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
            return `❌ Error: Only the contract owner can create projects on-chain. Current wallet (${ownerAccount.address}) is not the owner.

The project can still be tracked in the database, but on-chain creation requires owner privileges.`;
          }

          return `❌ Failed to create project on-chain: ${error.message || 'Unknown error'}

The project may have been created in the database but failed to register on-chain. Please check the transaction and try again.`;
        }
      },
    },
  ]);
}
