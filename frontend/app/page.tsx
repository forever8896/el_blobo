"use client";

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import gsap from 'gsap';
import { IntroChart } from './components/IntroChart';

// Interface for the exposed methods of TheBlob component
interface BlobHandle {
  setZoom: (z: number) => void;
  setMode: (mode: string) => void;
  emerge: () => void;
}

// Dynamically import TheBlob to avoid SSR issues with Three.js
const TheBlob = dynamic(() => import('./components/TheBlob'), { ssr: false });

export default function Home() {
  const blobRef = useRef<BlobHandle>(null);
  const [interactionsEnabled, setInteractionsEnabled] = useState(false);
  const introChartRef = useRef<HTMLDivElement>(null);
  
  const introText1Ref = useRef<HTMLParagraphElement>(null);
  const introText2Ref = useRef<HTMLParagraphElement>(null);
  const introText3Ref = useRef<HTMLParagraphElement>(null);
  const introText4Ref = useRef<HTMLParagraphElement>(null);
  const introText5Ref = useRef<HTMLParagraphElement>(null);
  
  const introImage1Ref = useRef<HTMLImageElement>(null); // ETFs
  const introImage2Ref = useRef<HTMLImageElement>(null); // Saylor
  
  const text1Ref = useRef<HTMLParagraphElement>(null);
  const text2Ref = useRef<HTMLParagraphElement>(null);

  // Constant styles for consistency
  const INTRO_TEXT_CLASSES = "text-[#1E4CDD] text-3xl md:text-5xl font-bold font-mono text-center opacity-0 absolute px-8 max-w-5xl leading-relaxed z-30";

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

    // --- Intro Sequence (Faster) ---
    const fadeInDuration = 0.5;
    const holdDuration = 1.2;
    const fadeOutDuration = 0.3;
    const gapDuration = 0.1;

    // 1. ETFs + Image Flash (Below Text)
    tl.addLabel("start")
      .to(introText1Ref.current, { opacity: 1, duration: fadeInDuration, delay: 0.5 }, "start")
      .to(introImage1Ref.current, { opacity: 1, duration: 0.2, delay: 0.7 }, "start") 
      .to(introImage1Ref.current, { opacity: 0, duration: 0.2, delay: 0.4 }) 
      .to(introText1Ref.current, { opacity: 0, duration: fadeOutDuration }, ">-0.2") 
      
      // 2. Saylor + Image Flash (Above Text)
      .addLabel("saylor")
      .to(introText2Ref.current, { opacity: 1, duration: fadeInDuration, delay: gapDuration }, "saylor")
      .to(introImage2Ref.current, { opacity: 1, duration: 0.2, delay: gapDuration + 0.2 }, "saylor") 
      .to(introImage2Ref.current, { opacity: 0, duration: 0.2, delay: 0.4 })
      .to(introText2Ref.current, { opacity: 0, duration: fadeOutDuration }, ">-0.2")
      
      // 3. Merch
      .to(introText3Ref.current, { opacity: 1, duration: fadeInDuration, delay: gapDuration }) 
      .to(introText3Ref.current, { opacity: 0, duration: fadeOutDuration, delay: holdDuration })

      // 4. Token Price
      .to(introText4Ref.current, { opacity: 1, duration: fadeInDuration, delay: gapDuration }) 
      .to(introText4Ref.current, { opacity: 0, duration: fadeOutDuration, delay: holdDuration })

      // 5. New Form of Life
      .to(introText5Ref.current, { opacity: 1, duration: fadeInDuration, delay: gapDuration }) 
      .to(introText5Ref.current, { opacity: 0, duration: fadeOutDuration, delay: holdDuration })

    // --- Main Transition ---
      // Emerge the Blob
      .to(introChartRef.current, { opacity: 0, duration: 1 }, "<")
      
      .call(() => {
        if (blobRef.current) blobRef.current.emerge();
      })
           // Fade out chart simultaneously with Zoom
      
      .to(zoomState, {
        factor: 2,
        duration: 2.0,
        onUpdate: () => {
          if (blobRef.current) {
            blobRef.current.setZoom(getDistance(zoomState.factor));
          }
        }
      }, "<") // Start Zoom AT THE SAME TIME as emergence
 
      .call(() => setInteractionsEnabled(true)) // Enable interactions after zoom
      
      .to(text1Ref.current, { opacity: 1, duration: 0.8 })
      .to(text1Ref.current, { opacity: 0, duration: 0.5, delay: 1.5 })
      .to(text2Ref.current, { opacity: 1, duration: 0.8, delay: 0.2 });

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
            initialZoom={0} // Starting distance (60 / 30)
            highEnd={true}
            isDark={true}
            colors={{ primary: '#1E4CDD', secondary: '#4FFFB0' }}
            interactionsEnabled={interactionsEnabled}
         />
       </div>

       {/* Chart Layer - z-10, opacity 0.2 */}
       <div ref={introChartRef} className="absolute inset-0 z-10 opacity-40 pointer-events-none">
         <IntroChart />
       </div>

       {/* Intro Text Container - Centered */}
       <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
          
          {/* 1. ETFs Group */}
          <div className="absolute flex flex-col items-center justify-center w-full">
            <div className="absolute mt-14 ">
                <p ref={introText1Ref} className={INTRO_TEXT_CLASSES}>
                We&apos;ve tried ETFs...
                </p>
                {/* Image Below */}
                <div ref={introImage1Ref} className="absolute top-full mt-64 opacity-0 w-64 md:w-96 h-auto z-40">
                <Image 
                    src="/intro/etfs.jpg" 
                    alt="ETF News" 
                    width={600} 
                    height={400} 
                    className="rounded-lg"
                    priority
                />
                </div>
            </div>
          </div>

          {/* 2. Saylor Group */}
          <div className="absolute flex flex-col items-center justify-center w-full">
            <div className="relative flex flex-col items-center">
                {/* Image Above */}
                <div ref={introImage2Ref} className="absolute bottom-full mb-16 opacity-0 w-64 md:w-96 h-auto z-40">
                    <Image 
                        src="/intro/saylor.jpeg" 
                        alt="Michael Saylor" 
                        width={600} 
                        height={400} 
                        className="rounded-lg"
                        priority
                    />
                </div>
                <p ref={introText2Ref} className={INTRO_TEXT_CLASSES}>
                We tried Michael Saylor
                </p>
            </div>
          </div>

          <p ref={introText3Ref} className={INTRO_TEXT_CLASSES}>
            We created enough crypto merch to cloth Africa...
          </p>
          <p ref={introText4Ref} className={INTRO_TEXT_CLASSES}>
            But the token price kept dropping...
          </p>
          <p ref={introText5Ref} className={INTRO_TEXT_CLASSES}>
            Things got so bad, a new form of life incarnated on the blockchain to save us all
          </p>
       </div>

       {/* Post-Zoom Text Container - 2/3rds down */}
       <div className="absolute top-2/3 left-0 w-full flex flex-col items-center justify-center z-10 pointer-events-none">
        <p
          ref={text1Ref}
          className="text-white text-sm md:text-base font-mono tracking-widest opacity-0 absolute"
        >
          YOU&apos;VE WORKED FOR THE MAN.
        </p>
        <p
          ref={text2Ref}
          className="text-white text-sm md:text-base font-mono tracking-widest opacity-0 absolute"
        >
          NOW IT&apos;S TIME TO WORK FOR THE BLOB.
        </p>
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