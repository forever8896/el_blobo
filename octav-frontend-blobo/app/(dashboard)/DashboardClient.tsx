'use client';

import dynamic from 'next/dynamic';
import Portfolio from '@/components/example/portfolio';

// Dynamically load the blob on the client only
const ParticleLifeform = dynamic(
  () => import('@/components/blob/TheBlob'),
  { ssr: false }
);

export default function DashboardClient() {
  return (
    <div className="flex flex-col items-center gap-8">
      {/* Blob wrapper: full width, center child */}
      <div className="w-full flex justify-center mt-4">
        {/* Blob widget: constrained width, tall height, centered */}
        <div className="w-full max-w-3xl h-[800px] rounded-xl flex items-center justify-center">
          <ParticleLifeform
            initialMode="idle"
            initialZoom={20}          // use zoom 20
            highEnd
            isDark
            interactionsEnabled
            // Blue-ish version of the blob
            colors={{
              primary: '#3b82f6',   // blue-500
              secondary: '#a5b4fc', // soft blue/indigo
            }}
          />
        </div>
      </div>
    </div>
  );
}
