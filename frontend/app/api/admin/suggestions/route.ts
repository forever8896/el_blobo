/**
 * Admin Suggestions API
 *
 * GET - Retrieve current admin suggestions
 * PUT - Update admin suggestions (admin-only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminSuggestions, updateAdminSuggestions } from "@/app/lib/db-neon";
import { isAdmin, DEFAULT_JOB_SUGGESTIONS } from "@/app/config/admin";

/**
 * GET /api/admin/suggestions
 * Retrieve current admin suggestions
 */
export async function GET() {
  try {
    const suggestions = await getAdminSuggestions();

    return NextResponse.json({
      success: true,
      data: {
        suggestions: suggestions?.suggestions || DEFAULT_JOB_SUGGESTIONS,
        updated_by: suggestions?.updated_by || "system",
        updated_at: suggestions?.updated_at || new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching admin suggestions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch admin suggestions",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/suggestions
 * Update admin suggestions (admin-only)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { suggestions, walletAddress } = body;

    // Validate admin access
    if (!isAdmin(walletAddress)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Admin access required",
        },
        { status: 403 }
      );
    }

    // Validate input
    if (!suggestions || typeof suggestions !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input: suggestions text is required",
        },
        { status: 400 }
      );
    }

    // Update suggestions
    const updated = await updateAdminSuggestions({
      suggestions,
      updatedBy: walletAddress,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Admin suggestions updated successfully",
    });
  } catch (error: unknown) {
    console.error("Error updating admin suggestions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update admin suggestions",
      },
      { status: 500 }
    );
  }
}
