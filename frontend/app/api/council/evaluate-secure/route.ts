/**
 * Secure AI Council Evaluation Endpoint (v2)
 *
 * Uses AI models' NATIVE capabilities:
 * - Grok has direct X/Twitter access
 * - Gemini processes video URLs natively
 * - GPT-4o analyzes code and images from URLs
 * - Models share insights with each other
 *
 * Security features:
 * - Multi-layer prompt injection protection
 * - Output validation and monitoring
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from 'next/server';
import { CouncilOrchestrator } from '@/app/lib/council/orchestrator-simple';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { projectId, submissionUrl, submissionNotes } = await req.json();

    // Validate required fields
    if (!projectId || !submissionUrl) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['projectId', 'submissionUrl']
        },
        { status: 400 }
      );
    }

    console.log(`[COUNCIL] Starting evaluation for project ${projectId}`);

    // Initialize orchestrator
    const orchestrator = new CouncilOrchestrator();

    // Run full evaluation with multi-agent coordination
    const result = await orchestrator.evaluateSubmission(
      projectId,
      submissionUrl,
      submissionNotes || ''
    );

    // Save all votes to database
    try {
      const { saveCouncilVote } = await import('@/app/lib/db-neon');

      for (const vote of result.votes) {
        await saveCouncilVote({
          projectId,
          judgeId: vote.judgeId,
          judgeName: vote.judgeName,
          vote: vote.vote,
          reason: vote.reasoning,
          aiProvider: vote.aiProvider
        });
      }

      console.log(`[COUNCIL] Saved ${result.votes.length} votes for project ${projectId}`);
    } catch (error) {
      console.error('[COUNCIL] Error saving votes to database:', error);
      // Don't fail the request if saving fails
    }

    const duration = Date.now() - startTime;

    console.log(`[COUNCIL] Evaluation complete for ${projectId} in ${duration}ms`);
    console.log(`[COUNCIL] Consensus: ${result.consensus.approved ? 'APPROVED' : 'REJECTED'} (${result.consensus.approvalRate * 100}%)`);

    // Return comprehensive result
    return NextResponse.json({
      success: true,
      projectId,
      submissionUrl,
      consensus: result.consensus,
      votes: result.votes,
      security: result.securityAnalysis,
      contentType: result.contentType,
      communications: result.communications.map(comm => ({
        from: comm.from,
        to: comm.to,
        contentType: comm.contentType,
        summary: comm.summary.substring(0, 200) + '...'
      })),
      metrics: {
        duration,
        judgeCount: result.votes.length,
        communicationCount: result.communications.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[COUNCIL] Evaluation error:', error);

    // Check if it's a security validation error
    if (error.message?.includes('Security validation failed')) {
      return NextResponse.json(
        {
          error: 'Security validation failed',
          message: 'The submission contains potentially malicious content',
          details: error.message
        },
        { status: 400 }
      );
    }

    // Check if it's a missing API key error
    if (error.message?.includes('not configured')) {
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: 'AI service not properly configured',
          details: error.message
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Evaluation failed',
        message: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve evaluation status
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      );
    }

    // Retrieve votes from database
    const { getProjectVotes } = await import('@/app/lib/db-neon');
    const votes = await getProjectVotes(projectId);

    if (!votes || votes.length === 0) {
      return NextResponse.json(
        { error: 'No evaluation found for this project' },
        { status: 404 }
      );
    }

    // Calculate consensus
    const approvalCount = votes.filter((v: any) => v.vote).length;
    const rejectionCount = votes.filter((v: any) => !v.vote).length;
    const approvalRate = votes.length > 0 ? approvalCount / votes.length : 0;

    return NextResponse.json({
      projectId,
      votes,
      consensus: {
        approved: approvalRate >= 0.5,
        approvalCount,
        rejectionCount,
        approvalRate
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[COUNCIL] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve evaluation', message: error.message },
      { status: 500 }
    );
  }
}
