import { NextResponse } from 'next/server';
import { getUserByWallet, getChatHistory, getProjectsByUser, saveChatMessage } from '@/app/lib/db-neon';
import { getTreasuryInfo, formatTreasuryForAgent } from '@/app/lib/contractUtils';
import { createAgent } from '@/app/api/agent/create-agent';
import { generateText } from 'ai';

export interface GreetingRequest {
  walletAddress: string;
}

export interface GreetingResponse {
  success: boolean;
  shouldGreet: boolean;
  greeting?: string;
  error?: string;
}

/**
 * Generate AI-powered personalized greeting for users
 * - NEW users: AI analyzes ecosystem via Twitter, proposes creative data-driven task
 * - EXISTING users with task: AI checks in on progress
 */
export async function POST(req: Request): Promise<NextResponse<GreetingResponse>> {
  try {
    const { walletAddress } = await req.json() as GreetingRequest;

    if (!walletAddress) {
      return NextResponse.json({
        success: false,
        shouldGreet: false,
        error: 'Wallet address is required',
      }, { status: 400 });
    }

    // 1. Get user profile
    const user = await getUserByWallet(walletAddress);
    if (!user) {
      return NextResponse.json({
        success: false,
        shouldGreet: false,
        error: 'User not found',
      }, { status: 404 });
    }

    // 2. Check if user has any chat history
    const chatHistory = await getChatHistory(walletAddress, 10);
    const hasChattedBefore = chatHistory.length > 0;

    // 3. Get user's projects
    const projects = await getProjectsByUser(walletAddress);
    const activeProjects = projects.filter(p => !p.submission_url);
    const hasActiveProject = activeProjects.length > 0;

    // 4. Check if we already greeted about this specific task
    let alreadyGreetedAboutTask = false;
    if (hasActiveProject && chatHistory.length > 0) {
      const activeProjectTitle = activeProjects[0].title;
      // Check if last few messages mention this task
      const recentMessages = chatHistory.slice(-5);
      alreadyGreetedAboutTask = recentMessages.some(
        msg => msg.role === 'assistant' && msg.content.includes(activeProjectTitle)
      );
    }

    // 5. Determine if we should greet
    let shouldGreet = false;
    let greetingPrompt = '';

    if (!hasChattedBefore && !hasActiveProject) {
      // NEW USER - Needs welcome + task proposal
      shouldGreet = true;
      greetingPrompt = buildNewUserPrompt(user);
    } else if (hasActiveProject && !alreadyGreetedAboutTask && chatHistory.length < 3) {
      // EXISTING USER WITH TASK - Status check
      // Only greet if we haven't greeted about this task yet AND conversation is still fresh
      shouldGreet = true;
      greetingPrompt = buildTaskStatusPrompt(user, activeProjects[0]);
    } else {
      // User has chatted before but no active task, OR already greeted - no automatic greeting
      return NextResponse.json({
        success: true,
        shouldGreet: false,
      });
    }

    if (!shouldGreet) {
      return NextResponse.json({
        success: true,
        shouldGreet: false,
      });
    }

    // 5. Get treasury context
    let treasuryContext = '';
    try {
      const treasuryInfo = await getTreasuryInfo();
      treasuryContext = formatTreasuryForAgent(treasuryInfo);
    } catch (error) {
      console.error('Error fetching treasury:', error);
      treasuryContext = 'Treasury data unavailable - suggest conservative budgets (0.01-0.05 RON)';
    }

    // 6. Create agent and generate greeting
    const agent = await createAgent(treasuryContext);

    const { text: greeting } = await generateText({
      ...agent,
      messages: [{
        role: 'user',
        content: greetingPrompt,
      }],
      // FORCE X search for Grok
      ...(process.env.GROK_API_KEY ? {
        providerOptions: {
          xai: {
            searchParameters: {
              mode: 'on', // ALWAYS search
              returnCitations: true,
              maxSearchResults: 20,
              sources: [
                {
                  type: 'x',
                  postViewCount: 1, // Must be > 0 (API requirement)
                  enableImageUnderstanding: true,
                  enableVideoUnderstanding: false,
                }
              ]
            }
          }
        }
      } : {}),
    });

    // 7. Save the greeting to chat history
    await saveChatMessage({
      userAddress: walletAddress,
      role: 'assistant',
      content: greeting,
    });

    return NextResponse.json({
      success: true,
      shouldGreet: true,
      greeting,
    });

  } catch (error) {
    console.error('Error generating greeting:', error);
    return NextResponse.json({
      success: false,
      shouldGreet: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * Build prompt for NEW user greeting
 * AI will: search Twitter, analyze data, propose creative task, suggest payment
 */
function buildNewUserPrompt(user: any): string {
  const username = user.username || 'friend';
  const skills = user.skills?.responses || [];
  const skillsList = skills.length > 0 ? skills.join(', ') : 'general Web3 enthusiasm';

  return `AUTOMATIC GREETING FOR NEW USER - BE CREATIVE AND DATA-DRIVEN

User just completed onboarding and landed on chat for the first time.

USERNAME: ${username}
SKILLS/INTERESTS: ${skillsList}

YOUR TASK:
1. Use the twitter_search tool to analyze what's ACTUALLY happening on Ronin right now
   - Search for: "Ronin blockchain" OR "#RoninNetwork" OR "$RON"
   - Look for real trends, pain points, and opportunities

2. Based on REAL Twitter data + user skills, propose ONE specific, creative task
   - NOT a generic template
   - Something that addresses a REAL ecosystem need you discovered
   - Should leverage their specific skills

3. Check treasury data (provided in context) and suggest appropriate payment
   - Be fiscally responsible
   - Explain your reasoning based on treasury health

4. Format as a warm, engaging greeting that includes:
   - "Hello {username}!"
   - What you discovered about Ronin today (data-driven conclusion from Twitter)
   - The SPECIFIC task you're proposing (creative, unique, actionable)
   - Payment offer with treasury-based reasoning
   - "How does that sound?"

CRITICAL:
- Actually USE the twitter_search tool - don't make up generic statements
- Propose something SPECIFIC and CREATIVE based on real data
- Be conversational and excited, not robotic
- Show your reasoning process

Generate the greeting now:`;
}

/**
 * Build prompt for existing user with active task
 */
function buildTaskStatusPrompt(user: any, activeProject: any): string {
  const username = user.username || 'friend';
  const projectTitle = activeProject.title || 'your current task';

  // Calculate deadline (48 hours from creation)
  const createdAt = new Date(activeProject.created_at);
  const deadline = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);
  const now = new Date();
  const hoursRemaining = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)));

  return `AUTOMATIC GREETING FOR USER WITH ACTIVE TASK

User has an active project and just opened the chat.

USERNAME: ${username}
ACTIVE TASK: ${projectTitle}
TASK DESCRIPTION: ${activeProject.description || 'No description available'}
HOURS UNTIL DEADLINE: ${hoursRemaining}

YOUR TASK:
Generate a friendly check-in message that:
- Greets them by name
- Mentions their active task
- Asks how the work is going
- Reminds them of the deadline (${hoursRemaining} hours remaining)
- Offers support if needed

Keep it conversational and supportive. Format:
"Hello {username}! I see your task is running, how is the work going? Will you get to submit it before the {deadline time}?"

Generate the greeting now:`;
}
