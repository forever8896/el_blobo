import { NextResponse } from 'next/server';
import {
  createProject,
  getProjectsByUser,
  updateProjectSubmission,
  Project,
} from '@/app/lib/db-neon';

export interface CreateProjectRequest {
  contractKey: string;
  assigneeAddress: string;
  title: string;
  description: string;
}

export interface UpdateProjectRequest {
  projectId: string;
  submissionUrl?: string;
  submissionNotes?: string;
}

export interface ProjectsResponse {
  success: boolean;
  projects?: Project[];
  project?: Project;
  message?: string;
}

/**
 * GET - Fetch projects for a user
 */
export async function GET(req: Request): Promise<NextResponse<ProjectsResponse>> {
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

    // Fetch all projects for this user
    const projects = await getProjectsByUser(walletAddress);

    return NextResponse.json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new project
 */
export async function POST(req: Request): Promise<NextResponse<ProjectsResponse>> {
  try {
    const body: CreateProjectRequest = await req.json();
    const { contractKey, assigneeAddress, title, description } = body;

    // Validate required fields
    if (!contractKey || !assigneeAddress || !title || !description) {
      return NextResponse.json(
        {
          success: false,
          message: 'contractKey, assigneeAddress, title, and description are required',
        },
        { status: 400 }
      );
    }

    // Create the project
    const project = await createProject({
      contractKey,
      assigneeAddress,
      title,
      description,
    });

    return NextResponse.json({
      success: true,
      project,
      message: 'Project created successfully',
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update project submission
 */
export async function PUT(req: Request): Promise<NextResponse<ProjectsResponse>> {
  try {
    const body: UpdateProjectRequest = await req.json();
    const { projectId, submissionUrl, submissionNotes } = body;

    // Validate required fields
    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          message: 'projectId is required',
        },
        { status: 400 }
      );
    }

    // Update the project
    const project = await updateProjectSubmission({
      projectId,
      submissionUrl,
      submissionNotes,
    });

    return NextResponse.json({
      success: true,
      project,
      message: 'Project updated successfully',
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
