// Quad Shot Unified Production Bundle

// --- MODULE: math.js ---
// Quad Shot — Mathematical & Vector Geometry Engine
// All coordinates operate on the Cartesian Coordinate Plane

class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    clone() {
        return new Vec2(this.x, this.y);
    }

    copy(v) {
        this.x = v.x;
        this.y = v.y;
        return this;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    scale(s) {
        this.x *= s;
        this.y *= s;
        return this;
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    cross(v) {
        return this.x * v.y - this.y * v.x;
    }

    magSq() {
        return this.x * this.x + this.y * this.y;
    }

    mag() {
        return Math.hypot(this.x, this.y);
    }

    normalize() {
        const m = this.mag();
        if (m > 0.00001) {
            this.x /= m;
            this.y /= m;
        } else {
            this.x = 0;
            this.y = 0;
        }
        return this;
    }

    dist(v) {
        return Math.hypot(this.x - v.x, this.y - v.y);
    }

    distSq(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return dx * dx + dy * dy;
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    rotate(angleRad) {
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const nx = this.x * cos - this.y * sin;
        const ny = this.x * sin + this.y * cos;
        this.x = nx;
        this.y = ny;
        return this;
    }

    reflect(normal) {
        // v' = v - 2 * (v . n) * n
        const d = 2 * this.dot(normal);
        this.x -= d * normal.x;
        this.y -= d * normal.y;
        return this;
    }

    lerp(v, t) {
        this.x += (v.x - this.x) * t;
        this.y += (v.y - this.y) * t;
        return this;
    }

    static fromAngle(angleRad, length = 1) {
        return new Vec2(Math.cos(angleRad) * length, Math.sin(angleRad) * length);
    }

    static add(a, b) {
        return new Vec2(a.x + b.x, a.y + b.y);
    }

    static sub(a, b) {
        return new Vec2(a.x - b.x, a.y - b.y);
    }

    static scale(a, s) {
        return new Vec2(a.x * s, a.y * s);
    }

    static dist(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }
}

// Geometric intersection & reflection utilities
function lineIntersection(p1, p2, p3, p4) {
    const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
    if (Math.abs(d) < 1e-8) return null; // Parallel

    const u = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
    const v = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;

    if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
        return new Vec2(p1.x + u * (p2.x - p1.x), p1.y + u * (p2.y - p1.y));
    }
    return null;
}

// Flanking angle calculation for Vampiric Vectors
// Angle between attacker trajectory and target facing orientation
function getFlankingAngle(attackerPos, targetPos, targetHeadingAngle) {
    const attackDir = Math.atan2(attackerPos.y - targetPos.y, attackerPos.x - targetPos.x);
    let diff = Math.abs(attackDir - targetHeadingAngle);
    while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);
    // diff = 0 is head-on, diff = PI is directly behind (flank)
    return diff; // in radians [0, PI]
}

// Calculate critical strike chance multiplier from flanking angle
function calculateFlankCritChance(flankAngleRad) {
    // Linear scale from 0.05 (head-on) to 0.75 (from behind)
    const ratio = flankAngleRad / Math.PI;
    return 0.05 + ratio * 0.70;
}

// Sine wave displacement calculation
function calculateSineWavePoint(origin, targetDir, distance, frequency, amplitude, phase) {
    const forward = Vec2.fromAngle(targetDir, distance);
    const perp = Vec2.fromAngle(targetDir + Math.PI / 2, Math.sin(distance * frequency + phase) * amplitude);
    return Vec2.add(origin, forward).add(perp);
}

// Parabolic arc displacement calculation
function calculateParabolaHeight(t, maxHeight) {
    // 4 * h * t * (1 - t)
    return 4 * maxHeight * t * (1 - t);
}


// --- MODULE: audio.js ---
// Quad Shot — Retro-Futuristic Vector Audio Synthesizer (Web Audio API)
// Pure procedural synth - zero external asset dependencies

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.enabled = true;
        this.musicPlaying = false;
        this.musicInterval = null;
        this.step = 0;
        this.psychoMode = false;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.4;
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.7;
        this.sfxGain.connect(this.masterGain);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.35;
        this.musicGain.connect(this.masterGain);

        this.startSynthwaveBGM();
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setPsychoMode(enabled) {
        this.psychoMode = enabled;
    }

    playLaser(type = 'sine') {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        let baseFreq = this.psychoMode ? 660 : 440;
        if (type === 'sine') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq * 2, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
        } else if (type === 'reflection') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(220, now + 0.09);
        } else if (type === 'mortar') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);
        } else if (type === 'shotgun') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
        }

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (type === 'mortar' ? 0.25 : 0.12));

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + (type === 'mortar' ? 0.26 : 0.13));
    }

    playMeleeSlash(slashId = 1) {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const baseF = 320 + ((slashId % 5) * 60);
        osc.type = slashId % 2 === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(baseF * 1.8, now);
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.15);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.16);
    }

    playDeflect() {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1250, now);
        osc.frequency.exponentialRampToValueAtTime(1850, now + 0.08);

        gain.gain.setValueAtTime(0.38, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.13);
    }

    playExplosion(size = 1) {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        // White noise buffer
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.3 * size);
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800 * size, now);
        filter.frequency.exponentialRampToValueAtTime(50, now + 0.3 * size);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3 * Math.min(1.5, size), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3 * size);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        whiteNoise.start(now);
        whiteNoise.stop(now + 0.31 * size);
    }

    playDash() {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.13);
    }

    playApexShockwave() {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.36);
        this.playExplosion(0.8);
    }

    playSuspension(active) {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        if (active) {
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
        } else {
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        }

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.21);
    }

    playChime(type = 'pickup') {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const freqs = type === 'drop' ? [440, 554, 659, 880] : [523, 659, 784, 1046];

        freqs.forEach((f, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now + idx * 0.05);

            gain.gain.setValueAtTime(0.2, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.2);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.21);
        });
    }

    playCritHit() {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.09);
    }

    playTrapDeploy() {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(900, now + 0.15);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.19);
    }

    startSynthwaveBGM() {
        if (this.musicInterval) clearInterval(this.musicInterval);
        
        // Dark synthwave 16-step bassline & arpeggiator
        const bassNotes = [55, 55, 110, 55, 65.4, 65.4, 130.8, 65.4, 49, 49, 98, 49, 73.4, 73.4, 146.8, 73.4];
        const leadArp = [440, 554, 659, 880, 523, 659, 784, 1046, 392, 493, 587, 784, 587, 739, 880, 1174];

        this.musicInterval = setInterval(() => {
            if (!this.enabled || !this.ctx || this.ctx.state === 'suspended') return;
            const now = this.ctx.currentTime;
            const idx = this.step % 16;

            // Bass pulse
            const bFreq = bassNotes[idx] * (this.psychoMode ? 1.25 : 1.0);
            const bassOsc = this.ctx.createOscillator();
            const bassGain = this.ctx.createGain();
            bassOsc.type = 'sawtooth';
            bassOsc.frequency.setValueAtTime(bFreq, now);

            bassGain.gain.setValueAtTime(0.2, now);
            bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            bassOsc.connect(bassGain);
            bassGain.connect(this.musicGain);
            bassOsc.start(now);
            bassOsc.stop(now + 0.13);

            // Lead arp note every 2 steps
            if (idx % 2 === 0) {
                const lFreq = leadArp[idx] * (this.psychoMode ? 1.5 : 1.0);
                const leadOsc = this.ctx.createOscillator();
                const leadGain = this.ctx.createGain();
                leadOsc.type = 'sine';
                leadOsc.frequency.setValueAtTime(lFreq, now);

                leadGain.gain.setValueAtTime(0.08, now);
                leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

                leadOsc.connect(leadGain);
                leadGain.connect(this.musicGain);
                leadOsc.start(now);
                leadOsc.stop(now + 0.19);
            }

            this.step++;
        }, 135); // ~111 BPM
    }

    toggle() {
        this.enabled = !this.enabled;
        if (this.masterGain) {
            this.masterGain.gain.value = this.enabled ? 0.4 : 0.0;
        }
        return this.enabled;
    }
}

const audio = new SoundEngine();


// --- MODULE: grid.js ---
// Quad Shot — Reactive Cartesian Grid & Deformable Space Engine

class CartesianGrid {
    constructor(worldWidth = 4000, worldHeight = 4000, spacing = 60) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.spacing = spacing;
        this.cols = Math.ceil(worldWidth / spacing) + 1;
        this.rows = Math.ceil(worldHeight / spacing) + 1;
        this.halfW = worldWidth / 2;
        this.halfH = worldHeight / 2;

        // Deformation grid vertices
        this.points = [];
        this.initGrid();

        // Biome mapping: [Q1 (+,+), Q2 (-,+), Q3 (-,-), Q4 (+,-)]
        this.biomes = ['Domain of Order', 'Parabolic Wastes', 'Fractal Depths', 'Zero-G Void'];
        
        // Themes
        this.theme = 'CYBER'; // CYBER, ULTRAVIOLET, THERMAL, MATRIX, MONOCHROME
        this.psychoMode = false;
        this.time = 0;
    }

    initGrid() {
        this.points = [];
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const ox = -this.halfW + x * this.spacing;
                const oy = -this.halfH + y * this.spacing;
                this.points.push({
                    ox, oy, // Original rest position
                    x: ox, y: oy, // Current deformed position
                    vx: 0, vy: 0 // Velocity for spring oscillation
                });
            }
        }
    }

    scrambleQuadrants() {
        // Scramble the 4 biomes across the quadrants upon player death
        for (let i = this.biomes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.biomes[i], this.biomes[j]] = [this.biomes[j], this.biomes[i]];
        }
    }

    getBiomeAt(x, y) {
        // Hub check: (0,0) safe zone within radius 350
        if (Math.hypot(x, y) < 350) return 'The Origin Hub';
        if (x >= 0 && y >= 0) return this.biomes[0]; // Quadrant I
        if (x < 0 && y >= 0) return this.biomes[1];  // Quadrant II
        if (x < 0 && y < 0) return this.biomes[2];   // Quadrant III
        return this.biomes[3];                       // Quadrant IV
    }

    applyImpulse(x, y, radius, strength) {
        const rSq = radius * radius;
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            const dx = p.x - x;
            const dy = p.y - y;
            const distSq = dx * dx + dy * dy;
            if (distSq < rSq && distSq > 0.001) {
                const dist = Math.sqrt(distSq);
                const force = (1 - dist / radius) * strength;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }
        }
    }

    applyGravityWell(x, y, radius, pullStrength) {
        const rSq = radius * radius;
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            const dx = x - p.x;
            const dy = y - p.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < rSq && distSq > 0.001) {
                const dist = Math.sqrt(distSq);
                const force = (1 - dist / radius) * pullStrength;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }
        }
    }

    update(dt) {
        this.time += dt;
        // Spring physics relaxation towards (ox, oy)
        const stiffness = 0.08;
        const damping = 0.88;

        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            const ax = (p.ox - p.x) * stiffness;
            const ay = (p.oy - p.y) * stiffness;
            p.vx = (p.vx + ax) * damping;
            p.vy = (p.vy + ay) * damping;
            p.x += p.vx;
            p.y += p.vy;
        }
    }

    render(ctx, camera) {
        ctx.save();

        const viewLeft = camera.x - camera.width / (2 * camera.zoom) - 100;
        const viewRight = camera.x + camera.width / (2 * camera.zoom) + 100;
        const viewTop = camera.y - camera.height / (2 * camera.zoom) - 100;
        const viewBottom = camera.y + camera.height / (2 * camera.zoom) + 100;

        // Theme colors
        let gridColor = 'rgba(0, 240, 255, 0.12)';
        let axisColor = 'rgba(0, 255, 234, 0.7)';
        let hubColor = 'rgba(57, 255, 20, 0.6)';
        let textColor = 'rgba(0, 240, 255, 0.4)';

        if (this.psychoMode) {
            const hue = (this.time * 90) % 360;
            gridColor = `hsla(${hue}, 100%, 55%, 0.25)`;
            axisColor = `hsla(${(hue + 180) % 360}, 100%, 65%, 0.9)`;
            hubColor = `hsla(${(hue + 90) % 360}, 100%, 60%, 0.8)`;
            textColor = `hsla(${hue}, 100%, 75%, 0.7)`;
        } else if (this.theme === 'ULTRAVIOLET') {
            gridColor = 'rgba(157, 0, 255, 0.15)';
            axisColor = 'rgba(255, 0, 180, 0.8)';
            hubColor = 'rgba(180, 80, 255, 0.7)';
        } else if (this.theme === 'THERMAL') {
            gridColor = 'rgba(255, 170, 0, 0.15)';
            axisColor = 'rgba(255, 60, 0, 0.8)';
            hubColor = 'rgba(255, 230, 0, 0.7)';
        } else if (this.theme === 'MATRIX') {
            gridColor = 'rgba(0, 255, 65, 0.13)';
            axisColor = 'rgba(50, 255, 100, 0.8)';
            hubColor = 'rgba(120, 255, 160, 0.7)';
        } else if (this.theme === 'MONOCHROME') {
            gridColor = 'rgba(255, 255, 255, 0.1)';
            axisColor = 'rgba(255, 255, 255, 0.75)';
            hubColor = 'rgba(220, 220, 220, 0.8)';
        }

        // Draw grid lines (horizontal & vertical)
        ctx.lineWidth = 1;
        ctx.strokeStyle = gridColor;

        // Horizontal lines
        for (let y = 0; y < this.rows; y++) {
            const p0 = this.points[y * this.cols];
            if (p0.y < viewTop || p0.y > viewBottom) continue;
            ctx.beginPath();
            let started = false;
            for (let x = 0; x < this.cols; x++) {
                const p = this.points[y * this.cols + x];
                if (p.x >= viewLeft && p.x <= viewRight) {
                    if (!started) {
                        ctx.moveTo(p.x, p.y);
                        started = true;
                    } else {
                        ctx.lineTo(p.x, p.y);
                    }
                }
            }
            ctx.stroke();
        }

        // Vertical lines
        for (let x = 0; x < this.cols; x++) {
            const p0 = this.points[x];
            if (p0.x < viewLeft || p0.x > viewRight) continue;
            ctx.beginPath();
            let started = false;
            for (let y = 0; y < this.rows; y++) {
                const p = this.points[y * this.cols + x];
                if (p.y >= viewTop && p.y <= viewBottom) {
                    if (!started) {
                        ctx.moveTo(p.x, p.y);
                        started = true;
                    } else {
                        ctx.lineTo(p.x, p.y);
                    }
                }
            }
            ctx.stroke();
        }

        // Major Cartesian Coordinate Axes: X-Axis (y=0) and Y-Axis (x=0)
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = axisColor;
        ctx.shadowBlur = 12;
        ctx.shadowColor = axisColor;

        // X-Axis
        ctx.beginPath();
        ctx.moveTo(-this.halfW, 0);
        ctx.lineTo(this.halfW, 0);
        ctx.stroke();

        // Y-Axis
        ctx.beginPath();
        ctx.moveTo(0, -this.halfH);
        ctx.lineTo(0, this.halfH);
        ctx.stroke();

        // Origin (0,0) Hub Anchor
        ctx.shadowBlur = 20;
        ctx.shadowColor = hubColor;
        ctx.strokeStyle = hubColor;
        ctx.fillStyle = 'rgba(57, 255, 20, 0.05)';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(0, 0, 320, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();

        // Inner Hub Matrix Anchor Ring
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, 240, this.time * 0.4, this.time * 0.4 + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Origin Crosshair
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.moveTo(-30, 0); ctx.lineTo(30, 0);
        ctx.moveTo(0, -30); ctx.lineTo(0, 30);
        ctx.stroke();

        // Quadrant Labels & Coordinate Markers
        ctx.shadowBlur = 0;
        ctx.font = '13px "JetBrains Mono", monospace';
        ctx.fillStyle = textColor;

        // Quadrant texts
        ctx.fillText(`QUADRANT I (+,+) — [${this.biomes[0]}]`, 420, 420);
        ctx.fillText(`QUADRANT II (-,+) — [${this.biomes[1]}]`, -850, 420);
        ctx.fillText(`QUADRANT III (-,-) — [${this.biomes[2]}]`, -850, -420);
        ctx.fillText(`QUADRANT IV (+,-) — [${this.biomes[3]}]`, 420, -420);
        
        ctx.fillStyle = hubColor;
        ctx.font = 'bold 15px "JetBrains Mono", monospace';
        ctx.fillText('THE ORIGIN POINT (0,0) — [NON-COMBAT MATRIX HUB]', -210, -40);

        ctx.restore();
    }
}


