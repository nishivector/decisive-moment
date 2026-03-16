import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const W = () => window.innerWidth;
const H = () => window.innerHeight;

const COLORS = {
  bg: 0xE8D5B0,
  primary: 0x2C5F4A,
  secondary: 0x8B6B47,
  accent: 0xF4A822,
  danger: 0xC8392B,
  dark: 0x1a1208
};

const LEVELS = [
  {
    name: 'Lisbon, 4pm',
    sub: 'Level 1',
    sCycle: 4200, sPeak: 800,
    lCycle: 3100, lPeak: 1000,
    bCycle: 0,    bPeak: 0,
    winThreshold: 450,
    bgColor: 0xE8C87A,
    skyColor: 0xF5C842,
    isRain: false
  },
  {
    name: 'Tokyo Market',
    sub: 'Level 2',
    sCycle: 3800, sPeak: 600,
    lCycle: 2700, lPeak: 700,
    bCycle: 5500, bPeak: 500,
    winThreshold: 450,
    bgColor: 0xC8A864,
    skyColor: 0x8CB0C8,
    isRain: false
  },
  {
    name: 'Paris Side Street',
    sub: 'Level 3',
    sCycle: 3200, sPeak: 500,
    lCycle: 2300, lPeak: 500,
    bCycle: 4800, bPeak: 400,
    winThreshold: 450,
    bgColor: 0xB8A078,
    skyColor: 0xD4B88C,
    isRain: false
  },
  {
    name: 'Paris Rain Night',
    sub: 'Level 4',
    sCycle: 2600, sPeak: 350,
    lCycle: 1900, lPeak: 400,
    bCycle: 3800, bPeak: 350,
    winThreshold: 500,
    bgColor: 0x283848,
    skyColor: 0x1C2A3C,
    isRain: true
  },
  {
    name: 'Rome Piazza, Noon',
    sub: 'Level 5',
    sCycle: 2200, sPeak: 250,
    lCycle: 1700, lPeak: 280,
    bCycle: 3200, bPeak: 250,
    winThreshold: 550,
    bgColor: 0xE8C882,
    skyColor: 0xF8E0A0,
    isRain: false
  }
];

// ─── State ────────────────────────────────────────────────────────────────────
let gameState = 'start'; // start | instructions | playing | levelComplete | gallery | gameover
let currentLevel = 0;
let shots = [];
let shotsUsed = 0;
let sTime = 0, lTime = 0, bTime = 0;
let levelStartTime = 0;
let audioReady = false;
let totalScore = 0;

// ─── Three.js Setup ───────────────────────────────────────────────────────────
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(W(), H());
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, W() / H(), 0.1, 100);
camera.position.set(0, 0, 5);

// Composer
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(W(), H()), 0.6, 0.4, 0.75
);
composer.addPass(bloomPass);

