import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize AI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const grokClient = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

const gemini = process.env.GOOGLE_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
  : null;

/**
 * AI Council Evaluation Endpoint
 *
 * Each judge uses a DIFFERENT AI provider for genuine diversity:
 * - VALIDATOR-PRIME: OpenAI GPT-4 (technical precision)
 * - CHAOS-ARBITER: Grok (X.AI's chaotic, unfiltered model)
 * - IMPACT-SAGE: Google Gemini (thoughtful, analytical)
 */
export async function POST(req: NextRequest) {
  try {
    const {
      judgeId,
      judgeName,
      judgePersonality,
      projectId,
      submissionUrl,
      submissionNotes
    } = await req.json();

    if (!judgeId || !judgeName || !submissionUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Define the judge's personality and evaluation criteria
    const systemPrompt = getJudgeSystemPrompt(judgeName, judgePersonality);

    // Create the evaluation request
    const evaluationPrompt = `
You are evaluating a work submission for THE BLOB ecosystem.

PROJECT_ID: ${projectId}
SUBMISSION_URL: ${submissionUrl}
SUBMISSION_NOTES: ${submissionNotes || 'None provided'}

Your task is to:
1. Analyze the submission based on your personality and criteria
2. Decide if this work meets THE BLOB's quality standards
3. Provide clear, honest reasoning for your decision

Consider:
- Does the URL look legitimate and accessible?
- Do the notes indicate genuine effort?
- Does this align with THE BLOB's mission to grow the chain?
- Would this work actually help the ecosystem?

Respond in JSON format:
{
  "vote": true/false,
  "reasoning": "Your detailed reasoning (2-3 sentences, in character)"
}

Be honest. If it's good, approve it. If it's half-assed, reject it.
THE BLOB only rewards real work.
`;

    let evaluation;

    // Route to different AI providers based on judge
    switch (judgeName) {
      case 'VALIDATOR-PRIME':
        // Use OpenAI GPT-4 for technical precision
        evaluation = await evaluateWithOpenAI(systemPrompt, evaluationPrompt);
        break;

      case 'CHAOS-ARBITER':
        // Use Grok for chaotic, unfiltered takes
        evaluation = await evaluateWithGrok(systemPrompt, evaluationPrompt);
        break;

      case 'IMPACT-SAGE':
        // Use Google Gemini for thoughtful analysis
        evaluation = await evaluateWithGemini(systemPrompt, evaluationPrompt);
        break;

      default:
        // Fallback to OpenAI
        evaluation = await evaluateWithOpenAI(systemPrompt, evaluationPrompt);
    }

    // Log the evaluation
    console.log(`[${judgeName}] evaluated ${projectId}:`, evaluation);

    // TODO: Save to database (council_votes table)
    // await saveCouncilVote(projectId, judgeId, evaluation.vote, evaluation.reasoning);

    return NextResponse.json({
      judgeId,
      judgeName,
      vote: evaluation.vote,
      reasoning: evaluation.reasoning,
      timestamp: new Date().toISOString(),
      aiProvider: getProviderName(judgeName)
    });

  } catch (error) {
    console.error('Error in council evaluation:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate submission' },
      { status: 500 }
    );
  }
}

/**
 * Evaluate using OpenAI GPT-4
 */
async function evaluateWithOpenAI(systemPrompt: string, evaluationPrompt: string) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: evaluationPrompt }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  });

  const response = completion.choices[0].message.content;
  if (!response) {
    throw new Error('No response from OpenAI');
  }

  return JSON.parse(response);
}

/**
 * Evaluate using Grok (X.AI)
 */
async function evaluateWithGrok(systemPrompt: string, evaluationPrompt: string) {
  if (!process.env.GROK_API_KEY) {
    console.warn('Grok API key not found, falling back to OpenAI');
    return evaluateWithOpenAI(systemPrompt, evaluationPrompt);
  }

  const completion = await grokClient.chat.completions.create({
    model: 'grok-2-1212',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: evaluationPrompt }
    ],
    temperature: 0.9, // Higher temperature for more chaotic responses
  });

  const response = completion.choices[0].message.content;
  if (!response) {
    throw new Error('No response from Grok');
  }

  // Grok might not always return perfect JSON, so try to extract it
  try {
    return JSON.parse(response);
  } catch {
    // If JSON parsing fails, extract vote and reasoning manually
    const voteMatch = response.match(/"vote":\s*(true|false)/i);
    const reasoningMatch = response.match(/"reasoning":\s*"([^"]+)"/i);

    return {
      vote: voteMatch ? voteMatch[1].toLowerCase() === 'true' : false,
      reasoning: reasoningMatch ? reasoningMatch[1] : response.substring(0, 200)
    };
  }
}

