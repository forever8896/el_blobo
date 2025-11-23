import { NextRequest, NextResponse } from 'next/server';
import { createProject } from '@/app/lib/db-neon';

/**
 * Submit Test Task Endpoint
 *
 * Creates a test project/submission and triggers council evaluation
 */
export async function POST(req: NextRequest) {
  try {
    const {
      userAddress,
      username,
      taskTitle,
      taskDescription,
      submissionUrl,
      submissionNotes
    } = await req.json();

    if (!userAddress || !taskTitle || !taskDescription) {
      return NextResponse.json(
        { error: 'userAddress, taskTitle, and taskDescription are required' },
        { status: 400 }
      );
    }

    // Create a test project in the database
    const project = await createProject({
      contractKey: `test_${Date.now()}`,
      assigneeAddress: userAddress.toLowerCase(),
      title: taskTitle,
      description: taskDescription,
    });

    // If submission provided, trigger council evaluation
    let councilResults = null;
    if (submissionUrl) {
      try {
        // Trigger council evaluation in parallel for all 3 judges
        const councilMembers = [
          {
            id: 'validator_prime',
            name: 'VALIDATOR-PRIME',
            personality: 'Technical perfectionist who demands quality code and solid implementation'
          },
          {
            id: 'chaos_arbiter',
            name: 'CHAOS-ARBITER',
            personality: 'Creative rebel who loves bold ideas and unconventional solutions'
          },
          {
            id: 'impact_sage',
            name: 'IMPACT-SAGE',
            personality: 'Wise community advocate focused on real-world value and ecosystem growth'
          }
        ];

        const evaluationPromises = councilMembers.map(judge =>
          fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/council/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              judgeId: judge.id,
              judgeName: judge.name,
              judgePersonality: judge.personality,
              projectId: project.id,
              submissionUrl,
              submissionNotes: submissionNotes || `Test submission by ${username}`
            })
          }).then(res => res.json())
        );

        councilResults = await Promise.all(evaluationPromises);
      } catch (error) {
        console.error('Error triggering council evaluation:', error);
        // Don't fail the request if council evaluation fails
      }
    }

    return NextResponse.json({
      success: true,
      project,
      councilResults,
      message: submissionUrl
        ? 'Test task submitted and sent to council for evaluation'
        : 'Test task created (not yet submitted)'
    });

  } catch (error) {
    console.error('Error submitting test task:', error);
    return NextResponse.json(
      { error: 'Failed to submit test task' },
      { status: 500 }
    );
  }
}
