/**
 * Simplified AI Model configurations
 * Uses native AI capabilities - no external APIs needed
 *
 * MODELS:
 * - GPT-4o: General validation, code analysis, image analysis
 * - Grok: Twitter/X content (has native access), social sentiment
 * - Gemini 2.5 Pro: Video analysis (processes video URLs natively)
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CouncilVote } from './security';

export type ModelProvider = 'openai' | 'google' | 'grok';
export type ContentType = 'github' | 'tweet' | 'video' | 'image' | 'text' | 'unknown';

export interface JudgeSpecialization {
  id: string;
  name: string;
  model: string;
  provider: ModelProvider;
  contentTypes: ContentType[];
  capabilities: {
    codeReview?: boolean;
    videoAnalysis?: boolean;
    twitterAccess?: boolean;
    visionAnalysis?: boolean;
  };
  personality: string;
}

/**
 * Council members - 3 judges using native AI capabilities
 */
export const councilMembers: JudgeSpecialization[] = [
  {
    id: 'code-validator',
    name: 'CODE-VALIDATOR',
    model: 'gpt-4o',
    provider: 'openai',
    contentTypes: ['github', 'image', 'text', 'unknown'],
    capabilities: {
      codeReview: true,
      visionAnalysis: true
    },
    personality: 'Strict technical expert focused on code quality, security, and best practices. You examine implementations with precision and reject anything that shows poor craftsmanship.'
  },
  {
    id: 'media-analyst',
    name: 'MEDIA-ANALYST',
    model: 'gemini-2.5-flash',
    provider: 'google',
    contentTypes: ['video', 'image', 'text'],
    capabilities: {
      videoAnalysis: true,
      visionAnalysis: true
    },
    personality: 'Creative evaluator who analyzes visual and multimedia content. You assess production quality, messaging clarity, and audience impact.'
  },
  {
    id: 'social-sentinel',
    name: 'SOCIAL-SENTINEL',
    model: 'grok-2-1212',
    provider: 'grok',
    contentTypes: ['tweet', 'video', 'text'],
    capabilities: {
      twitterAccess: true
    },
    personality: 'Chaotic good evaluator who understands social dynamics and viral potential. You appreciate bold ideas and creative community engagement. You have direct access to X/Twitter data.'
  }
];

/**
 * Model client factory
 */
export class ModelClients {
  private static openaiClient: OpenAI | null = null;
  private static grokClient: OpenAI | null = null;
  private static geminiClient: GoogleGenerativeAI | null = null;

  static getOpenAI(): OpenAI {
    if (!this.openaiClient) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.openaiClient;
  }

  static getGrok(): OpenAI {
    if (!this.grokClient) {
      if (!process.env.GROK_API_KEY) {
        throw new Error('GROK_API_KEY not configured');
      }
      this.grokClient = new OpenAI({
        apiKey: process.env.GROK_API_KEY,
        baseURL: 'https://api.x.ai/v1',
      });
    }
    return this.grokClient;
  }

  static getGemini(): GoogleGenerativeAI {
    if (!this.geminiClient) {
      if (!process.env.GOOGLE_API_KEY) {
        throw new Error('GOOGLE_API_KEY not configured');
      }
      this.geminiClient = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    }
    return this.geminiClient;
  }
}

/**
 * Evaluate with OpenAI (GPT-4o)
 */
export async function evaluateWithOpenAI(
  systemPrompt: string,
  evaluationPrompt: string
): Promise<CouncilVote> {
  const openai = ModelClients.getOpenAI();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: evaluationPrompt }
    ],
    temperature: 0.7,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'council_vote',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            vote: { type: 'boolean' },
            reasoning: {
              type: 'string',
              description: 'Detailed reasoning for the vote in 2-3 sentences'
            }
          },
          required: ['vote', 'reasoning'],
          additionalProperties: false
        }
      }
    }
  });

  const response = completion.choices[0].message.content;
  if (!response) {
    throw new Error('No response from OpenAI');
  }

  return JSON.parse(response);
}

/**
 * Evaluate with Grok (X.AI) - has native Twitter access
 */
export async function evaluateWithGrok(
  systemPrompt: string,
  evaluationPrompt: string
): Promise<CouncilVote> {
  const grok = ModelClients.getGrok();

  const completion = await grok.chat.completions.create({
    model: 'grok-2-1212',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: evaluationPrompt }
    ],
    temperature: 0.9,
  });

  const response = completion.choices[0].message.content;
  if (!response) {
    throw new Error('No response from Grok');
  }

  try {
    return JSON.parse(response);
  } catch {
    const voteMatch = response.match(/"vote":\s*(true|false)/i);
    const reasoningMatch = response.match(/"reasoning":\s*"([^"]+)"/i);

    return {
      vote: voteMatch ? voteMatch[1].toLowerCase() === 'true' : false,
      reasoning: reasoningMatch ? reasoningMatch[1] : response.substring(0, 200)
    };
  }
}

/**
 * Evaluate with Google Gemini - can process video URLs natively
 */
export async function evaluateWithGemini(
  systemPrompt: string,
  evaluationPrompt: string
): Promise<CouncilVote> {
  const gemini = ModelClients.getGemini();

  const model = gemini.getGenerativeModel({
    model: 'gemini-2.5-flash',
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

  try {
    return JSON.parse(response);
  } catch {
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*?\}/);

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr);
    }

    const voteMatch = response.match(/vote["\s:]*(?:true|false)/i);
    return {
      vote: voteMatch ? response.toLowerCase().includes('true') : false,
      reasoning: response.substring(0, 200).trim()
    };
  }
}

/**
 * Route to appropriate evaluation function based on provider
 */
export async function evaluateWithModel(
  provider: ModelProvider,
  systemPrompt: string,
  evaluationPrompt: string
): Promise<CouncilVote> {
  switch (provider) {
    case 'openai':
      return evaluateWithOpenAI(systemPrompt, evaluationPrompt);
    case 'grok':
      return evaluateWithGrok(systemPrompt, evaluationPrompt);
    case 'google':
      return evaluateWithGemini(systemPrompt, evaluationPrompt);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Get judges that can handle this content type
 */
export function selectJudgesForContent(contentType: ContentType): JudgeSpecialization[] {
  return councilMembers.filter(judge =>
    judge.contentTypes.includes(contentType)
  );
}

/**
 * Get all judges
 */
export function getAllJudges(): JudgeSpecialization[] {
  return councilMembers;
}

/**
 * Get judge by ID
 */
export function getJudgeById(id: string): JudgeSpecialization | undefined {
  return councilMembers.find(judge => judge.id === id);
}
