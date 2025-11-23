"use client";

import { useRouter } from "next/navigation";
import AICouncil from "../../../components/AICouncil";
import { use } from "react";

export const dynamic = 'force-dynamic';

export default function CouncilPage({ params }: { params: Promise<{ jobId: string }> }) {
  const router = useRouter();
  const { jobId } = use(params);

  const handleComplete = (approved: boolean, decision: string) => {
    console.log("Council Decision:", { approved, decision });
    if (approved) {
        // Maybe redirect to a success page or back to jobs
        router.push('/dashboard/jobs');
    }
  };

  // We need to pass submission data to AICouncil, but we don't have it in this context easily without fetching.
  // For now, we'll mock it to allow the page to render.
  return (
    <AICouncil
      projectId={jobId}
      submissionUrl="https://mock-submission.com"
      submissionNotes="Mock submission notes for viewing council."
      onComplete={handleComplete}
    />
  );
}
