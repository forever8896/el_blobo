"use client";

import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';

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
    // Helper to convert "Zoom Factor" to Camera Distance
    // Assumes Distance 60 is "1x", so Distance 2 is "30x"
    const getDistance = (factor: number) => 60 / factor;
    
    // Initial state
    const zoomState = { factor: 30 };
    
    // Create GSAP Timeline
    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut" }
    });

    // Set initial zoom immediately
    if (blobRef.current) {
      blobRef.current.setZoom(getDistance(zoomState.factor));
    }

    tl.to(zoomState, {
      factor: 2,
      duration: 3,
      delay: 10,
      onUpdate: () => {
        if (blobRef.current) {
          blobRef.current.setZoom(getDistance(zoomState.factor));
        }
      }
    });

    return () => {
      tl.kill();
    };
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
