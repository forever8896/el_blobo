import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate Test Task Endpoint
 *
 * AI generates a realistic task that could be submitted to The Blob,
 * then asks the user if they want to submit it for council evaluation.
 */
export async function POST(req: NextRequest) {
  try {
    const { userAddress, username } = await req.json();

    if (!userAddress || !username) {
      return NextResponse.json(
        { error: 'userAddress and username are required' },
        { status: 400 }
      );
    }

    // Ask AI to generate a realistic test task
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are THE BLOB's AI assistant. Generate a realistic test task that a user could submit for evaluation.

The task should be:
- Relevant to web3/blockchain ecosystem growth
- Specific and measurable
- Something that could actually be completed
- Creative and interesting

Examples of good tasks:
- "Write a tutorial on using Ronin wallet for beginners"
- "Create 5 memes promoting The Blob on Twitter"
- "Build a simple NFT gallery widget"
- "Record a 2-minute explainer video about The Blob's mission"
- "Write documentation for integrating Blob API"

Respond in JSON format:
{
  "title": "Brief task title (5-8 words)",
  "description": "Detailed description of what needs to be done (2-3 sentences)",
  "estimatedReward": "0.5-2.0" (string, in RON),
  "category": "content" | "code" | "design" | "marketing" | "documentation"
}`
        },
        {
          role: 'user',
          content: `Generate a test task for user ${username} (${userAddress}). Make it creative and fun!`
        }
      ],
      temperature: 0.9,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from AI');
    }

    const task = JSON.parse(response);

    return NextResponse.json({
      success: true,
      task: {
        ...task,
        generatedFor: username,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating test task:', error);
    return NextResponse.json(
      { error: 'Failed to generate test task' },
      { status: 500 }
    );
  }
}
