import { NextResponse } from 'next/server';
import { getVaultBalance } from '@/app/lib/contractUtils';

/**
 * Get Vault Balance Endpoint
 *
 * Returns the current balance of the reward vault contract
 */
export async function GET() {
  try {
    const balance = await getVaultBalance();

    return NextResponse.json({
      success: true,
      balance: {
        wei: balance.balanceWei.toString(),
        ron: balance.balanceFormatted,
        formatted: `${parseFloat(balance.balanceFormatted).toFixed(4)} RON`
      }
    });
  } catch (error) {
    console.error('Error fetching vault balance:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch vault balance',
        balance: {
          wei: '0',
          ron: '0',
          formatted: '0 RON'
        }
      },
      { status: 500 }
    );
  }
}
