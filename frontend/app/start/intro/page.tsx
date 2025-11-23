"use client";

import { useRouter } from "next/navigation";

export default function IntroPage() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center h-screen p-8 bg-blob-violet">
      <button
        onClick={() => router.push('/start/choice')}
        className="px-16 py-6 bg-blob-cobalt border-2 border-blob-mint text-white text-2xl font-black font-mono transition-all hover:scale-105 hover:shadow-[8px_8px_0px_#4FFFB0] hover:-translate-y-1 hover:-translate-x-1 active:scale-95 active:shadow-none active:translate-x-0 active:translate-y-0"
      >
        [[ INITIALIZE ]]
      </button>
    </div>
  );
}