// Vignette shader pass
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 0.65 },
    darkness: { value: 0.4 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - 0.5) * 2.0;
      float vignette = 1.0 - smoothstep(offset - 0.1, offset + 0.2, length(uv));
      color.rgb = mix(color.rgb * (1.0 - darkness), color.rgb, vignette);
      gl_FragColor = color;
    }
  `
};
const vignettePass = new ShaderPass(VignetteShader);
composer.addPass(vignettePass);

// ─── Scene Objects ────────────────────────────────────────────────────────────
// Sky/bg plane
const bgGeo = new THREE.PlaneGeometry(20, 12);
const bgMat = new THREE.MeshBasicMaterial({ color: LEVELS[0].bgColor });
const bgMesh = new THREE.Mesh(bgGeo, bgMat);
bgMesh.position.z = -3;
scene.add(bgMesh);

// Viewfinder frame (DOM canvas overlay approach)
const startCanvas = document.getElementById('overlay2d');
// Patch missing canvas 2d methods for compatibility
function patchCtx(c) {
  if (!c) return c;
  const noop = () => {};
  if (!c.ellipse) c.ellipse = noop;
  if (!c.quadraticCurveTo) c.quadraticCurveTo = noop;
  if (!c.bezierCurveTo) c.bezierCurveTo = noop;
  if (!c.clip) c.clip = noop;
  if (!c.isPointInPath) c.isPointInPath = () => false;
  if (!c.createPattern) c.createPattern = () => ({});
  if (!c.strokeRect) c.strokeRect = noop;
  return c;
}

// ─── Scene building per level ─────────────────────────────────────────────────
// We use simple 3D shapes + DOM canvas overlay for 2D details

// Subject mesh (silhouette)
const subjectGroup = new THREE.Group();
scene.add(subjectGroup);

// Ground plane
const groundGeo = new THREE.PlaneGeometry(20, 4);
const groundMat = new THREE.MeshBasicMaterial({ color: 0x8B6B47 });
const groundMesh = new THREE.Mesh(groundGeo, groundMat);
groundMesh.position.set(0, -2.5, -1);
scene.add(groundMesh);

// Building shapes
const buildingGroup = new THREE.Group();
scene.add(buildingGroup);

// Light shaft mesh
const lightShaftGeo = new THREE.PlaneGeometry(1, 8);
const lightShaftMat = new THREE.MeshBasicMaterial({
  color: 0xF4A822, transparent: true, opacity: 0, side: THREE.DoubleSide
});
const lightShaftMesh = new THREE.Mesh(lightShaftGeo, lightShaftMat);
lightShaftMesh.position.set(-1, 0, -1.5);
lightShaftMesh.rotation.z = 0.3;
scene.add(lightShaftMesh);

// Background element mesh
const bgElementGroup = new THREE.Group();
scene.add(bgElementGroup);

// Rain particles
const rainParticles = [];
const rainGroup = new THREE.Group();
scene.add(rainGroup);

function buildRain() {
  const geo = new THREE.BufferGeometry();
  const count = 500;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 16;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0x8899bb, size: 0.04, transparent: true, opacity: 0.5 });
  const pts = new THREE.Points(geo, mat);
  rainGroup.add(pts);
  rainParticles.push({ geo, pos, count });
}
buildRain();
rainGroup.visible = false;

// ─── Build scene for level ─────────────────────────────────────────────────────
function buildSceneForLevel(lvl) {
  // Clear groups
  while (subjectGroup.children.length) subjectGroup.remove(subjectGroup.children[0]);
  while (buildingGroup.children.length) buildingGroup.remove(buildingGroup.children[0]);
  while (bgElementGroup.children.length) bgElementGroup.remove(bgElementGroup.children[0]);

  const lev = LEVELS[lvl];
  bgMat.color.setHex(lev.bgColor);
  rainGroup.visible = lev.isRain;
  vignettePass.uniforms.darkness.value = lev.isRain ? 0.55 : 0.4;

  // Buildings (3-4 rectangles)
  const bColors = lev.isRain ? [0x2C3A4A, 0x1A2530, 0x384858] : [0x8B6B47, 0x6B4F35, 0xA07850];
  for (let i = 0; i < 4; i++) {
    const bw = 2.5 + Math.random() * 2;
    const bh = 3 + Math.random() * 3;
    const bGeo = new THREE.BoxGeometry(bw, bh, 0.1);
    const bMat = new THREE.MeshBasicMaterial({ color: bColors[i % bColors.length] });
    const bMesh = new THREE.Mesh(bGeo, bMat);
    bMesh.position.set(-5 + i * 3.5, -1 + bh / 2, -2.5);
    buildingGroup.add(bMesh);
  }

  // Subject — person silhouette using a capsule shape
  const bodyGeo = new THREE.CapsuleGeometry(0.22, 0.7, 4, 8);
  const headGeo = new THREE.SphereGeometry(0.18, 8, 8);
  const subjColor = lev.isRain ? 0x1C2A3C : COLORS.primary;
  const bodyMesh = new THREE.Mesh(bodyGeo, new THREE.MeshBasicMaterial({ color: subjColor }));
  const headMesh = new THREE.Mesh(headGeo, new THREE.MeshBasicMaterial({ color: subjColor }));
  headMesh.position.y = 0.75;

  // Level-specific accessories
  if (lvl === 0) {
    // António: newspaper (flat rect in front)
    const npGeo = new THREE.PlaneGeometry(0.5, 0.35);
    const npMat = new THREE.MeshBasicMaterial({ color: 0xE8D5B0, side: THREE.DoubleSide });
    const npMesh = new THREE.Mesh(npGeo, npMat);
    npMesh.position.set(0.15, 0.1, 0.25);
    npMesh.name = 'newspaper';
    subjectGroup.add(npMesh);
  }

  subjectGroup.add(bodyMesh, headMesh);
  subjectGroup.position.set(-0.3, -1.2, 0);

  // Level-specific bg element
  if (lvl >= 1) {
    // Cat / window / lightning flash indicator
    const beGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const beMat = new THREE.MeshBasicMaterial({ color: 0xF4A822, transparent: true, opacity: 0.8 });
    const beMesh = new THREE.Mesh(beGeo, beMat);
    beMesh.name = 'bgelement';
    beMesh.position.set(0.8, -1.6, 0.2);
    bgElementGroup.add(beMesh);
  }

  if (lvl === 3) {
    // Rain effect elements
    rainGroup.visible = true;
  }
}

// ─── Audio ────────────────────────────────────────────────────────────────────
let bass, snare, trumpet, pianoComp, mutedTrumpet, rain;
let sfxShutter, sfxMisfire, sfxHum, sfxTick, sfxFilm, sfxCorner, sfxApplause, sfxTear, sfxRain, sfxLightning;
let bassLoop, snareLoop, pianoLoop, mutedTrumpetLoop;
let nearHumActive = false;
let sfxHumVolume = null;

function initAudio() {
  try {
    // Bass
    bass = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.8 }
    }).toDestination();
    bass.volume.value = -8;
    const bassFilter = new Tone.Filter(400, 'lowpass');
    bass.connect(bassFilter);
    bassFilter.toDestination();

    // Snare
    snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 }
    }).toDestination();
    snare.volume.value = -12;
    const snareFilter = new Tone.Filter(1800, 'bandpass');
    snare.connect(snareFilter);
    snareFilter.toDestination();

    // Solo Trumpet
    trumpet = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.12, decay: 0.3, sustain: 0.7, release: 1.2 }
    });
    const trumpetReverb = new Tone.Reverb({ decay: 2.8, wet: 0.5 }).toDestination();
    trumpet.connect(trumpetReverb);
    trumpet.volume.value = -6;

    // Piano comp
    pianoComp = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.04, decay: 0.4, sustain: 0.3, release: 1.0 }
    }).toDestination();
    pianoComp.volume.value = -14;

    // Muted trumpet
    mutedTrumpet = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.08, decay: 0.5, sustain: 0.4, release: 1.0 }
    });
    const mutedReverb = new Tone.Reverb({ decay: 1.5, wet: 0.7 }).toDestination();
    mutedTrumpet.connect(mutedReverb);
    mutedTrumpet.volume.value = -10;

    // Rain
    rain = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 2.0, decay: 0, sustain: 1, release: 2.0 }
    });
    const rainFilter = new Tone.Filter(200, 'lowpass');
    rain.connect(rainFilter);
    rainFilter.toDestination();
    rain.volume.value = -20;

    // SFX
    const shutterReverb = new Tone.Reverb({ decay: 1.8, wet: 0.4 }).toDestination();
    sfxShutter = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.06 }
    });
    sfxShutter.connect(shutterReverb);
    sfxShutter.volume.value = -4;

    sfxMisfire = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.04 }
    }).toDestination();
    sfxMisfire.volume.value = -6;

    sfxHum = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.4, decay: 0, sustain: 1, release: 0.2 }
    }).toDestination();
    sfxHum.volume.value = -20;

    sfxTick = new Tone.MetalSynth({
      frequency: 800,
      envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5
    }).toDestination();
    sfxTick.volume.value = -18;

    sfxFilm = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.02 }
    });
    const filmFilter = new Tone.Filter(3000, 'bandpass');
    sfxFilm.connect(filmFilter);
    filmFilter.toDestination();
    sfxFilm.volume.value = -14;

    sfxCorner = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.02 }
    }).toDestination();
    sfxCorner.volume.value = -20;

    sfxApplause = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 1.5, decay: 0, sustain: 1, release: 3.0 }
    }).toDestination();
    sfxApplause.volume.value = -14;

    const tearDest = new Tone.Destination();
    sfxTear = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.05, decay: 2.0, sustain: 0, release: 0.5 }
    }).toDestination();
    sfxTear.volume.value = -20;

    sfxRain = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 2.0, decay: 0, sustain: 1, release: 2.0 }
    });
    const rainFilter2 = new Tone.Filter(250, 'lowpass');
    sfxRain.connect(rainFilter2);
    rainFilter2.toDestination();
    sfxRain.volume.value = -18;

    sfxLightning = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.05 }
    }).toDestination();
    sfxLightning.volume.value = -8;

    audioReady = true;
    startScreenMusic();
  } catch(e) {
    // Audio init failed silently
  }
}

const BEAT = 60 / 78; // seconds per beat at 78 BPM
const BAR = BEAT * 4;

let bassNotes = ['Eb2','F2','G2','Bb2','C3','D3','Eb3'];
let bassIndex = 0;
let lastBassTime = 0;
let lastSnareTime = 0;
let lastPianoTime = 0;
let musicPlaying = false;
let musicVolume = 0.6;
let snareMode = 'normal'; // normal | beat1only | silent
let pianoSkipBars = 0;
let startScreenMusicState = 0;

function startScreenMusic() {
  if (!audioReady) return;
  musicPlaying = true;
}

function playTrumpetHook(withPiano) {
  if (!audioReady) return;
  const notes = ['Eb4', 'G4', 'Bb4', 'Db5'];
  const now = Tone.now();
  notes.forEach((n, i) => {
    trumpet.triggerAttackRelease(n, '4n', now + i * 0.38);
  });
  if (withPiano && pianoComp) {
    const pianNotes = ['Eb3', 'G3'];
    pianNotes.forEach(n => {
      pianoComp.triggerAttackRelease(n, '2n', now + 4 * 0.38);
    });
  }
}

function playStartScreenHook() {
  if (!audioReady) return;
  const notes = ['Eb4', 'G4', 'Bb4'];
  const now = Tone.now();
  notes.forEach((n, i) => {
    mutedTrumpet.triggerAttackRelease(n, '4n', now + i * 0.38);
    // Pulse camera SVG inner ring
    const ring = document.getElementById('cam-inner');
    if (ring) {
      const delay = (now + i * 0.38 - Tone.now()) * 1000;
      setTimeout(() => {
        ring.style.transition = 'opacity 0.1s';
        ring.setAttribute('opacity', '1.0');
        setTimeout(() => ring.setAttribute('opacity', '0.6'), 200);
      }, Math.max(0, delay));
    }
  });
}

function playPerfectShutter() {
  if (!audioReady) return;
  sfxShutter.triggerAttackRelease('D5', '64n');
}

function playMisfireShutter() {
  if (!audioReady) return;
  sfxMisfire.triggerAttackRelease('Bb4', '64n');
  // Loud snare
  snare.volume.value = -4;
  snare.triggerAttackRelease('8n');
  setTimeout(() => { snare.volume.value = -12; }, 500);
}

function playFilmAdvance() {
  if (!audioReady) return;
  sfxFilm.triggerAttackRelease('8n');
}

function playElementTick() {
  if (!audioReady) return;
  sfxTick.triggerAttackRelease('8n');
}

function playCornerTighten() {
  if (!audioReady) return;
  const now = Tone.now();
  for (let i = 0; i < 4; i++) {
    sfxCorner.triggerAttackRelease('32n', now + i * 0.04);
  }
}

let humPlaying = false;
function startNearHum() {
  if (!audioReady || humPlaying) return;
  humPlaying = true;
  sfxHum.triggerAttack('A3');
}
function stopNearHum() {
  if (!audioReady || !humPlaying) return;
  humPlaying = false;
  sfxHum.triggerRelease();
}

function startRainAudio() {
  if (!audioReady) return;
  sfxRain.triggerAttack();
}
function stopRainAudio() {
  if (!audioReady) return;
  sfxRain.triggerRelease();
}

function playLightningStrike() {
  if (!audioReady) return;
  sfxLightning.triggerAttackRelease('4n');
}

// ─── Music tick ───────────────────────────────────────────────────────────────
let musicTime = 0;
let lastMusicUpdate = 0;
let barPhase = 0;
let beatPhase = 0;
let startScreenMusicStarted = false;
let startScreenMusicTimer = 0;
let startScreenHookPlayed = false;

function updateMusic(dt) {
  if (!audioReady || !musicPlaying) return;
  musicTime += dt;
  beatPhase += dt / BEAT;
  barPhase += dt / BAR;

  if (gameState === 'start') {
    startScreenMusicTimer += dt;
    // Bass: every bar
    if (Math.floor(beatPhase) > Math.floor((beatPhase - dt / BEAT))) {
      const beat = Math.floor(musicTime / BEAT) % 4;
      if (beat === 0) {
        // Bass note
        if (bass && startScreenMusicTimer > 0.1) {
          bass.triggerAttackRelease(bassNotes[bassIndex % bassNotes.length], '4n');
          bassIndex++;
        }
      }
      // Snare on 2 and 4
      if ((beat === 1 || beat === 3) && startScreenMusicTimer > 2) {
        snare.triggerAttackRelease('8n');
      }
      // Piano sparse stabs after 4 bars
      if (beat === 1 && startScreenMusicTimer > 8 && Math.random() < 0.3) {
        pianoComp.triggerAttackRelease(['Eb3', 'G3', 'Bb3'], '4n');
      }
    }
    // Muted trumpet hook (3 notes) every 16s
    if (!startScreenHookPlayed && startScreenMusicTimer > 10) {
      startScreenHookPlayed = true;
      playStartScreenHook();
      // Reset to play again
      setTimeout(() => { startScreenHookPlayed = false; }, 16000);
    }
    return;
  }

  if (gameState !== 'playing') return;

  const beat = Math.floor(musicTime / BEAT) % 4;
  const lastBeat = Math.floor((musicTime - dt) / BEAT) % 4;
  if (beat !== lastBeat) {
    // Bass on every beat
    bass.triggerAttackRelease(bassNotes[bassIndex % bassNotes.length], '8n');
    bassIndex++;

    // Snare
    if (snareMode === 'normal' && (beat === 1 || beat === 3)) {
      snare.triggerAttackRelease('8n');
    } else if (snareMode === 'beat1only' && beat === 0) {
      snare.triggerAttackRelease('8n');
    }

    // Piano comp (Level 2+)
    if (currentLevel >= 1 && pianoSkipBars <= 0 && beat === 1 && Math.random() < 0.4) {
      pianoComp.triggerAttackRelease(['Eb3', 'G3', 'Bb3'], '4n');
    }
    if (beat === 0 && pianoSkipBars > 0) pianoSkipBars--;

    // Muted trumpet (Level 3+)
    if (currentLevel >= 2 && beat === 2 && Math.random() < 0.15) {
      mutedTrumpet.triggerAttackRelease(['G4', 'Bb4', 'Eb4'][Math.floor(Math.random() * 3)], '2n');
    }
  }
}

// ─── DOM Elements ─────────────────────────────────────────────────────────────
const startScreen = document.getElementById('startScreen');
const instructionsScreen = document.getElementById('instructions-screen');
const gameUI = document.getElementById('game-ui');
const shotFeedback = document.getElementById('shot-feedback');
const levelCompleteEl = document.getElementById('level-complete');
const galleryScreen = document.getElementById('gallery-screen');
const gameOverEl = document.getElementById('game-over');
const titleGroup = document.getElementById('title-group');
const cameraGroup = document.getElementById('camera-svg');
const pressPrompt = document.getElementById('press-prompt');

// ─── Start Screen Animation ───────────────────────────────────────────────────
const startCtx = patchCtx(startCanvas.getContext('2d'));
let startAnimTime = 0;
let pigeonState = 'waiting'; // waiting | landing | sitting | takingoff
let pigeonTimer = 0;
let pigeonX = 0, pigeonY = 0;
let pigeonVX = 0, pigeonVY = 0;
let sunShadowX = 0;
let titleFadeIn = 0;

function resizeStartCanvas() {
  startCanvas.width = W();
  startCanvas.height = H();
}
resizeStartCanvas();

function drawStartScreen(dt) {
  startAnimTime += dt;
  titleFadeIn = Math.min(1, startAnimTime / 1.8);

  const w = startCanvas.width;
  const h = startCanvas.height;
  startCtx.clearRect(0, 0, w, h);

  // Background warm gradient
  const grad = startCtx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#F5C842');
  grad.addColorStop(0.5, '#E8C87A');
  grad.addColorStop(1, '#8B6B47');
  startCtx.fillStyle = grad;
  startCtx.fillRect(0, 0, w, h);

  // Sun shadow — creeps left to right
  sunShadowX += dt * 2;
  if (sunShadowX > 600) {
    const fade = Math.min(1, (sunShadowX - 600) / 30);
    if (fade >= 1) sunShadowX = 0;
  }
  const shadowX = Math.min(sunShadowX, 600) * (w / 800);
  startCtx.fillStyle = `rgba(100, 70, 30, 0.18)`;
  startCtx.fillRect(0, 0, shadowX, h * 0.7);

  // Building shapes
  const bw = w; const bh = h;
  // Far buildings
  startCtx.fillStyle = '#B8956A';
  startCtx.fillRect(0, bh * 0.25, bw * 0.3, bh * 0.45);
  startCtx.fillStyle = '#A07850';
  startCtx.fillRect(bw * 0.25, bh * 0.2, bw * 0.25, bh * 0.5);
  startCtx.fillStyle = '#C49A6C';
  startCtx.fillRect(bw * 0.55, bh * 0.28, bw * 0.2, bh * 0.42);
  startCtx.fillStyle = '#A07850';
  startCtx.fillRect(bw * 0.75, bh * 0.22, bw * 0.3, bh * 0.48);

  // Archway / doorway
  startCtx.fillStyle = '#6B4F35';
  startCtx.fillRect(bw * 0.4, bh * 0.4, bw * 0.2, bh * 0.35);
  startCtx.fillStyle = '#1a1208';
  startCtx.beginPath();
  startCtx.arc(bw * 0.5, bh * 0.4, bw * 0.1, Math.PI, 0);
  startCtx.fill();

  // Ground
  startCtx.fillStyle = '#C4A062';
  startCtx.fillRect(0, bh * 0.72, bw, bh * 0.28);
  // Cobblestone suggestion
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 20; col++) {
      const cx = col * (bw / 20) + (row % 2) * (bw / 40);
      const cy = bh * 0.74 + row * (bh * 0.07);
      startCtx.strokeStyle = 'rgba(100, 70, 30, 0.2)';
      startCtx.strokeRect(cx, cy, bw / 21, bh * 0.06);
    }
  }

  // Bench
  const benchX = bw * 0.15, benchY = bh * 0.62;
  startCtx.fillStyle = '#6B4F35';
  startCtx.fillRect(benchX, benchY, bw * 0.12, bh * 0.03);
  startCtx.fillRect(benchX + bw * 0.01, benchY + bh * 0.03, bw * 0.01, bh * 0.06);
  startCtx.fillRect(benchX + bw * 0.1, benchY + bh * 0.03, bw * 0.01, bh * 0.06);

  // António — old man on bench
  const antPhase = startAnimTime % 4.0;
  let antY = 0;
  if (antPhase < 1.4) {
    antY = 0;
  } else if (antPhase < 2.0) {
    // Looking up: lower newspaper 12px
    const t = (antPhase - 1.4) / 0.6;
    antY = 12 * (1 - Math.cos(t * Math.PI)) / 2;
  } else if (antPhase < 2.6) {
    antY = 12;
  } else if (antPhase < 3.2) {
    const t = (antPhase - 2.6) / 0.6;
    antY = 12 * (1 + Math.cos(t * Math.PI)) / 2;
  } else {
    antY = 0;
  }

  const antX = benchX + bw * 0.04;
  const antBY = benchY - bh * 0.02;
  // Body
  startCtx.fillStyle = '#4A3520';
  startCtx.beginPath();
  startCtx.ellipse(antX, antBY - bh * 0.04, bw * 0.02, bh * 0.04, 0, 0, Math.PI * 2);
  startCtx.fill();
  // Head
  startCtx.beginPath();
  startCtx.arc(antX, antBY - bh * 0.1, bw * 0.015, 0, Math.PI * 2);
  startCtx.fill();
  // Newspaper — moves up/down by antY
  const npOffset = antY * (h / 600);
  startCtx.fillStyle = '#E8D5B0';
  startCtx.fillRect(antX - bw * 0.025, antBY - bh * 0.06 - npOffset * 0.01, bw * 0.05, bh * 0.06);
  startCtx.strokeStyle = '#8B6B47';
  startCtx.lineWidth = 0.5;
  for (let i = 0; i < 3; i++) {
    startCtx.beginPath();
    startCtx.moveTo(antX - bw * 0.02, antBY - bh * 0.05 + i * bh * 0.015 - npOffset * 0.01);
    startCtx.lineTo(antX + bw * 0.02, antBY - bh * 0.05 + i * bh * 0.015 - npOffset * 0.01);
    startCtx.stroke();
  }

  // Fountain
  const fX = bw * 0.65, fY = bh * 0.7;
  startCtx.fillStyle = '#6B4F35';
  startCtx.beginPath();
  startCtx.arc(fX, fY, bw * 0.04, 0, Math.PI * 2);
  startCtx.fill();
  // Fountain basin
  startCtx.fillStyle = '#8B6B47';
  startCtx.beginPath();
  startCtx.ellipse(fX, fY, bw * 0.06, bh * 0.02, 0, 0, Math.PI * 2);
  startCtx.fill();
  // Water arcs
  for (let arc = 0; arc < 3; arc++) {
    const arcPhase = (startAnimTime / 1.8 + arc * 0.33) % 1;
    const arcAngle = (arc - 1) * 0.4;
    const arcAmp = 6 * (h / 600);
    const oscY = Math.sin(arcPhase * Math.PI * 2) * arcAmp;
    startCtx.strokeStyle = `rgba(130, 180, 220, 0.6)`;
    startCtx.lineWidth = 1.5;
    startCtx.beginPath();
    startCtx.moveTo(fX, fY - bh * 0.02);
    const cx1 = fX + Math.cos(arcAngle) * bw * 0.03;
    const cy1 = fY - bh * 0.05 + oscY;
    const ex = fX + Math.cos(arcAngle) * bw * 0.055;
    const ey = fY - bh * 0.01 + oscY;
    startCtx.quadraticCurveTo(cx1, cy1, ex, ey);
    startCtx.stroke();
  }
  // Spray particles
  for (let sp = 0; sp < 8; sp++) {
    const spPhase = (startAnimTime * 0.5 + sp * 0.125) % 1;
    const spX = fX + (Math.random() - 0.5) * bw * 0.04;
    const spY = fY - spPhase * 20 * (h / 600);
    startCtx.globalAlpha = 0.3 * (1 - spPhase);
    startCtx.fillStyle = '#99CCDD';
    startCtx.beginPath();
    startCtx.arc(spX, spY, 2, 0, Math.PI * 2);
    startCtx.fill();
    startCtx.globalAlpha = 1;
  }

  // Pigeon
  pigeonTimer += dt;
  if (pigeonState === 'waiting' && pigeonTimer > 9.0) {
    pigeonState = 'sitting';
    pigeonX = bw * 0.72;
    pigeonY = bh * 0.68;
    pigeonTimer = 0;
    playElementTick();
  }
  if (pigeonState === 'sitting') {
    const bobY = Math.sin(startAnimTime / 0.4 * Math.PI * 2) * 3 * (h / 600);
    startCtx.fillStyle = '#555';
    startCtx.beginPath();
    startCtx.ellipse(pigeonX, pigeonY + bobY, bw * 0.015, bh * 0.012, 0, 0, Math.PI * 2);
    startCtx.fill();
    startCtx.beginPath();
    startCtx.arc(pigeonX + bw * 0.01, pigeonY + bobY - bh * 0.015, bw * 0.008, 0, Math.PI * 2);
    startCtx.fill();
    if (pigeonTimer > 2.5) {
      pigeonState = 'takingoff';
      pigeonTimer = 0;
      pigeonVX = 180 * (w / 800);
      pigeonVY = -180 * (h / 600);
    }
  }
  if (pigeonState === 'takingoff') {
    pigeonX += pigeonVX * dt;
    pigeonY += pigeonVY * dt;
    startCtx.fillStyle = '#555';
    startCtx.beginPath();
    startCtx.ellipse(pigeonX, pigeonY, bw * 0.015, bh * 0.008, -0.5, 0, Math.PI * 2);
    startCtx.fill();
    if (pigeonX > w + 20 || pigeonY < -20) {
      pigeonState = 'waitingNext';
      pigeonTimer = 0;
    }
  }
  if (pigeonState === 'waitingNext' && pigeonTimer > 6.5) {
    pigeonState = 'waiting';
    pigeonTimer = 0;
  }

  // Viewfinder frame
  const vfW = w * 0.8, vfH = h * 0.75;
  const vfX = (w - vfW) / 2, vfY = (h - vfH) / 2;
  // Vignette outside viewfinder
  startCtx.fillStyle = 'rgba(26, 18, 8, 0.5)';
  startCtx.fillRect(0, 0, w, vfY);
  startCtx.fillRect(0, vfY + vfH, w, h - vfY - vfH);
  startCtx.fillRect(0, vfY, vfX, vfH);
  startCtx.fillRect(vfX + vfW, vfY, w - vfX - vfW, vfH);

  // Corner pulse
  const cpScale = 1 + 0.008 * Math.sin((startAnimTime / 3.2) * Math.PI * 2);
  const cornerSize = 20 * cpScale;
  const cornerThick = 2;
  startCtx.strokeStyle = '#2C5F4A';
  startCtx.lineWidth = cornerThick;
  // Four corners
  const corners = [
    [vfX, vfY],
    [vfX + vfW, vfY],
    [vfX, vfY + vfH],
    [vfX + vfW, vfY + vfH]
  ];
  corners.forEach(([cx, cy]) => {
    const sx = cx === vfX ? 1 : -1;
    const sy = cy === vfY ? 1 : -1;
    startCtx.beginPath();
    startCtx.moveTo(cx, cy + sy * cornerSize);
    startCtx.lineTo(cx, cy);
    startCtx.lineTo(cx + sx * cornerSize, cy);
    startCtx.stroke();
  });

  // Rule of thirds grid
  startCtx.strokeStyle = 'rgba(255,255,255,0.08)';
  startCtx.lineWidth = 1;
  for (let i = 1; i <= 2; i++) {
    startCtx.beginPath();
    startCtx.moveTo(vfX + vfW * i / 3, vfY);
    startCtx.lineTo(vfX + vfW * i / 3, vfY + vfH);
    startCtx.stroke();
    startCtx.beginPath();
    startCtx.moveTo(vfX, vfY + vfH * i / 3);
    startCtx.lineTo(vfX + vfW, vfY + vfH * i / 3);
    startCtx.stroke();
  }

  // Camera body border at bottom
  const camBodyH = h * 0.06;
  startCtx.fillStyle = '#1a1208';
  startCtx.fillRect(0, h - camBodyH, w, camBodyH);
  // Grip texture suggestion
  for (let gx = w * 0.78; gx < w * 0.88; gx += 4) {
    startCtx.fillStyle = 'rgba(255,255,255,0.05)';
    startCtx.fillRect(gx, h - camBodyH + 4, 2, camBodyH - 8);
  }
  // Film counter
  startCtx.fillStyle = '#2C5F4A';
  startCtx.fillRect(w * 0.88, h - camBodyH + camBodyH * 0.2, w * 0.08, camBodyH * 0.6);
  startCtx.fillStyle = '#E8D5B0';
  startCtx.font = `${Math.round(camBodyH * 0.4)}px 'Courier New', monospace`;
  startCtx.textAlign = 'center';
  startCtx.fillText('36', w * 0.92, h - camBodyH + camBodyH * 0.68);

  // Shutter button indicator
  startCtx.fillStyle = '#C8392B';
  startCtx.beginPath();
  startCtx.arc(w * 0.5, h - camBodyH + camBodyH * 0.5, camBodyH * 0.25, 0, Math.PI * 2);
  startCtx.fill();
}

// Position camera SVG
function updateCameraSVGPosition() {
  const svgEl = document.getElementById('camera-svg');
  const w = W(), h = H();
  if (svgEl && svgEl.setAttribute) {
    svgEl.setAttribute('transform', `translate(${w * 0.5}, ${h * 0.56})`);
  }
  const camCenter = document.getElementById('cam-center');
  if (camCenter && camCenter.setAttribute) {
    camCenter.setAttribute('transform', `translate(${w * 0.5}, ${h * 0.56})`);
  }
}

// Title fade in
let titleFadeDone = false;
let titlePulseTimer = 0;
let promptFadeIn = 0;

function updateTitleSVG(dt) {
  if (gameState !== 'start') return;
  startAnimTime += 0; // already incremented in drawStartScreen

  if (!titleFadeDone) {
    titleFadeIn = Math.min(1, startAnimTime / 1.8);
    if (titleGroup) titleGroup.style.opacity = titleFadeIn;
    if (cameraGroup) cameraGroup.style.opacity = titleFadeIn * 0.9;
    if (titleFadeIn >= 1) titleFadeDone = true;
  }

  titlePulseTimer += dt;
  if (titlePulseTimer > 12) {
    const pulseT = titlePulseTimer - 12;
    if (pulseT < 1) {
      const pOpacity = 0.92 - 0.42 * Math.sin(pulseT * Math.PI);
      if (titleGroup) titleGroup.style.opacity = pOpacity;
      if (cameraGroup) cameraGroup.style.opacity = pOpacity * 0.9;
    } else {
      titlePulseTimer = 0;
      if (titleGroup) titleGroup.style.opacity = 0.92;
      if (cameraGroup) cameraGroup.style.opacity = 0.92 * 0.9;
    }
  }

  // Press prompt after 3s
  if (startAnimTime > 3 && pressPrompt) {
    promptFadeIn = Math.min(0.6, promptFadeIn + dt * 0.75);
    const blinkPhase = (startAnimTime - 3) / 2.0;
    const blinkOpacity = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(blinkPhase * Math.PI * 2));
    pressPrompt.setAttribute('opacity', Math.min(promptFadeIn, blinkOpacity));
  }
}

// ─── Game Scene Drawing ────────────────────────────────────────────────────────
let gameCtx = null; // We use the startCanvas for game UI too (renamed usage)

// Track element states
let sVal = 0, lVal = 0, bVal = 0;
let sPrevPeaked = false, lPrevPeaked = false, bPrevPeaked = false;
let allAlignedTime = null;
let wasNearAligned = false;
let viewfinderTightened = false;
let bloomActive = false;

function computeElementValues(now) {
  const lev = LEVELS[currentLevel];
  const elapsed = now - levelStartTime;

  // Subject: sinusoidal with flat top at peak
  const sPhase = (elapsed % lev.sCycle) / lev.sCycle;
  const sRaw = (Math.sin(sPhase * Math.PI * 2 - Math.PI / 2) + 1) / 2; // 0..1
  const sPeakFrac = lev.sPeak / lev.sCycle;
  // Flat top: if raw > (1 - sPeakFrac*2), clamp
  const sFlatThresh = 1 - sPeakFrac * 2;
  sVal = sRaw > sFlatThresh ? 100 : sRaw * 100 / sFlatThresh;

  // Light: similar
  const lPhase = (elapsed % lev.lCycle) / lev.lCycle;
  const lRaw = (Math.sin(lPhase * Math.PI * 2 - Math.PI / 2) + 1) / 2;
  const lPeakFrac = lev.lPeak / lev.lCycle;
  const lFlatThresh = 1 - lPeakFrac * 2;
  lVal = lRaw > lFlatThresh ? 100 : lRaw * 100 / lFlatThresh;

  // Background: constant 100 for level 1, else sinusoidal
  if (currentLevel === 0) {
    bVal = 100;
  } else {
    const bPhase = (elapsed % lev.bCycle) / lev.bCycle;
    const bRaw = (Math.sin(bPhase * Math.PI * 2 - Math.PI / 2) + 1) / 2;
    const bPeakFrac = lev.bPeak / lev.bCycle;
    const bFlatThresh = 1 - bPeakFrac * 2;
    bVal = bRaw > bFlatThresh ? 100 : bRaw * 100 / bFlatThresh;
  }
}

function checkElementPeaks() {
  const sPeaked = sVal >= 85;
  const lPeaked = lVal >= 85;
  const bPeaked = bVal >= 85;

  // Tick on crossing peak
  if (sPeaked && !sPrevPeaked) { playElementTick(); }
  if (lPeaked && !lPrevPeaked) { playElementTick(); }
  if (bPeaked && !bPrevPeaked) { playElementTick(); }
  sPrevPeaked = sPeaked;
  lPrevPeaked = lPeaked;
  bPrevPeaked = bPeaked;

  const alignCount = [sPeaked, lPeaked, bPeaked].filter(Boolean).length;

  // Near alignment (2/3)
  const isNear = alignCount === 2;
  if (isNear && !wasNearAligned) {
    startNearHum();
    wasNearAligned = true;
    snareMode = 'beat1only';
    pianoComp.volume.value = -30;
  } else if (!isNear && wasNearAligned) {
    stopNearHum();
    wasNearAligned = false;
    snareMode = 'normal';
    pianoComp.volume.value = -14;
  }

  // Full alignment
  const allAligned = alignCount === 3;
  if (allAligned && !viewfinderTightened) {
    viewfinderTightened = true;
    allAlignedTime = performance.now();
    playCornerTighten();
  } else if (!allAligned) {
    viewfinderTightened = false;
    allAlignedTime = null;
  }

  // Bloom on alignment
  bloomPass.strength = allAligned ? 1.2 : isNear ? 0.8 : 0.6;
  bloomPass.threshold = allAligned ? 0.5 : 0.75;
}

// ─── Shot Firing ──────────────────────────────────────────────────────────────
let feedbackTimeout = null;

function fireShutter() {
  if (gameState !== 'playing') return;
  if (shotsUsed >= 12) return;

  const sPeaked = sVal >= 85;
  const lPeaked = lVal >= 85;
  const bPeaked = bVal >= 85;
  const alignCount = [sPeaked, lPeaked, bPeaked].filter(Boolean).length;
  const allAligned = alignCount === 3;
  const twoAligned = alignCount === 2;
  const thirdLow = allAligned ? false : [sVal, lVal, bVal].some((v, i) => {
    const peaked = [sPeaked, lPeaked, bPeaked][i];
    return !peaked && v < 60;
  });

  // Score
  let score = Math.round((sVal / 100) * (lVal / 100) * (bVal / 100) * 1000);
  let bonus = 0;
  let label = '';
  let labelColor = '#E8D5B0';
  let isDecisive = false;

  if (allAligned) {
    bonus += 500;
    label = 'DECISIVE MOMENT';
    labelColor = '#F4A822';
    isDecisive = true;
    // Anticipation bonus
    if (allAlignedTime !== null) {
      const sincePeak = performance.now() - allAlignedTime;
      if (sincePeak < 50) {
        bonus += 300;
        label = '◈ DECISIVE MOMENT';
      }
    }
    playPerfectShutter();
    // Trumpet hook after 0.3s silence
    setTimeout(() => {
      if (audioReady) playTrumpetHook(false);
    }, 300);
  } else if (twoAligned && thirdLow) {
    label = 'NEAR MISS';
    labelColor = '#8B6B47';
    playMisfireShutter();
    pianoSkipBars = 2;
  } else {
    label = 'BLOWN FRAME';
    labelColor = '#C8392B';
    playMisfireShutter();
  }

  const totalShot = score + bonus;
  shots.push({ score: totalShot, isDecisive });
  shotsUsed++;

  playFilmAdvance();

  // Show feedback
  showShotFeedback(label, labelColor, totalShot);

  // Update shot counter on 2D canvas
  // Check if level should end
  if (shotsUsed >= 12) {
    setTimeout(() => endLevel(), 1200);
  }
}

function showShotFeedback(label, color, score) {
  if (feedbackTimeout) clearTimeout(feedbackTimeout);
  shotFeedback.innerHTML = `<div style="color:${color};text-shadow:0 0 10px ${color};">${label}</div><div style="color:#E8D5B0;font-size:clamp(12px,2vw,18px);margin-top:4px;">+${score}</div>`;
  shotFeedback.style.opacity = '1';
  feedbackTimeout = setTimeout(() => {
    shotFeedback.style.opacity = '0';
    shotFeedback.style.transition = 'opacity 0.6s';
  }, 1200);
}

// ─── Level End ────────────────────────────────────────────────────────────────
function endLevel() {
  gameState = 'levelComplete';
  stopNearHum();

  if (currentLevel === 3 && LEVELS[currentLevel].isRain) stopRainAudio();

  const sorted = [...shots].sort((a, b) => b.score - a.score);
  const top3 = sorted.slice(0, 3);
  const avg = top3.reduce((s, x) => s + x.score, 0) / Math.max(top3.length, 1);
  const lev = LEVELS[currentLevel];

  if (currentLevel === 2) {
    // Gallery reveal for Level 3
    showGallery(sorted, avg);
  } else if (avg < 200) {
    showGameOver(false, avg);
  } else if (avg >= lev.winThreshold) {
    showLevelComplete(sorted, avg);
  } else {
    showGameOver(false, avg);
  }
}

function showLevelComplete(sorted, avg) {
  levelCompleteEl.innerHTML = buildContactSheet(sorted, avg);
  levelCompleteEl.classList.add('visible');

  // Play level complete music
  if (audioReady) {
    setTimeout(() => {
      playTrumpetHook(true);
      setTimeout(() => playTrumpetHook(true), 2000);
    }, 500);
  }

  levelCompleteEl.addEventListener('pointerdown', advanceLevel, { once: true });
}

function advanceLevel() {
  levelCompleteEl.classList.remove('visible');
  currentLevel++;
  if (currentLevel >= LEVELS.length) {
    showGameOver(true, 0);
  } else {
    startLevel();
  }
}

function buildContactSheet(sorted, avg) {
  const lev = LEVELS[currentLevel];
  const top3Scores = sorted.slice(0, 3).map(s => s.score);

  let thumbsHtml = '';
  for (let i = 0; i < 12; i++) {
    const shot = sorted[i];
    let color = '#333';
    if (shot) {
      const s = shot.score;
      if (s >= 800) color = '#F4A822';
      else if (s >= 500) color = '#2C5F4A';
      else if (s >= 300) color = '#8B6B47';
      else color = '#C8392B';
    }
    const isTop3 = shot && top3Scores.includes(shot.score) && i < 3;
    thumbsHtml += `<div class="contact-thumb${isTop3 ? ' top3' : ''}" style="background:${color};">
      ${shot ? `<div style="position:absolute;bottom:2px;right:2px;font-size:7px;color:#fff;font-family:Courier New;">${shot.score}</div>` : ''}
    </div>`;
  }

  return `
    <div style="color:#E8D5B0;text-align:center;padding:20px;">
      <div style="font-family:'Courier New',monospace;font-size:clamp(14px,2.5vw,20px);letter-spacing:6px;color:#2C5F4A;margin-bottom:8px;">${lev.name.toUpperCase()}</div>
      <div style="font-family:'Courier New',monospace;font-size:clamp(11px,2vw,14px);color:#8B6B47;margin-bottom:16px;">${lev.sub} — Roll Developed</div>
      <div class="contact-sheet-grid">${thumbsHtml}</div>
      <div style="font-family:'Courier New',monospace;font-size:clamp(16px,3vw,24px);color:#F4A822;margin-top:12px;">TOP-3 AVG: ${Math.round(avg)}</div>
      <div style="font-family:'Courier New',monospace;font-size:clamp(9px,1.5vw,12px);color:#8B6B47;margin-top:8px;letter-spacing:2px;">TAP TO CONTINUE</div>
    </div>
  `;
}

// ─── Gallery Screen (Level 3) ─────────────────────────────────────────────────
let galleryCanvas = null;
let galleryCtx = null;
let galleryAnimTime = 0;
let galleryAvg = 0;
let galleryShots = [];
let tearVisible = false;

function showGallery(sorted, avg) {
  galleryAvg = avg;
  galleryShots = sorted;
  gameState = 'gallery';
  galleryScreen.classList.add('visible');
  tearVisible = false;

  // Build gallery HTML
  galleryScreen.innerHTML = `<canvas id="gallery-canvas" style="position:absolute;top:0;left:0;width:100%;height:100%;"></canvas>`;
  galleryCanvas = document.getElementById('gallery-canvas');
  if (galleryCanvas) {
    galleryCanvas.width = W();
    galleryCanvas.height = H();
    galleryCtx = patchCtx(galleryCanvas.getContext ? galleryCanvas.getContext('2d') : null);
  }

  // Applause
  if (audioReady && sfxApplause) {
    sfxApplause.triggerAttack();
    let duration = avg < 450 ? 3000 : avg < 700 ? 6000 : avg < 900 ? 9000 : 12000;
    setTimeout(() => sfxApplause.triggerRelease(), duration);
  }

  // Perfect score: tear + C6 note
  if (avg > 900 && audioReady && sfxTear) {
    setTimeout(() => {
      tearVisible = true;
      sfxTear.triggerAttackRelease(['C6'], '2n');
    }, 3000);
  }

  galleryScreen.addEventListener('pointerdown', () => {
    galleryScreen.classList.remove('visible');
    galleryScreen.innerHTML = '';
    const avg2 = galleryAvg;
    const lev = LEVELS[currentLevel];
    if (avg2 >= lev.winThreshold) {
      // Show regular level complete then advance
      levelCompleteEl.innerHTML = buildContactSheet(galleryShots, avg2);
      levelCompleteEl.classList.add('visible');
      levelCompleteEl.addEventListener('pointerdown', advanceLevel, { once: true });
    } else {
      showGameOver(false, avg2);
    }
  }, { once: true });
}

function drawGallery(dt) {
  if (gameState !== 'gallery' || !galleryCtx) return;
  galleryAnimTime += dt;
  const gw = galleryCanvas.width, gh = galleryCanvas.height;
  galleryCtx.clearRect(0, 0, gw, gh);

  // Gallery wall
  galleryCtx.fillStyle = '#f0ece4';
  galleryCtx.fillRect(0, 0, gw, gh);

  // Ceiling light gradient
  const ceilGrad = galleryCtx.createLinearGradient(0, 0, 0, gh * 0.6);
  ceilGrad.addColorStop(0, 'rgba(255,248,230,0.8)');
  ceilGrad.addColorStop(1, 'rgba(240,236,228,0)');
  galleryCtx.fillStyle = ceilGrad;
  galleryCtx.fillRect(0, 0, gw, gh * 0.6);

  // Background painting (portrait)
  const portX = gw * 0.5, portY = gh * 0.25;
  galleryCtx.fillStyle = '#c8b89a';
  galleryCtx.fillRect(portX - 60, portY - 80, 120, 150);
  galleryCtx.strokeStyle = '#6B4F35';
  galleryCtx.lineWidth = 4;
  galleryCtx.strokeRect(portX - 60, portY - 80, 120, 150);
  // Portrait face suggestion
  galleryCtx.fillStyle = '#D4A882';
  galleryCtx.beginPath();
  galleryCtx.ellipse(portX, portY - 20, 28, 36, 0, 0, Math.PI * 2);
  galleryCtx.fill();
  galleryCtx.fillStyle = '#8B6B47';
  galleryCtx.beginPath();
  galleryCtx.arc(portX - 8, portY - 25, 4, 0, Math.PI * 2);
  galleryCtx.fill();
  galleryCtx.beginPath();
  galleryCtx.arc(portX + 8, portY - 25, 4, 0, Math.PI * 2);
  galleryCtx.fill();

  // Tear effect (for perfect score)
  if (tearVisible) {
    const tearProgress = Math.min(1, (galleryAnimTime - (galleryAnimTime > 3 ? galleryAnimTime - 3 : 0)) * 0.5);
    galleryCtx.strokeStyle = `rgba(70, 100, 180, ${0.7 * tearProgress})`;
    galleryCtx.lineWidth = 3;
    galleryCtx.beginPath();
    galleryCtx.moveTo(portX + 8, portY - 18);
    galleryCtx.bezierCurveTo(portX + 10, portY - 10, portX + 6, portY, portX + 5, portY + 15);
    galleryCtx.stroke();
  }

  // Three photo prints on wall
  const top3 = galleryShots.slice(0, 3);
  const printW = Math.min(gw * 0.18, 140);
  const printH = printW * 0.67;
  const spacing = printW * 1.4;
  const startPX = gw * 0.5 - spacing;

  top3.forEach((shot, i) => {
    const px = startPX + i * spacing;
    const py = gh * 0.35;

    // Photo mount (white with border)
    galleryCtx.fillStyle = '#fff';
    galleryCtx.fillRect(px - 8, py - 8, printW + 16, printH + 24);
    galleryCtx.strokeStyle = '#ddd';
    galleryCtx.lineWidth = 1;
    galleryCtx.strokeRect(px - 8, py - 8, printW + 16, printH + 24);

    // Photo itself (colored by score)
    const s = shot.score;
    let photoColor = s >= 800 ? '#F4A822' : s >= 500 ? '#2C5F4A' : s >= 300 ? '#8B6B47' : '#C8392B';
    galleryCtx.fillStyle = photoColor;
    galleryCtx.fillRect(px, py, printW, printH);

    // Photo content suggestion — silhouette
    galleryCtx.fillStyle = 'rgba(0,0,0,0.3)';
    galleryCtx.beginPath();
    galleryCtx.ellipse(px + printW * 0.5, py + printH * 0.55, printW * 0.12, printH * 0.25, 0, 0, Math.PI * 2);
    galleryCtx.fill();
    galleryCtx.beginPath();
    galleryCtx.arc(px + printW * 0.5, py + printH * 0.28, printH * 0.12, 0, Math.PI * 2);
    galleryCtx.fill();

    // Score on mount
    galleryCtx.fillStyle = '#555';
    galleryCtx.font = `${Math.round(printW * 0.1)}px 'Courier New'`;
    galleryCtx.textAlign = 'center';
    galleryCtx.fillText(shot.score.toString(), px + printW * 0.5, py + printH + 14);

    // Spot light
    const spotGrad = galleryCtx.createRadialGradient(px + printW / 2, py - 20, 5, px + printW / 2, py - 20, printW * 1.2);
    spotGrad.addColorStop(0, 'rgba(255, 248, 220, 0.3)');
    spotGrad.addColorStop(1, 'rgba(255, 248, 220, 0)');
    galleryCtx.fillStyle = spotGrad;
    galleryCtx.fillRect(px - printW * 0.5, py - printH * 0.5, printW * 2, printH * 2.5);
  });

  // Floor
  galleryCtx.fillStyle = '#c8b89a';
  galleryCtx.fillRect(0, gh * 0.75, gw, gh * 0.25);
  // Floor reflection
  const floorGrad = galleryCtx.createLinearGradient(0, gh * 0.75, 0, gh);
  floorGrad.addColorStop(0, 'rgba(200, 184, 154, 1)');
  floorGrad.addColorStop(1, 'rgba(160, 140, 110, 1)');
  galleryCtx.fillStyle = floorGrad;
  galleryCtx.fillRect(0, gh * 0.75, gw, gh * 0.25);

  // Silhouetted gallery-goers
  const goers = [0.15, 0.3, 0.5, 0.7, 0.85];
  goers.forEach((gx, gi) => {
    const bh = gh * (0.12 + gi * 0.01);
    const gxPx = gw * gx;
    const gyPx = gh * 0.75 - bh;
    galleryCtx.fillStyle = '#2a2020';
    // Body
    galleryCtx.beginPath();
    galleryCtx.ellipse(gxPx, gyPx + bh * 0.5, bh * 0.12, bh * 0.4, 0, 0, Math.PI * 2);
    galleryCtx.fill();
    // Head
    galleryCtx.beginPath();
    galleryCtx.arc(gxPx, gyPx + bh * 0.08, bh * 0.1, 0, Math.PI * 2);
    galleryCtx.fill();
  });

  // Score overlay
  galleryCtx.fillStyle = 'rgba(0,0,0,0.5)';
  galleryCtx.fillRect(0, gh - 50, gw, 50);
  galleryCtx.fillStyle = '#F4A822';
  galleryCtx.font = `clamp(12px, 2vw, 16px) 'Courier New'`;
  galleryCtx.font = `${Math.round(gh * 0.025)}px 'Courier New'`;
  galleryCtx.textAlign = 'center';
  const tier = galleryAvg > 900 ? 'PERFECT ROLL' : galleryAvg >= 700 ? 'EXCEPTIONAL' : galleryAvg >= 450 ? 'DEVELOPED WELL' : 'UNDEREXPOSED';
  galleryCtx.fillText(`${tier} — AVG ${Math.round(galleryAvg)}  |  TAP TO CONTINUE`, gw * 0.5, gh - 20);
}

// ─── Game Over ────────────────────────────────────────────────────────────────
function showGameOver(won, avg) {
  gameState = 'gameover';
  gameOverEl.classList.add('visible');

  if (audioReady && bass) {
    // Low Eb sustained fade in/out
    bass.volume.value = -20;
    bass.triggerAttack('Eb2');
    setTimeout(() => {
      bass.volume.rampTo(-6, 2);
      setTimeout(() => {
        bass.volume.rampTo(-40, 3);
        setTimeout(() => bass.triggerRelease(), 3000);
      }, 2000);
    }, 100);
  }

  const lev = LEVELS[currentLevel];
  if (won) {
    gameOverEl.innerHTML = `
      <div style="color:#F4A822;font-family:'Courier New',monospace;text-align:center;padding:40px;">
        <div style="font-size:clamp(20px,4vw,32px);letter-spacing:8px;margin-bottom:20px;">ROLL COMPLETE</div>
        <div style="font-size:clamp(12px,2vw,16px);color:#E8D5B0;letter-spacing:3px;margin-bottom:8px;">All 5 locations shot.</div>
        <div style="font-size:clamp(12px,2vw,16px);color:#8B6B47;letter-spacing:2px;margin-bottom:32px;">Mara never missed a decisive moment she recognised.</div>
        <div style="font-size:clamp(28px,5vw,48px);color:#F4A822;">${totalScore.toLocaleString()}</div>
        <div style="font-size:clamp(9px,1.5vw,11px);color:#8B6B47;margin-top:8px;letter-spacing:4px;">TOTAL SCORE</div>
        <div style="font-size:clamp(10px,1.5vw,12px);color:#8B6B47;margin-top:32px;letter-spacing:3px;">TAP TO PLAY AGAIN</div>
      </div>
    `;
  } else {
    gameOverEl.innerHTML = `
      <div style="color:#C8392B;font-family:'Courier New',monospace;text-align:center;padding:40px;">
        <div style="font-size:clamp(20px,4vw,28px);letter-spacing:6px;margin-bottom:20px;">ROLL UNDEREXPOSED</div>
        <div style="font-size:clamp(12px,2vw,16px);color:#8B6B47;letter-spacing:2px;margin-bottom:8px;">${lev.name}</div>
        <div style="font-size:clamp(12px,2vw,14px);color:#E8D5B0;letter-spacing:2px;margin-bottom:12px;">Top-3 average: ${Math.round(avg)}</div>
        <div style="font-size:clamp(11px,1.8vw,13px);color:#8B6B47;letter-spacing:2px;margin-bottom:32px;">The moment passed. Reload.</div>
        <div style="font-size:clamp(10px,1.5vw,12px);color:#8B6B47;margin-top:16px;letter-spacing:3px;">TAP TO RETRY</div>
      </div>
    `;
  }

  gameOverEl.addEventListener('pointerdown', () => {
    gameOverEl.classList.remove('visible');
    if (won) {
      currentLevel = 0;
      totalScore = 0;
    }
    startLevel();
  }, { once: true });
}

// ─── Start Level ──────────────────────────────────────────────────────────────
function startLevel() {
  shots = [];
  shotsUsed = 0;
  sVal = 0; lVal = 0; bVal = 0;
  sPrevPeaked = false; lPrevPeaked = false; bPrevPeaked = false;
  wasNearAligned = false;
  viewfinderTightened = false;
  allAlignedTime = null;
  pianoSkipBars = 0;
  snareMode = 'normal';

  levelStartTime = performance.now();
  gameState = 'playing';
  gameUI.style.display = 'block';

  buildSceneForLevel(currentLevel);

  if (LEVELS[currentLevel].isRain) {
    startRainAudio();
  }

  bloomPass.strength = 0.6;
  bloomPass.threshold = 0.75;
  vignettePass.uniforms.darkness.value = LEVELS[currentLevel].isRain ? 0.55 : 0.4;
}

// ─── Screen flow ──────────────────────────────────────────────────────────────
function showInstructions() {
  startScreen.style.display = 'none';
  instructionsScreen.classList.remove('hidden');
  instructionsScreen.style.display = 'flex';
  requestAnimationFrame(() => {
    instructionsScreen.style.opacity = '1';
    instructionsScreen.style.transition = 'opacity 0.3s';
  });
}

startScreen.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (gameState !== 'start') return;
  try { initAudio(); } catch(err) {}
  showInstructions();
});

instructionsScreen.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (gameState !== 'start') return;
  instructionsScreen.style.opacity = '0';
  instructionsScreen.style.transition = 'opacity 0.3s';
  setTimeout(() => {
    instructionsScreen.classList.add('hidden');
    instructionsScreen.style.display = 'none';
    startLevel();
  }, 300);
});

// ─── Game input ───────────────────────────────────────────────────────────────
document.addEventListener('pointerdown', (e) => {
  if (gameState === 'playing') {
    fireShutter();
  }
}, { capture: true });

// Advance button (bottom left during play)
// We'll draw this in the 2D canvas and check clicks

// ─── 2D Game Canvas (UI overlay) ──────────────────────────────────────────────
function drawGameUI(dt) {
  if (gameState !== 'playing') {
    startCtx.clearRect(0, 0, startCanvas.width, startCanvas.height);
    return;
  }

  const w = startCanvas.width;
  const h = startCanvas.height;
  startCtx.clearRect(0, 0, w, h);

  // Viewfinder frame
  const vfW = w * 0.82, vfH = h * 0.76;
  const vfX = (w - vfW) / 2;
  const vfY = (h - vfH) * 0.35;

  // Darkness outside viewfinder
  const lev = LEVELS[currentLevel];
  const darkAlpha = lev.isRain ? 0.6 : 0.45;
  startCtx.fillStyle = `rgba(26, 18, 8, ${darkAlpha})`;
  startCtx.fillRect(0, 0, w, vfY);
  startCtx.fillRect(0, vfY + vfH, w, h - vfY - vfH);
  startCtx.fillRect(0, vfY, vfX, vfH);
  startCtx.fillRect(vfX + vfW, vfY, w - vfX - vfW, vfH);

  // Corner scale when aligned
  const allAligned = sVal >= 85 && lVal >= 85 && bVal >= 85;
  const cornerScale = allAligned ? 1.015 : 1.0;
  const adjVfX = vfX - (vfW * (cornerScale - 1)) / 2;
  const adjVfY = vfY - (vfH * (cornerScale - 1)) / 2;
  const adjVfW = vfW * cornerScale;
  const adjVfH = vfH * cornerScale;

  const cornerColor = allAligned ? '#F4A822' : '#2C5F4A';
  const cornerSize = 22;
  startCtx.strokeStyle = cornerColor;
  startCtx.lineWidth = allAligned ? 3 : 1.5;

  const cornersArr = [
    [adjVfX, adjVfY],
    [adjVfX + adjVfW, adjVfY],
    [adjVfX, adjVfY + adjVfH],
    [adjVfX + adjVfW, adjVfY + adjVfH]
  ];
  cornersArr.forEach(([cx, cy]) => {
    const sx = (cx < w / 2) ? 1 : -1;
    const sy = (cy < h / 2) ? 1 : -1;
    startCtx.beginPath();
    startCtx.moveTo(cx, cy + sy * cornerSize);
    startCtx.lineTo(cx, cy);
    startCtx.lineTo(cx + sx * cornerSize, cy);
    startCtx.stroke();
  });

  // Rule of thirds
  startCtx.strokeStyle = 'rgba(255,255,255,0.08)';
  startCtx.lineWidth = 1;
  for (let i = 1; i <= 2; i++) {
    startCtx.beginPath();
    startCtx.moveTo(vfX + vfW * i / 3, vfY);
    startCtx.lineTo(vfX + vfW * i / 3, vfY + vfH);
    startCtx.stroke();
    startCtx.beginPath();
    startCtx.moveTo(vfX, vfY + vfH * i / 3);
    startCtx.lineTo(vfX + vfW, vfY + vfH * i / 3);
    startCtx.stroke();
  }

  // Camera body border at bottom
  const camBodyH = h * 0.07;
  startCtx.fillStyle = '#1a1208';
  startCtx.fillRect(0, h - camBodyH, w, camBodyH);

  // Shutter button
  startCtx.fillStyle = allAligned ? '#F4A822' : '#C8392B';
  startCtx.beginPath();
  startCtx.arc(w * 0.5, h - camBodyH + camBodyH * 0.5, camBodyH * 0.28, 0, Math.PI * 2);
  startCtx.fill();
  if (allAligned) {
    startCtx.shadowColor = '#F4A822';
    startCtx.shadowBlur = 15;
    startCtx.beginPath();
    startCtx.arc(w * 0.5, h - camBodyH + camBodyH * 0.5, camBodyH * 0.28, 0, Math.PI * 2);
    startCtx.fill();
    startCtx.shadowBlur = 0;
  }

  // Film counter
  const remaining = 12 - shotsUsed;
  startCtx.fillStyle = '#2C5F4A';
  startCtx.fillRect(w * 0.86, h - camBodyH + camBodyH * 0.15, w * 0.1, camBodyH * 0.7);
  startCtx.fillStyle = '#E8D5B0';
  startCtx.font = `${Math.round(camBodyH * 0.45)}px 'Courier New', monospace`;
  startCtx.textAlign = 'center';
  startCtx.fillText(remaining.toString().padStart(2, '0'), w * 0.91, h - camBodyH + camBodyH * 0.68);

  // Level name
  startCtx.fillStyle = 'rgba(44, 95, 74, 0.7)';
  startCtx.font = `${Math.round(h * 0.018)}px 'Courier New', monospace`;
  startCtx.textAlign = 'left';
  startCtx.fillText(LEVELS[currentLevel].name.toUpperCase(), vfX + 8, vfY + 18);

  // Element bars (S, L, B)
  drawElementBars(startCtx, vfX + vfW - 90, vfY + 8, 80, h);

  // Advance button (after 6 shots)
  if (shotsUsed >= 6) {
    startCtx.fillStyle = 'rgba(44, 95, 74, 0.8)';
    const advW = w * 0.15, advH = h * 0.04;
    const advX = w * 0.02, advY = h - camBodyH - advH - 8;
    startCtx.fillRect(advX, advY, advW, advH);
    startCtx.fillStyle = '#E8D5B0';
    startCtx.font = `${Math.round(h * 0.015)}px 'Courier New', monospace`;
    startCtx.textAlign = 'center';
    startCtx.fillText('DEVELOP', advX + advW / 2, advY + advH * 0.65);
    // Store advance button bounds for click detection
    window._advBtn = { x: advX, y: advY, w: advW, h: advH };
  } else {
    window._advBtn = null;
  }
}

function drawElementBars(ctx, x, y, w, h) {
  const lev = LEVELS[currentLevel];
  const barH = h * 0.018;
  const barGap = barH * 1.5;
  const labels = ['S', 'L', lev.bCycle > 0 ? 'B' : null];
  const vals = [sVal, lVal, lev.bCycle > 0 ? bVal : null];
  const colors = ['#2C5F4A', '#F4A822', '#8B6B47'];

  labels.forEach((label, i) => {
    if (label === null) return;
    const by = y + i * (barH + barGap);
    const val = vals[i];
    const peaked = val >= 85;

    // Background bar
    ctx.fillStyle = 'rgba(26, 18, 8, 0.6)';
    ctx.fillRect(x, by, w, barH);

    // Value bar
    const fillColor = peaked ? '#F4A822' : colors[i];
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, by, w * val / 100, barH);

    // Label
    ctx.fillStyle = peaked ? '#F4A822' : '#E8D5B0';
    ctx.font = `${Math.round(barH * 0.85)}px 'Courier New', monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(label, x - 4, by + barH * 0.8);

    // Peak indicator
    if (peaked) {
      ctx.strokeStyle = '#F4A822';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, by, w, barH);
    }
  });
}

