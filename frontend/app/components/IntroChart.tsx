"use client";
import { useEffect, useRef } from 'react';

export const IntroChart = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        let chart: any = null;

        const initChart = async () => {
             const LightweightCharts = await import('lightweight-charts');
             const { createChart, ColorType } = LightweightCharts;

             if (!containerRef.current) return;

             chart = createChart(containerRef.current, {
                layout: {
                    background: { type: ColorType.Solid, color: 'transparent' },
                    textColor: 'rgba(255, 255, 255, 0.5)'
                },
                grid: {
                    vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    horzLines: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight,
                timeScale: {
                    visible: false,
                    rightOffset: 5,
                    barSpacing: 12,
                },
                rightPriceScale: {
                    visible: false,
                    autoScale: true,
                    scaleMargins: {
                        top: 0.2,
                        bottom: 0.2,
                    },
                },
                crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
                handleScroll: false,
                handleScale: false,
            });

            // Use brighter, more visible colors with increased opacity
            const candlestickSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
                upColor: 'rgba(38, 166, 154, 0.95)',
                downColor: 'rgba(239, 83, 80, 0.95)',
                borderVisible: true,
                borderUpColor: 'rgba(38, 166, 154, 1)',
                borderDownColor: 'rgba(239, 83, 80, 1)',
                wickUpColor: 'rgba(38, 166, 154, 0.9)',
                wickDownColor: 'rgba(239, 83, 80, 0.9)',
            });

            // 1. Initial History - More candles for longer visibility
            const data = [];
            let time = Math.floor(Date.now() / 1000) - 115 * 86400;
            let open = 1000;

            // Generate 92 days of history (extra data before crash)
            for (let i = 0; i < 92; i++) {
                const volatility = 25;
                const bias = (Math.random() - 0.48) * volatility;
                const close = Math.max(10, open + bias);
                const bodyHigh = Math.max(open, close);
                const bodyLow = Math.min(open, close);
                const high = bodyHigh + Math.random() * 15;
                const low = Math.max(0.1, bodyLow - Math.random() * 15);

                data.push({ time, open, high, low, close });
                time += 86400;
                open = close;
            }
            candlestickSeries.setData(data);
            chart.timeScale().fitContent();

            // 2. Smooth Time-Based Animation
            let animationFrameId: number = 0;
            let candleIndex = 0;
            let lastTimestamp = performance.now();
            const CANDLES_PER_SECOND = 4; // 4 new candles per second for smooth continuous flow
            const MS_PER_CANDLE = 1000 / CANDLES_PER_SECOND;
            let accumulatedTime = 0;

            const crashStartCandle = 22; // Delayed crash start for 3 more seconds of normal trading

            const animate = (timestamp: number) => {
                // Calculate delta time for smooth, frame-rate independent animation
                const deltaTime = timestamp - lastTimestamp;
                lastTimestamp = timestamp;
                accumulatedTime += deltaTime;

                // Generate new candles based on elapsed time, not frames
                while (accumulatedTime >= MS_PER_CANDLE) {
                    accumulatedTime -= MS_PER_CANDLE;

                    // Calculate volatility and trend
                    let volatility = 25 + candleIndex * 0.8;
                    let trendBias = (Math.random() - 0.48) * 8;

                    // Intensify crash
                    if (candleIndex > crashStartCandle) {
                        const crashForce = (candleIndex - crashStartCandle) * 3.5;
                        trendBias -= crashForce;
                        volatility += 30;
                    }

                    const move = trendBias + (Math.random() - 0.5) * volatility;
                    const close = Math.max(1, open + move);

                    const bodyHigh = Math.max(open, close);
                    const bodyLow = Math.min(open, close);
                    const high = bodyHigh + Math.random() * volatility * 0.4;
                    const low = Math.max(0.1, bodyLow - Math.random() * volatility * 0.4);

                    const currentCandleTime = time + candleIndex * 86400;

                    candlestickSeries.update({
                        time: currentCandleTime,
                        open,
                        high,
                        low,
                        close
                    });

                    open = close;
                    candleIndex++;

                    // Smooth auto-scroll to keep recent candles visible
                    chart.timeScale().scrollToPosition(3, true);
                }

                animationFrameId = requestAnimationFrame(animate);
                if (containerRef.current) {
                    (containerRef.current as any)._animId = animationFrameId;
                }
            };

            requestAnimationFrame(animate);
            
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
