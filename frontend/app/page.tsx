"use client";

import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import Link from 'next/link';

// Interface for the exposed methods of TheBlob component
interface BlobHandle {
  setZoom: (z: number) => void;
  setMode: (mode: string) => void;
}

// Dynamically import TheBlob to avoid SSR issues with Three.js
const TheBlob = dynamic(() => import('./components/TheBlob'), { ssr: false });

export default function Home() {
  const blobRef = useRef<BlobHandle>(null);

  useEffect(() => {
    const duration = 10000; // 10 seconds
    const startZoomFactor = 30; // "30x" Zoom (Very Close)
    const endZoomFactor = 2;    // "2x" Zoom (Farther)
    
    // Helper to convert "Zoom Factor" to Camera Distance
    // Assumes Distance 60 is "1x", so Distance 2 is "30x"
    const getDistance = (factor: number) => 60 / factor;
    
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing (optional, using simple linear for now as requested)
      const currentFactor = startZoomFactor - (startZoomFactor - endZoomFactor) * progress;
      const distance = getDistance(currentFactor);

      if (blobRef.current) {
        blobRef.current.setZoom(distance);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    // Start the animation loop
    requestAnimationFrame(animate);
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
       <div className="w-full h-full absolute inset-0 z-0">
         <TheBlob 
            ref={blobRef}
            initialMode="idle" 
            initialZoom={2.0} // Starting distance (60 / 30)
            highEnd={true}
            isDark={true}
         />
       </div>

       <div className="absolute bottom-8 right-8 z-50">
         <Link 
           href="/start/intro" 
           className="text-white/40 hover:text-white font-mono text-xs uppercase tracking-[0.2em] transition-all duration-500"
         >
           Skip
         </Link>
       </div>
    </div>
  );
}
