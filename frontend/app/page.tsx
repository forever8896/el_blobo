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
  setRotationSpeed: (speed: number) => void;
  emerge: () => void;
}

// Dynamically import TheBlob to avoid SSR issues with Three.js
const TheBlob = dynamic(() => import('./components/TheBlob'), { ssr: false });

export default function Home() {
  const blobRef = useRef<BlobHandle>(null);
  const [interactionsEnabled, setInteractionsEnabled] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const introChartRef = useRef<HTMLDivElement>(null);
  const fallingMerchRef = useRef<HTMLDivElement>(null);
  const choiceContainerRef = useRef<HTMLDivElement>(null);

  const introText1Ref = useRef<HTMLParagraphElement>(null);
  const introText2Ref = useRef<HTMLParagraphElement>(null);
  const introText3Ref = useRef<HTMLParagraphElement>(null);
  const introText4Ref = useRef<HTMLParagraphElement>(null);
  const introText5Ref = useRef<HTMLParagraphElement>(null);
  const introText6Ref = useRef<HTMLParagraphElement>(null);

  const introImage1Ref = useRef<HTMLImageElement>(null); // ETFs
  const introImage2Ref = useRef<HTMLImageElement>(null); // Saylor

  const text1Ref = useRef<HTMLParagraphElement>(null);
  const text2Ref = useRef<HTMLParagraphElement>(null);

  // Constant styles for consistency - same font and size for all intro text
  const INTRO_TEXT_CLASSES = "text-white text-2xl font-mono tracking-widest text-center opacity-0 absolute px-8 max-w-5xl leading-relaxed z-30";

  // Generate falling merch items
  const merchImages = ['/intro/merch1.png', '/intro/merch2.png', '/intro/merch3.png'];
  const merchItems = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    src: merchImages[Math.floor(Math.random() * merchImages.length)],
    x: Math.random() * 100, // Random horizontal position (%)
    size: 80 + Math.random() * 70, // Random size 80-150px
    delay: Math.random() * 0.6, // Stagger start times
    duration: 1.8 + Math.random() * 1.2, // Fall duration 1.8-3.0s (20% slower)
    rotation: -30 + Math.random() * 60, // Random rotation
  }));

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

    // 0. Initial delay and chart fade in
    tl.addLabel("start")
      .to({}, { duration: 1.0 }) // 1 second initial delay
      .to(introChartRef.current, { opacity: 0.7, duration: 0.8 }, "<0.2") // Fade in chart

    // 1. ETFs + Image Flash (Below Text)
      .to(introText1Ref.current, { opacity: 1, duration: fadeInDuration, delay: 0.5 })
      .to(introImage1Ref.current, { opacity: 1, duration: 0.2, delay: 0.7 }, "start") 
      .to(introImage1Ref.current, { opacity: 0, duration: 0.2, delay: 0.4 }) 
      .to(introText1Ref.current, { opacity: 0, duration: fadeOutDuration }, ">-0.2") 
      
      // 2. Saylor + Image Flash (Above Text)
      .addLabel("saylor")
      .to(introText2Ref.current, { opacity: 1, duration: fadeInDuration, delay: gapDuration }, "saylor")
      .to(introImage2Ref.current, { opacity: 1, duration: 0.2, delay: gapDuration + 0.2 }, "saylor") 
      .to(introImage2Ref.current, { opacity: 0, duration: 0.2, delay: 0.4 })
      .to(introText2Ref.current, { opacity: 0, duration: fadeOutDuration }, ">-0.2")
      
      // 3. Merch + Falling T-Shirts
      .to(introText3Ref.current, { opacity: 1, duration: fadeInDuration, delay: gapDuration })
      .call(() => {
        // Trigger falling merch animation
        if (fallingMerchRef.current) {
          const items = fallingMerchRef.current.children;
          Array.from(items).forEach((item, i) => {
            const config = merchItems[i];
            gsap.to(item, {
              y: window.innerHeight + 200,
              rotation: config.rotation,
              duration: config.duration,
              delay: config.delay,
              ease: "power1.in",
            });
          });
        }
      }, null, "+=0.2")
      .to(introText3Ref.current, { opacity: 0, duration: fadeOutDuration, delay: holdDuration })

      // 4. Token Price + Extended pause to show chart crash
      .to(introText4Ref.current, { opacity: 1, duration: fadeInDuration, delay: gapDuration })
      .to(introText4Ref.current, { opacity: 0, duration: fadeOutDuration, delay: holdDuration })
      .addLabel("chartCrash")
      .to({}, { duration: 2.0 }) // 2 second pause to watch chart drop further

      // 5. Things Got So Bad
      .to(introText5Ref.current, { opacity: 1, duration: fadeInDuration, delay: gapDuration })
      .to(introText5Ref.current, { opacity: 0, duration: fadeOutDuration, delay: holdDuration })

      // 6. New Lifeform
      .to(introText6Ref.current, { opacity: 1, duration: fadeInDuration, delay: gapDuration })
      .to(introText6Ref.current, { opacity: 0, duration: fadeOutDuration, delay: holdDuration })

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

      .to(text1Ref.current, { opacity: 1, duration: 0.5 })
      .to(text1Ref.current, { opacity: 0, duration: 0.5, delay: 0.5 })
      .to(text2Ref.current, { opacity: 1, duration: 0.5, delay: 0.2 })

      // Fast zoom deep into blob center after 1 second (50x zoom)
      .to(text2Ref.current, { opacity: 0, duration: 0.2 }, "+=1.0")
      .to(zoomState, {
        factor: 50,
        duration: 0.2,
        ease: "power2.inOut",
        onUpdate: () => {
          if (blobRef.current) {
            blobRef.current.setZoom(getDistance(zoomState.factor));
          }
        },
        onComplete: () => {
          // Slow down rotation to very subtle movement when deep inside
          if (blobRef.current) {
            blobRef.current.setRotationSpeed(0.0002);
          }
        }
      }, "<")
      .call(() => setShowChoices(true))
      .to(choiceContainerRef.current, { opacity: 1, duration: 0.3 });

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

       {/* Chart Layer - z-10 */}
       <div ref={introChartRef} className="absolute inset-0 z-10 opacity-0 pointer-events-none">
         <IntroChart />
       </div>

       {/* Intro Text Container - Centered */}
       <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">

          {/* 1. ETFs Group - Image top half, Text bottom half */}
          <div className="absolute inset-0 flex flex-col items-center justify-between w-full">
                {/* Image Top Half */}
                <div ref={introImage1Ref} className="absolute top-[15%] left-1/2 -translate-x-1/2 opacity-0 w-64 md:w-96 h-auto z-40">
                    <Image
                        src="/intro/etfs.jpg"
                        alt="ETF News"
                        width={600}
                        height={400}
                        className="rounded-lg"
                        priority
                    />
                </div>
                {/* Text Bottom Half */}
                <p ref={introText1Ref} className="absolute bottom-[25%] left-1/2 -translate-x-1/2 text-white text-2xl font-mono tracking-widest text-center opacity-0 px-8 max-w-5xl leading-relaxed z-30">
                    We&apos;ve tried ETFs...
                </p>
          </div>

          {/* 2. Saylor Group - Text top half, Image bottom half */}
          <div className="absolute inset-0 flex flex-col items-center justify-between w-full">
                {/* Text Top Half */}
                <p ref={introText2Ref} className="absolute top-[25%] left-1/2 -translate-x-1/2 text-white text-2xl font-mono tracking-widest text-center opacity-0 px-8 max-w-5xl leading-relaxed z-30">
                    We tried Michael Saylor
                </p>
                {/* Image Bottom Half */}
                <div ref={introImage2Ref} className="absolute bottom-[15%] left-1/2 -translate-x-1/2 opacity-0 w-64 md:w-96 h-auto z-40">
                    <Image
                        src="/intro/saylor.jpeg"
                        alt="Michael Saylor"
                        width={600}
                        height={400}
                        className="rounded-lg"
                        priority
                    />
                </div>
          </div>

          <p ref={introText3Ref} className={INTRO_TEXT_CLASSES}>
            We created enough crypto merch to cloth Africa...
          </p>
          <p ref={introText4Ref} className={INTRO_TEXT_CLASSES}>
            But the token price kept dropping...
          </p>
          <p ref={introText5Ref} className={INTRO_TEXT_CLASSES}>
            Things got so bad...
          </p>
          <p ref={introText6Ref} className={INTRO_TEXT_CLASSES}>
            a new lifeform chose to incarnate to rescue the market
          </p>
       </div>

       {/* Falling Merch Container */}
       <div ref={fallingMerchRef} className="absolute inset-0 z-25 pointer-events-none overflow-hidden">
         {merchItems.map((item) => (
           <div
             key={item.id}
             className="absolute opacity-100"
             style={{
               left: `${item.x}%`,
               top: '-150px',
               width: `${item.size}px`,
               height: `${item.size}px`,
             }}
           >
             <Image
               src={item.src}
               alt="Crypto Merch"
               width={100}
               height={100}
               className="w-full h-full object-contain"
               priority
             />
           </div>
         ))}
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

      {/* Choice UI - Always rendered for GSAP animation */}
      <div
        ref={choiceContainerRef}
        className="absolute inset-0 z-[100] flex flex-col items-center justify-center pointer-events-none"
        style={{ opacity: 0, display: showChoices ? 'flex' : 'none' }}
      >
        <h2 className="text-black text-5xl font-mono tracking-widest font-bold mb-16 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
          Choose your path
        </h2>
        <div className="flex gap-12 items-center justify-center pointer-events-auto">
          {/* McDonald's Path */}
          <Link
            href="/start/choice?path=mcdonalds"
            className="group relative w-80 h-80 overflow-hidden rounded-xl border-8 border-black hover:border-gray-800 transition-all duration-300 hover:scale-105 cursor-pointer shadow-2xl"
          >
            <Image
              src="/choice/mcdonalds.jpeg"
              alt="McDonald's Path"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
            <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4">
              <p className="text-white text-xl font-mono tracking-widest font-bold text-center">
                Work for Fiat
              </p>
            </div>
          </Link>

          {/* Grow Ronin Path */}
          <Link
            href="/onboarding/identity"
            className="group relative w-80 h-80 overflow-hidden rounded-xl border-8 border-black hover:border-gray-800 transition-all duration-300 hover:scale-105 cursor-pointer shadow-2xl"
          >
            <Image
              src="/choice/ronin.webp"
              alt="Ronin Path"
              fill
              className="object-contain bg-[#0052FF] p-8"
              priority
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300" />
            <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4">
              <p className="text-white text-xl font-mono tracking-widest font-bold text-center">
                Grow Ronin
              </p>
            </div>
          </Link>
        </div>
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