// --- MODULE: sprite_manager.js ---
// Quad Shot — Cyberpunk Sprite & Visual Effects Engine
// Integrates 20 character sheets, weapon icon sprites, and cartoon slash effect animations

const SLASH_FRAME_COUNTS = {
    1: 10,
    2: 5,
    3: 10,
    4: 8,
    5: 8,
    6: 10,
    7: 10,
    8: 10,
    9: 8,
    10: 8
};

class SpriteManager {
    constructor() {
        this.cache = new Map();
        this.weaponIcons = new Map();
        this.slashEffects = new Map(); // slashId -> Array of Image
        this.roster = null;
        this.currentView = 'topdown'; // 'topdown' (twin-stick) or 'ortho' (isometric RPG)
        this.loaded = false;
    }

    async init() {
        try {
            let resp = await fetch('sprites/character-sprites/release/roster.json');
            if (!resp.ok) {
                resp = await fetch('sprites/release/roster.json');
            }
            if (resp.ok) {
                const data = await resp.json();
                this.roster = data.roster;
            }
        } catch (e) {
            console.warn('Roster fetch error, using defaults', e);
        }

        // 1. Preload key sheets for player and enemies
        const preloadCharacters = [
            'VX-0024', // Null-7 (Player Origin Point)
            'VX-0001', // Neon Jack
            'VX-0012', // Cipher (Ray-Caster)
            'VX-0048', // Ledger (Tessellator)
            'VX-0042', // Static (Sine-Seeker)
            'VX-0156', // Wire (Scalar)
            'VX-0240', // Glitch (Delta Swarm)
            'VX-0036', // Grit (Boss)
        ];
        for (const seed of preloadCharacters) {
            await this.loadCharacter(seed, this.currentView);
        }

        // 2. Preload Weapon Icon Sprites (from sprites/weapon_sprites/1 Icons)
        const weaponIcons = [
            'Icon28_01.png', 'Icon28_05.png', 'Icon28_10.png', 'Icon28_15.png',
            'Icon28_20.png', 'Icon28_25.png', 'Icon28_30.png', 'Icon28_35.png'
        ];
        for (const iconName of weaponIcons) {
            await this.loadWeaponIcon(iconName);
        }

        // 3. Preload Slash Animation Effect Sequences (from sprites/slash-sprite-cartoon-effects/PNG)
        const slashIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        for (const sId of slashIds) {
            await this.loadSlashEffect(sId);
        }

        this.loaded = true;
    }

    async loadCharacter(seed, view = 'topdown') {
        const key = `${seed}_${view}`;
        if (this.cache.has(key)) return this.cache.get(key);

        const primaryUrl = `sprites/character-sprites/release/cyber/${seed}_${view}_sheet.png`;
        const fallbackUrl = `sprites/release/cyber/${seed}_${view}_sheet.png`;
        const meta = {
            cellW: 56,
            cellH: 84,
            directions: 8,
            frames: 6
        };

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const sheetData = { image: img, meta };
                this.cache.set(key, sheetData);
                resolve(sheetData);
            };
            img.onerror = () => {
                if (img.src.includes('character-sprites')) {
                    img.src = fallbackUrl;
                } else if (view !== 'ortho') {
                    const fallbackImg = new Image();
                    fallbackImg.onload = () => {
                        const sheetData = { image: fallbackImg, meta };
                        this.cache.set(key, sheetData);
                        resolve(sheetData);
                    };
                    fallbackImg.onerror = () => resolve(null);
                    fallbackImg.src = `sprites/character-sprites/release/cyber/${seed}_ortho_sheet.png`;
                } else {
                    console.warn(`Could not load sprite sheet for ${seed}_${view}`);
                    resolve(null);
                }
            };
            img.src = primaryUrl;
        });
    }

    async loadWeaponIcon(iconFilename) {
        if (this.weaponIcons.has(iconFilename)) {
            return this.weaponIcons.get(iconFilename);
        }

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.weaponIcons.set(iconFilename, img);
                resolve(img);
            };
            img.onerror = () => {
                console.warn(`Could not load weapon icon ${iconFilename}`);
                resolve(null);
            };
            img.src = `sprites/weapon_sprites/1 Icons/${iconFilename}`;
        });
    }

    getWeaponIcon(iconFilename) {
        return this.weaponIcons.get(iconFilename) || null;
    }

    async loadSlashEffect(slashId) {
        if (this.slashEffects.has(slashId)) {
            return this.slashEffects.get(slashId);
        }

        const totalFrames = SLASH_FRAME_COUNTS[slashId] || 8;
        const frames = [];

        const promises = [];
        for (let i = 1; i <= totalFrames; i++) {
            const p = new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve({ index: i - 1, img });
                img.onerror = () => resolve({ index: i - 1, img: null });
                img.src = `sprites/slash-sprite-cartoon-effects/PNG/${slashId}/${i}.png`;
            });
            promises.push(p);
        }

        const loadedFrames = await Promise.all(promises);
        loadedFrames.sort((a, b) => a.index - b.index);
        const validFrames = loadedFrames.map(f => f.img).filter(Boolean);
        this.slashEffects.set(slashId, validFrames);
        return validFrames;
    }

    getSlashFrameCount(slashId) {
        return SLASH_FRAME_COUNTS[slashId] || 8;
    }

    draw(ctx, seed, dirRow, frameIdx, x, y, scale = 0.65, glowColor = null) {
        const key = `${seed}_${this.currentView}`;
        const sheet = this.cache.get(key) || this.cache.get(`${seed}_ortho`);
        if (!sheet) return false;

        const { image, meta } = sheet;
        const dir = Math.max(0, Math.min(meta.directions - 1, dirRow));
        const frame = Math.max(0, Math.min(meta.frames - 1, frameIdx));

        const sx = frame * meta.cellW;
        const sy = dir * meta.cellH;
        const dw = meta.cellW * scale;
        const dh = meta.cellH * scale;

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        if (glowColor) {
            ctx.shadowBlur = 12;
            ctx.shadowColor = glowColor;
        }

        ctx.drawImage(
            image,
            sx, sy, meta.cellW, meta.cellH,
            x - dw / 2, y - dh / 2, dw, dh
        );

        ctx.restore();
        return true;
    }

    drawWeapon(ctx, iconFilename, x, y, angle, scale = 1.0, glowColor = null, flipped = false) {
        const img = this.weaponIcons.get(iconFilename);
        if (!img) return false;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        if (flipped) {
            ctx.scale(1, -1);
        }

        ctx.imageSmoothingEnabled = false;

        if (glowColor) {
            ctx.shadowBlur = 14;
            ctx.shadowColor = glowColor;
        }

        const w = 32 * scale;
        const h = 32 * scale;
        // Center the weapon at origin
        ctx.drawImage(img, -w / 2, -h / 2, w, h);

        ctx.restore();
        return true;
    }

    drawSlash(ctx, slashId, frameIdx, x, y, angle, scale = 0.35, glowColor = null) {
        const frames = this.slashEffects.get(slashId);
        if (!frames || frames.length === 0) return false;

        const idx = Math.max(0, Math.min(frames.length - 1, frameIdx));
        const img = frames[idx];
        if (!img) return false;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        if (glowColor) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = glowColor;
        }

        const w = 496 * scale;
        const h = 496 * scale;
        // Draw centered on origin
        ctx.drawImage(img, -w / 2, -h / 2, w, h);

        ctx.restore();
        return true;
    }

    angleToRow(vx, vy, directions = 8) {
        const theta = Math.atan2(vx, vy);
        let d = Math.round((theta / (2 * Math.PI)) * directions);
        return ((d % directions) + directions) % directions;
    }
}

const spriteManager = new SpriteManager();


// --- MODULE: weapons.js ---
// Quad Shot — Weapon & Trap Arsenal (Grade I to IV)

const WEAPON_DEFS = {
    'SINE_RIFLE': {
        id: 'SINE_RIFLE',
        name: 'Sine Rifle',
        grade: 'Grade I',
        type: 'Linear Wave',
        icon: 'Icon28_01.png',
        slashId: 1,
        desc: 'Fires alternating high-frequency sine-wave beam pulses.',
        meleeDesc: 'High-frequency oscillating blade slash that cancels light projectiles.',
        cooldown: 0.16,
        meleeCooldown: 0.22,
        baseDmg: 28,
        meleeDmg: 55,
        meleeRange: 90,
        meleeArc: Math.PI * 0.65,
        color: '#00ffea',
        scrapValue: 25
    },
    'PARABOLIC_MORTAR': {
        id: 'PARABOLIC_MORTAR',
        name: 'Parabolic Mortar',
        grade: 'Grade I',
        type: 'Arc Projectile',
        icon: 'Icon28_05.png',
        slashId: 3,
        desc: 'Fires explosive geometric shells along calculated arc trajectories.',
        meleeDesc: 'Heavy explosive ground-cleave that detonates on impact.',
        cooldown: 0.85,
        meleeCooldown: 0.55,
        baseDmg: 85,
        meleeDmg: 120,
        meleeRange: 110,
        meleeArc: Math.PI * 0.75,
        radius: 120,
        color: '#ffaa00',
        scrapValue: 30
    },
    'REFLECTION_RAY': {
        id: 'REFLECTION_RAY',
        name: 'Reflection Ray',
        grade: 'Grade II',
        type: 'Multi-Bounce',
        icon: 'Icon28_10.png',
        slashId: 4,
        desc: 'High-velocity laser that ricochets off grid lines and enemy shields.',
        meleeDesc: 'Prismatic laser katana that deflects enemy projectiles back at attackers.',
        cooldown: 0.28,
        meleeCooldown: 0.28,
        baseDmg: 45,
        meleeDmg: 70,
        meleeRange: 95,
        meleeArc: Math.PI * 0.7,
        maxBounces: 4,
        color: '#39ff14',
        scrapValue: 60
    },
    'TANGENT_DISC': {
        id: 'TANGENT_DISC',
        name: 'Tangent Disc',
        grade: 'Grade II',
        type: 'Cutting Ricochet',
        icon: 'Icon28_15.png',
        slashId: 6,
        desc: 'Slices along obstacle edges, accelerating with every tangential contact.',
        meleeDesc: 'Whirling 360° circular blade sweep slicing all surrounding enemies.',
        cooldown: 0.45,
        meleeCooldown: 0.35,
        baseDmg: 40,
        meleeDmg: 65,
        meleeRange: 105,
        meleeArc: Math.PI * 2.0,
        color: '#ffff00',
        scrapValue: 70
    },
    'SCALAR_SHOTGUN': {
        id: 'SCALAR_SHOTGUN',
        name: 'Scalar Shotgun',
        grade: 'Grade III',
        type: 'Area Spread',
        icon: 'Icon28_20.png',
        slashId: 7,
        desc: 'Fires cone-shaped bursts of vector points that widen and slow down over distance.',
        meleeDesc: 'Massive kinetic fan swing with enormous knockback force.',
        cooldown: 0.65,
        meleeCooldown: 0.45,
        baseDmg: 22, // per pellet (8 pellets)
        meleeDmg: 95,
        meleeRange: 95,
        meleeArc: Math.PI * 0.85,
        pellets: 8,
        color: '#ff007f',
        scrapValue: 150
    },
    'FRACTAL_CLUSTER': {
        id: 'FRACTAL_CLUSTER',
        name: 'Fractal Cluster',
        grade: 'Grade III',
        type: 'Explosive Split',
        icon: 'Icon28_25.png',
        slashId: 8,
        desc: 'Grenade that recursively splits into smaller sub-explosions upon impact.',
        meleeDesc: 'Dimensional cleave that fractures into secondary cutting shards.',
        cooldown: 0.9,
        meleeCooldown: 0.48,
        baseDmg: 90,
        meleeDmg: 110,
        meleeRange: 100,
        meleeArc: Math.PI * 0.7,
        color: '#9d00ff',
        scrapValue: 180
    },
    'ASYMPTOTE_LASER': {
        id: 'ASYMPTOTE_LASER',
        name: 'Asymptote Laser',
        grade: 'Grade IV',
        type: 'Continuous Beam',
        icon: 'Icon28_30.png',
        slashId: 9,
        desc: 'Continuous beam that increases damage infinitely the longer it hits a single target.',
        meleeDesc: 'Superheated beam-saber thrust with infinite penetration.',
        cooldown: 0.05,
        meleeCooldown: 0.14,
        baseDmg: 15,
        meleeDmg: 48,
        meleeRange: 120,
        meleeArc: Math.PI * 0.5,
        color: '#00ffff',
        scrapValue: 350
    },
    'DOPPLER_REPEATER': {
        id: 'DOPPLER_REPEATER',
        name: 'Doppler Repeater',
        grade: 'Grade IV',
        type: 'Velocity Scale',
        icon: 'Icon28_35.png',
        slashId: 10,
        desc: 'Rapid-fire bolt weapon whose damage scales directly with player movement speed.',
        meleeDesc: 'Supersonic twin-blade flurry whose damage multiplies with player movement speed.',
        cooldown: 0.1,
        meleeCooldown: 0.16,
        baseDmg: 32,
        meleeDmg: 62,
        meleeRange: 85,
        meleeArc: Math.PI * 0.65,
        color: '#ff0055',
        scrapValue: 380
    }
};

const TRAP_DEFS = {
    'GRAVITY_TETHER': {
        id: 'GRAVITY_TETHER',
        name: 'Gravity Tether',
        desc: 'Pins enemies to a fixed coordinate point, pulling surrounding grunts inward.',
        duration: 6.0,
        radius: 260,
        pullForce: 450,
        color: '#9d00ff',
        scrapValue: 40
    },
    'PRISM_MINE': {
        id: 'PRISM_MINE',
        name: 'Prism Mine',
        desc: 'Detonates into 12 refracting light shards when an enemy crosses its laser trigger.',
        duration: 15.0,
        radius: 180,
        color: '#00ffea',
        scrapValue: 50
    },
    'MOEBIUS_SNARE': {
        id: 'MOEBIUS_SNARE',
        name: 'Möbius Snare',
        desc: 'Deploys an infinite-loop energy field that traps enemy movement vectors inside its boundary for 4 seconds.',
        duration: 4.0,
        radius: 160,
        color: '#ff007f',
        scrapValue: 75
    },
    'VECTOR_REPULSOR': {
        id: 'VECTOR_REPULSOR',
        name: 'Vector Repulsor',
        desc: 'Periodically emits a high-impact kinetic pulse that reflects incoming projectiles back toward enemies.',
        duration: 8.0,
        radius: 200,
        color: '#39ff14',
        scrapValue: 90
    }
};

// Projectile Class
class Projectile {
    constructor(config) {
        this.pos = config.pos.clone();
        this.vel = config.vel ? config.vel.clone() : new Vec2(0, 0);
        this.origin = this.pos.clone();
        this.targetPos = config.targetPos ? config.targetPos.clone() : null;
        this.type = config.type;
        this.damage = config.damage || 25;
        this.bouncesLeft = config.bouncesLeft || 0;
        this.color = config.color || '#00ffea';
        this.life = config.life || 2.5;
        this.maxLife = this.life;
        this.radius = config.radius || 4;
        this.isDead = false;
        
        // Sine wave params
        this.phase = config.phase || 0;
        this.freq = config.freq || 0.05;
        this.amp = config.amp || 18;
        this.distTraveled = 0;
        this.heading = config.heading || (config.vel ? config.vel.angle() : 0);

        // Parabolic mortar params
        this.isMortar = config.isMortar || false;
        this.t = 0;
        this.flightDuration = config.flightDuration || 0.7;

        // Tangent disc
        this.isTangent = config.isTangent || false;
        this.speedMultiplier = 1.0;

        // Fractal split generation
        this.splitGen = config.splitGen || 0;

        // Doppler scaling
        this.speedScale = config.speedScale || 1.0;

        // Ricochet damage boost
        this.bounceDamageMultiplier = 1.0;
        this.hasRicochetBoost = config.hasRicochetBoost || false;
    }

