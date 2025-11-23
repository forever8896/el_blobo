// @ts-nocheck
'use client';

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';

/**
 * LLMJudges - A 3D Visualization of AI Agents casting votes.
 * * RESTORED: "AGT Style" High-Gloss Stage & Dramatic Lighting
 */

const LLMJudges = forwardRef(({ initialAgents }, ref) => {
  const containerRef = useRef(null);
  const uiLayerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneData = useRef({
    scene: null,
    camera: null,
    judges: [], 
    particles: [],
    clock: new THREE.Clock(),
    cameraPath: null,
    introActive: true,
    introProgress: 0,
    isUnmounted: false
  });

  // --- Configuration Constants ---
  const PALETTE = {
    cobaltBlue: 0x1E4CDD,
    neonMint: 0x4FFFB0,
    softPeach: 0xFFDAB9,
    deepSpaceViolet: 0x240B4D,
    sunsetOrange: 0xFF9F1C,
    lushGrassGreen: 0x2ECC71
  };

  const DEFAULT_CONFIG = [
    { id: 'gemini', name: 'GEMINI 3.0', color: PALETTE.cobaltBlue, pos: -7, logoType: 'gemini' },
    { id: 'grok', name: 'GROK 4.1', color: PALETTE.neonMint, pos: 0, logoType: 'grok' },
    { id: 'claude', name: 'CLAUDE SONNET 4.5', color: PALETTE.sunsetOrange, pos: 7, logoType: 'claude' }
  ];

  const AGENTS_CONFIG = initialAgents || DEFAULT_CONFIG;

  // --- Exposed API Methods ---
  useImperativeHandle(ref, () => ({
    streamThought: (agentId, text) => {
      if (!sceneData.current.judges) return;
      const judge = sceneData.current.judges.find(j => j.id === agentId);
      if (judge && !judge.approved) {
        const currentText = judge.textEl.innerText.replace('|', '');
        let newText = currentText + text;
        if (newText.length > 120) newText = "..." + newText.slice(-120);
        judge.textEl.innerHTML = newText + `<span style="display:inline-block; width:6px; height:12px; background:currentColor; vertical-align:middle; animation: blink 1s infinite;">|</span>`;
        judge.avatar.position.y += 0.05; 
      }
    },

    approvePayment: (agentId) => {
      if (!sceneData.current.judges) return;
      const index = sceneData.current.judges.findIndex(j => j.id === agentId);
      if (index !== -1) {
        triggerBuzzer(index);
      }
    },

    updateAgent: (agentId, { name, color, logoType }) => {
      if (!sceneData.current.judges) return;
      const judge = sceneData.current.judges.find(j => j.id === agentId);
      if (!judge) return;

      if (name) judge.ui.querySelector('.judge-name').textContent = name;
      
      if (color || logoType) {
        const newColor = color || judge.config.color;
        const newType = logoType || judge.config.logoType;
        judge.config.color = newColor;
        judge.config.logoType = newType;

        const newTex = generateLogoTexture(newType, newColor);
        if (judge.avatar.material[1]) {
            judge.avatar.material[1].map = newTex;
            judge.avatar.material[1].needsUpdate = true;
        }
        if (judge.avatar.material[2]) {
            judge.avatar.material[2].map = newTex;
            judge.avatar.material[2].needsUpdate = true;
        }

        judge.light.color.setHex(newColor);
        const cssColor = '#' + new THREE.Color(newColor).getHexString();
        judge.ui.style.borderColor = cssColor;
        judge.ui.style.boxShadow = `0 0 15px ${cssColor}40`;
        const nameEl = judge.ui.querySelector('.judge-name');
        if (nameEl) nameEl.style.color = cssColor;
      }
    },

    reset: () => {
      resetScene();
    }
  }));

  // --- Texture Generator ---
  const generateLogoTexture = (type, colorHex) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const color = '#' + new THREE.Color(colorHex).getHexString();

    // Styles based on Identity
    if (type === 'claude') {
      ctx.fillStyle = '#' + new THREE.Color(PALETTE.softPeach).getHexString();
    } else {
      ctx.fillStyle = '#080808'; // Dark Matte Background
    }
    ctx.fillRect(0, 0, 512, 512);
    
    // Rim
    ctx.strokeStyle = color;
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.arc(256, 256, 248, 0, Math.PI * 2);
    ctx.stroke();

    // Logo
    ctx.save();
    ctx.translate(256, 256);

    if (type === 'gemini') {
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      const drawStar = (scale) => {
          ctx.beginPath();
          ctx.moveTo(0, -150 * scale);
          ctx.bezierCurveTo(0, -50 * scale, 50 * scale, 0, 150 * scale, 0);
          ctx.bezierCurveTo(50 * scale, 0, 0, 50 * scale, 0, 150 * scale);
          ctx.bezierCurveTo(0, 50 * scale, -50 * scale, 0, -150 * scale, 0);
          ctx.bezierCurveTo(-50 * scale, 0, 0, -50 * scale, 0, -150 * scale);
          ctx.fill();
      };
      drawStar(1.0);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.5;
      drawStar(0.4);
    } else if (type === 'grok') {
      ctx.fillStyle = color; 
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.rotate(Math.PI / 5.5); 
      // Manual Rounded Rect
      const x = -35, y = -180, w = 70, h = 360, r = 4;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'claude') {
      ctx.fillStyle = '#' + new THREE.Color(PALETTE.sunsetOrange).getHexString();
      const s = 1.2;
      ctx.scale(s, s);
      ctx.translate(-100, -100); 
      ctx.beginPath();
      ctx.moveTo(0, 200);
      ctx.lineTo(0, 0);
      ctx.lineTo(130, 0);
      ctx.lineTo(130, 60);
      ctx.lineTo(60, 60);
      ctx.lineTo(60, 130);
      ctx.lineTo(200, 130);
      ctx.lineTo(200, 200);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = color;
      ctx.font = 'bold 200px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(type.charAt(0).toUpperCase(), 0, 0);
    }
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  // --- 3D Scene Initialization ---
  const initScene = () => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    // Set a background color to verify renderer is working
    scene.background = new THREE.Color(0x111111);
    // Remove fog for now to debug visibility
    // scene.fog = new THREE.FogExp2(0x000000, 0.01); 
    
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    
    const curvePoints = [
        new THREE.Vector3(0, 40, 80),   
        new THREE.Vector3(20, 25, 50),  
        new THREE.Vector3(5, 10, 30),   
        new THREE.Vector3(0, 3, 18)     
    ];
    const cameraPath = new THREE.CatmullRomCurve3(curvePoints);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // RESTORED: Cinematic Tone Mapping for high contrast
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2; // Slightly increased exposure

    // Cleanup
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting - MASSIVE FRONT LIGHTS SETUP
    // Increased ambient to ensure nothing is black
    const ambient = new THREE.AmbientLight(0xffffff, 2.0); 
    scene.add(ambient);

    // Massive Front Directional Light (The "Studio Flood")
    const frontLight = new THREE.DirectionalLight(0xffffff, 3.0);
    frontLight.position.set(0, 10, 20);
    frontLight.castShadow = true;
    scene.add(frontLight);

    // Helper to add target to scene (crucial for spotlights)
    const addSpot = (color, intensity, x, y, z, penumbra = 0.5) => {
        const spot = new THREE.SpotLight(color, intensity);
        spot.position.set(x, y, z);
        spot.target.position.set(0, 0, 0); 
        spot.penumbra = penumbra;
        spot.castShadow = true;
        // Increased distance/decay handling for "massive" feel
        spot.distance = 200;
        spot.decay = 1.5; 
        scene.add(spot);
        scene.add(spot.target);
        return spot;
    };

    // Side lights with INTENSE brightness to cut through shadows
    addSpot(PALETTE.cobaltBlue, 200.0, -25, 20, 10); // Was 4.0
    addSpot(PALETTE.sunsetOrange, 200.0, 25, 20, 10); // Was 4.0
    
    // Center white hot spot
    const mainSpot = addSpot(0xffffff, 20.0, 0, 25, 25, 0.2); // Was 2.0
    mainSpot.angle = Math.PI / 4;
    
    // Backlight for silhouettes (using palette)
    const rimLight = new THREE.PointLight(PALETTE.neonMint, 5.0, 50);
    rimLight.position.set(0, 10, -10);
    scene.add(rimLight);

    setupStage(scene);
    
    sceneData.current.scene = scene;
    sceneData.current.camera = camera;
    sceneData.current.cameraPath = cameraPath;

    AGENTS_CONFIG.forEach(config => createJudge(scene, config));
  };

  const setupStage = (scene) => {
    // Floor - RESTORED MIRROR FINISH
    // Using a neutral dark grey/black allows for pure reflections of the colored lights
    const planeGeo = new THREE.PlaneGeometry(200, 100);
    const planeMat = new THREE.MeshStandardMaterial({ 
        color: 0x080808,  // Very dark grey
        roughness: 0.05,  // Almost polished mirror
        metalness: 0.9    // Highly metallic
    });
    const floor = new THREE.Mesh(planeGeo, planeMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const deskGroup = new THREE.Group();
    const DESK_WIDTH = 26;
    const DESK_HEIGHT = 3.5;
    const DESK_DEPTH = 5;
    const DESK_Y = DESK_HEIGHT / 2;
    
    // Desk Body - Deep Violet with some shine
    const bodyGeo = new THREE.BoxGeometry(DESK_WIDTH, DESK_HEIGHT, DESK_DEPTH);
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: PALETTE.deepSpaceViolet, 
        roughness: 0.2, 
        metalness: 0.6 
    });
    const deskBody = new THREE.Mesh(bodyGeo, bodyMat);
    deskBody.position.y = DESK_Y;
    deskBody.castShadow = true;
    deskBody.receiveShadow = true;
    deskGroup.add(deskBody);

    // Desk Top - Glassy Mint
    const topGeo = new THREE.BoxGeometry(DESK_WIDTH + 1, 0.1, DESK_DEPTH + 0.5);
    const topMat = new THREE.MeshPhysicalMaterial({
        color: PALETTE.neonMint,
        emissive: 0x002211,
        transmission: 0.5,
        opacity: 0.9,
        metalness: 0.1,
        roughness: 0.1,
        thickness: 0.5
    });
    const deskTop = new THREE.Mesh(topGeo, topMat);
    deskTop.position.y = DESK_HEIGHT + 0.05;
    deskGroup.add(deskTop);

    scene.add(deskGroup);
    
    sceneData.current.deskHeight = DESK_HEIGHT + 0.1;
    sceneData.current.deskFrontZ = DESK_DEPTH / 2;
    sceneData.current.deskGroup = deskGroup;
  };

  const createFrontX = (xPos, zPos, parent) => {
    const group = new THREE.Group();
    group.position.set(xPos, 0, zPos); 
    const geometry = new THREE.BoxGeometry(0.6, 3.5, 0.2); 
    // X Glow Material - White/Neutral by default
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0xaaaaaa, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.1
    });
    const leg1 = new THREE.Mesh(geometry, material);
    leg1.rotation.z = Math.PI / 4;
    const leg2 = new THREE.Mesh(geometry, material);
    leg2.rotation.z = -Math.PI / 4;
    group.add(leg1, leg2);
    
    // Black Border
    const borderGeo = new THREE.BoxGeometry(0.66, 3.675, 0.1);
    const borderMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const b1 = new THREE.Mesh(borderGeo, borderMat);
    b1.position.z = -0.1; b1.rotation.z = Math.PI / 4;
    const b2 = new THREE.Mesh(borderGeo, borderMat);
    b2.position.z = -0.1; b2.rotation.z = -Math.PI / 4;
    group.add(b1, b2);

    parent.add(group);
    return { group, leg1: leg1 };
  };

  const createJudge = (scene, config) => {
    const judgeGroup = new THREE.Group();
    const deskTopY = sceneData.current.deskHeight;
    judgeGroup.position.set(config.pos, deskTopY, 0);

    // Coin Avatar
    const coinGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.2, 64);
    const logoTex = generateLogoTexture(config.logoType, config.color);
    
    const rimMat = new THREE.MeshStandardMaterial({ 
        color: 0xffd700, // Gold Rim
        roughness: 0.1, 
        metalness: 1.0 
    });
    const faceMat = new THREE.MeshStandardMaterial({ 
        map: logoTex, 
        roughness: 0.4, 
        metalness: 0.1 
    });
    
    const coin = new THREE.Mesh(coinGeo, [rimMat, faceMat, faceMat]);
    coin.rotation.x = Math.PI / 2; 
    coin.position.set(0, 1.8, 0); 
    coin.castShadow = true;
    coin.userData = { initialY: 1.8, spinSpeed: 0.5 + Math.random() * 0.5, floatOffset: Math.random() * 10 };
    judgeGroup.add(coin);

    // Buzzer
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.1, 32), baseMat);
    base.position.set(0, 0.05, 1);
    judgeGroup.add(base);

    const btnMat = new THREE.MeshStandardMaterial({ 
        color: 0xdd0000, roughness: 0.1, metalness: 0.3, emissive: 0x550000, emissiveIntensity: 0.2 
    });
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI/2), btnMat);
    button.position.set(0, 0.1, 1);
    button.castShadow = true;
    judgeGroup.add(button);

    // Giant X on Desk
    const xObj = createFrontX(config.pos, sceneData.current.deskFrontZ + 0.15, sceneData.current.deskGroup);
    xObj.group.position.y = 1.75; 

    // Spotlight above judge
    const spot = new THREE.SpotLight(config.color, 5.0); // Boosted for visibility
    spot.position.set(0, 10, -5);
    spot.target = coin;
    judgeGroup.add(spot);
    judgeGroup.add(spot.target);

    scene.add(judgeGroup);

    // HTML UI
    const colorHex = '#' + new THREE.Color(config.color).getHexString();
    const uiDiv = document.createElement('div');
    
    Object.assign(uiDiv.style, {
        position: 'absolute',
        backgroundColor: 'rgba(36, 11, 77, 0.85)', 
        border: '1px solid #475569',
        color: 'white',
        padding: '12px',
        borderRadius: '8px',
        width: '240px',
        transform: 'translate(-50%, -100%)',
        transition: 'opacity 0.3s ease',
        pointerEvents: 'none',
        borderColor: colorHex,
        boxShadow: `0 0 15px ${colorHex}40`,
        fontFamily: '"Courier New", Courier, monospace',
        backdropFilter: 'blur(8px)'
    });

    uiDiv.innerHTML = `
      <div class="judge-name" style="
          font-weight: bold; 
          font-size: 1.1rem; 
          text-transform: uppercase; 
          border-bottom: 1px solid rgba(255,255,255,0.2); 
          padding-bottom: 8px; 
          margin-bottom: 8px; 
          color: ${colorHex};
          display: flex; 
          justify-content: space-between;
      ">
        ${config.name}
      </div>
      <div class="stream-text" style="
          font-family: monospace; 
          font-size: 0.9rem; 
          height: 70px; 
          overflow: hidden; 
          white-space: pre-wrap; 
          opacity: 0.9; 
          line-height: 1.4; 
          color: #d1d5db;
      ">
        Waiting for input...<span style="display:inline-block; width:6px; height:12px; background:currentColor; vertical-align:middle; animation: blink 1s infinite;">|</span>
      </div>
    `;
    
    // Inject Styles
    if (typeof document !== 'undefined' && !document.getElementById('llm-judges-styles')) {
        const style = document.createElement('style');
        style.id = 'llm-judges-styles';
        style.innerHTML = ` @keyframes blink { 50% { opacity: 0; } } @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`;
        document.head.appendChild(style);
    }

    if (uiLayerRef.current) {
      uiLayerRef.current.appendChild(uiDiv);
    }

    sceneData.current.judges.push({
      id: config.id,
      config: config,
      group: judgeGroup,
      avatar: coin,
      button: button,
      xObject: xObj,
      light: spot,
      ui: uiDiv,
      textEl: uiDiv.querySelector('.stream-text'),
      approved: false,
    });
  };

  const triggerBuzzer = (index) => {
    const judge = sceneData.current.judges[index];
    if (judge.approved) return;

    judge.approved = true;
    
    judge.button.scale.y = 0.3;
    judge.button.position.y = 0.05;
    
    const gold = 0xFFD700;
    const green = PALETTE.lushGrassGreen;
    const greenHex = '#' + new THREE.Color(green).getHexString();

    // X Glow Intensity
    const xMat = judge.xObject.leg1.material;
    xMat.color.setHex(gold);
    xMat.emissive.setHex(gold);
    xMat.emissiveIntensity = 4.0;

    // Particles
    const worldPos = new THREE.Vector3();
    judge.button.getWorldPosition(worldPos);
    createExplosion(worldPos, green);

    // Fast Spin
    judge.avatar.userData.spinSpeed = 15; 
    
    // UI
    judge.textEl.innerHTML = `<div style="font-weight: 800; font-size: 1.5rem; text-align: center; padding-top: 16px; letter-spacing: 0.1em; color: ${greenHex}; text-shadow: 0 0 20px ${greenHex}; animation: bounce 0.5s infinite;">APPROVED</div>`;
    judge.ui.style.borderColor = greenHex;
    judge.ui.style.boxShadow = `0 0 30px ${greenHex}80`;
  };

  const createExplosion = (position, color) => {
    const count = 50;
    const geo = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];
    for(let i=0; i<count; i++) {
        positions.push(position.x, position.y, position.z);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const speed = 0.1 + Math.random() * 0.2;
        velocities.push(
            Math.sin(phi) * Math.cos(theta) * speed,
            Math.cos(phi) * speed + 0.1, 
            Math.sin(phi) * Math.sin(theta) * speed
        );
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: color, size: 0.25, transparent: true });
    const sys = new THREE.Points(geo, mat);
    sys.userData = { velocities: velocities, life: 1.0 };
    sceneData.current.scene.add(sys);
    sceneData.current.particles.push(sys);
  };

  const resetScene = () => {
    const { judges } = sceneData.current;
    if (!judges) return;
    judges.forEach(j => {
        j.approved = false;
        j.button.scale.y = 1;
        j.button.position.y = 0.1;
        
        const xMat = j.xObject.leg1.material;
        xMat.color.setHex(0xffffff);
        xMat.emissive.setHex(0xaaaaaa);
        xMat.emissiveIntensity = 0.5;

        j.avatar.userData.spinSpeed = 0.5 + Math.random() * 0.5;
        
        const colorHex = '#' + new THREE.Color(j.config.color).getHexString();
        j.ui.style.borderColor = colorHex;
        j.ui.style.boxShadow = `0 0 15px ${colorHex}40`;
        j.textEl.innerHTML = `Resetting logic...<span style="display:inline-block; width:6px; height:12px; background:currentColor; vertical-align:middle; animation: blink 1s infinite;">|</span>`;
    });
    sceneData.current.introActive = true;
    sceneData.current.introProgress = 0;
    if (uiLayerRef.current) uiLayerRef.current.style.opacity = '0';
  };

  // --- Loop ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    initScene();

    const animate = () => {
      if (sceneData.current.isUnmounted) return;
      requestAnimationFrame(animate);

      const dt = sceneData.current.clock.getDelta();
      const time = sceneData.current.clock.getElapsedTime();
      const { scene, camera, cameraPath, judges, particles } = sceneData.current;

      if (!scene || !camera) return;

      if (sceneData.current.introActive) {
        sceneData.current.introProgress += dt * 0.6; 
        if (sceneData.current.introProgress > 1) {
          sceneData.current.introProgress = 1;
          sceneData.current.introActive = false;
          if (uiLayerRef.current) uiLayerRef.current.style.opacity = '1';
        }
        if (cameraPath) {
          const point = cameraPath.getPoint(sceneData.current.introProgress);
          camera.position.copy(point);
          camera.lookAt(new THREE.Vector3(0, 2, 0));
        }
      } else {
        camera.position.x = Math.sin(time * 0.2) * 1; 
        camera.position.y = 3 + Math.sin(time * 0.3) * 0.2;
        camera.lookAt(new THREE.Vector3(0, 2, 0));
      }

      judges.forEach((j) => {
        j.avatar.rotation.z += dt * j.avatar.userData.spinSpeed; 
        j.avatar.position.y = j.avatar.userData.initialY + Math.sin(time * 1.5 + j.avatar.userData.floatOffset) * 0.1;

        if (containerRef.current) {
            const labelPos = j.avatar.position.clone();
            labelPos.y += 0.8; 
            j.group.localToWorld(labelPos);
            labelPos.project(camera);

            const x = (labelPos.x * .5 + .5) * containerRef.current.clientWidth;
            const y = (labelPos.y * -.5 + .5) * containerRef.current.clientHeight;

            j.ui.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
            
            if (labelPos.z > 1 || sceneData.current.introActive) {
                j.ui.style.opacity = '0';
            } else {
                j.ui.style.opacity = '1';
            }
        }
      });

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.userData.life -= dt;
        const positions = p.geometry.attributes.position.array;
        const vels = p.userData.velocities;
        for(let k=0; k < positions.length; k+=3) {
            positions[k] += vels[k];
            positions[k+1] += vels[k+1];
            positions[k+2] += vels[k+2];
            vels[k+1] -= 0.01;
        }
        p.geometry.attributes.position.needsUpdate = true;
        if(p.userData.life <= 0) {
            scene.remove(p);
            particles.splice(i, 1);
        }
      }

      rendererRef.current.render(scene, camera);
    };

    animate();

    const observer = new ResizeObserver(() => {
        if (!containerRef.current || !rendererRef.current || !sceneData.current.camera) return;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        sceneData.current.camera.aspect = width / height;
        sceneData.current.camera.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
    });
    observer.observe(containerRef.current);

    return () => {
      sceneData.current.isUnmounted = true;
      observer.disconnect();
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '600px', position: 'relative', backgroundColor: '#000', overflow: 'hidden' }}>
      <div ref={uiLayerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', transition: 'opacity 0.5s ease', opacity: 0 }}>
      </div>
    </div>
  );
});

LLMJudges.displayName = 'LLMJudges';

export default LLMJudges;
