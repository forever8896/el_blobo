import { NextResponse } from 'next/server';
import {
  createUser,
  getUserByWallet,
  isUsernameTaken,
} from '@/app/lib/db-neon';

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

    // Check if user already exists
    const existingUser = await getUserByWallet(walletAddress);

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
    const usernameTaken = await isUsernameTaken(username);

    if (usernameTaken) {
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
    const newUser = await createUser({
      walletAddress,
      username,
      skills,
      referrerAddress: referrerAddress || null,
    });

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
