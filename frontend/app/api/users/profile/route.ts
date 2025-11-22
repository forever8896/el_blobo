import { NextResponse } from 'next/server';
import { getUserByWallet, updateUser, User } from '@/app/lib/db-neon';

export interface GetProfileResponse {
  success: boolean;
  user?: User;
  message?: string;
}

export async function GET(req: Request): Promise<NextResponse<GetProfileResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        {
          success: false,
          message: 'Wallet address is required',
        },
        { status: 400 }
      );
    }

    // Fetch user profile
    const user = await getUserByWallet(walletAddress);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request): Promise<NextResponse<GetProfileResponse>> {
  try {
    const body = await req.json();
    const { walletAddress, username, skills } = body;

    if (!walletAddress) {
      return NextResponse.json(
        {
          success: false,
          message: 'Wallet address is required',
        },
        { status: 400 }
      );
    }

    // Update user profile
    const updatedUser = await updateUser({
      walletAddress,
      username,
      skills,
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
