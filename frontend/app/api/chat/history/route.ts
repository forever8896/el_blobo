import { NextResponse } from 'next/server';
import { getChatHistory } from '@/app/lib/db-neon';

export interface GetChatHistoryResponse {
  success: boolean;
  messages?: Array<{
    id: string;
    user_address: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
  }>;
  message?: string;
}

export async function GET(req: Request): Promise<NextResponse<GetChatHistoryResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('walletAddress');
    const limitParam = searchParams.get('limit');

    if (!walletAddress) {
      return NextResponse.json(
        {
          success: false,
          message: 'Wallet address is required',
        },
        { status: 400 }
      );
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    // Fetch chat history from database
    const messages = await getChatHistory(walletAddress, limit);

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