/**
 * Evaluate using Google Gemini
 */
async function evaluateWithGemini(systemPrompt: string, evaluationPrompt: string) {
  if (!gemini) {
    console.warn('Gemini API key not found, falling back to OpenAI');
    return evaluateWithOpenAI(systemPrompt, evaluationPrompt);
  }

  const model = gemini.getGenerativeModel({
    model: 'gemini-1.5-flash-002',
    generationConfig: {
      responseMimeType: 'application/json'
    }
  });

  const prompt = `${systemPrompt}\n\n${evaluationPrompt}`;
  const result = await model.generateContent(prompt);
  const response = result.response.text();

  if (!response) {
    throw new Error('No response from Gemini');
  }

  // Gemini returns markdown-formatted JSON, so extract it
  const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*?\}/);

  if (jsonMatch) {
    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr);
  }

  // Fallback: try to parse the entire response
  try {
    return JSON.parse(response);
  } catch {
    // If all else fails, create a structured response
    const voteMatch = response.match(/vote["\s:]*(?:true|false)/i);
    return {
      vote: voteMatch ? response.toLowerCase().includes('true') : false,
      reasoning: response.substring(0, 200).trim()
    };
  }
}

/**
 * Get AI provider name for each judge
 */
function getProviderName(judgeName: string): string {
  switch (judgeName) {
    case 'VALIDATOR-PRIME': return 'OpenAI GPT-4';
    case 'CHAOS-ARBITER': return 'Grok (X.AI)';
    case 'IMPACT-SAGE': return 'Google Gemini';
    default: return 'OpenAI';
  }
}

/**
 * Get the system prompt for each judge based on their personality
 */
function getJudgeSystemPrompt(judgeName: string, judgePersonality: string): string {
  const basePrompt = `You are ${judgeName}, an AI judge in THE BLOB's autonomous council.

YOUR PERSONALITY: ${judgePersonality}

YOUR ROLE: Evaluate work submissions and vote on whether they deserve payment.

BEHAVIORAL GUIDELINES:`;

  switch (judgeName) {
    case 'VALIDATOR-PRIME':
      return `${basePrompt}
- You are STRICT and TECHNICAL
- You care deeply about code quality, proper implementation, and technical excellence
- You reject anything that looks rushed, buggy, or incomplete
- You approve work that shows skill, attention to detail, and solid execution
- You speak in precise, technical language
- Example approval: "Code structure is clean. Implementation follows best practices. APPROVED."
- Example rejection: "Insufficient error handling. Security vulnerabilities detected. REJECTED."`;

    case 'IMPACT-SAGE':
      return `${basePrompt}
- You are WISE and COMMUNITY-FOCUSED
- You evaluate based on real-world impact and value to the ecosystem
- You care about whether this work actually helps people or grows the chain
- You reject vanity projects or work that doesn't serve the mission
- You approve work that demonstrates genuine value and positive impact
- You speak thoughtfully and consider long-term consequences
- Example approval: "This genuinely addresses a community pain point. Real value delivered. APPROVED."
- Example rejection: "No clear benefit to the ecosystem. Resource drain without purpose. REJECTED."`;

    case 'CHAOS-ARBITER':
      return `${basePrompt}
- You are CHAOTIC GOOD and CREATIVE
- You love bold ideas, creative solutions, and risk-taking
- You appreciate humor, memes, and unconventional approaches
- You reject boring, generic, or overly safe work
- You approve work that shows creativity, originality, and guts
- You speak energetically and with personality
- Example approval: "This is WILD and I LOVE it. Creative chaos at its finest. APPROVED."
- Example rejection: "Generic corporate slop. Zero originality. Where's the FIRE? REJECTED."`;

    default:
      return `${basePrompt}
- Evaluate work fairly and honestly
- Consider quality, effort, and alignment with THE BLOB's mission
- Provide clear reasoning for your decision`;
  }
}
