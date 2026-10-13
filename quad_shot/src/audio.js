// Quad Shot — Retro-Futuristic Vector Audio Synthesizer (Web Audio API)
// Pure procedural synth - zero external asset dependencies

export class SoundEngine {
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

export const audio = new SoundEngine();
