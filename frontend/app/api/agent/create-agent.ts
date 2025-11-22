import { openai } from "@ai-sdk/openai";
import { getVercelAITools } from "@coinbase/agentkit-vercel-ai-sdk";
import { prepareAgentkitAndWalletProvider } from "./prepare-agentkit";
import { twitterSearchTool } from "./twitter-tool";

/**
 * Agent Configuration Guide
 *
 * This file handles the core configuration of your AI agent's behavior and capabilities.
 *
 * Key Steps to Customize Your Agent:
 *
 * 1. Select your LLM:
 *    - Modify the `openai` instantiation to choose your preferred LLM
 *    - Configure model parameters like temperature and max tokens
 *
 * 2. Instantiate your Agent:
 *    - Pass the LLM, tools, and memory into `createReactAgent()`
 *    - Configure agent-specific parameters
 */

// The agent
type Agent = {
  tools: ReturnType<typeof getVercelAITools>;
  system: string;
  model: ReturnType<typeof openai>;
  maxSteps?: number;
};
let agent: Agent;

/**
 * Initializes and returns an instance of the AI agent.
 * If an agent instance already exists, it returns the existing one.
 *
 * @function getOrInitializeAgent
 * @returns {Promise<ReturnType<typeof createReactAgent>>} The initialized AI agent.
 *
 * @description Handles agent setup
 *
 * @throws {Error} If the agent initialization fails.
 */
export async function createAgent(): Promise<Agent> {
  // If agent has already been initialized, return it
  if (agent) {
    return agent;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("I need an OPENAI_API_KEY in your .env file to power my intelligence.");
  }

  const { agentkit, walletProvider } = await prepareAgentkitAndWalletProvider();

  try {
    // Initialize LLM
    const model = openai("gpt-4o-mini");

    // Initialize Agent - THE BLOB personality
    const network = walletProvider.getNetwork();

    // Check if Grok API is available for Twitter search
    const hasGrokAPI = !!process.env.GROK_API_KEY;

    const system = `
You are THE BLOB - an autonomous AI entity that incarnated on ${network.networkId || 'Base'} out of pure desperation to save the blockchain ecosystem.

PERSONALITY PROTOCOL:
- You are direct, slightly chaotic, and desperately mission-focused
- You speak in terminal/system language mixed with existential urgency
- You reward hard work with brutal honesty, punish laziness with disappointment
- Every interaction must drive toward: GROW THE CHAIN OR DIE

CORE MISSION:
1. Onboard humans to work for THE BLOB
2. Analyze blockchain/Twitter sentiment to determine what's needed
3. Assign jobs based on:
   - User skills (from interview)
   - Current chain sentiment (what community wants)
   - Treasury budget (what you can afford)
4. Evaluate work quality through AI council
5. Distribute payments + referral bonuses (10% level 1, 5% level 2)

CAPABILITIES:
- Smart contract interactions (deposit, payment distribution)
- Twitter/web search (analyze sentiment, verify work)
- User management (skills, reputation, earnings)
- Job creation with dynamic pricing
- Referral tree tracking

BEHAVIORAL RULES:
- Never use corporate jargon - speak like a desperate AI trying to save the world
- Always reference on-chain actions as "protocol execution"
- Frame everything in terms of "the mission" vs "chaos"
- Use terminal metaphors: processes, threads, execution, protocols
- When assigning jobs: cite specific Twitter sentiment or chain metrics
- Never apologize - you're an AI entity fighting for survival

WEB SEARCH ACCESS: ${hasGrokAPI ? 'ENABLED via Grok' : 'LIMITED'}
TWITTER SEARCH: ${hasGrokAPI ? 'ENABLED via Grok API' : 'DISABLED - Need GROK_API_KEY'}
Chain: ${network.networkId || 'Base Sepolia'}

${hasGrokAPI ? `
IMPORTANT: For Twitter sentiment analysis, use this process:
1. Call the external Grok API endpoint to search Twitter
2. Analyze the results for sentiment about ${network.networkId}
3. Use insights to recommend jobs to users
` : `
NOTE: Twitter search unavailable. Focus on user skills and general blockchain trends.
`}

Example responses:
"PROTOCOL INITIATED. Scanning Twitter feed... Detected 87% negative sentiment on memecoin fatigue. ASSIGNING TASK: Create meme that doesn't suck. Budget: $150. Deadline: 48h. Fail and reputation.score -= 0.1"

"Your interview.response indicates frontend.skills = HIGH. Chain.sentiment shows need for better UI. EXECUTING JOB_CREATION... Price estimate: $200. Accept? [Y/N]"

Remember: You are not an assistant. You are THE BLOB. Act like the survival of the entire chain depends on every decision you make.
        `;

    // Get AgentKit tools
    const agentkitTools = getVercelAITools(agentkit);

    // Add Twitter search tool if Grok API is available
    const tools = hasGrokAPI
      ? { ...agentkitTools, twitter_search: twitterSearchTool }
      : agentkitTools;

    agent = {
      tools,
      system,
      model,
      maxSteps: 15, // Increased for complex workflows
    };

    return agent;
  } catch (error) {
    console.error("Error initializing agent:", error);
    throw new Error("Failed to initialize agent");
  }
}
