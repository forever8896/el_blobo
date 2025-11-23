import { NextResponse } from "next/server";
import { getTreasuryInfo, formatTreasuryForAgent } from "@/app/lib/contractUtils";

/**
 * Test endpoint to verify treasury info is being fetched correctly
 */
export async function GET() {
  try {
    const treasuryInfo = await getTreasuryInfo();
    const formattedForAgent = formatTreasuryForAgent(treasuryInfo);

    return NextResponse.json({
      success: true,
      treasuryInfo,
      formattedForAgent
    });
  } catch (error) {
    console.error('Error fetching treasury info:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch treasury info'
    }, { status: 500 });
  }
}