    update(dt, worldBounds, grid = null, currentBiome = '') {
        this.life -= dt;
        if (this.life <= 0) {
            this.isDead = true;
            return;
        }

        // Parabolic arc projectile
        if (this.isMortar) {
            this.t += dt / this.flightDuration;
            if (this.t >= 1.0) {
                this.t = 1.0;
                this.isDead = true;
                return; // Triggers explosion
            }
            this.pos = Vec2.add(this.origin, Vec2.scale(Vec2.sub(this.targetPos, this.origin), this.t));
            return;
        }

        // Biome mechanic: Parabolic Wastes bends projectile paths with gravitational curve!
        if (currentBiome === 'Parabolic Wastes') {
            const curveForce = 120;
            this.vel.y += curveForce * dt;
        }

        // Sine wave projectile
        if (this.type === 'SINE') {
            const step = this.vel.mag() * dt;
            this.distTraveled += step;
            this.heading = this.vel.angle();
            const forward = Vec2.fromAngle(this.heading, this.distTraveled);
            const perp = Vec2.fromAngle(this.heading + Math.PI / 2, Math.sin(this.distTraveled * this.freq + this.phase) * this.amp);
            this.pos = Vec2.add(this.origin, forward).add(perp);
        } else {
            // Standard linear / tangent disc / scalar spread
            if (this.type === 'SCALAR') {
                // Scalar pellets decelerate over distance
                this.vel.scale(Math.pow(0.85, dt * 60));
            }
            this.pos.add(Vec2.scale(this.vel, dt));
        }

        // Ricochet against world boundary
        const halfW = worldBounds.width / 2;
        const halfH = worldBounds.height / 2;

        if (this.bouncesLeft > 0) {
            let bounced = false;
            if (this.pos.x < -halfW || this.pos.x > halfW) {
                this.vel.x = -this.vel.x;
                this.pos.x = Math.max(-halfW, Math.min(halfW, this.pos.x));
                bounced = true;
            }
            if (this.pos.y < -halfH || this.pos.y > halfH) {
                this.vel.y = -this.vel.y;
                this.pos.y = Math.max(-halfH, Math.min(halfH, this.pos.y));
                bounced = true;
            }

            if (bounced) {
                this.bouncesLeft--;
                if (this.hasRicochetBoost) {
                    this.bounceDamageMultiplier += 0.15; // Elastic Collision modifier
                }
                if (this.isTangent) {
                    this.vel.scale(1.2); // Tangent disc accelerates
                }
                if (grid) grid.applyImpulse(this.pos.x, this.pos.y, 100, 25);
            }
        } else {
            if (this.pos.x < -halfW || this.pos.x > halfW || this.pos.y < -halfH || this.pos.y > halfH) {
                this.isDead = true;
            }
        }
    }

    render(ctx) {
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.lineWidth = 2.5;

        if (this.isMortar) {
            // Parabolic mortar shell + height elevation shadow
            const arcH = 4 * 160 * this.t * (1 - this.t);
            // Shadow on ground
            ctx.fillStyle = 'rgba(255, 170, 0, 0.25)';
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, 6, 0, Math.PI * 2);
            ctx.fill();
            // Elevated shell
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y - arcH, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (this.isTangent) {
            // Spinning geometric disc
            ctx.translate(this.pos.x, this.pos.y);
            ctx.rotate(this.life * 20);
            ctx.beginPath();
            ctx.moveTo(0, -9);
            ctx.lineTo(8, 0);
            ctx.lineTo(0, 9);
            ctx.lineTo(-8, 0);
            ctx.closePath();
            ctx.stroke();
        } else {
            // Glowing neon projectile bolt / particle
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Trail line behind velocity
            const trailLen = Math.min(25, this.vel.mag() * 0.03);
            if (trailLen > 2) {
                const back = Vec2.sub(this.pos, this.vel.clone().normalize().scale(trailLen));
                ctx.beginPath();
                ctx.moveTo(this.pos.x, this.pos.y);
                ctx.lineTo(back.x, back.y);
                ctx.stroke();
            }
        }
        ctx.restore();
    }
}

// Deployable Trap Class
class DeployableTrap {
    constructor(config) {
        this.pos = config.pos.clone();
        this.type = config.type;
        this.def = TRAP_DEFS[this.type];
        this.duration = this.def.duration;
        this.life = this.duration;
        this.radius = this.def.radius;
        this.color = this.def.color;
        this.isDead = false;
        this.timer = 0;
    }

    update(dt, enemies, projectiles, grid) {
        this.life -= dt;
        this.timer += dt;
        if (this.life <= 0) {
            this.isDead = true;
            return;
        }

        if (this.type === 'GRAVITY_TETHER') {
            // Pull enemies inward to anchor point
            enemies.forEach(e => {
                const dist = this.pos.dist(e.pos);
                if (dist < this.radius && dist > 10) {
                    const pull = Vec2.sub(this.pos, e.pos).normalize().scale(this.def.pullForce * dt);
                    e.pos.add(pull);
                }
            });
            if (grid) grid.applyGravityWell(this.pos.x, this.pos.y, this.radius, 20);
        } else if (this.type === 'MOEBIUS_SNARE') {
            // Trap enemy velocities within boundary
            enemies.forEach(e => {
                const dist = this.pos.dist(e.pos);
                if (dist < this.radius) {
                    e.vel.scale(0.3); // Stun / snared
                }
            });
        } else if (this.type === 'VECTOR_REPULSOR') {
            // Repel incoming hostile projectiles back at enemies every 1.5s
            if (Math.floor(this.timer / 1.5) !== Math.floor((this.timer - dt) / 1.5)) {
                projectiles.forEach(p => {
                    if (p.isHostile && this.pos.dist(p.pos) < this.radius) {
                        p.isHostile = false; // Turned friendly!
                        p.vel.scale(-1.2);
                        p.color = '#39ff14';
                        audio.playLaser('reflection');
                    }
                });
                if (grid) grid.applyImpulse(this.pos.x, this.pos.y, this.radius, 40);
            }
        }
    }

    render(ctx) {
        ctx.save();
        ctx.shadowBlur = 16;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5;

        const pulse = Math.sin(this.timer * 6) * 6;

        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius + pulse, 0, Math.PI * 2);
        ctx.stroke();

        if (this.type === 'GRAVITY_TETHER') {
            // Spiral vortex rings
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(this.pos.x, this.pos.y, (this.radius * (i + 1) / 3), this.timer * 3 + i, this.timer * 3 + i + Math.PI);
                ctx.stroke();
            }
        } else if (this.type === 'MOEBIUS_SNARE') {
            // Infinity figure-8 symbol
            ctx.beginPath();
            const s = 40;
            ctx.ellipse(this.pos.x - 20, this.pos.y, 25, 14, 0, 0, Math.PI * 2);
            ctx.ellipse(this.pos.x + 20, this.pos.y, 25, 14, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.type === 'VECTOR_REPULSOR') {
            // Hexagon forcefield
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = i * Math.PI / 3 + this.timer;
                const hx = this.pos.x + Math.cos(a) * 35;
                const hy = this.pos.y + Math.sin(a) * 35;
                if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();
        }

        ctx.restore();
    }
}


// --- MODULE: stickman.js ---
// Quad Shot — The Origin Point (0,0) Stickman & Dual Physics Engine

class StickmanPlayer {
    constructor(x = 0, y = 0) {
        this.pos = new Vec2(x, y);
        this.vel = new Vec2(0, 0);
        this.facing = new Vec2(1, 0);
        this.aimAngle = 0;
        
        // Physics Engine Selection: 'KINEMATIC' or 'INERTIAL'
        this.physicsFrame = 'KINEMATIC';

        // Stats & Meta Attributes
        this.baseSpeed = 380;
        this.accel = 2400; // For Inertial Frame
        this.friction = 0.91; // For Inertial Frame
        
        // Health & Survivability
        this.maxHp = 100;
        this.hp = 100;
        this.invincibleTimer = 0;
        this.invincibleDuration = 1.0;
        this.lives = 3;
        this.passiveRegenRate = 0; // Upgraded via Matrix Expansion

        // 8-Directional Vector Dash
        this.dashChargesMax = 5;
        this.dashCharges = 5;
        this.dashRechargeTimer = 0;
        this.dashRechargeRate = 1.8; // seconds per charge
        this.dashSpeed = 1200;
        this.dashDuration = 0.15;
        this.dashActiveTimer = 0;
        this.dashTrails = []; // { p1: Vec2, p2: Vec2, life: 1.5, maxLife: 1.5, damage: 45 }

        // Apex Step (Double-jump shockwave pulse)
        this.apexCooldown = 0;
        this.apexCooldownMax = 3.0;
        this.apexActiveTimer = 0;
        this.shockwaves = []; // { x, y, radius, maxRadius, life, maxLife }

        // Suspension State (Bullet-time 60% slow down)
        this.suspensionActive = false;
        this.suspensionTimer = 2.5;
        this.suspensionTimerMax = 2.5;
        this.suspensionRechargeCooldown = 0;

        // Visual / Martial Arts Animation State
        this.animTime = 0;
        this.combatPose = 'IDLE'; // IDLE, RUN, DASH, KICK, PUNCH, RECOIL
        this.poseTimer = 0;
        this.isDead = false;
        this.ragdollPieces = [];

        // Neon Glow Color
        this.neonColor = '#00ffea'; // Cyan
        this.trailColor = '#ff007f'; // Magenta

        // Weapon & Combat Visual Animation State
        this.recoilOffset = 0;
        this.muzzleFlashTimer = 0;
    }

    setPhysicsFrame(frame) {
        this.physicsFrame = frame;
        this.vel.set(0, 0);
    }

    triggerDash(dirVector) {
        if (this.dashCharges < 1 || this.dashActiveTimer > 0) return false;
        this.dashCharges--;
        this.dashActiveTimer = this.dashDuration;

        const dashDir = dirVector.magSq() > 0.01 ? dirVector.clone().normalize() : this.facing.clone();
        const startPos = this.pos.clone();

        if (this.physicsFrame === 'KINEMATIC') {
            this.vel.copy(dashDir).scale(this.dashSpeed);
        } else {
            // Inertial adds massive instantaneous impulse
            this.vel.add(dashDir.clone().scale(this.dashSpeed * 1.25));
        }

        const endPos = Vec2.add(startPos, dashDir.clone().scale(this.dashSpeed * this.dashDuration));
        
        // Neon damage-dealing trail for 1.5 seconds
        this.dashTrails.push({
            p1: startPos,
            p2: endPos,
            life: 1.5,
            maxLife: 1.5,
            damage: 40
        });

        this.combatPose = 'DASH';
        this.poseTimer = 0.25;
        audio.playDash();
        return true;
    }

    triggerApexStep() {
        if (this.apexCooldown > 0) return false;
        this.apexCooldown = this.apexCooldownMax;
        this.apexActiveTimer = 0.35;

        // Shockwave neutralizes light projectiles and knocks back grunts
        this.shockwaves.push({
            pos: this.pos.clone(),
            radius: 20,
            maxRadius: 260,
            life: 0.45,
            maxLife: 0.45,
            damage: 30
        });

        this.combatPose = 'KICK';
        this.poseTimer = 0.35;
        audio.playApexShockwave();
        return true;
    }

    setSuspension(active) {
        if (active && this.suspensionTimer > 0.2) {
            if (!this.suspensionActive) audio.playSuspension(true);
            this.suspensionActive = true;
        } else {
            if (this.suspensionActive) audio.playSuspension(false);
            this.suspensionActive = false;
        }
    }

