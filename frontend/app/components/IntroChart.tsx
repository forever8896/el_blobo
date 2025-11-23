"use client";
import { useEffect, useRef } from 'react';

export const IntroChart = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        let chart: any = null;

        const initChart = async () => {
             const { createChart, ColorType, CandlestickSeries } = await import('lightweight-charts');

             if (!containerRef.current) return;

             chart = createChart(containerRef.current, {
                layout: { 
                    background: { type: ColorType.Solid, color: 'transparent' }, 
                    textColor: 'rgba(255, 255, 255, 0.3)' 
                },
                grid: { 
                    vertLines: { color: 'rgba(255, 255, 255, 0.05)' }, 
                    horzLines: { color: 'rgba(255, 255, 255, 0.05)' } 
                },
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight,
                timeScale: { visible: false },
                rightPriceScale: { visible: false },
                crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
                handleScroll: false,
                handleScale: false,
            });

                        const candlestickSeries = chart.addSeries(CandlestickSeries, {
                            upColor: '#26a69a', 
                            downColor: '#ef5350', 
                            borderVisible: false, 
                            wickUpColor: '#26a69a', 
                            wickDownColor: '#ef5350' 
                        });
            
                        // 1. Initial History (Stabilization)
                        const data = [];
                        let time = Math.floor(Date.now() / 1000) - 100 * 86400;
                        let open = 1000;
                        let currentClose = 1000;
            
                        // Generate 50 days of history first
                        for (let i = 0; i < 50; i++) {
                            const volatility = 15;
                            const bias = (Math.random() - 0.4) * volatility; // Slight upward bias initially
                            const close = Math.max(10, open + bias);
                            const high = Math.max(open, close) + Math.random() * 10;
                            const low = Math.min(open, close) - Math.random() * 10;
                            
                            data.push({ time: time, open, high, low, close });
                            time += 86400;
                            open = close;
                            currentClose = close;
                        }
                        candlestickSeries.setData(data);
                        chart.timeScale().fitContent();
            
                                                            // 2. Animation Loop (The Dump)
            
                                                            let animationFrameId: number = 0;
            
                                                            let tickIndex = 0; // Total animation frames
            
                                                            let candleIndex = 0; // Actual candles added
            
                                                            const ticksPerCandle = 6; // Increased for smooth 60fps (approx 10 candles/sec)
            
                                                            let currentCandleTicks = 0;
            
                                                            
            
                                                            // Start crash relative to candle count
            
                                                            const crashStartCandle = 10; 
            
                                                
            
                                                            const animate = () => {
            
                                                                // No throttle: Run at native refresh rate (usually 60fps) for maximum smoothness
            
                                                                tickIndex++;
            
                                                
            
                                                                // Determine volatility & trend based on CANDLE index (macro trend)
            
                                                                let volatility = 15 + candleIndex * 0.5;
            
                                                                let trendBias = (Math.random() - 0.5) * 5; 
            
                                                
            
                                                                // Crash Logic
            
                                                                if (candleIndex > crashStartCandle) {
            
                                                                    trendBias -= (candleIndex - crashStartCandle) * 2.0; // Strong down trend
            
                                                                    volatility += 20;
            
                                                                }
            
                                                
            
                                                                // Random walk for the "current price" (close)
            
                                                                let move = trendBias + (Math.random() - 0.5) * volatility;
            
                                                                let currentPrice = open + move;
            
                                                                
            
                                                                if (currentPrice < 1) currentPrice = 1;
            
                                                
            
                                                                const close = currentPrice;
            
                                                                
            
                                                                // Wicks need to contain the open and close
            
                                                                const bodyHigh = Math.max(open, close);
            
                                                                const bodyLow = Math.min(open, close);
            
                                                                
            
                                                                const high = bodyHigh + Math.random() * volatility * 0.2;
            
                                                                let low = bodyLow - Math.random() * volatility * 0.2;
            
                                                                if (low < 0.1) low = 0.1;
            
                                                
            
                                                                const currentCandleTime = time + candleIndex * 86400;
            
                                                
            
                                                                const candleUpdate = {
            
                                                                    time: currentCandleTime, 
            
                                                                    open: open,
            
                                                                    high: high,
            
                                                                    low: low,
            
                                                                    close: close
            
                                                                };
            
                                                
            
                                                                candlestickSeries.update(candleUpdate);
            
                                                                // Use false to prevent animation on the scroll itself which can cause jitter
            
                                                                chart.timeScale().scrollToRealTime(); 
            
                                                
            
                                                                currentCandleTicks++;
            
                                                                
            
                                                                // If we've ticked enough for this candle, finalize it and prepare next
            
                                                                if (currentCandleTicks >= ticksPerCandle) {
            
                                                                    open = close; // Next candle opens at this close
            
                                                                    candleIndex++;
            
                                                                    currentCandleTicks = 0;
            
                                                                }
            
                                                
            
                                                                animationFrameId = requestAnimationFrame(animate);
            
                                                                if (containerRef.current) {
            
                                                                     (containerRef.current as any)._animId = animationFrameId;
            
                                                                }
            
                                                            };
            
                                    
            
                                                animate();
            
                                            };
            
                    initChart();
            
                    const handleResize = () => {
                        if(containerRef.current && chart) {
                            chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
                        }
                    };
            
                    window.addEventListener('resize', handleResize);
            
                    return () => {
                        window.removeEventListener('resize', handleResize);
                        if (containerRef.current && (containerRef.current as any)._animId) {
                            cancelAnimationFrame((containerRef.current as any)._animId);
                        }
                        if (chart) {
                            chart.remove();
                        }
                    };    }, []);

    return <div ref={containerRef} className="w-full h-full absolute inset-0 pointer-events-none" />;
};
