import { AgentRequest, AgentResponse } from "@/app/types/api";
import { NextResponse } from "next/server";
import { createAgent } from "./create-agent";
import { Message, generateId, generateText } from "ai";
import { getUserByWallet, saveChatMessage, getChatHistory, getAdminSuggestions } from "@/app/lib/db-neon";
import { getTreasuryInfo, formatTreasuryForAgent } from "@/app/lib/contractUtils";
import { DEFAULT_JOB_SUGGESTIONS } from "@/app/config/admin";

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

    // 2. Fetch treasury info on EVERY REQUEST (ALWAYS fresh data)
    console.log('🏦 Fetching FRESH treasury data from blockchain...');
    let treasuryContext = '';
    let treasuryInfo = null;

    try {
      treasuryInfo = await getTreasuryInfo();
      treasuryContext = formatTreasuryForAgent(treasuryInfo);
      console.log('✅ Treasury fetched:', {
        total: treasuryInfo.totalAssets.toFixed(4),
        available: treasuryInfo.availableAssets.toFixed(4),
        utilization: treasuryInfo.utilizationRate.toFixed(1) + '%'
      });
    } catch (error) {
      console.error('❌ Error fetching treasury info:', error);
      // Treasury read failed - use simple fallback with reasonable defaults
      treasuryContext = `
TREASURY STATUS (Fallback - contract read failed):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Unable to fetch live data - using fallback estimates
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

    // 3. Fetch admin suggestions for job guidance
    let adminGuidance = '';
    try {
      const suggestions = await getAdminSuggestions();
      adminGuidance = suggestions?.suggestions || DEFAULT_JOB_SUGGESTIONS;
    } catch (error) {
      console.error('Error fetching admin suggestions:', error);
      adminGuidance = DEFAULT_JOB_SUGGESTIONS;
    }

    // 4. Fetch user profile if wallet address is provided
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

    // 5. Load full chat history from database for context
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

    // 6. Get the agent with treasury context, user context, AND admin guidance
    // Using Grok 4.1 Fast - has both Twitter search AND excellent tool calling!
    const fullContext = treasuryContext + '\n' + adminGuidance + '\n' + userContext;
    const agent = await createAgent(fullContext);

    // 7. INJECT Twitter search results BEFORE user message (Grok has built-in search but we supplement)
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

    // If this looks like a project confirmation, strongly bias Grok to call create_project_onchain
    const lastAssistantMsg = messages.slice(0, -1).reverse().find(m => m.role === 'assistant');
    const userConfirms = ['yes', 'yep', 'sure', 'sounds good', "let's do", 'do it', 'confirm', 'proceed', 'go ahead', 'start'].some(
      phrase => userMessage.toLowerCase().includes(phrase)
    );
    const assistantProposedProject = lastAssistantMsg?.content?.toLowerCase?.()?.includes('budget') &&
      (lastAssistantMsg.content?.toLowerCase?.()?.includes('title') || lastAssistantMsg.content?.toLowerCase?.()?.includes('project'));

    if (userConfirms && assistantProposedProject) {
      const walletHint = walletAddress ? `Use ${walletAddress} for projectKey and assigneeAddress.` : 'Use the user wallet from context for projectKey and assigneeAddress.';
      messages.push({
        id: generateId(),
        role: 'system',
        content: `Project confirmation mode: Call create_project_onchain now with camelCase params { projectKey, assigneeAddress, title, description, budgetRON, durationDays }. ${walletHint} Do not call other tools for project creation. If any field is missing, ask for it explicitly instead of calling other tools.`
      });
    }

    // 8. ALWAYS remind agent of current treasury (not just on keywords)
    // This ensures budget discussions are ALWAYS grounded in reality
    console.log('🤖 Agent tools available:', Object.keys(agent.tools));
    console.log('📝 User message:', userMessage);

    // Add treasury reminder to EVERY message about jobs/budgets
    const isJobDiscussion = userMessage.toLowerCase().includes('job') ||
                           userMessage.toLowerCase().includes('project') ||
                           userMessage.toLowerCase().includes('budget') ||
                           userMessage.toLowerCase().includes('task') ||
                           userMessage.toLowerCase().includes('assign') ||
                           userMessage.toLowerCase().includes('work');

    if (treasuryInfo && isJobDiscussion) {
      const treasuryReminder = `\n\n💰 [CURRENT TREASURY STATUS - Use this for ALL budget decisions]:\n` +
                              `Total: ${treasuryInfo.totalAssets.toFixed(4)} RON | ` +
                              `Available: ${treasuryInfo.availableAssets.toFixed(4)} RON | ` +
                              `Already Allocated: ${treasuryInfo.allocatedAssets.toFixed(4)} RON\n`;

      messages[messages.length - 1].content += treasuryReminder;
      console.log('💰 Treasury reminder added to job discussion');
    }

    const generateConfig: any = {
      model: agent.model,
      system: agent.system,
      tools: agent.tools,
      toolChoice: 'auto', // Enable tool calling
      messages,
      maxSteps: agent.maxSteps,
      experimental_telemetry: {
        isEnabled: true,
      },
      onStepFinish: ({ toolCalls, toolResults, text }: any) => {
        if (toolCalls && toolCalls.length > 0) {
          console.log('🔧 Tool calls made:', toolCalls.map((tc: any) => tc.toolName));
        }
        if (toolResults && toolResults.length > 0) {
          console.log('📊 Tool results:', toolResults);
        }

        // DETECT LYING: If agent says project created without tool call
        if (text && !toolCalls?.some((tc: any) =>
          tc.toolName === 'create_project_onchain' || tc.toolName === 'CustomActionProvider_create_project_onchain'
        )) {
          if (text.toLowerCase().includes('project created') ||
              text.toLowerCase().includes('setting up') ||
              text.toLowerCase().includes("i'm registering")) {
            console.warn('⚠️  WARNING: Agent claiming to create project without calling tool!');
          }
        }
      },
    };

    // Add xAI Live Search (Grok 4.1 Fast has this built-in)
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
      console.log('🔍 GROK 4.1 FAST - Search + Tool Calling enabled');
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

    let { text } = result;
    let projectCreatedMessage = '';

    // Check for tool errors first (used in multiple places)
    const hadToolError = result.steps?.some((step: any) =>
      step.content?.some((c: any) => c.type === 'tool-error' || (c.output && JSON.stringify(c.output).includes('ZodError')))
    );

    // No manual fallback: Grok must call create_project_onchain with correct parameters

    // Clean up any tool calling artifacts from the response
    text = text.replace(/<has_function_call>/g, '').trim();

    // CRITICAL: Clean up XML parameters from Grok 4.1 that leaked into response
    text = text.replace(/<parameter name="[^"]+">.*?<\/parameter>/gs, '').trim();
    text = text.replace(/<\/xai:function_call>/g, '').trim();
    text = text.replace(/<xai:function_call[^>]*>/g, '').trim();

    // Add project created message if we have one
    if (projectCreatedMessage) {
      text += projectCreatedMessage;
    }

    // ANTI-HALLUCINATION: If agent claims TX hash, verify tool was actually called successfully
    const claimsTxHash = text.match(/TX:?\s*(0x[a-fA-F0-9]{64})/i);
    const hadToolCall = result.steps?.some((step: any) =>
      step.content?.some((c: any) => c.toolName === 'create_project_onchain' || c.toolName === 'CustomActionProvider_create_project_onchain')
    );
    const hadToolSuccess = result.steps?.some((step: any) =>
      step.content?.some((c: any) =>
        c.type === 'tool-result' &&
        (c.toolName === 'create_project_onchain' || c.toolName === 'CustomActionProvider_create_project_onchain') &&
        typeof c.output === 'string' &&
        c.output.includes('Project created')
      )
    );

    console.log('🔍 Hallucination check:', {
      claimsTxHash: !!claimsTxHash,
      hadToolCall,
      hadToolSuccess,
      hadToolError
    });

    if (claimsTxHash && (!hadToolCall || hadToolError || !hadToolSuccess)) {
      console.warn('🚨 HALLUCINATION DETECTED: Agent claims TX but tool never succeeded!');
      console.warn('   Claims TX:', claimsTxHash[0]);
      console.warn('   Had tool call:', hadToolCall);
      console.warn('   Had success:', hadToolSuccess);
      console.warn('   Had error:', hadToolError);

      text = text.replace(/✅\s*\*?\*?Project created on-chain!\*?\*?.*?TX:?\s*0x[a-fA-F0-9]{64}[^\n]*/gi, '');
      text = text.replace(/TX:?\s*0x[a-fA-F0-9]{64}/gi, '');
      text = `❌ **Project creation failed** - The tool encountered an error and did not execute successfully.

${text}

⚠️ **Important**: No transaction was created. The project parameters are ready, but there was an issue with the blockchain registration. Please try again or let me know if you need help troubleshooting.`;
    }

    // 10. Save messages to database if user is authenticated
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

    // 11. Return the final response
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