    takeDamage(amount) {
        if (this.invincibleTimer > 0 || this.isDead) return false;
        this.hp -= amount;
        this.invincibleTimer = this.invincibleDuration;
        this.combatPose = 'RECOIL';
        this.poseTimer = 0.2;
        audio.playExplosion(0.5);

        if (this.hp <= 0) {
            this.handleDeath();
            return true;
        }
        return false;
    }

    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }

    handleDeath() {
        this.isDead = true;
        this.hp = 0;
        // Init ragdoll pieces
        this.ragdollPieces = [
            { x: this.pos.x, y: this.pos.y, vx: (Math.random() - 0.5) * 400, vy: (Math.random() - 0.5) * 400, r: 8, angle: 0, va: 5 }, // Head
            { x: this.pos.x, y: this.pos.y - 12, vx: (Math.random() - 0.5) * 350, vy: (Math.random() - 0.5) * 350, len: 20, angle: 0, va: 3 }, // Torso
            { x: this.pos.x - 8, y: this.pos.y - 5, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 300, len: 14, angle: 0, va: 4 }, // Left arm
            { x: this.pos.x + 8, y: this.pos.y - 5, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 300, len: 14, angle: 0, va: -4 }, // Right arm
            { x: this.pos.x - 6, y: this.pos.y - 25, vx: (Math.random() - 0.5) * 320, vy: (Math.random() - 0.5) * 320, len: 18, angle: 0, va: 2 }, // Left leg
            { x: this.pos.x + 6, y: this.pos.y - 25, vx: (Math.random() - 0.5) * 320, vy: (Math.random() - 0.5) * 320, len: 18, angle: 0, va: -2 }, // Right leg
        ];
        audio.playExplosion(1.5);
    }

    update(dt, inputVector, targetMousePos, worldBounds, currentBiome = '') {
        if (this.isDead) {
            // Update ragdoll pieces
            this.ragdollPieces.forEach(p => {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vx *= 0.94;
                p.vy *= 0.94;
                p.angle += p.va * dt;
            });
            return;
        }

        this.animTime += dt;
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        if (this.poseTimer > 0) {
            this.poseTimer -= dt;
            if (this.poseTimer <= 0) this.combatPose = 'IDLE';
        }

        // Passive Regen from Meta Matrix
        if (this.passiveRegenRate > 0 && this.hp < this.maxHp) {
            this.heal(this.passiveRegenRate * dt);
        }

        // Aiming direction towards mouse
        const toMouse = Vec2.sub(targetMousePos, this.pos);
        if (toMouse.magSq() > 1) {
            this.facing.copy(toMouse).normalize();
            this.aimAngle = this.facing.angle();
        }

        // Suspension State timing
        if (this.suspensionActive) {
            this.suspensionTimer -= dt / 0.4; // Consumes faster during slowdown
            if (this.suspensionTimer <= 0) {
                this.suspensionTimer = 0;
                this.setSuspension(false);
            }
        } else {
            if (this.suspensionTimer < this.suspensionTimerMax) {
                this.suspensionTimer = Math.min(this.suspensionTimerMax, this.suspensionTimer + dt * 0.8);
            }
        }

        // Dash recharge
        if (this.dashCharges < this.dashChargesMax) {
            this.dashRechargeTimer += dt;
            if (this.dashRechargeTimer >= this.dashRechargeRate) {
                this.dashCharges++;
                this.dashRechargeTimer = 0;
            }
        }

        // Apex cooldown
        if (this.apexCooldown > 0) this.apexCooldown -= dt;

        // DUAL PHYSICS FRAME HANDLING
        const hasInput = inputVector.magSq() > 0.01;
        const normInput = hasInput ? inputVector.clone().normalize() : new Vec2(0, 0);

        if (this.dashActiveTimer > 0) {
            this.dashActiveTimer -= dt;
            // Velocity maintains dash vector
        } else {
            // Biome modifiers (Zero-G Void has frictionless drift!)
            let effectiveFriction = this.friction;
            if (currentBiome === 'Zero-G Void') {
                effectiveFriction = 0.99; // Near frictionless
            }

            if (this.physicsFrame === 'KINEMATIC') {
                // Kinematic Frame: Instant velocity response, zero drift
                if (hasInput) {
                    this.vel.copy(normInput).scale(this.baseSpeed);
                    if (this.combatPose === 'IDLE') this.combatPose = 'RUN';
                } else {
                    this.vel.set(0, 0);
                    if (this.combatPose === 'RUN') this.combatPose = 'IDLE';
                }
            } else {
                // Inertial Frame: Thrust acceleration, momentum preservation & drift
                if (hasInput) {
                    this.vel.add(normInput.scale(this.accel * dt));
                    // Cap max velocity
                    const maxV = this.baseSpeed * 1.8;
                    if (this.vel.mag() > maxV) this.vel.normalize().scale(maxV);
                    if (this.combatPose === 'IDLE') this.combatPose = 'RUN';
                } else {
                    this.vel.scale(effectiveFriction);
                    if (this.combatPose === 'RUN' && this.vel.mag() < 30) this.combatPose = 'IDLE';
                }
            }
        }

        // Position integration
        this.pos.add(Vec2.scale(this.vel, dt));

        // Arena boundary clamping
        const halfW = worldBounds.width / 2 - 25;
        const halfH = worldBounds.height / 2 - 25;
        if (this.pos.x < -halfW) { this.pos.x = -halfW; this.vel.x = -this.vel.x * 0.5; }
        if (this.pos.x > halfW) { this.pos.x = halfW; this.vel.x = -this.vel.x * 0.5; }
        if (this.pos.y < -halfH) { this.pos.y = -halfH; this.vel.y = -this.vel.y * 0.5; }
        if (this.pos.y > halfH) { this.pos.y = halfH; this.vel.y = -this.vel.y * 0.5; }

        // Update dash trails
        for (let i = this.dashTrails.length - 1; i >= 0; i--) {
            const tr = this.dashTrails[i];
            tr.life -= dt;
            if (tr.life <= 0) this.dashTrails.splice(i, 1);
        }

        // Update shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.life -= dt;
            const progress = 1 - sw.life / sw.maxLife;
            sw.radius = 20 + progress * (sw.maxRadius - 20);
            if (sw.life <= 0) this.shockwaves.splice(i, 1);
        }

        // Weapon visual animation decay
        if (this.recoilOffset > 0) {
            this.recoilOffset = Math.max(0, this.recoilOffset - dt * 50);
        }
        if (this.muzzleFlashTimer > 0) {
            this.muzzleFlashTimer -= dt;
        }
    }

    render(ctx, weaponDef = null, combatMode = 'RANGED', activeSlash = null, spriteMgr = null) {
        if (this.isDead) {
            // Render ragdoll
            ctx.save();
            ctx.strokeStyle = '#ff0055';
            ctx.fillStyle = '#ff0055';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0055';
            ctx.lineWidth = 2.5;

            this.ragdollPieces.forEach(p => {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle);
                if (p.r) {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (p.len) {
                    ctx.beginPath();
                    ctx.moveTo(-p.len / 2, 0);
                    ctx.lineTo(p.len / 2, 0);
                    ctx.stroke();
                }
                ctx.restore();
            });
            ctx.restore();
            return;
        }

        // Render Active Dash Trails (Neon line obstacles that damage enemies)
        this.dashTrails.forEach(tr => {
            const alpha = tr.life / tr.maxLife;
            ctx.save();
            ctx.strokeStyle = this.trailColor;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 16;
            ctx.shadowColor = this.trailColor;
            ctx.globalAlpha = alpha;

            ctx.beginPath();
            ctx.moveTo(tr.p1.x, tr.p1.y);
            ctx.lineTo(tr.p2.x, tr.p2.y);
            ctx.stroke();
            ctx.restore();
        });

        // Render Apex Step Shockwaves
        this.shockwaves.forEach(sw => {
            const alpha = sw.life / sw.maxLife;
            ctx.save();
            ctx.strokeStyle = '#39ff14';
            ctx.lineWidth = 3.5;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#39ff14';
            ctx.globalAlpha = alpha;

            ctx.beginPath();
            ctx.arc(sw.pos.x, sw.pos.y, sw.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });

        // Suspension State Trajectory Planning Line
        if (this.suspensionActive) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 255, 234, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(this.pos.x, this.pos.y);
            ctx.lineTo(this.pos.x + Math.cos(this.aimAngle) * 600, this.pos.y + Math.sin(this.aimAngle) * 600);
            ctx.stroke();
            ctx.restore();
        }

        // Render Stickman Character with Martial Arts Animation Poses
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);

        // Invulnerability flicker
        if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 15) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        // Stickman Glow styling
        ctx.strokeStyle = this.neonColor;
        ctx.fillStyle = this.neonColor;
        ctx.shadowBlur = 14;
        ctx.shadowColor = this.neonColor;
        ctx.lineWidth = 2.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Orientation alignment
        const angle = this.aimAngle;
        const speed = this.vel.mag();
        const walkCycle = Math.sin(this.animTime * 12);

        // Body proportions
        const headR = 7;
        const torsoLen = 22;

        if (this.combatPose === 'DASH') {
            // Flying spear punch / dash strike pose
            ctx.rotate(angle);
            // Head
            ctx.beginPath();
            ctx.arc(torsoLen, 0, headR, 0, Math.PI * 2);
            ctx.stroke();
            // Torso
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(torsoLen - headR, 0);
            ctx.stroke();
            // Extended punch arm
            ctx.beginPath();
            ctx.moveTo(12, 0);
            ctx.lineTo(torsoLen + 14, 0);
            ctx.stroke();
            // Tucked leg
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(-24, 8);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(-22, -8);
            ctx.stroke();
        } else if (this.combatPose === 'KICK') {
            // Apex Step 360 roundhouse kick pose
            ctx.rotate(this.animTime * 25);
            // Head
            ctx.beginPath();
            ctx.arc(0, -torsoLen - headR, headR, 0, Math.PI * 2);
            ctx.stroke();
            // Torso
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -torsoLen);
            ctx.stroke();
            // Extended kick leg
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(24, 4);
            ctx.stroke();
            // Supporting bent leg
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-12, 16);
            ctx.stroke();
        } else {
            // Standard dynamic stance (aiming + running/idle)
            const facingSign = Math.cos(angle) >= 0 ? 1 : -1;

            // Head (at top)
            const headY = -torsoLen - headR;
            ctx.beginPath();
            ctx.arc(0, headY, headR, 0, Math.PI * 2);
            ctx.stroke();

            // Glowing visor / origin indicator
            ctx.beginPath();
            ctx.moveTo(facingSign * 2, headY - 1);
            ctx.lineTo(facingSign * 7, headY - 1);
            ctx.stroke();

            // Torso (vertical line)
            ctx.beginPath();
            ctx.moveTo(0, -torsoLen);
            ctx.lineTo(0, 0);
            ctx.stroke();

            // Legs (running or combat stance)
            const legSwing = speed > 20 ? walkCycle * 14 : 6;
            // Left leg
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-legSwing * facingSign, 12);
            ctx.lineTo(-legSwing * 1.3 * facingSign, 22);
            ctx.stroke();
            // Right leg
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(legSwing * facingSign, 12);
            ctx.lineTo(legSwing * 1.3 * facingSign, 22);
            ctx.stroke();

            // Arms & Weapon Grip
            const shoulderY = -torsoLen + 6;
            const armLen = 16;

            let gunTipX = Math.cos(angle) * (armLen * 1.3 - this.recoilOffset);
            let gunTipY = shoulderY + Math.sin(angle) * (armLen * 1.3 - this.recoilOffset);
            let weaponAngle = angle;
            let weaponScale = 1.0;

            if (combatMode === 'MELEE') {
                if (activeSlash) {
                    const swingProg = activeSlash.swingProgress || 0;
                    weaponAngle = angle - activeSlash.arc / 2 + swingProg * activeSlash.arc;
                    gunTipX = Math.cos(weaponAngle) * (armLen * 1.35);
                    gunTipY = shoulderY + Math.sin(weaponAngle) * (armLen * 1.35);
                    weaponAngle += Math.PI / 4;
                    weaponScale = 1.2;
                } else {
                    const readyAngle = angle - 0.45 * facingSign;
                    gunTipX = Math.cos(readyAngle) * (armLen * 0.9);
                    gunTipY = shoulderY + Math.sin(readyAngle) * (armLen * 0.9);
                    weaponAngle = angle + 0.35 * facingSign;
                }
            }

            // Firing / Primary arm
            ctx.beginPath();
            ctx.moveTo(0, shoulderY);
            ctx.lineTo(gunTipX, gunTipY);
            ctx.stroke();

            // Support arm
            ctx.beginPath();
            ctx.moveTo(0, shoulderY);
            ctx.lineTo(gunTipX * 0.6, gunTipY * 0.6 + 5);
            ctx.stroke();

            // Render Weapon Icon Sprite
            if (weaponDef && spriteMgr && weaponDef.icon) {
                const flipY = Math.cos(angle) < 0 && combatMode === 'RANGED';
                spriteMgr.drawWeapon(ctx, weaponDef.icon, gunTipX, gunTipY, weaponAngle, weaponScale, weaponDef.color, flipY);

                // Muzzle Flash in Ranged Mode
                if (combatMode === 'RANGED' && this.muzzleFlashTimer > 0) {
                    ctx.save();
                    const muzzleX = gunTipX + Math.cos(angle) * 16;
                    const muzzleY = gunTipY + Math.sin(angle) * 16;
                    ctx.translate(muzzleX, muzzleY);
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowBlur = 18;
                    ctx.shadowColor = weaponDef.color || '#00ffea';
                    ctx.beginPath();
                    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
                    ctx.fill();

                    // Muzzle spark lines
                    ctx.strokeStyle = weaponDef.color || '#00ffea';
                    ctx.lineWidth = 1.8;
                    for (let s = 0; s < 4; s++) {
                        const spkAngle = angle + (s - 1.5) * 0.55;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(Math.cos(spkAngle) * 12, Math.sin(spkAngle) * 12);
                        ctx.stroke();
                    }
                    ctx.restore();
                }
            }

            // Origin Cross Marker on Chest
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(-4, -torsoLen / 2);
            ctx.lineTo(4, -torsoLen / 2);
            ctx.moveTo(0, -torsoLen / 2 - 4);
            ctx.lineTo(0, -torsoLen / 2 + 4);
            ctx.stroke();
        }

        ctx.restore();
    }
}


// --- MODULE: enemies.js ---
// Quad Shot — Hostile Enemy Units & AI Engine