// Handle advance button click
document.addEventListener('pointerdown', (e) => {
  if (gameState !== 'playing') return;
  if (!window._advBtn) return;
  const rect = startCanvas.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (startCanvas.width / rect.width);
  const py = (e.clientY - rect.top) * (startCanvas.height / rect.height);
  const btn = window._advBtn;
  if (px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h) {
    e.stopPropagation();
    endLevel();
  }
}, { capture: false });

// ─── 3D Scene Update ───────────────────────────────────────────────────────────
let sceneTime = 0;

function updateScene3D(dt) {
  if (gameState !== 'playing') return;
  sceneTime += dt;

  const lev = LEVELS[currentLevel];
  const now = performance.now();

  // Update element values
  computeElementValues(now);
  checkElementPeaks();

  // Subject animation based on sVal
  if (subjectGroup.children.length > 0) {
    const sNorm = sVal / 100;
    // Lean forward/back based on score
    subjectGroup.children[0].rotation.z = (0.5 - sNorm) * 0.3;
    // Head bob
    const headMesh = subjectGroup.children.find ? subjectGroup.children.find(c => c.geometry && c.geometry.type === 'SphereGeometry') : null;
    if (headMesh) {
      headMesh.position.y = 0.75 + Math.sin(sceneTime * 0.8) * 0.02;
    }

    // Newspaper (Level 1)
    const np = subjectGroup.children.find ? subjectGroup.children.find(c => c.name === 'newspaper') : null;
    if (np) {
      np.position.y = 0.1 - sNorm * 0.12;
      np.rotation.x = (1 - sNorm) * 0.5;
    }
  }

  // Light shaft based on lVal
  const lNorm = lVal / 100;
  lightShaftMesh.material.opacity = lNorm * 0.3;
  lightShaftMesh.position.x = -2 + lNorm * 4;

  // Background element (cat/window/lightning)
  if (bgElementGroup.children.length > 0) {
    const beMesh = bgElementGroup.children[0];
    const bNorm = bVal / 100;
    beMesh.material.opacity = 0.2 + bNorm * 0.8;

    if (currentLevel === 3) {
      // Lightning: flash on peak
      if (bVal >= 85) {
        bgMat.color.setHex(0x9AAABB);
        if (!bPrevPeaked) playLightningStrike();
      } else {
        bgMat.color.lerp(new THREE.Color(lev.bgColor), 0.05);
      }
    } else {
      // Position bg element to animate
      beMesh.position.x = 0.8 + Math.sin(sceneTime * 0.5) * 0.5;
    }
  }

  // Rain animation
  if (lev.isRain && rainParticles.length > 0) {
    const rp = rainParticles[0];
    const pos = rp.geo.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      pos.array[i * 3 + 1] -= dt * (3 + Math.random() * 2);
      pos.array[i * 3]     -= dt * 0.5;
      if (pos.array[i * 3 + 1] < -5) {
        pos.array[i * 3 + 1] = 5;
        pos.array[i * 3] = (Math.random() - 0.5) * 16;
      }
    }
    pos.needsUpdate = true;
  }

  // Camera slight wobble
  camera.position.x = Math.sin(sceneTime * 0.3) * 0.05;
  camera.position.y = Math.sin(sceneTime * 0.2) * 0.02;
}

// ─── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  renderer.setSize(W(), H());
  composer.setSize(W(), H());
  camera.aspect = W() / H();
  camera.updateProjectionMatrix();
  startCanvas.width = W();
  startCanvas.height = H();
  if (galleryCanvas) {
    galleryCanvas.width = W();
    galleryCanvas.height = H();
  }
  updateCameraSVGPosition();
});

updateCameraSVGPosition();

// ─── Main Loop ────────────────────────────────────────────────────────────────
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  updateMusic(dt);

  if (gameState === 'start') {
    drawStartScreen(dt);
    updateTitleSVG(dt);
    // Three.js background render (simple)
    scene.background = new THREE.Color(0x1a1208);
    composer.render();
  } else if (gameState === 'playing') {
    updateScene3D(dt);
    drawGameUI(dt);
    bgMesh.material.color.setHex(LEVELS[currentLevel].bgColor);
    composer.render();
  } else if (gameState === 'gallery') {
    drawGallery(dt);
    composer.render();
  } else {
    composer.render();
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
buildSceneForLevel(0);
scene.background = new THREE.Color(0x1a1208);

// Set initial camera SVG position
updateCameraSVGPosition();

animate();
