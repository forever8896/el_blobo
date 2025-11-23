"use client";

import { useRouter } from "next/navigation";
import WorkSubmission from "../../../components/WorkSubmission";
import { use } from "react";

export default function SubmitPage({ params }: { params: Promise<{ jobId: string }> }) {
  const router = useRouter();
  const { jobId } = use(params);

  // Mock project data lookup
  const project = {
    id: jobId,
    title: "Create engaging meme for Base blockchain",
    description: "Twitter sentiment shows memecoin fatigue. Create a FRESH, creative meme that doesn't suck. Must be original, funny, and actually help the ecosystem.",
    price_estimate: 150,
    deadline_end: new Date(Date.now() + 24 * 60 * 60 * 1000)
  };

  const handleSubmit = (url: string, notes: string) => {
    console.log("Submitting:", { jobId, url, notes });
    // In reality: await fetch('/api/projects/submit', ...)
    router.push(`/dashboard/council/${jobId}`);
  };

  return (
    <WorkSubmission
      project={project}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
}
