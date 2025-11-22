import { NextResponse } from 'next/server';
import { supabaseServer } from '@/app/lib/db-server';

export interface RegisterUserRequest {
  walletAddress: string;
  username: string;
  interviewResponses?: string[];
  referrerAddress?: string;
}

export interface RegisterUserResponse {
  success: boolean;
  userId?: string;
  message?: string;
  user?: {
    id: string;
    wallet_address: string;
    username: string;
    skills: { responses: string[] } | null;
  };
}

export async function POST(
  req: Request
): Promise<NextResponse<RegisterUserResponse>> {
  try {
    const body: RegisterUserRequest = await req.json();
    const { walletAddress, username, interviewResponses, referrerAddress } =
      body;

    // Validate required fields
    if (!walletAddress || !username) {
      return NextResponse.json(
        {
          success: false,
          message: 'Wallet address and username are required',
        },
        { status: 400 }
      );
    }

    // Normalize wallet address to lowercase for consistency
    const normalizedAddress = walletAddress.toLowerCase();

    // Check if user already exists
    const { data: existingUser } = await supabaseServer
      .from('users')
      .select('*')
      .eq('wallet_address', normalizedAddress)
      .single();

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'User with this wallet address already exists',
        },
        { status: 409 }
      );
    }

    // Check if username is already taken
    const { data: existingUsername } = await supabaseServer
      .from('users')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUsername) {
      return NextResponse.json(
        {
          success: false,
          message: 'Username is already taken',
        },
        { status: 409 }
      );
    }

    // Prepare skills object
    const skills = interviewResponses
      ? { responses: interviewResponses }
      : null;

    // Create new user
    const { data: newUser, error } = await supabaseServer
      .from('users')
      .insert({
        wallet_address: normalizedAddress,
        username,
        skills,
        referrer_address: referrerAddress?.toLowerCase() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error creating user:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to create user in database',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: newUser.id,
      user: {
        id: newUser.id,
        wallet_address: newUser.wallet_address,
        username: newUser.username,
        skills: newUser.skills,
      },
      message: 'User registered successfully',
    });
  } catch (error) {
    console.error('Error in user registration:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
