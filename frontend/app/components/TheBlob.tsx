"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js';

// --- SHADER DEFINITIONS ---

const vsHigh = `
    uniform float uTime;
    uniform float uSpeed;
    uniform float uNoiseStrength;
    uniform float uNoiseFrequency;
    uniform float uState;
    uniform vec2 uMouse;
    uniform float uMouseVel;
    uniform float uAppearance;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying float vNoise;
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) { const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0); vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx); vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g; vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy); vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy; i = mod289(i); vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i.x, 1.0)); float n_ = 0.142857142857; vec3 ns = n_ * D.wyz - D.xzx; vec4 j = p - 49.0 * floor(p * ns.z * ns.z); vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_); vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y); vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw); vec4 s0 = floor(b0) * 2.0 + 1.0; vec4 s1 = floor(b1) * 2.0 + 1.0; vec4 sh = -step(h, vec4(0.0)); vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww; vec3 p0 = vec3(a0.xy, h.x); vec3 p1 = vec3(a0.zw, h.y); vec3 p2 = vec3(a1.xy, h.z); vec3 p3 = vec3(a1.zw, h.w); vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3))); p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w; vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0); m = m * m; return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3))); }
    vec3 curlNoise(vec3 p) { const float e = 0.01; float n1 = snoise(vec3(p.x, p.y + e, p.z)); float n2 = snoise(vec3(p.x, p.y - e, p.z)); float n3 = snoise(vec3(p.x, p.y, p.z + e)); float n4 = snoise(vec3(p.x, p.y, p.z - e)); float n5 = snoise(vec3(p.x + e, p.y, p.z)); float n6 = snoise(vec3(p.x - e, p.y, p.z)); float x = n2 - n1; float y = n4 - n3; float z = n6 - n5; return normalize(vec3(y, z, x)); }
    void main() {
        vPosition = position;
        vNormal = normalize(normalMatrix * normal);
        float time = uTime * uSpeed;
        float baseNoise = snoise(position * uNoiseFrequency * 0.8 + time * 0.5);
        vec3 flow = curlNoise(position * uNoiseFrequency + time);
        vec3 newPos = position;
        newPos += normal * baseNoise * uNoiseStrength * 0.7;
        
        if (uState < 0.5) { // IDLE
            newPos += flow * uNoiseStrength * 0.3;
        } else if (uState < 1.5) { // REPLYING
            float breath = sin(time * 1.5) * 0.5 + 0.5;
            newPos += normal * breath * 0.15;
            newPos += flow * uNoiseStrength * 0.2;
            newPos.x *= 1.0 + (breath * 0.1 * smoothstep(0.5, 0.0, abs(position.y)));
        } else if (uState < 2.5) { // PROCESSING
            newPos += flow * uNoiseStrength * 0.8;
            float angle = baseNoise * 0.5;
            mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
            newPos.xz = rot * newPos.xz;
        } else if (uState < 3.5) { // LISTENING
            newPos += flow * uNoiseStrength * 0.5;
            newPos.y += sin(time * 0.8 + position.x * 2.0) * 0.2;
            newPos.y += sin(uTime * 0.3) * 0.5; 
        } else { // SLEEPING
            newPos *= 0.8;
            newPos += normal * sin(uTime * 1.0) * 0.05; 
            newPos += flow * uNoiseStrength * 0.1;
        }

        if (uMouseVel > 0.01) {
            float startle = snoise(position * 10.0 + uTime * 20.0);
            newPos += normal * startle * uMouseVel * 2.0;
        }
        
        // Emergence
        float twist = (1.0 - uAppearance) * 5.0;
        float cT = cos(twist);
        float sT = sin(twist);
        mat2 rotT = mat2(cT, -sT, sT, cT);
        newPos.xz = rotT * newPos.xz;
        newPos *= uAppearance;

        float mouseDist = distance(uMouse, newPos.xy);
        newPos.z += smoothstep(1.0, 0.0, mouseDist) * 0.2;
        vNoise = baseNoise;
        vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
        gl_PointSize = (20.0 * (1.0 + baseNoise * 0.3) / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fsHigh = `
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform float uState;
    uniform float uTime;
    uniform float uAppearance;
    varying float vNoise;
    varying vec3 vPosition;
    varying vec3 vNormal;
    void main() {
        float r = distance(gl_PointCoord, vec2(0.5));
        float alpha = 1.0 - smoothstep(0.3, 0.5, r);
        vec3 viewDir = normalize(-vPosition);
        float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.5);
        float deepStructure = smoothstep(-0.3, 0.4, vNoise);
        alpha *= (0.3 + 0.7 * deepStructure);
        
        alpha *= uAppearance;
        
        if (alpha < 0.01) discard;
        vec3 finalColor = uColor1;
        float noiseMix = smoothstep(-0.6, 0.6, vNoise);
        
        if (uState < 0.5) { finalColor = mix(uColor1, uColor2, noiseMix); }
        else if (uState < 1.5) { float pulse = 0.5 + 0.5 * sin(uTime * 1.5 + vNoise * 3.0); finalColor = mix(uColor1, uColor2, pulse); }
        else if (uState < 2.5) { finalColor = mix(uColor1, uColor2, pow(noiseMix, 3.0)); }
        else if (uState < 3.5) { finalColor = mix(uColor2, uColor1, pow(1.0 - noiseMix, 2.0)); }
        else { 
            finalColor = mix(uColor1 * 0.5, uColor2 * 0.5, noiseMix);
            finalColor *= 0.6;
        }
        
        finalColor += uColor2 * fresnel * 2.0;
        finalColor += vec3(0.05);
        gl_FragColor = vec4(finalColor, alpha);
    }
