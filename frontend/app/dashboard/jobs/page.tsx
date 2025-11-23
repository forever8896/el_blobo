"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = 'force-dynamic';

interface Project {
  id: string;
  title: string;
  description: string;
  created_at: string;
  status: string; // derived
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Mock fetching jobs for now since we don't have the endpoint yet
    // In a real scenario, this would fetch from /api/projects?walletAddress=...
    const fetchJobs = async () => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setJobs([
            {
                id: '1',
                title: 'Create engaging meme for Base blockchain',
                description: 'Twitter sentiment shows memecoin fatigue...',
                created_at: new Date().toISOString(),
                status: 'active'
            }
        ]);
        setLoading(false);
    };

    fetchJobs();
  }, []);

  return (
    <div className="min-h-screen bg-blob-violet p-8">
      <h1 className="text-4xl font-black text-white mb-8 font-display border-b-2 border-blob-cobalt pb-4">
        AVAILABLE JOBS
      </h1>

      {loading ? (
        <div className="text-blob-mint animate-pulse font-mono">LOADING_JOBS...</div>
      ) : (
        <div className="grid gap-6">
          {jobs.map(job => (
            <div key={job.id} className="bg-black border-2 border-blob-cobalt p-6 hover:shadow-[8px_8px_0px_#1E4CDD] transition-all">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-blob-mint font-mono">{job.title}</h2>
                <span className="bg-blob-orange text-black px-3 py-1 font-bold text-xs font-mono">
                  {job.status.toUpperCase()}
                </span>
              </div>
              <p className="text-blob-peach mb-6 font-mono text-sm line-clamp-2">
                {job.description}
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => router.push(`/dashboard/submit/${job.id}`)}
                  className="flex-1 bg-blob-cobalt border-2 border-blob-mint text-white font-bold py-3 font-mono hover:-translate-y-1 hover:shadow-[4px_4px_0px_#4FFFB0] transition-all"
                >
                  SUBMIT WORK
                </button>
                <button 
                   onClick={() => router.push(`/dashboard/council/${job.id}`)}
                   className="flex-1 bg-transparent border-2 border-blob-cobalt text-white font-bold py-3 font-mono hover:bg-blob-cobalt transition-all"
                >
                  VIEW STATUS
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
