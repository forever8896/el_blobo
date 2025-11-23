import { AgentRequest, AgentResponse } from "@/app/types/api";
import { NextResponse } from "next/server";
import { createAgent } from "./create-agent";
import { Message, generateId, generateText } from "ai";
import { getUserByWallet, saveChatMessage, getChatHistory } from "@/app/lib/db-neon";
import { getTreasuryInfo, formatTreasuryForAgent } from "@/app/lib/contractUtils";

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

    // 2. Fetch treasury info (ALWAYS - this grounds the agent in reality)
    let treasuryContext = '';
    try {
      const treasuryInfo = await getTreasuryInfo();
      treasuryContext = formatTreasuryForAgent(treasuryInfo);
    } catch (error) {
      console.error('Error fetching treasury info:', error);
      // Treasury read failed - use simple fallback with reasonable defaults
      treasuryContext = `
TREASURY STATUS (Fallback - contract read failed):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Treasury: ~1.0 RON (estimated)
Available for Projects: ~0.8 RON

BUDGET RECOMMENDATIONS (Conservative):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 Standard Projects: 0.05 - 0.15 RON
   (Good quality work, reasonable scope)

🔴 Maximum per project: 0.25 RON

CRITICAL: Be fiscally conservative until real treasury data is available.
Suggest budgets in the 0.05-0.15 RON range for most projects.
`;
    }

    // 3. Fetch user profile if wallet address is provided
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

Use this context to personalize project recommendations and interactions.
`;
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    }

    // 4. Load full chat history from database for context
    let messages: Message[] = [];
    if (walletAddress) {
      try {
        const chatHistory = await getChatHistory(walletAddress, 100); // Load last 100 messages
        messages = chatHistory.map(msg => ({
          id: msg.id,
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        }));
      } catch (error) {
        console.error('Error loading chat history:', error);
        // Continue with empty history if load fails
      }
    }

    // 5. Get the agent with BOTH user context AND treasury context
    const fullContext = treasuryContext + '\n' + userContext;
    const agent = await createAgent(fullContext);

    // 6. INJECT Twitter search results BEFORE user message (Grok Live Search doesn't work properly)
    if (process.env.GROK_API_KEY && (userMessage.toLowerCase().includes('job') || userMessage.toLowerCase().includes('task') || userMessage.toLowerCase().includes('project'))) {
      try {
        const twitterResponse = await fetch('http://localhost:3000/api/twitter-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'Ronin blockchain OR #RoninNetwork OR $RON' }),
        });

        if (twitterResponse.ok) {
          const twitterData = await twitterResponse.json();
          if (twitterData.success && twitterData.sentiment) {
            const sentimentSummary = `
REAL-TIME X (TWITTER) DATA ABOUT RONIN (Last 24-48 hours):

Sentiment Score: ${twitterData.sentiment.sentiment_score} (-1 to 1)
Tweets Analyzed: ${twitterData.sentiment.tweet_count || 20}

Trending Topics:
${twitterData.sentiment.trending_topics?.map((t: string, i: number) => `${i+1}. ${t}`).join('\n') || 'N/A'}

Community Insights:
${twitterData.sentiment.insights?.map((i: string, idx: number) => `${idx+1}. ${i}`).join('\n') || 'N/A'}

Citations: ${twitterData.citations?.length || 0} X posts found
${twitterData.citations?.slice(0, 5).map((c: any) => `- ${c.url}`).join('\n') || ''}

USE THIS REAL DATA to propose specific, data-driven projects!`;

            messages.push({
              id: generateId(),
              role: 'user',
              content: sentimentSummary
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch Twitter data:', error);
      }
    }

    // Add the current user message to history
    messages.push({
      id: generateId(),
      role: "user",
      content: userMessage
    });

    // 7. Generate response with full conversation context
    const generateConfig: any = {
      model: agent.model,
      system: agent.system,
      tools: agent.tools,
      messages,
      maxSteps: agent.maxSteps,
      experimental_telemetry: {
        isEnabled: true,
      },
    };

    // Add xAI Live Search if using Grok
    if (process.env.GROK_API_KEY) {
      generateConfig.providerOptions = {
        xai: {
          searchParameters: {
            mode: 'on', // FORCE search
            returnCitations: true,
            maxSearchResults: 20,
            sources: [
              {
                type: 'x',
                // X search REQUIRES these parameters to actually work
                postViewCount: 1, // Minimum 1 view (required by API)
                enableImageUnderstanding: true,
                enableVideoUnderstanding: false,
              }
            ]
          }
        }
      };
      console.log('🔍 GROK SEARCH CONFIG:', JSON.stringify(generateConfig.providerOptions, null, 2));
    } else {
      console.log('❌ NO GROK_API_KEY - Using OpenAI without search');
    }

    console.log('🤖 MODEL:', generateConfig.model);

    const result = await generateText(generateConfig);

    // LOG EVERYTHING TO SEE WTF IS HAPPENING
    console.log('📊 RESULT KEYS:', Object.keys(result));
    console.log('🔍 SOURCES:', result.sources);
    console.log('📝 RESPONSE METADATA:', result.response?.headers);
    console.log('💬 RAW RESPONSE TEXT (first 500 chars):', result.text.substring(0, 500));
    console.log('🔧 FULL RESULT OBJECT KEYS:', Object.keys(result).join(', '));
    if (result.steps) {
      console.log('📝 STEPS:', JSON.stringify(result.steps.slice(0, 2), null, 2));
    }

    const { text } = result;

    // 8. Save messages to database if user is authenticated
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

    // 9. Return the final response
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