class Enemy {
    constructor(config) {
        this.pos = config.pos.clone();
        this.vel = new Vec2(0, 0);
        this.type = config.type; // 'RAY_CASTER', 'TESSELLATOR', 'SINE_SEEKER', 'SCALAR', 'DELTA_SWARM'
        this.heading = 0;
        this.radius = 16;
        this.isDead = false;
        this.animTimer = Math.random() * 5;
        this.isElite = config.isElite || false;

        // Base Stats by Enemy Type
        switch (this.type) {
            case 'RAY_CASTER':
                this.maxHp = this.isElite ? 180 : 80;
                this.speed = 140;
                this.color = '#ff007f';
                this.spriteSeed = 'VX-0012'; // Cipher / Sniper
                this.attackCooldown = 2.8;
                this.aimTimer = 0;
                this.laserCharging = false;
                this.laserTarget = null;
                break;

            case 'TESSELLATOR':
                this.maxHp = this.isElite ? 280 : 130;
                this.speed = 90;
                this.color = '#00ffea';
                this.spriteSeed = 'VX-0048'; // Ledger / Heavy Shield
                this.wallTimer = 3.5;
                break;

            case 'SINE_SEEKER':
                this.maxHp = this.isElite ? 150 : 65;
                this.speed = 190;
                this.color = '#ffaa00';
                this.spriteSeed = 'VX-0042'; // Static / Seeker
                this.attackCooldown = 1.6;
                break;

            case 'SCALAR':
                this.maxHp = this.isElite ? 220 : 100;
                this.speed = 120;
                this.color = '#9d00ff';
                this.spriteSeed = 'VX-0156'; // Wire / Gravity
                this.wellTimer = 4.0;
                break;

            case 'DELTA_SWARM':
            default:
                this.maxHp = this.isElite ? 90 : 35;
                this.speed = 260;
                this.radius = 12;
                this.color = '#39ff14';
                this.spriteSeed = 'VX-0240'; // Glitch / Swarm
                break;
        }

        this.hp = this.maxHp;
        this.attackTimer = Math.random() * 1.5;
        this.verticesValue = this.isElite ? 35 : (this.type === 'DELTA_SWARM' ? 5 : 15);
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.isDead = true;
            return true;
        }
        return false;
    }

    update(dt, player, spawnBulletCallback, grid, walls) {
        this.animTimer += dt;
        const toPlayer = Vec2.sub(player.pos, this.pos);
        const dist = toPlayer.mag();
        this.heading = toPlayer.angle();

        // Unit behaviors
        switch (this.type) {
            case 'RAY_CASTER':
                // Snipes from distance, keeps buffer
                if (dist < 320) {
                    this.vel = toPlayer.clone().normalize().scale(-this.speed);
                } else if (dist > 520) {
                    this.vel = toPlayer.clone().normalize().scale(this.speed);
                } else {
                    this.vel.scale(0.85); // Stays in range
                }

                this.attackTimer -= dt;
                if (this.attackTimer <= 1.0 && !this.laserCharging) {
                    this.laserCharging = true;
                    this.laserTarget = player.pos.clone();
                }

                if (this.laserCharging) {
                    // Update tracking with slight lead
                    this.laserTarget.lerp(player.pos, dt * 3.5);
                }

                if (this.attackTimer <= 0) {
                    this.laserCharging = false;
                    this.attackTimer = this.attackCooldown;
                    // Fire high-speed sniper beam
                    const beamDir = Vec2.sub(this.laserTarget, this.pos).normalize();
                    spawnBulletCallback({
                        pos: this.pos.clone(),
                        vel: beamDir.scale(1100),
                        type: 'BEAM',
                        damage: 42,
                        color: '#ff007f',
                        radius: 5,
                        life: 1.8,
                        isHostile: true
                    });
                    audio.playLaser('reflection');
                }
                break;

            case 'TESSELLATOR':
                // Moves steadily towards player
                this.vel = toPlayer.clone().normalize().scale(this.speed);
                this.wallTimer -= dt;
                if (this.wallTimer <= 0) {
                    this.wallTimer = 4.5;
                    // Deploys a laser wall barrier (temporary obstacle)
                    const perp = Vec2.fromAngle(this.heading + Math.PI / 2, 90);
                    walls.push({
                        p1: Vec2.add(this.pos, perp),
                        p2: Vec2.sub(this.pos, perp),
                        life: 6.0,
                        maxLife: 6.0,
                        color: '#00ffea'
                    });
                    audio.playLaser('mortar');
                    if (grid) grid.applyImpulse(this.pos.x, this.pos.y, 140, 30);
                }
                break;

            case 'SINE_SEEKER':
                // Circling pursuit drone firing oscillating homing waves
                const orbitAngle = this.heading + Math.PI / 2;
                const forward = toPlayer.clone().normalize().scale(this.speed * 0.7);
                const flank = Vec2.fromAngle(orbitAngle, this.speed * 0.7);
                this.vel = Vec2.add(forward, flank);

                this.attackTimer -= dt;
                if (this.attackTimer <= 0) {
                    this.attackTimer = this.attackCooldown;
                    spawnBulletCallback({
                        pos: this.pos.clone(),
                        vel: toPlayer.clone().normalize().scale(360),
                        type: 'SINE',
                        damage: 22,
                        color: '#ffaa00',
                        freq: 0.08,
                        amp: 24,
                        life: 3.5,
                        isHostile: true
                    });
                    audio.playLaser('sine');
                }
                break;

            case 'SCALAR':
                // Deploys localized gravity wells pulling player
                this.vel = toPlayer.clone().normalize().scale(this.speed);
                this.wellTimer -= dt;
                if (this.wellTimer <= 0) {
                    this.wellTimer = 4.0;
                    if (grid) grid.applyGravityWell(this.pos.x, this.pos.y, 280, 45);
                    // Gravity pull impulse on player
                    const pull = Vec2.sub(this.pos, player.pos).normalize().scale(250 * dt);
                    player.vel.add(pull);
                    audio.playLaser('mortar');
                }
                break;

            case 'DELTA_SWARM':
            default:
                // Fast direct swarm charge
                this.vel = toPlayer.clone().normalize().scale(this.speed);
                break;
        }

        // Apply movement
        this.pos.add(Vec2.scale(this.vel, dt));
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);

        // Render Sniper Aiming Laser Line
        if (this.type === 'RAY_CASTER' && this.laserCharging && this.laserTarget) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 0, 127, 0.75)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(this.laserTarget.x - this.pos.x, this.laserTarget.y - this.pos.y);
            ctx.stroke();
            ctx.restore();
        }

        // Attempt sprite rendering
        const dirRow = spriteManager.angleToRow(Math.cos(this.heading), Math.sin(this.heading), 8);
        const frameIdx = Math.floor(this.animTimer * 8) % 6;
        const rendered = spriteManager.draw(
            ctx,
            this.spriteSeed,
            dirRow,
            frameIdx,
            0,
            0,
            0.6,
            this.color
        );

        if (!rendered) {
            // High-contrast vector geometric fallback
            ctx.shadowBlur = 14;
            ctx.shadowColor = this.color;
            ctx.strokeStyle = this.color;
            ctx.fillStyle = this.color;
            ctx.lineWidth = 2.5;

            ctx.rotate(this.heading);

            if (this.type === 'DELTA_SWARM') {
                // Sharp triangle
                ctx.beginPath();
                ctx.moveTo(14, 0);
                ctx.lineTo(-10, 8);
                ctx.lineTo(-6, 0);
                ctx.lineTo(-10, -8);
                ctx.closePath();
                ctx.stroke();
            } else if (this.type === 'TESSELLATOR') {
                // Sturdy diamond shield
                ctx.beginPath();
                ctx.moveTo(16, 0);
                ctx.lineTo(0, 16);
                ctx.lineTo(-16, 0);
                ctx.lineTo(0, -16);
                ctx.closePath();
                ctx.stroke();
            } else if (this.type === 'RAY_CASTER') {
                // Long sleek hex sniper
                ctx.beginPath();
                ctx.moveTo(20, 0);
                ctx.lineTo(6, 9);
                ctx.lineTo(-14, 9);
                ctx.lineTo(-8, 0);
                ctx.lineTo(-14, -9);
                ctx.lineTo(6, -9);
                ctx.closePath();
                ctx.stroke();
            } else {
                // Drone circle with crosshairs
                ctx.beginPath();
                ctx.arc(0, 0, 14, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Elite Crown Aura
        if (this.isElite) {
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#ffff00';
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Health Bar (above unit)
        if (this.hp < this.maxHp) {
            const barW = 32;
            const barH = 3;
            const fillW = Math.max(0, (this.hp / this.maxHp) * barW);
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(-barW / 2, -26, barW, barH);
            ctx.fillStyle = this.color;
            ctx.fillRect(-barW / 2, -26, fillW, barH);
        }

        ctx.restore();
    }
}


// --- MODULE: bosses.js ---
// Quad Shot — Mini-Bosses & Wave 100 Corruption Vector Boss

class Boss {
    constructor(type, wave, difficulty = 'NORMAL') {
        this.type = type; // 'ORBITAL_TORUS', 'HYPERBOLIC_TWINS', 'NON_EUCLIDEAN_PRISM', 'APEX_ICOSAHEDRON', 'CORRUPTION_VECTOR'
        this.wave = wave;
        this.difficulty = difficulty; // 'EASY', 'NORMAL', 'HARD'

        this.pos = new Vec2(0, -600); // Spawns north of player
        this.vel = new Vec2(0, 0);
        this.heading = 0;
        this.timer = 0;
        this.attackTimer = 0;
        this.radius = 45;
        this.isDead = false;
        this.isBoss = true;

        // Twin specific
        this.posTwin = new Vec2(0, 600);
        this.velTwin = new Vec2(0, 0);

        // Stats calculation based on wave
        const hpMultiplier = 1 + wave * 0.08;
        if (this.type === 'CORRUPTION_VECTOR') {
            this.maxHp = Math.round(5000 * hpMultiplier);
            this.name = 'THE CORRUPTION VECTOR (WAVE 100)';
            this.color = '#ff0033';
            this.radius = 65;
            this.spriteSeed = 'VX-0036'; // Grit
            this.attackDamageMultiplier = 1.0;
            this.damageReduction = 0.0;
        } else {
            this.maxHp = Math.round(1200 * hpMultiplier);
            this.damageReduction = 0.0;
            this.attackDamageMultiplier = 1.0;

            if (this.type === 'ORBITAL_TORUS') {
                this.name = 'ORBITAL TORUS';
                this.color = '#00ffea';
                this.spriteSeed = 'VX-0060';
            } else if (this.type === 'HYPERBOLIC_TWINS') {
                this.name = 'HYPERBOLIC TWINS';
                this.color = '#ff007f';
                this.radius = 35;
                this.spriteSeed = 'VX-0012';
            } else if (this.type === 'NON_EUCLIDEAN_PRISM') {
                this.name = 'NON-EUCLIDEAN PRISM';
                this.color = '#9d00ff';
                this.spriteSeed = 'VX-0144';
            } else { // APEX_ICOSAHEDRON
                this.name = 'APEX ICOSAHEDRON';
                this.color = '#39ff14';
                this.radius = 55;
                this.spriteSeed = 'VX-0132';
            }
        }

        this.hp = this.maxHp;
    }

    takeDamage(amount) {
        // Apply dynamic armor/damage reduction
        const effectiveDamage = amount * (1 - this.damageReduction);
        this.hp -= effectiveDamage;
        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;
            audio.playExplosion(2.5);
            return true;
        }
        return false;
    }

    update(dt, player, activeGruntCount, spawnBulletCallback, grid) {
        this.timer += dt;
        this.attackTimer += dt;

        // BOSS 100: THE CORRUPTION VECTOR ADAPTIVE STANCE
        if (this.type === 'CORRUPTION_VECTOR') {
            // High Grunt Count (> 8 active):
            // Boss Attack +200%, Boss Armor -75% (takes 1.75x dmg)
            // Low Grunt Count (<= 8 active):
            // Boss enters defensive stance (-90% incoming dmg, -50% attack)
            if (activeGruntCount >= 8) {
                this.attackDamageMultiplier = 3.0; // +200%
                this.damageReduction = -0.75; // -75% armor = vulnerable!
                this.stance = 'OFFENSIVE BERSERK (+200% DMG / -75% ARMOR)';
            } else {
                this.attackDamageMultiplier = 0.5; // -50%
                this.damageReduction = 0.90; // -90% armor = heavy barrier!
                this.stance = 'DEFENSIVE FORTRESS (-90% DMG TAKEN)';
            }

            // Movement: Pursues with pulsing acceleration
            const toPlayer = Vec2.sub(player.pos, this.pos);
            this.heading = toPlayer.angle();
            this.vel = toPlayer.normalize().scale(160 + Math.sin(this.timer * 3) * 60);
            this.pos.add(Vec2.scale(this.vel, dt));

            // Attacks: Salvo spiral + corruption beam
            if (this.attackTimer >= 1.2) {
                this.attackTimer = 0;
                // Radial corruption spiral
                for (let i = 0; i < 12; i++) {
                    const angle = (i * Math.PI * 2 / 12) + this.timer * 2;
                    const bDir = Vec2.fromAngle(angle, 420);
                    spawnBulletCallback({
                        pos: this.pos.clone(),
                        vel: bDir,
                        type: 'BEAM',
                        damage: 28 * this.attackDamageMultiplier,
                        color: '#ff0033',
                        radius: 5,
                        life: 4.0,
                        isHostile: true
                    });
                }
                audio.playLaser('mortar');
                if (grid) grid.applyImpulse(this.pos.x, this.pos.y, 250, 50);
            }
            return;
        }

        // MINI-BOSS 1: ORBITAL TORUS
        if (this.type === 'ORBITAL_TORUS') {
            // Circling orbit around player + radial salvo bursts
            const dist = this.pos.dist(player.pos);
            const targetDist = 420;
            const toPlayer = Vec2.sub(player.pos, this.pos).normalize();
            const tangent = Vec2.fromAngle(toPlayer.angle() + Math.PI / 2, 1);
            
            this.vel = Vec2.add(
                toPlayer.scale((dist - targetDist) * 0.8),
                tangent.scale(220)
            );
            this.pos.add(Vec2.scale(this.vel, dt));

            if (this.attackTimer >= 1.8) {
                this.attackTimer = 0;
                for (let i = 0; i < 16; i++) {
                    const angle = i * Math.PI * 2 / 16 + this.timer;
                    spawnBulletCallback({
                        pos: this.pos.clone(),
                        vel: Vec2.fromAngle(angle, 350),
                        type: 'TORUS_BURST',
                        damage: 30,
                        color: '#00ffea',
                        radius: 5,
                        life: 3.5,
                        isHostile: true
                    });
                }
                audio.playLaser('reflection');
            }
            return;
        }

        // MINI-BOSS 2: HYPERBOLIC TWINS
        if (this.type === 'HYPERBOLIC_TWINS') {
            // Dual cores orbiting center with deadly connecting laser beam sweeping the arena!
            const orbitR = 360;
            const omega = 0.8;
            this.pos.set(
                player.pos.x + Math.cos(this.timer * omega) * orbitR,
                player.pos.y + Math.sin(this.timer * omega) * orbitR
            );
            this.posTwin.set(
                player.pos.x - Math.cos(this.timer * omega) * orbitR,
                player.pos.y - Math.sin(this.timer * omega) * orbitR
            );

            // Laser beam between twins deals damage if player crosses it!
            const beamDist = this.pos.dist(this.posTwin);
            // Check player distance to beam segment
            const v = Vec2.sub(this.posTwin, this.pos);
            const w = Vec2.sub(player.pos, this.pos);
            const c1 = w.dot(v);
            const c2 = v.dot(v);
            let b = 0;
            if (c2 > 0) b = Math.max(0, Math.min(1, c1 / c2));
            const pb = Vec2.add(this.pos, Vec2.scale(v, b));
            if (player.pos.dist(pb) < 22) {
                player.takeDamage(25);
            }

            if (this.attackTimer >= 2.0) {
                this.attackTimer = 0;
                // Both twins fire synchronized bolts
                [-1, 1].forEach(side => {
                    const p = side === 1 ? this.pos : this.posTwin;
                    const dir = Vec2.sub(player.pos, p).normalize().scale(400);
                    spawnBulletCallback({
                        pos: p.clone(),
                        vel: dir,
                        type: 'BEAM',
                        damage: 32,
                        color: '#ff007f',
                        radius: 5,
                        life: 3.0,
                        isHostile: true
                    });
                });
                audio.playLaser('sine');
            }
            return;
        }

        // MINI-BOSS 3: NON-EUCLIDEAN PRISM
        if (this.type === 'NON_EUCLIDEAN_PRISM') {
            // Warps space and curves player projectiles
            const toPlayer = Vec2.sub(player.pos, this.pos);
            this.vel = toPlayer.normalize().scale(130);
            this.pos.add(Vec2.scale(this.vel, dt));

            if (grid) grid.applyGravityWell(this.pos.x, this.pos.y, 450, 45);

            if (this.attackTimer >= 2.2) {
                this.attackTimer = 0;
                // Curved spatial shockwave bullets
                for (let i = 0; i < 8; i++) {
                    const angle = i * Math.PI * 2 / 8;
                    spawnBulletCallback({
                        pos: this.pos.clone(),
                        vel: Vec2.fromAngle(angle, 320),
                        type: 'SINE',
                        damage: 28,
                        color: '#9d00ff',
                        freq: 0.05,
                        amp: 30,
                        life: 4.0,
                        isHostile: true
                    });
                }
                audio.playLaser('mortar');
            }
            return;
        }

        // MINI-BOSS 4: APEX ICOSAHEDRON
        if (this.type === 'APEX_ICOSAHEDRON') {
            // Heavy 20-sided geometric boss with intense bullet hell patterns
            const toPlayer = Vec2.sub(player.pos, this.pos);
            this.vel = toPlayer.normalize().scale(90);
            this.pos.add(Vec2.scale(this.vel, dt));

            if (this.attackTimer >= 0.8) {
                this.attackTimer = 0;
                const offset = this.timer * 4;
                for (let i = 0; i < 6; i++) {
                    const a = offset + i * Math.PI * 2 / 6;
                    spawnBulletCallback({
                        pos: this.pos.clone(),
                        vel: Vec2.fromAngle(a, 360),
                        type: 'BEAM',
                        damage: 26,
                        color: '#39ff14',
                        radius: 4,
                        life: 3.5,
                        isHostile: true
                    });
                }
                audio.playLaser('reflection');
            }
        }
    }

    render(ctx) {
        ctx.save();
        ctx.shadowBlur = 24;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.lineWidth = 3.5;

        // Render Twin Laser Link
        if (this.type === 'HYPERBOLIC_TWINS') {
            ctx.save();
            ctx.strokeStyle = '#ff007f';
            ctx.lineWidth = 4 + Math.sin(this.timer * 15) * 2;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff007f';
            ctx.beginPath();
            ctx.moveTo(this.pos.x, this.pos.y);
            ctx.lineTo(this.posTwin.x, this.posTwin.y);
            ctx.stroke();

            // Twin 2 body
            ctx.beginPath();
            ctx.arc(this.posTwin.x, this.posTwin.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.translate(this.pos.x, this.pos.y);

        // Rotating geometric geometry
        if (this.type === 'ORBITAL_TORUS') {
            // Concentric rings
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius * 1.4, this.radius * 0.6, this.timer * 2, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius * 1.4, this.radius * 0.6, -this.timer * 2, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.type === 'APEX_ICOSAHEDRON') {
            // 20-sided polygon projection
            ctx.rotate(this.timer * 1.5);
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = i * Math.PI / 4;
                const r = i % 2 === 0 ? this.radius : this.radius * 0.7;
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        } else if (this.type === 'NON_EUCLIDEAN_PRISM') {
            // Warping prism triangle
            ctx.rotate(this.timer * 3);
            ctx.beginPath();
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(this.radius * 0.86, this.radius * 0.5);
            ctx.lineTo(-this.radius * 0.86, this.radius * 0.5);
            ctx.closePath();
            ctx.stroke();
        } else {
            // The Corruption Vector / Default Core
            ctx.rotate(this.timer);
            ctx.beginPath();
            for (let i = 0; i < 12; i++) {
                const a = i * Math.PI / 6;
                const r = i % 2 === 0 ? this.radius : this.radius * 0.6;
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // Draw Sprite inside boss core if available
        spriteManager.draw(ctx, this.spriteSeed, 0, Math.floor(this.timer * 6) % 6, 0, 0, 0.85, this.color);

        ctx.restore();
    }
}


// --- MODULE: economy_meta.js ---
// Quad Shot — Economy, Sustain & Meta-Matrix Progression

class MetaProgression {
    constructor() {
        this.primeMatrices = 0;
        this.vertices = 0;
        this.runVertices = 0;

        // Algorithmic Tree
        this.upgrades = {
            vectorProcessing: 0, // Level 0..2 (+30 speed, +1 dash charge per lvl)
            kineticDampening: 0, // Level 0..3 (-20% collision damage per lvl)
            matrixExpansion: 0,  // Level 0..3 (+25 max HP, +2 HP/s regen per lvl)
            initialMatrix: 0,    // Level 0..1 (Start with Grade II weapon)
            trapCalibration: 0   // Level 0..3 (-10% trap recharge time per lvl)
        };

        // Chromatic Shifts (Unlocked Palettes)
        this.palette = 'CYBER'; // CYBER, ULTRAVIOLET, THERMAL, MATRIX, MONOCHROME
        this.unlockedPalettes = ['CYBER'];

        // Run Temporary Modifiers
        this.elasticCollision = false; // +15% ricochet damage
        this.terminalVelocity = false; // Speed boost on max speed kill
        this.vampiricVectors = true;   // Critical flanking heals structural HP

        // Load saved progression from localStorage if available
        this.load();
    }

    convertRunVerticesToPrimeMatrices() {
        const gainedPrime = Math.floor(this.runVertices / 10);
        this.primeMatrices += gainedPrime;
        const remainder = this.runVertices % 10;
        this.runVertices = 0;
        this.save();
        return gainedPrime;
    }

    addVertices(amount) {
        this.runVertices += amount;
        this.vertices += amount;
    }

    upgrade(nodeKey, cost) {
        if (this.primeMatrices >= cost) {
            this.primeMatrices -= cost;
            this.upgrades[nodeKey] = (this.upgrades[nodeKey] || 0) + 1;
            this.save();
            audio.playChime('drop');
            return true;
        }
        return false;
    }

    unlockPalette(name, cost) {
        if (this.primeMatrices >= cost && !this.unlockedPalettes.includes(name)) {
            this.primeMatrices -= cost;
            this.unlockedPalettes.push(name);
            this.palette = name;
            this.save();
            audio.playChime('drop');
            return true;
        }
        return false;
    }

    applyToPlayer(player) {
        // Apply Vector Processing
        const vp = this.upgrades.vectorProcessing;
        player.baseSpeed = 380 + vp * 35;
        player.dashChargesMax = 5 + vp;
        player.dashCharges = player.dashChargesMax;

        // Apply Matrix Expansion
        const me = this.upgrades.matrixExpansion;
        player.maxHp = 100 + me * 25;
        player.hp = player.maxHp;
        player.passiveRegenRate = me * 2.0;

        // Apply Palette
        if (this.palette === 'ULTRAVIOLET') {
            player.neonColor = '#9d00ff';
            player.trailColor = '#ff007f';
        } else if (this.palette === 'THERMAL') {
            player.neonColor = '#ffaa00';
            player.trailColor = '#ff0033';
        } else if (this.palette === 'MATRIX') {
            player.neonColor = '#00ff41';
            player.trailColor = '#39ff14';
        } else if (this.palette === 'MONOCHROME') {
            player.neonColor = '#ffffff';
            player.trailColor = '#aaaaaa';
        } else {
            player.neonColor = '#00ffea';
            player.trailColor = '#ff007f';
        }
    }

    save() {
        try {
            const data = {
                primeMatrices: this.primeMatrices,
                vertices: this.vertices,
                upgrades: this.upgrades,
                palette: this.palette,
                unlockedPalettes: this.unlockedPalettes
            };
            localStorage.setItem('quad_shot_meta', JSON.stringify(data));
        } catch (e) {
            // Ignore in private browsing
        }
    }

    load() {
        try {
            const raw = localStorage.getItem('quad_shot_meta');
            if (raw) {
                const data = JSON.parse(raw);
                if (data.primeMatrices !== undefined) this.primeMatrices = data.primeMatrices;
                if (data.vertices !== undefined) this.vertices = data.vertices;
                if (data.upgrades) this.upgrades = Object.assign(this.upgrades, data.upgrades);
                if (data.palette) this.palette = data.palette;
                if (data.unlockedPalettes) this.unlockedPalettes = data.unlockedPalettes;
            }
        } catch (e) {
            // Ignore
        }
    }
}


// --- MODULE: game.js ---
// Quad Shot — Main Game Controller & Systems Orchestrator

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Dimensions
        this.width = canvas.width = window.innerWidth;
        this.height = canvas.height = window.innerHeight;

        // Camera
        this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            zoom: 1.0,
            targetZoom: 1.0,
            damping: 0.12,
            width: this.width,
            height: this.height
        };

        // World Bounds (Infinite Cartesian grid simulated at 4000x4000)
        this.worldBounds = { width: 4000, height: 4000 };
        this.grid = new CartesianGrid(4000, 4000, 60);

        // Meta Matrix & Progression
        this.meta = new MetaProgression();
        this.grid.theme = this.meta.palette;

        // Player Entity
        this.player = new StickmanPlayer(0, 0);
        this.meta.applyToPlayer(this.player);

        // Loadout (3 Weapons max, 2 Traps max)
        this.weapons = ['SINE_RIFLE'];
        if (this.meta.upgrades.initialMatrix > 0) {
            this.weapons.push('REFLECTION_RAY');
        }
        this.activeWeaponIdx = 0;
        this.weaponCooldown = 0;
        this.meleeCooldown = 0;
        this.combatMode = 'RANGED'; // 'RANGED' or 'MELEE'
        this.activeSlashes = [];

        this.traps = ['GRAVITY_TETHER'];
        this.activeTrapIdx = 0;
        this.trapCharges = [3, 3];
        this.trapRechargeTimers = [0, 0];
        this.trapRechargeMax = 8.0 * (1 - this.meta.upgrades.trapCalibration * 0.1);

        // State Machine
        this.state = 'HUB'; // 'HUB', 'COMBAT', 'INTERSECTION_PAUSE', 'GAME_OVER'
        this.timeScale = 1.0;
        this.targetTimeScale = 1.0;
        this.gameTime = 0;

        // Wave & Combat Management
        this.currentWave = 0;
        this.recordWave = parseInt(localStorage.getItem('quad_shot_record_wave') || '0', 10);
        this.waveTimer = 0;
        this.waveEnemiesToSpawn = 0;
        this.waveSpawnTimer = 0;
        this.activeBoss = null;
        this.miniBossesDefeated = 0;
        this.difficulty = 'NORMAL'; // EASY, NORMAL, HARD

        // Scoring loop from Endless Fire
        this.score = 0;
        this.recordScore = parseInt(localStorage.getItem('quad_shot_record_score') || '0', 10);
        this.multiplier = 1.0;
        this.multiplierDecayRate = 0.25;

        // Entities
        this.projectiles = [];
        this.trapsDeployed = [];
        this.enemies = [];
        this.pickups = []; // { pos, type: 'VERTICES'|'CODE_FRAGMENT'|'WEAPON'|'TRAP', value, itemDef, life }
        this.walls = []; // { p1, p2, life, maxLife, color }
        this.particles = [];

        // Intersection Pause Drop Candidate
        this.pendingDrop = null; // { type: 'WEAPON'|'TRAP', id: string, pos: Vec2 }

        // Input Tracking
        this.keys = new Set();
        this.mousePos = new Vec2(0, 0);
        this.worldMousePos = new Vec2(0, 0);
        this.isMouseDown = false;

        // Psycho Mode & Sprite Toggle
        this.psychoMode = false;
        this.useSprites = true;

        this.initInput();
        this.initResize();
    }

    async start() {
        await spriteManager.init();
        audio.init();
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop.bind(this));
    }

    initResize() {
        window.addEventListener('resize', () => {
            this.width = this.canvas.width = window.innerWidth;
            this.height = this.canvas.height = window.innerHeight;
            this.camera.width = this.width;
            this.camera.height = this.height;
        });
    }

    initInput() {
        window.addEventListener('keydown', (e) => {
            const k = e.key.toLowerCase();
            this.keys.add(k);

            // Audio init on first gesture
            audio.resume();

            // Weapon switching: 1, 2, 3
            if (k === '1' && this.weapons[0]) this.activeWeaponIdx = 0;
            if (k === '2' && this.weapons[1]) this.activeWeaponIdx = 1;
            if (k === '3' && this.weapons[2]) this.activeWeaponIdx = 2;
            if (k === 'q') {
                this.activeWeaponIdx = (this.activeWeaponIdx + 1) % this.weapons.length;
            }

            // Trap deployment: E or F
            if (k === 'e' || k === 'f') {
                if (this.state === 'INTERSECTION_PAUSE') {
                    this.resolveIntersectionPause('SWAP');
                } else {
                    this.deployActiveTrap();
                }
            }

            // Intersection Pause Scrap: X
            if (k === 'x' && this.state === 'INTERSECTION_PAUSE') {
                this.resolveIntersectionPause('SCRAP');
            }

            // Dash: Space or Shift
            if (k === ' ') {
                const moveVec = this.getInputVector();
                this.player.triggerDash(moveVec);
            }

            // Apex Step: C
            if (k === 'c') {
                this.player.triggerApexStep();
            }

            // Psycho Mode Toggle: P (Endless Fire legacy feature)
            if (k === 'p') {
                this.psychoMode = !this.psychoMode;
                this.grid.psychoMode = this.psychoMode;
                audio.setPsychoMode(this.psychoMode);
            }

            // Toggle Sprites vs Vector: T
            if (k === 't') {
                this.useSprites = !this.useSprites;
            }

            // Dual Physics Toggle: Z (Kinematic vs Inertial Frame)
            if (k === 'z') {
                const nextFrame = this.player.physicsFrame === 'KINEMATIC' ? 'INERTIAL' : 'KINEMATIC';
                this.player.setPhysicsFrame(nextFrame);
                audio.playLaser('reflection');
            }

            // Toggle Melee vs Ranged Combat Mode: V
            if (k === 'v') {
                this.toggleCombatMode();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.key.toLowerCase());
        });

        window.addEventListener('mousemove', (e) => {
            this.mousePos.set(e.clientX, e.clientY);
            this.updateWorldMousePos();
        });

        window.addEventListener('mousedown', (e) => {
            audio.resume();
            if (e.button === 0) this.isMouseDown = true;
            if (e.button === 2) {
                // Right click: Suspension State
                this.player.setSuspension(true);
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.isMouseDown = false;
            if (e.button === 2) {
                this.player.setSuspension(false);
            }
        });

        window.addEventListener('contextmenu', (e) => e.preventDefault());

        window.addEventListener('wheel', (e) => {
            if (this.weapons.length > 1) {
                if (e.deltaY > 0) {
                    this.activeWeaponIdx = (this.activeWeaponIdx + 1) % this.weapons.length;
                } else {
                    this.activeWeaponIdx = (this.activeWeaponIdx - 1 + this.weapons.length) % this.weapons.length;
                }
            }
        });
    }

    updateWorldMousePos() {
        this.worldMousePos.x = this.camera.x + (this.mousePos.x - this.width / 2) / this.camera.zoom;
        this.worldMousePos.y = this.camera.y + (this.mousePos.y - this.height / 2) / this.camera.zoom;
    }

    getInputVector() {
        const v = new Vec2(0, 0);
        if (this.keys.has('w') || this.keys.has('arrowup')) v.y -= 1;
        if (this.keys.has('s') || this.keys.has('arrowdown')) v.y += 1;
        if (this.keys.has('a') || this.keys.has('arrowleft')) v.x -= 1;
        if (this.keys.has('d') || this.keys.has('arrowright')) v.x += 1;
        return v;
    }

    startCombatLockdown() {
        this.state = 'COMBAT';
        this.currentWave = 1;
        this.startWave(this.currentWave);
        audio.playChime('drop');
    }

    startWave(waveNum) {
        this.currentWave = waveNum;
        if (this.currentWave > this.recordWave) {
            this.recordWave = this.currentWave;
            localStorage.setItem('quad_shot_record_wave', String(this.recordWave));
        }

        // Camera zoom: Zoom out to Macro-View every 5th wave!
        if (waveNum % 5 === 0) {
            this.camera.targetZoom = 0.65; // Macro-View
            this.spawnBossForWave(waveNum);
        } else {
            this.camera.targetZoom = 1.0;
            this.activeBoss = null;
        }

        // Grunt spawn count: 10% exponential scaling per wave!
        // N(w) = round(8 * 1.10^w)
        this.waveEnemiesToSpawn = Math.round(8 * Math.pow(1.10, waveNum));
        this.waveSpawnTimer = 0;
        audio.playLaser('mortar');
    }

    spawnBossForWave(waveNum) {
        let bType = 'ORBITAL_TORUS';
        if (waveNum === 100) {
            bType = 'CORRUPTION_VECTOR';
        } else {
            const roster = ['ORBITAL_TORUS', 'HYPERBOLIC_TWINS', 'NON_EUCLIDEAN_PRISM', 'APEX_ICOSAHEDRON'];
            bType = roster[Math.floor((waveNum / 5 - 1) % roster.length)];
        }
        this.activeBoss = new Boss(bType, waveNum, this.difficulty);
        audio.playExplosion(2.0);
    }

    deployActiveTrap() {
        const trapId = this.traps[this.activeTrapIdx];
        if (!trapId) return;

        const charges = this.trapCharges[this.activeTrapIdx];
        if (charges > 0) {
            this.trapCharges[this.activeTrapIdx]--;
            this.trapsDeployed.push(new DeployableTrap({
                pos: this.player.pos.clone(),
                type: trapId
            }));
            audio.playTrapDeploy();
            if (this.grid) this.grid.applyImpulse(this.player.pos.x, this.player.pos.y, 220, 45);
        }
    }

    toggleCombatMode() {
        this.combatMode = this.combatMode === 'RANGED' ? 'MELEE' : 'RANGED';
        if (audio) {
            audio.playLaser(this.combatMode === 'MELEE' ? 'reflection' : 'sine');
        }
        const btn = document.getElementById('btn-combat-mode');
        if (btn) {
            btn.innerText = this.combatMode === 'MELEE' ? '⚔ MELEE [V]' : '🏹 RANGED [V]';
            btn.classList.toggle('active', this.combatMode === 'MELEE');
        }
    }

    executeMeleeAttack() {
        const wId = this.weapons[this.activeWeaponIdx];
        const def = WEAPON_DEFS[wId];
        if (!def || this.meleeCooldown > 0) return;

        this.meleeCooldown = def.meleeCooldown || 0.22;
        this.player.combatPose = 'SLASH';
        this.player.poseTimer = 0.22;

        const slashId = def.slashId || 1;
        const slash = {
            pos: this.player.pos.clone(),
            angle: this.player.aimAngle,
            slashId: slashId,
            frame: 0,
            totalFrames: spriteManager.getSlashFrameCount(slashId),
            frameTimer: 0,
            frameDuration: 0.024,
            radius: def.meleeRange || 90,
            arc: def.meleeArc || Math.PI * 0.7,
            damage: def.meleeDmg || 60,
            color: def.color || '#00ffea',
            hitEnemies: new Set(),
            weaponId: def.id,
            swingProgress: 0
        };

        this.activeSlashes.push(slash);
        audio.playMeleeSlash(slashId);
        if (this.grid) this.grid.applyImpulse(this.player.pos.x, this.player.pos.y, 200, 35);
    }

    fireActiveWeapon() {
        const wId = this.weapons[this.activeWeaponIdx];
        const def = WEAPON_DEFS[wId];
        if (!def || this.weaponCooldown > 0) return;

        this.weaponCooldown = def.cooldown;
        this.player.recoilOffset = 9;
        this.player.muzzleFlashTimer = 0.06;

        const aimDir = this.player.facing.clone();
        const fireOrigin = Vec2.add(this.player.pos, aimDir.clone().scale(25));

        switch (wId) {
            case 'SINE_RIFLE':
                // Alternating high-frequency sine-wave beam pulses
                this.projectiles.push(new Projectile({
                    pos: fireOrigin,
                    vel: aimDir.scale(850),
                    type: 'SINE',
                    damage: def.baseDmg,
                    color: def.color,
                    freq: 0.09,
                    amp: 20,
                    phase: (this.gameTime * 20) % (Math.PI * 2),
                    hasRicochetBoost: this.meta.elasticCollision
                }));
                audio.playLaser('sine');
                break;

            case 'PARABOLIC_MORTAR':
                // Explosive geometric shell along arc trajectory towards cursor
                this.projectiles.push(new Projectile({
                    pos: fireOrigin,
                    targetPos: this.worldMousePos.clone(),
                    type: 'MORTAR',
                    isMortar: true,
                    damage: def.baseDmg,
                    radius: def.radius,
                    color: def.color,
                    flightDuration: 0.65
                }));
                audio.playLaser('mortar');
                break;

            case 'REFLECTION_RAY':
                // Laser ricocheting off grid lines & shields
                this.projectiles.push(new Projectile({
                    pos: fireOrigin,
                    vel: aimDir.scale(1200),
                    type: 'REFLECTION',
                    damage: def.baseDmg,
                    color: def.color,
                    bouncesLeft: def.maxBounces,
                    hasRicochetBoost: this.meta.elasticCollision
                }));
                audio.playLaser('reflection');
                break;

            case 'TANGENT_DISC':
                // Cutting ricochet disc accelerating with tangential contact
                this.projectiles.push(new Projectile({
                    pos: fireOrigin,
                    vel: aimDir.scale(700),
                    type: 'TANGENT',
                    isTangent: true,
                    damage: def.baseDmg,
                    color: def.color,
                    bouncesLeft: 6,
                    hasRicochetBoost: this.meta.elasticCollision
                }));
                audio.playLaser('sine');
                break;

            case 'SCALAR_SHOTGUN':
                // Cone burst of 8 vector points
                for (let i = 0; i < def.pellets; i++) {
                    const spreadAngle = this.player.aimAngle + (Math.random() - 0.5) * 0.55;
                    const spd = 750 + Math.random() * 200;
                    this.projectiles.push(new Projectile({
                        pos: fireOrigin,
                        vel: Vec2.fromAngle(spreadAngle, spd),
                        type: 'SCALAR',
                        damage: def.baseDmg,
                        color: def.color,
                        radius: 3.5,
                        life: 1.4,
                        hasRicochetBoost: this.meta.elasticCollision
                    }));
                }
                audio.playLaser('shotgun');
                break;

            case 'FRACTAL_CLUSTER':
                // Grenade recursively splitting into smaller sub-explosions
                this.projectiles.push(new Projectile({
                    pos: fireOrigin,
                    vel: aimDir.scale(600),
                    type: 'FRACTAL',
                    damage: def.baseDmg,
                    color: def.color,
                    splitGen: 2,
                    life: 1.1
                }));
                audio.playLaser('mortar');
                break;

            case 'ASYMPTOTE_LASER':
                // Continuous laser beam
                this.projectiles.push(new Projectile({
                    pos: fireOrigin,
                    vel: aimDir.scale(1600),
                    type: 'ASYMPTOTE',
                    damage: def.baseDmg,
                    color: def.color,
                    radius: 3,
                    life: 0.25
                }));
                audio.playLaser('reflection');
                break;

            case 'DOPPLER_REPEATER':
                // Damage scales with player velocity!
                const pSpeed = this.player.vel.mag();
                const vRatio = 1 + (pSpeed / this.player.baseSpeed);
                this.projectiles.push(new Projectile({
                    pos: fireOrigin,
                    vel: aimDir.scale(950),
                    type: 'DOPPLER',
                    damage: Math.round(def.baseDmg * vRatio),
                    color: def.color,
                    radius: 4.5,
                    hasRicochetBoost: this.meta.elasticCollision
                }));
                audio.playLaser('sine');
                break;
        }

        // Slight player recoil impulse
        if (this.player.physicsFrame === 'INERTIAL') {
            this.player.vel.add(aimDir.clone().scale(-40));
        }
    }

    triggerIntersectionPause(itemType, itemId, pos) {
        this.pendingDrop = { type: itemType, id: itemId, pos: pos.clone() };
        this.state = 'INTERSECTION_PAUSE';
        this.targetTimeScale = 0.05; // Slow down to 5% speed!
        audio.playChime('drop');
    }

    resolveIntersectionPause(choice) {
        if (!this.pendingDrop) return;
        const drop = this.pendingDrop;
        const def = drop.type === 'WEAPON' ? WEAPON_DEFS[drop.id] : TRAP_DEFS[drop.id];

        if (choice === 'SWAP') {
            if (drop.type === 'WEAPON') {
                if (this.weapons.length < 3) {
                    this.weapons.push(drop.id);
                    this.activeWeaponIdx = this.weapons.length - 1;
                } else {
                    this.weapons[this.activeWeaponIdx] = drop.id;
                }
            } else {
                if (this.traps.length < 2) {
                    this.traps.push(drop.id);
                    this.activeTrapIdx = this.traps.length - 1;
                } else {
                    this.traps[this.activeTrapIdx] = drop.id;
                }
            }
            audio.playChime('pickup');
        } else if (choice === 'SCRAP') {
            // Instant scrap into Vertices
            const val = def.scrapValue || 40;
            this.meta.addVertices(val);
            audio.playChime('pickup');
        }

        this.pendingDrop = null;
        this.state = 'COMBAT';
        this.targetTimeScale = 1.0;
    }

    handleMiniBossDefeat() {
        this.miniBossesDefeated++;
        // Mini-Boss Surge: 50% base chance + 10% per prior defeated mini-boss
        const surgeChance = Math.min(1.0, 0.50 + (this.miniBossesDefeated - 1) * 0.10);
        if (Math.random() < surgeChance) {
            if (this.player.hp >= this.player.maxHp) {
                // Permanently expands Max HP by 15%!
                this.player.maxHp = Math.round(this.player.maxHp * 1.15);
                this.player.hp = this.player.maxHp;
            } else {
                // Full HP restore!
                this.player.hp = this.player.maxHp;
            }
            audio.playChime('drop');
        }
    }

    update(rawDt) {
        // Smooth timeScale transition
        this.timeScale += (this.targetTimeScale - this.timeScale) * 0.2;
        const dt = rawDt * this.timeScale * (this.player.suspensionActive ? 0.4 : 1.0);
        this.gameTime += dt;

        this.updateWorldMousePos();

        // Multiplier decay over time (Endless Fire mechanic)
        if (this.multiplier > 1.0) {
            this.multiplier = Math.max(1.0, this.multiplier - this.multiplierDecayRate * dt);
        }

        // Current quadrant biome
        const currentBiome = this.grid.getBiomeAt(this.player.pos.x, this.player.pos.y);

        // Update Grid deformation & relaxation
        this.grid.update(dt);

        // Update Player
        const inputVec = this.getInputVector();
        this.player.update(dt, inputVec, this.worldMousePos, this.worldBounds, currentBiome);

        // Player attack (Ranged shooting or Melee slashing)
        if (this.weaponCooldown > 0) this.weaponCooldown -= dt;
        if (this.meleeCooldown > 0) this.meleeCooldown -= dt;
        if (this.isMouseDown && (this.state === 'COMBAT' || this.state === 'HUB')) {
            if (this.combatMode === 'RANGED') {
                this.fireActiveWeapon();
            } else {
                this.executeMeleeAttack();
            }
        }

        // Update Active Melee Slashes
        for (let i = this.activeSlashes.length - 1; i >= 0; i--) {
            const sl = this.activeSlashes[i];
            sl.frameTimer += dt;
            if (sl.frameTimer >= sl.frameDuration) {
                sl.frameTimer -= sl.frameDuration;
                sl.frame++;
            }
            sl.swingProgress = sl.frame / sl.totalFrames;
            sl.pos = Vec2.add(this.player.pos, Vec2.fromAngle(sl.angle, 18));

            // Collision check against enemies
            for (const e of this.enemies) {
                if (e.isDead || sl.hitEnemies.has(e)) continue;
                const toEnemy = Vec2.sub(e.pos, this.player.pos);
                const dist = toEnemy.mag();
                if (dist <= sl.radius + (e.radius || 15)) {
                    let diffAngle = Math.abs(toEnemy.angle() - sl.angle);
                    while (diffAngle > Math.PI) diffAngle = Math.abs(diffAngle - 2 * Math.PI);

                    if (diffAngle <= sl.arc / 2 || sl.arc >= Math.PI * 1.9) {
                        sl.hitEnemies.add(e);
                        let dmg = sl.damage;
                        if (sl.weaponId === 'DOPPLER_REPEATER') {
                            dmg = Math.round(dmg * (1 + this.player.vel.mag() / this.player.baseSpeed));
                        }
                        const flankAngle = getFlankingAngle(this.player.pos, e.pos, e.facing ? e.facing.angle() : 0);
                        const critChance = calculateFlankCritChance(flankAngle);
                        const isCrit = Math.random() < critChance;
                        if (isCrit) dmg = Math.round(dmg * 2.0);

                        e.takeDamage(dmg, isCrit, this);
                        if (e.vel) e.vel.add(Vec2.fromAngle(sl.angle, 350));
                        if (this.grid) this.grid.applyImpulse(e.pos.x, e.pos.y, 220, 30);

                        for (let p = 0; p < 8; p++) {
                            this.particles.push({
                                pos: e.pos.clone(),
                                vel: Vec2.fromAngle(sl.angle + (Math.random() - 0.5) * 1.2, 120 + Math.random() * 200),
                                color: sl.color,
                                life: 0.35,
                                maxLife: 0.35,
                                size: 3
                            });
                        }

                        if (sl.weaponId === 'FRACTAL_CLUSTER') {
                            this.projectiles.push(new Projectile({
                                pos: e.pos.clone(),
                                vel: Vec2.fromAngle(sl.angle + (Math.random() - 0.5) * 1.5, 300),
                                type: 'FRACTAL',
                                damage: 35,
                                color: sl.color,
                                splitGen: 1,
                                life: 0.4
                            }));
                        }
                    }
                }
            }

            // Deflect / Cancel Hostile Projectiles
            for (let pIdx = this.projectiles.length - 1; pIdx >= 0; pIdx--) {
                const proj = this.projectiles[pIdx];
                if (proj.isDead || !proj.isHostile) continue;
                const toProj = Vec2.sub(proj.pos, this.player.pos);
                const pDist = toProj.mag();
                if (pDist <= sl.radius + 15) {
                    let diffA = Math.abs(toProj.angle() - sl.angle);
                    while (diffA > Math.PI) diffA = Math.abs(diffA - 2 * Math.PI);
                    if (diffA <= sl.arc / 2 || sl.arc >= Math.PI * 1.9) {
                        if (sl.weaponId === 'REFLECTION_RAY') {
                            proj.isHostile = false;
                            proj.vel.scale(-1.2);
                            proj.color = '#39ff14';
                            proj.damage = 45;
                            audio.playDeflect();
                        } else {
                            proj.isDead = true;
                            audio.playDeflect();
                            for (let p = 0; p < 5; p++) {
                                this.particles.push({
                                    pos: proj.pos.clone(),
                                    vel: Vec2.fromAngle(Math.random() * Math.PI * 2, 80 + Math.random() * 100),
                                    color: '#00ffea',
                                    life: 0.25,
                                    maxLife: 0.25,
                                    size: 2.5
                                });
                            }
                        }
                    }
                }
            }

            if (sl.frame >= sl.totalFrames) {
                this.activeSlashes.splice(i, 1);
            }
        }

        // Trap recharge timers
        for (let i = 0; i < this.traps.length; i++) {
            if (this.trapCharges[i] < 3) {
                this.trapRechargeTimers[i] += dt;
                if (this.trapRechargeTimers[i] >= this.trapRechargeMax) {
                    this.trapCharges[i]++;
                    this.trapRechargeTimers[i] = 0;
                }
            }
        }

        // Camera Smooth Follow (Damped follow like G-Wars)
        this.camera.targetX = this.player.pos.x;
        this.camera.targetY = this.player.pos.y;
        this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.damping;
        this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.damping;
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.08;

        // Wave Spawner in Combat
        if (this.state === 'COMBAT') {
            if (this.waveEnemiesToSpawn > 0) {
                this.waveSpawnTimer += dt;
                if (this.waveSpawnTimer >= 0.45) {
                    this.waveSpawnTimer = 0;
                    this.waveEnemiesToSpawn--;
                    this.spawnGruntEnemy();
                }
            } else if (this.enemies.length === 0 && !this.activeBoss) {
                // Wave cleared! Advance to next wave
                this.startWave(this.currentWave + 1);
            }
        }

        // Update Deployed Traps
        for (let i = this.trapsDeployed.length - 1; i >= 0; i--) {
            const trap = this.trapsDeployed[i];
            trap.update(dt, this.enemies, this.projectiles, this.grid);
            if (trap.isDead) this.trapsDeployed.splice(i, 1);
        }

        // Update Hostile Laser Walls
        for (let i = this.walls.length - 1; i >= 0; i--) {
            const w = this.walls[i];
            w.life -= dt;
            if (w.life <= 0) this.walls.splice(i, 1);
        }

        // Update Boss
        if (this.activeBoss) {
            this.activeBoss.update(
                dt,
                this.player,
                this.enemies.length,
                (bulletConfig) => this.projectiles.push(new Projectile(bulletConfig)),
                this.grid
            );
            if (this.activeBoss.isDead) {
                this.handleMiniBossDefeat();
                this.activeBoss = null;
                this.camera.targetZoom = 1.0;
            }
        }

        // Update Grunt Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(
                dt,
                this.player,
                (bulletConfig) => this.projectiles.push(new Projectile(bulletConfig)),
                this.grid,
                this.walls
            );

            // Melee damage to player
            if (this.player.pos.dist(enemy.pos) < this.player.pos.dist(enemy.pos) && this.player.pos.dist(enemy.pos) < 26) {
                this.player.takeDamage(enemy.type === 'DELTA_SWARM' ? 14 : 22);
            }

            // Dash Trail damage to enemies
            this.player.dashTrails.forEach(tr => {
                const distToLine = this.distPointToSegment(enemy.pos, tr.p1, tr.p2);
                if (distToLine < enemy.radius + 6) {
                    enemy.takeDamage(tr.damage * dt * 4);
                }
            });

            // Shockwave damage & knockback
            this.player.shockwaves.forEach(sw => {
                const d = enemy.pos.dist(sw.pos);
                if (Math.abs(d - sw.radius) < 25) {
                    enemy.takeDamage(sw.damage);
                    const kb = Vec2.sub(enemy.pos, sw.pos).normalize().scale(300);
                    enemy.pos.add(kb);
                }
            });

            if (enemy.isDead) {
                this.handleEnemyDeath(enemy);
                this.enemies.splice(i, 1);
            }
        }

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(dt, this.worldBounds, this.grid, currentBiome);

            // Player shockwave neutralizes hostile light projectiles!
            if (p.isHostile) {
                this.player.shockwaves.forEach(sw => {
                    if (p.pos.dist(sw.pos) < sw.radius) {
                        p.isDead = true; // Neutralized!
                    }
                });

                // Check collision with player
                if (!p.isDead && p.pos.dist(this.player.pos) < 18) {
                    this.player.takeDamage(p.damage);
                    p.isDead = true;
                }
            } else {
                // Friendly projectile hitting enemies
                let hitTarget = null;
                for (const e of this.enemies) {
                    if (p.pos.dist(e.pos) < e.radius + p.radius) {
                        hitTarget = e;
                        break;
                    }
                }
                if (!hitTarget && this.activeBoss) {
                    if (p.pos.dist(this.activeBoss.pos) < this.activeBoss.radius + p.radius) {
                        hitTarget = this.activeBoss;
                    }
                }

                if (hitTarget) {
                    // Flanking angle crit calculation for Vampiric Vectors
                    const flankAngle = getFlankingAngle(this.player.pos, hitTarget.pos, hitTarget.heading || 0);
                    const critChance = calculateFlankCritChance(flankAngle);
                    const isCrit = Math.random() < critChance;
                    let finalDmg = p.damage * p.bounceDamageMultiplier;

                    if (isCrit) {
                        finalDmg *= 1.8;
                        audio.playCritHit();
                        // Vampiric Vectors: heal percentage of crit damage!
                        if (this.meta.vampiricVectors) {
                            this.player.heal(finalDmg * 0.12);
                        }
                    }

                    hitTarget.takeDamage(finalDmg);
                    if (this.grid) this.grid.applyImpulse(hitTarget.pos.x, hitTarget.pos.y, 80, 18);

                    // Multiplier increase from hits (Endless Fire scoring synergy)
                    this.multiplier = Math.min(25.0, this.multiplier + 0.15);

                    // Fractal split logic
                    if (p.type === 'FRACTAL' && p.splitGen > 0) {
                        for (let s = 0; s < 3; s++) {
                            const angle = (s * Math.PI * 2 / 3) + Math.random() * 0.5;
                            this.projectiles.push(new Projectile({
                                pos: p.pos.clone(),
                                vel: Vec2.fromAngle(angle, 450),
                                type: 'SCALAR',
                                damage: Math.round(p.damage * 0.55),
                                color: p.color,
                                splitGen: p.splitGen - 1,
                                life: 0.8
                            }));
                        }
                        audio.playExplosion(0.8);
                    }

                    p.isDead = true;
                }
            }

            if (p.isDead) this.projectiles.splice(i, 1);
        }

        // Update Pickups
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const pk = this.pickups[i];
            pk.life -= dt;
            const distToPlayer = this.player.pos.dist(pk.pos);

            // Vacuum pull towards player within 140px
            if (distToPlayer < 140) {
                const pull = Vec2.sub(this.player.pos, pk.pos).normalize().scale(400 * dt);
                pk.pos.add(pull);
            }

            if (distToPlayer < 24) {
                // Collect pickup!
                if (pk.type === 'VERTICES') {
                    const gained = Math.round(pk.value * this.multiplier);
                    this.meta.addVertices(gained);
                    this.score += gained * 10;
                    audio.playChime('pickup');
                } else if (pk.type === 'CODE_FRAGMENT') {
                    // Restores 25% health & replenishes all trap charges!
                    this.player.heal(this.player.maxHp * 0.25);
                    this.trapCharges = [3, 3];
                    audio.playChime('drop');
                } else if (pk.type === 'WEAPON' || pk.type === 'TRAP') {
                    this.triggerIntersectionPause(pk.type, pk.itemId, pk.pos);
                }
                this.pickups.splice(i, 1);
            } else if (pk.life <= 0) {
                this.pickups.splice(i, 1);
            }
        }

        // Player Death check
        if (this.player.isDead && this.state !== 'GAME_OVER') {
            this.handlePlayerDeath();
        }
    }

    distPointToSegment(p, a, b) {
        const l2 = a.distSq(b);
        if (l2 === 0) return p.dist(a);
        let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
    }

    spawnGruntEnemy() {
        // Spawn around player with distance buffer (> 450px)
        const angle = Math.random() * Math.PI * 2;
        const dist = 500 + Math.random() * 300;
        const spawnPos = new Vec2(
            this.player.pos.x + Math.cos(angle) * dist,
            this.player.pos.y + Math.sin(angle) * dist
        );

        // Clamp to world
        const halfW = this.worldBounds.width / 2 - 100;
        const halfH = this.worldBounds.height / 2 - 100;
        spawnPos.x = Math.max(-halfW, Math.min(halfW, spawnPos.x));
        spawnPos.y = Math.max(-halfH, Math.min(halfH, spawnPos.y));

        const types = ['DELTA_SWARM', 'DELTA_SWARM', 'SINE_SEEKER', 'RAY_CASTER', 'TESSELLATOR', 'SCALAR'];
        const chosenType = types[Math.floor(Math.random() * types.length)];
        const isElite = Math.random() < 0.12;

        this.enemies.push(new Enemy({
            pos: spawnPos,
            type: chosenType,
            isElite
        }));
    }

    handleEnemyDeath(enemy) {
        audio.playExplosion(enemy.isElite ? 1.2 : 0.6);
        if (this.grid) this.grid.applyImpulse(enemy.pos.x, enemy.pos.y, 160, 35);

        // Vertices Drop
        this.pickups.push({
            pos: enemy.pos.clone(),
            type: 'VERTICES',
            value: enemy.verticesValue,
            life: 14.0
        });

        // Elite unit drop chance: Code Fragments or Weapons/Traps!
        if (enemy.isElite) {
            if (Math.random() < 0.45) {
                this.pickups.push({
                    pos: Vec2.add(enemy.pos, new Vec2(15, 0)),
                    type: 'CODE_FRAGMENT',
                    life: 20.0
                });
            } else if (Math.random() < 0.40) {
                // Drop a higher grade weapon
                const pool = ['REFLECTION_RAY', 'TANGENT_DISC', 'SCALAR_SHOTGUN', 'FRACTAL_CLUSTER', 'DOPPLER_REPEATER', 'ASYMPTOTE_LASER'];
                const dropId = pool[Math.floor(Math.random() * pool.length)];
                this.pickups.push({
                    pos: Vec2.add(enemy.pos, new Vec2(0, 15)),
                    type: 'WEAPON',
                    itemId: dropId,
                    life: 30.0
                });
            }
        }
    }

    handlePlayerDeath() {
        this.state = 'GAME_OVER';
        // Scramble quadrants on death! (GDD Section 3: Quadrant Mechanics)
        this.grid.scrambleQuadrants();
        // Convert run vertices to Prime Matrices (10:1 ratio)
        this.meta.convertRunVerticesToPrimeMatrices();
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // Deep space background
        ctx.fillStyle = this.psychoMode ? '#0a0014' : '#030811';
        ctx.fillRect(0, 0, this.width, this.height);

        // Begin Camera Transformation
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(this.camera.zoom, this.camera.zoom);
        ctx.translate(-this.camera.x, -this.camera.y);

        // 1. Render Cartesian Grid & Quadrants
        this.grid.render(ctx, this.camera);

        // 2. Render Hostile Laser Walls
        this.walls.forEach(w => {
            ctx.save();
            ctx.strokeStyle = w.color;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 18;
            ctx.shadowColor = w.color;
            ctx.beginPath();
            ctx.moveTo(w.p1.x, w.p1.y);
            ctx.lineTo(w.p2.x, w.p2.y);
            ctx.stroke();
            ctx.restore();
        });

        // 3. Render Deployed Traps
        this.trapsDeployed.forEach(t => t.render(ctx));

        // 4. Render Pickups (Vertices crystals & Code Fragments)
        this.pickups.forEach(pk => {
            ctx.save();
            ctx.translate(pk.pos.x, pk.pos.y);
            if (pk.type === 'VERTICES') {
                ctx.shadowBlur = 12;
                ctx.shadowColor = '#39ff14';
                ctx.strokeStyle = '#39ff14';
                ctx.fillStyle = 'rgba(57, 255, 20, 0.4)';
                ctx.lineWidth = 2;
                // Diamond vertex crystal
                ctx.beginPath();
                ctx.moveTo(0, -7);
                ctx.lineTo(6, 0);
                ctx.lineTo(0, 7);
                ctx.lineTo(-6, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else if (pk.type === 'CODE_FRAGMENT') {
                ctx.shadowBlur = 16;
                ctx.shadowColor = '#00ffea';
                ctx.strokeStyle = '#00ffea';
                ctx.fillStyle = '#00ffea';
                ctx.lineWidth = 2;
                // Hexagon Code Fragment
                ctx.beginPath();
                for (let a = 0; a < 6; a++) {
                    const ang = a * Math.PI / 3;
                    const hx = Math.cos(ang) * 9;
                    const hy = Math.sin(ang) * 9;
                    if (a === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                ctx.stroke();
            } else {
                // Dropped Weapon / Trap item box
                ctx.shadowBlur = 18;
                ctx.shadowColor = '#ffff00';
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 2.5;
                ctx.strokeRect(-12, -12, 24, 24);
            }
            ctx.restore();
        });

        // 5. Render Enemies & Boss
        this.enemies.forEach(e => e.render(ctx));
        if (this.activeBoss) this.activeBoss.render(ctx);

        // 6. Render Projectiles
        this.projectiles.forEach(p => p.render(ctx));

        // 6.5 Render Active Melee Slashes
        this.activeSlashes.forEach(sl => {
            spriteManager.drawSlash(ctx, sl.slashId, sl.frame, sl.pos.x, sl.pos.y, sl.angle, sl.radius / 190, sl.color);
        });

        // 7. Render Player Stickman / Sprite
        const activeWDef = WEAPON_DEFS[this.weapons[this.activeWeaponIdx]];
        const currentSlash = this.activeSlashes.length > 0 ? this.activeSlashes[this.activeSlashes.length - 1] : null;
        this.player.render(ctx, activeWDef, this.combatMode, currentSlash, spriteManager);

        ctx.restore();
        // End Camera Transformation

        // 8. Render HUD & UI Overlays
        this.renderHUD(ctx);
    }

    renderHUD(ctx) {
        ctx.save();
        ctx.shadowBlur = 0;

        // Health Bar & Lives (Top-Left)
        ctx.fillStyle = 'rgba(0, 10, 25, 0.7)';
        ctx.strokeStyle = 'rgba(0, 255, 234, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.fillRect(20, 20, 240, 24);
        ctx.strokeRect(20, 20, 240, 24);

        const hpRatio = Math.max(0, this.player.hp / this.player.maxHp);
        ctx.fillStyle = hpRatio > 0.3 ? '#00ffea' : '#ff0055';
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(22, 22, (240 - 4) * hpRatio, 20);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillText(`HP: ${Math.round(this.player.hp)} / ${this.player.maxHp}`, 30, 36);

        // Dash Charges (5 Pips)
        for (let i = 0; i < this.player.dashChargesMax; i++) {
            const filled = i < this.player.dashCharges;
            ctx.fillStyle = filled ? '#ff007f' : 'rgba(255, 0, 127, 0.2)';
            ctx.strokeStyle = '#ff007f';
            ctx.lineWidth = 1;
            ctx.fillRect(20 + i * 24, 52, 18, 8);
            ctx.strokeRect(20 + i * 24, 52, 18, 8);
        }
        ctx.fillStyle = '#ff007f';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText('DASH [SPACE]', 20 + this.player.dashChargesMax * 24 + 10, 60);

        // Dual Physics Frame Indicator
        ctx.fillStyle = this.player.physicsFrame === 'KINEMATIC' ? '#39ff14' : '#ffaa00';
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.fillText(`PHYSICS: ${this.player.physicsFrame} FRAME [Z to toggle]`, 20, 84);

        // Biome & Coordinates Indicator (Top-Center)
        const currentBiome = this.grid.getBiomeAt(this.player.pos.x, this.player.pos.y);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00ffea';
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.fillText(`COORD: (${Math.round(this.player.pos.x)}, ${Math.round(this.player.pos.y)}) — [${currentBiome}]`, this.width / 2, 30);

        if (this.state === 'COMBAT') {
            ctx.fillStyle = '#ff007f';
            ctx.font = 'bold 18px "Outfit", sans-serif';
            ctx.fillText(`GRID LOCKDOWN: WAVE ${this.currentWave}`, this.width / 2, 54);
            if (this.activeBoss) {
                ctx.fillStyle = '#ff0033';
                ctx.font = 'bold 14px "JetBrains Mono", monospace';
                ctx.fillText(`ALERT: ${this.activeBoss.name} ACTIVE`, this.width / 2, 74);
            }
        } else if (this.state === 'HUB') {
            ctx.fillStyle = '#39ff14';
            ctx.font = 'bold 16px "Outfit", sans-serif';
            ctx.fillText('THE ORIGIN POINT (0,0) — SECURE MATRIX HUB', this.width / 2, 54);
        }

        // Multiplier & Score (Top-Right)
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 22px "JetBrains Mono", monospace';
        ctx.fillText(`SCORE: ${this.score}`, this.width - 20, 36);

        ctx.fillStyle = this.multiplier > 1.5 ? '#ffaa00' : '#888888';
        ctx.font = 'bold 15px "JetBrains Mono", monospace';
        ctx.fillText(`MULTIPLIER: x${this.multiplier.toFixed(1)}`, this.width - 20, 60);

        ctx.fillStyle = '#39ff14';
        ctx.font = '13px "JetBrains Mono", monospace';
        ctx.fillText(`VERTICES: ${this.meta.vertices}`, this.width - 20, 82);

        // Weapon Loadout & Combat Mode (Bottom-Left)
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(0, 15, 30, 0.75)';
        ctx.fillRect(20, this.height - 92, 370, 78);
        ctx.strokeStyle = this.combatMode === 'MELEE' ? '#ff007f' : '#00ffea';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(20, this.height - 92, 370, 78);

        // Combat Mode Header
        ctx.fillStyle = this.combatMode === 'MELEE' ? '#ff007f' : '#00ffea';
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillText(`[V] COMBAT MODE: ${this.combatMode === 'MELEE' ? '⚔ MELEE (SLASH & DEFLECT)' : '🏹 RANGED (AIM & FIRE)'}`, 30, this.height - 74);

        this.weapons.forEach((wId, idx) => {
            const def = WEAPON_DEFS[wId];
            const isActive = idx === this.activeWeaponIdx;
            const yPos = this.height - 54 + idx * 18;

            // Draw weapon icon
            if (spriteManager && def.icon) {
                spriteManager.drawWeapon(ctx, def.icon, 38, yPos - 3, 0, 0.55, isActive ? def.color : null);
            }

            ctx.fillStyle = isActive ? def.color : '#666666';
            ctx.font = (isActive ? 'bold 12px' : '11px') + ' "JetBrains Mono", monospace';
            const statText = this.combatMode === 'MELEE' ? `Melee ${def.meleeDmg} DMG` : `${def.type} (${def.baseDmg} DMG)`;
            ctx.fillText(`[${idx + 1}] ${def.name} — ${statText}`, 54, yPos);
        });

        // Traps Indicator (Bottom-Right)
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(0, 15, 30, 0.7)';
        ctx.fillRect(this.width - 280, this.height - 70, 260, 50);
        ctx.strokeRect(this.width - 280, this.height - 70, 260, 50);

        this.traps.forEach((tId, idx) => {
            const def = TRAP_DEFS[tId];
            ctx.fillStyle = def.color;
            ctx.font = 'bold 12px "JetBrains Mono", monospace';
            const charges = this.trapCharges[idx];
            ctx.fillText(`[E] ${def.name} : ${charges}/3 Charges`, this.width - 30, this.height - 48 + idx * 18);
        });

        // INTERSECTION PAUSE MODAL OVERLAY
        if (this.state === 'INTERSECTION_PAUSE' && this.pendingDrop) {
            this.renderIntersectionPauseModal(ctx);
        }

        // GAME OVER MODAL OVERLAY
        if (this.state === 'GAME_OVER') {
            this.renderGameOverModal(ctx);
        }

        ctx.restore();
    }

    renderIntersectionPauseModal(ctx) {
        ctx.fillStyle = 'rgba(2, 6, 18, 0.88)';
        ctx.fillRect(0, 0, this.width, this.height);

        const drop = this.pendingDrop;
        const def = drop.type === 'WEAPON' ? WEAPON_DEFS[drop.id] : TRAP_DEFS[drop.id];

        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00ffea';
        ctx.font = 'bold 28px "Outfit", sans-serif';
        ctx.fillText('INTERSECTION PAUSE — TRAJECTORY ANALYSIS', this.width / 2, this.height / 2 - 120);

        ctx.fillStyle = def.color;
        ctx.font = 'bold 22px "JetBrains Mono", monospace';
        ctx.fillText(`DISCOVERED: ${def.name} [${def.grade || 'TRAP'}]`, this.width / 2, this.height / 2 - 70);

        ctx.fillStyle = '#cccccc';
        ctx.font = '15px "JetBrains Mono", monospace';
        ctx.fillText(def.desc, this.width / 2, this.height / 2 - 30);

        // Options: Swap vs Scrap
        ctx.fillStyle = '#39ff14';
        ctx.font = 'bold 18px "JetBrains Mono", monospace';
        ctx.fillText('[E] SWAP — EQUIP ITEM INTO ACTIVE LOADOUT', this.width / 2, this.height / 2 + 40);

        ctx.fillStyle = '#ff007f';
        ctx.fillText(`[X] SCRAP — CONVERT TO +${def.scrapValue} VERTICES`, this.width / 2, this.height / 2 + 80);

        ctx.restore();
    }

    renderGameOverModal(ctx) {
        ctx.fillStyle = 'rgba(10, 0, 5, 0.9)';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff0055';
        ctx.font = 'bold 36px "Outfit", sans-serif';
        ctx.fillText('ORIGIN DEVIATION — MATRIX COMPROMISED', this.width / 2, this.height / 2 - 90);

        ctx.fillStyle = '#ffffff';
        ctx.font = '16px "JetBrains Mono", monospace';
        ctx.fillText(`SURVIVED TO WAVE ${this.currentWave} | RECORD WAVE: ${this.recordWave}`, this.width / 2, this.height / 2 - 40);
        ctx.fillText(`FINAL SCORE: ${this.score}`, this.width / 2, this.height / 2 - 10);

        ctx.fillStyle = '#39ff14';
        ctx.font = 'bold 18px "JetBrains Mono", monospace';
        ctx.fillText(`VERTICES CONVERTED TO PRIME MATRICES: +${Math.floor(this.meta.runVertices / 10)} [TOTAL: ${this.meta.primeMatrices}]`, this.width / 2, this.height / 2 + 35);

        ctx.fillStyle = '#00ffea';
        ctx.fillText('CLICK TO RESPAWN AT (0,0) ORIGIN HUB', this.width / 2, this.height / 2 + 90);
        ctx.restore();
    }

    loop(timestamp) {
        const rawDt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;

        this.update(rawDt);
        this.render();

        requestAnimationFrame(this.loop.bind(this));
    }
}