`;

const vsSimple = `
    uniform float uTime;
    uniform float uSpeed;
    uniform float uNoiseStrength;
    uniform float uNoiseFrequency;
    uniform float uState; 
    uniform vec2 uMouse;
    uniform float uMouseVel;
    uniform float uAppearance;
    varying vec3 vPosition;
    varying float vNoise;
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) { const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0); vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx); vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g; vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy); vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy; i = mod289(i); vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0)); float n_ = 0.142857142857; vec3 ns = n_ * D.wyz - D.xzx; vec4 j = p - 49.0 * floor(p * ns.z * ns.z); vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_); vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y); vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw); vec4 s0 = floor(b0) * 2.0 + 1.0; vec4 s1 = floor(b1) * 2.0 + 1.0; vec4 sh = -step(h, vec4(0.0)); vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww; vec3 p0 = vec3(a0.xy, h.x); vec3 p1 = vec3(a0.zw, h.y); vec3 p2 = vec3(a1.xy, h.z); vec3 p3 = vec3(a1.zw, h.w); vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3))); p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w; vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0); m = m * m; return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3))); }
    void main() {
        vPosition = position;
        float time = uTime * uSpeed;
        float noise = snoise(position * uNoiseFrequency + time);
        vec3 newPos = position;
        if (uState < 0.5) { newPos += normal * noise * uNoiseStrength; }
        else if (uState < 1.5) { float pulse = snoise(position * 2.0 + time * 1.5); newPos += normal * (noise * uNoiseStrength + pulse * 0.1); float mouthOpen = sin(time * 3.0) * 0.5 + 0.5; newPos.x *= 1.0 + (mouthOpen * 0.1 * (1.0 - smoothstep(0.0, 1.0, abs(position.y)))); }
        else if (uState < 2.5) { float angle = noise * 1.5; float s = sin(angle); float c = cos(angle); mat2 rot = mat2(c, -s, s, c); newPos.xz = rot * newPos.xz; newPos += normal * noise * (uNoiseStrength * 0.6); }
        else if (uState < 3.5) { newPos.y += sin(time + position.x) * 0.3; newPos += normal * noise * uNoiseStrength; }
        else { newPos *= 0.8; newPos += normal * noise * (uNoiseStrength * 0.5); }

        if (uMouseVel > 0.01) {
            newPos += normal * snoise(position * 10.0) * uMouseVel * 2.0;
        }
        
        float twist = (1.0 - uAppearance) * 5.0;
        float cT = cos(twist);
        float sT = sin(twist);
        mat2 rotT = mat2(cT, -sT, sT, cT);
        newPos.xz = rotT * newPos.xz;
        newPos *= uAppearance;

        float mouseDist = distance(uMouse, newPos.xy);
        newPos.z += smoothstep(1.0, 0.0, mouseDist) * 0.2;
        vNoise = noise;
        vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
        gl_PointSize = (30.0 * 1.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fsSimple = `
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform float uState;
    uniform float uTime;
    uniform float uAppearance;
    varying float vNoise;
    varying vec3 vPosition;
    void main() {
        float r = distance(gl_PointCoord, vec2(0.5));
        if (r > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.4, 0.5, r);
        
        alpha *= uAppearance;
        
        vec3 finalColor = uColor1;
        float noiseMix = smoothstep(-0.5, 0.5, vNoise);
        if (uState < 0.5) { finalColor = mix(uColor1, uColor2, noiseMix); }
        else if (uState < 1.5) { float pulse = 0.5 + 0.5 * sin(uTime * 3.0 + vNoise * 2.0); finalColor = mix(uColor1, uColor2, pulse); }
        else if (uState < 2.5) { finalColor = mix(uColor1, uColor2, pow(noiseMix, 2.0)); }
        else if (uState < 3.5) { finalColor = mix(uColor2, uColor1, pow(1.0 - noiseMix, 2.0)); }
        else { finalColor = mix(uColor1 * 0.6, uColor2 * 0.6, noiseMix); }

        finalColor += vec3(0.05);
        gl_FragColor = vec4(finalColor, alpha);
    }
`;

// --- CONSTANTS ---

const STATES = {
    'idle':      { speed: 0.15, strength: 0.3, freq: 0.8, stateId: 0.0 },
    'replying':  { speed: 0.2, strength: 0.35, freq: 0.9, stateId: 1.0 },
    'processing':{ speed: 0.1, strength: 0.6, freq: 0.5, stateId: 2.0 },
    'listening': { speed: 0.15, strength: 0.4, freq: 0.6, stateId: 3.0 },
    'sleeping':  { speed: 0.05, strength: 0.1, freq: 0.3, stateId: 4.0 }
};

interface ParticleLifeformProps {
    initialMode?: string;
    initialZoom?: number;
    colors?: { primary: string; secondary: string };
    highEnd?: boolean;
    isDark?: boolean;
}

const ParticleLifeform = forwardRef<unknown, ParticleLifeformProps>(({ 
    initialMode = 'idle',
    initialZoom = 3.8,
    colors = { primary: '#E000E0', secondary: '#FFE000' },
    highEnd = true,
    isDark = false
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const composerRef = useRef<EffectComposer | null>(null);
    const particlesRef = useRef<THREE.Points | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniformsRef = useRef<any>(null);
    const bloomPassRef = useRef<UnrealBloomPass | null>(null);
    const materialsRef = useRef<{ high?: THREE.ShaderMaterial; simple?: THREE.ShaderMaterial }>({});
    const clockRef = useRef(new THREE.Clock());
    const requestRef = useRef<number>(0);
    
    // State Ref to hold values without re-rendering
    const stateRef = useRef({
        targetConfig: STATES[initialMode as keyof typeof STATES] || STATES['idle'],
        mouseX: 0,
        mouseY: 0,
        mouseVelocity: 0,
        lastMouseX: 0,
        lastMouseY: 0,
        targetZoom: initialZoom,
        isHighEnd: highEnd,
        isDark: isDark,
        // Tween Targets
        targetColor1: new THREE.Color(colors.primary),
        targetColor2: new THREE.Color(colors.secondary),
        targetAppearance: 0.0, // Start invisible
        targetFogColor: new THREE.Color(isDark ? 0x231e49 : 0x87CEEB)
    });

    // --- API ---
    useImperativeHandle(ref, () => ({
        setMode: (mode: string) => {
            const key = mode as keyof typeof STATES;
            if (STATES[key]) {
                stateRef.current.targetConfig = STATES[key];
            }
        },
        setColors: (c1: string | number | THREE.Color, c2: string | number | THREE.Color) => {
            stateRef.current.targetColor1.set(c1);
            stateRef.current.targetColor2.set(c2);
        },
        toggleStyle: (forceState?: boolean) => {
            const newState = forceState !== undefined ? forceState : !stateRef.current.isHighEnd;
            stateRef.current.isHighEnd = newState;
            
            if (particlesRef.current && materialsRef.current && rendererRef.current) {
                if (newState) {
                    particlesRef.current.material = materialsRef.current.high!;
                    rendererRef.current.toneMapping = THREE.ReinhardToneMapping;
                } else {
                    particlesRef.current.material = materialsRef.current.simple!;
                    rendererRef.current.toneMapping = THREE.NoToneMapping;
                }
            }
        },
        setZoom: (z: number) => {
            stateRef.current.targetZoom = Math.max(1.0, Math.min(100.0, z));
        },
        emerge: () => {
             if (!uniformsRef.current) return;
             uniformsRef.current.uAppearance.value = 0.0;
             stateRef.current.targetAppearance = 1.0;
        }
    }));

    useEffect(() => {
        if (!containerRef.current) return;

        // 1. Init Scene
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x87CEEB, 0.035);
        sceneRef.current = scene;

        // 2. Init Camera
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.z = stateRef.current.targetZoom;
        cameraRef.current = camera;

        // 3. Init Renderer
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = stateRef.current.isHighEnd ? THREE.ReinhardToneMapping : THREE.NoToneMapping;
        renderer.toneMappingExposure = 1.5;
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // 4. Init Post Processing
        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));

        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0.3;
        bloomPass.strength = 1.8;
        bloomPass.radius = 0.8;
        composer.addPass(bloomPass);
        bloomPassRef.current = bloomPass;

        const rgbShiftPass = new ShaderPass(RGBShiftShader);
        rgbShiftPass.uniforms['amount'].value = 0.0025;
        rgbShiftPass.uniforms['angle'].value = 3.14159 * 0.25;
        composer.addPass(rgbShiftPass);
        composerRef.current = composer;

        // 5. Init Materials
        const uniforms = {
            uTime: { value: 0.0 },
            uSpeed: { value: 0.2 },
            uNoiseStrength: { value: 0.3 },
            uNoiseFrequency: { value: 0.8 },
            uState: { value: 0.0 },
            uMouse: { value: new THREE.Vector2(0,0) },
            uMouseVel: { value: 0.0 },
            uAppearance: { value: 0.0 }, // Start invisible for emergence
            uColor1: { value: new THREE.Color(colors.primary) },
            uColor2: { value: new THREE.Color(colors.secondary) }
        };
        uniformsRef.current = uniforms;

        const materialHigh = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vsHigh,
            fragmentShader: fsHigh,
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending
        });

        const materialSimple = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vsSimple,
            fragmentShader: fsSimple,
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending
        });

        materialsRef.current = { high: materialHigh, simple: materialSimple };

        // 6. Init Particles
        const geometry = new THREE.SphereGeometry(1.5, 160, 160);
        const particles = new THREE.Points(geometry, stateRef.current.isHighEnd ? materialHigh : materialSimple);
        scene.add(particles);
        particlesRef.current = particles;

        // 7. Events
        const handleResize = () => {
            if (!cameraRef.current || !rendererRef.current || !composerRef.current) return;
            cameraRef.current.aspect = window.innerWidth / window.innerHeight;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(window.innerWidth, window.innerHeight);
            composerRef.current.setSize(window.innerWidth, window.innerHeight);
        };

        const handleMouseMove = (e: MouseEvent) => {
            stateRef.current.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            stateRef.current.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;

            const dist = Math.sqrt(Math.pow(stateRef.current.mouseX - stateRef.current.lastMouseX, 2) + Math.pow(stateRef.current.mouseY - stateRef.current.lastMouseY, 2));
            stateRef.current.mouseVelocity = Math.min(dist * 2.0, 0.2);
            stateRef.current.lastMouseX = stateRef.current.mouseX;
            stateRef.current.lastMouseY = stateRef.current.mouseY;
        };

        const handleWheel = (e: WheelEvent) => {
             stateRef.current.targetZoom += e.deltaY * 0.005;
             stateRef.current.targetZoom = Math.max(2.0, Math.min(10.0, stateRef.current.targetZoom));
        };

        window.addEventListener('resize', handleResize);
        document.addEventListener('mousemove', handleMouseMove);
        // document.addEventListener('wheel', handleWheel, { passive: true });

        // 8. Animation Loop
        const animate = () => {
            requestRef.current = requestAnimationFrame(animate);
            const delta = clockRef.current.getDelta();
            const time = clockRef.current.getElapsedTime();

            // -- LERPING LOGIC (Replaces GSAP) --
            const lerpFactor = 0.05;
            const colorLerpFactor = 0.03;

            // Physical Params
            uniforms.uTime.value = time;
            uniforms.uSpeed.value = THREE.MathUtils.lerp(uniforms.uSpeed.value, stateRef.current.targetConfig.speed, lerpFactor);
            uniforms.uNoiseStrength.value = THREE.MathUtils.lerp(uniforms.uNoiseStrength.value, stateRef.current.targetConfig.strength, lerpFactor);
            uniforms.uNoiseFrequency.value = THREE.MathUtils.lerp(uniforms.uNoiseFrequency.value, stateRef.current.targetConfig.freq, lerpFactor);
            uniforms.uState.value = stateRef.current.targetConfig.stateId;
            
            // Colors
            uniforms.uColor1.value.lerp(stateRef.current.targetColor1, colorLerpFactor);
            uniforms.uColor2.value.lerp(stateRef.current.targetColor2, colorLerpFactor);
            
            // Fog Color
            if (scene.fog) {
                scene.fog.color.lerp(stateRef.current.targetFogColor, colorLerpFactor);
            }

            // Appearance (Emergence)
            // We use a slightly different lerp here for smoother start/stop, or simple lerp
            uniforms.uAppearance.value = THREE.MathUtils.lerp(uniforms.uAppearance.value, stateRef.current.targetAppearance, 0.02);

            // Mouse & Camera
            uniforms.uMouse.value.lerp(new THREE.Vector2(stateRef.current.mouseX, stateRef.current.mouseY), 0.1);
            uniforms.uMouseVel.value = THREE.MathUtils.lerp(uniforms.uMouseVel.value, stateRef.current.mouseVelocity, 0.1);
            stateRef.current.mouseVelocity *= 0.9; 
            camera.position.z = THREE.MathUtils.lerp(camera.position.z, stateRef.current.targetZoom, 0.05);

            // Rotation
            const targetRotX = stateRef.current.mouseY * 0.6;
            const targetRotY = stateRef.current.mouseX * 0.02;
            particles.rotation.x = THREE.MathUtils.lerp(particles.rotation.x, targetRotX, 0.04);
            particles.rotation.y = THREE.MathUtils.lerp(particles.rotation.y, particles.rotation.y + (targetRotY + delta * 0.05) * 0.1, 0.04);
            particles.rotation.y += 0.002;

            if (stateRef.current.isHighEnd) {
                composer.render();
            } else {
                renderer.render(scene, camera);
            }
        };

        // Trigger emergence
        stateRef.current.targetAppearance = 1.0;

        animate();

        // Cleanup
        const currentContainer = containerRef.current;
        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('mousemove', handleMouseMove);
            // document.removeEventListener('wheel', handleWheel);
            cancelAnimationFrame(requestRef.current);
            
            if (currentContainer && rendererRef.current) {
                currentContainer.removeChild(rendererRef.current.domElement);
            }
            geometry.dispose();
            materialHigh.dispose();
            materialSimple.dispose();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Init once

    // Handle Prop Updates
    useEffect(() => {
        const fogHex = isDark ? 0x231e49 : 0x87CEEB;
        stateRef.current.targetFogColor.setHex(fogHex);
        
        if (bloomPassRef.current) {
            bloomPassRef.current.strength = isDark ? 2.2 : 1.8;
            bloomPassRef.current.threshold = isDark ? 0.1 : 0.3;
        }
    }, [isDark]);

    return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
});

ParticleLifeform.displayName = 'ParticleLifeform';

export default ParticleLifeform;
