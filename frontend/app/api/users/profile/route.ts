import { NextResponse } from 'next/server';
import { supabaseServer, User } from '@/app/lib/db-server';

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

    const normalizedAddress = walletAddress.toLowerCase();

    // Fetch user profile
    const { data: user, error } = await supabaseServer
      .from('users')
      .select('*')
      .eq('wallet_address', normalizedAddress)
      .single();

    if (error || !user) {
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

    const normalizedAddress = walletAddress.toLowerCase();

    // Update user profile
    const { data: updatedUser, error } = await supabaseServer
      .from('users')
      .update({
        username,
        skills,
      })
      .eq('wallet_address', normalizedAddress)
      .select()
      .single();

    if (error || !updatedUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to update user profile',
        },
        { status: 500 }
      );
    }

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
