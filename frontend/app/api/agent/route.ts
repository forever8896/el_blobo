import { AgentRequest, AgentResponse } from "@/app/types/api";
import { NextResponse } from "next/server";
import { createAgent } from "./create-agent";
import { Message, generateId, generateText } from "ai";
import { getUserByWallet, saveChatMessage } from "@/app/lib/db-neon";

// Store messages per user wallet address
const userMessages: Record<string, Message[]> = {};

/**
 * Handles incoming POST requests to interact with the AgentKit-powered AI agent.
 * This function processes user messages and streams responses from the agent.
 *
 * @function POST
 * @param {Request & { json: () => Promise<AgentRequest> }} req - The incoming request object containing the user message.
 * @returns {Promise<NextResponse<AgentResponse>>} JSON response containing the AI-generated reply or an error message.
 *
 * @description Sends a single message to the agent and returns the agents' final response.
 *
 * @example
 * const response = await fetch("/api/agent", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ userMessage: input }),
 * });
 */
export async function POST(
  req: Request & { json: () => Promise<AgentRequest> },
): Promise<NextResponse<AgentResponse>> {
  try {
    // 1. Extract user message and wallet address from the request body
    const { userMessage, walletAddress } = await req.json();

    // 2. Fetch user profile if wallet address is provided
    let userContext = '';
    if (walletAddress) {
      try {
        const user = await getUserByWallet(walletAddress);

        if (user) {
          userContext = `
USER CONTEXT:
- Username: ${user.username}
- Wallet: ${user.wallet_address}
- Skills/Interests: ${user.skills?.responses ? user.skills.responses.join('; ') : 'Not available'}
- Member since: ${new Date(user.created_at).toLocaleDateString()}

Use this context to personalize job recommendations and interactions.
`;
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    }

    // Get or initialize messages for this user
    const userWallet = walletAddress || 'anonymous';
    if (!userMessages[userWallet]) {
      userMessages[userWallet] = [];
    }

    // 3. Get the agent with user context
    const agent = await createAgent(userContext);

    // 4. Start streaming the agent's response
    userMessages[userWallet].push({
      id: generateId(),
      role: "user",
      content: userMessage
    });

    const { text } = await generateText({
      ...agent,
      messages: userMessages[userWallet],
      // Enable experimental features for web and Twitter search
      experimental_telemetry: {
        isEnabled: true,
      },
      maxSteps: agent.maxSteps,
    });

    // 5. Add the agent's response to the messages
    userMessages[userWallet].push({
      id: generateId(),
      role: "assistant",
      content: text
    });

    // 6. Save messages to database if user is authenticated
    if (walletAddress) {
      try {
        await Promise.all([
          saveChatMessage({
            userAddress: walletAddress,
            role: 'user',
            content: userMessage
          }),
          saveChatMessage({
            userAddress: walletAddress,
            role: 'assistant',
            content: text
          })
        ]);
      } catch (error) {
        console.error('Error saving chat messages:', error);
      }
    }

    // 7. Return the final response
    return NextResponse.json({ response: text });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({
      error:
        error instanceof Error
          ? error.message
          : "I'm sorry, I encountered an issue processing your message. Please try again later.",
    });
  }
}
