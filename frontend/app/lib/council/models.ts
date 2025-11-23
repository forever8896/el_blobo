/**
 * AI Model configurations and integrations
 * Supports OpenAI, Anthropic Claude, Google Gemini, and Grok
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { CouncilVote } from './security';

export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'grok';
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
    realTimeData?: boolean;
    visionAnalysis?: boolean;
  };
  personality: string;
}

/**
 * Council members with capability-based assignments
 */
export const councilMembers: JudgeSpecialization[] = [
  {
    id: 'code-auditor',
    name: 'CODE-AUDITOR',
    model: 'claude-opus-4-20250514',
    provider: 'anthropic',
    contentTypes: ['github', 'text'],
    capabilities: {
      codeReview: true
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
    contentTypes: ['tweet', 'text'],
    capabilities: {
      realTimeData: true
    },
    personality: 'Chaotic good evaluator who understands social dynamics and viral potential. You appreciate bold ideas and creative community engagement.'
  },
  {
    id: 'general-validator',
    name: 'GENERAL-VALIDATOR',
    model: 'gpt-4o',
    provider: 'openai',
    contentTypes: ['github', 'image', 'text', 'unknown'],
    capabilities: {
      codeReview: true,
      visionAnalysis: true
    },
    personality: 'Balanced evaluator who considers overall impact and ecosystem value. You assess whether work genuinely helps THE BLOB grow.'
  }
];

/**
 * Model client factory
 */
export class ModelClients {
  private static openaiClient: OpenAI | null = null;
  private static grokClient: OpenAI | null = null;
  private static geminiClient: GoogleGenerativeAI | null = null;
  private static anthropicClient: Anthropic | null = null;

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

  static getAnthropic(): Anthropic {
    if (!this.anthropicClient) {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY not configured');
      }
      this.anthropicClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
    return this.anthropicClient;
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
 * Evaluate with Grok (X.AI)
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
    temperature: 0.9, // Higher temperature for more creative/chaotic responses
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
 * Evaluate with Google Gemini
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

  // Gemini returns JSON directly with responseMimeType set
  try {
    return JSON.parse(response);
  } catch {
    // Fallback: try to extract from markdown
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*?\}/);

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr);
    }

    // If all else fails, create a structured response
    const voteMatch = response.match(/vote["\s:]*(?:true|false)/i);
    return {
      vote: voteMatch ? response.toLowerCase().includes('true') : false,
      reasoning: response.substring(0, 200).trim()
    };
  }
}

/**
 * Evaluate with Anthropic Claude
 */
export async function evaluateWithClaude(
  systemPrompt: string,
  evaluationPrompt: string
): Promise<CouncilVote> {
  const anthropic = ModelClients.getAnthropic();

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: evaluationPrompt
    }],
    temperature: 0.7
  });

  const textContent = response.content.find(block => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const text = textContent.text;

  // Try to parse JSON from response
  try {
    // Claude might wrap JSON in markdown
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*?\}/);

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr);
    }

    // Try direct parse
    return JSON.parse(text);
  } catch {
    // If parsing fails, extract manually
    const voteMatch = text.match(/"vote":\s*(true|false)/i) || text.match(/vote:\s*(true|false)/i);
    const reasoningMatch = text.match(/"reasoning":\s*"([^"]+)"/i) || text.match(/reasoning:\s*"([^"]+)"/i);

    return {
      vote: voteMatch ? voteMatch[1].toLowerCase() === 'true' : false,
      reasoning: reasoningMatch ? reasoningMatch[1] : text.substring(0, 200).trim()
    };
  }
}

/**
 * Analyze video with Gemini (multimodal)
 */
export async function analyzeVideoWithGemini(
  videoUrl: string,
  analysisPrompt: string
): Promise<string> {
  const gemini = ModelClients.getGemini();
  const model = gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // Note: Gemini 2.0 supports video URLs directly
  // For local files, you'd need to upload via File API first
  const result = await model.generateContent([
    { text: analysisPrompt },
    {
      fileData: {
        mimeType: 'video/mp4',
        fileUri: videoUrl
      }
    }
  ]);

  return result.response.text();
}

/**
 * Analyze code with Claude (specialized for code review)
 */
export async function analyzeCodeWithClaude(
  codeContext: string,
  analysisPrompt: string
): Promise<string> {
  const anthropic = ModelClients.getAnthropic();

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 8192,
    messages: [{
      role: 'user',
      content: `${analysisPrompt}\n\n${codeContext}`
    }]
  });

  const textContent = response.content.find(block => block.type === 'text');
  return textContent && textContent.type === 'text' ? textContent.text : '';
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
    case 'anthropic':
      return evaluateWithClaude(systemPrompt, evaluationPrompt);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Get judge by content type
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
