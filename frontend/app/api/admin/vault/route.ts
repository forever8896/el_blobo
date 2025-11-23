/**
 * Admin Vault API
 *
 * GET - Get vault balance and info
 */

import { NextResponse } from "next/server";
import { getTreasuryInfo, getVaultBalance } from "@/app/lib/contractUtils";

/**
 * GET /api/admin/vault
 * Get vault balance and treasury information
 */
export async function GET() {
  try {
    const [treasuryInfo, vaultBalance] = await Promise.all([
      getTreasuryInfo(),
      getVaultBalance(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        balance: vaultBalance.balanceFormatted,
        balanceWei: vaultBalance.balanceWei.toString(),
        treasury: treasuryInfo,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching vault info:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch vault information",
      },
      { status: 500 }
    );
  }
}
