import type { BiomeDefinition } from './types';

/**
 * 16-bit Chiptune Web Audio Synthesizer for Sanctum of Echoes.
 * Generates zero-dependency authentic Zelda-inspired SFX (sword swing, puzzle chime,
 * chest fanfare, door unlock, boomerang whoosh, fireball, explosion) and ambient dungeon BGM.
 */
class SoundEngine {
	private ctx: AudioContext | null = null;
	private masterGain: GainNode | null = null;
	private bgmGain: GainNode | null = null;
	private sfxGain: GainNode | null = null;
	private muted = false;
	private bgmTimer: number | null = null;
	private bgmStep = 0;
	private activeBiome: BiomeDefinition | null = null;

	private ensureContext(): AudioContext | null {
		if (typeof window === 'undefined') return null;
		if (!this.ctx) {
			const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			if (!AudioCtx) return null;
			this.ctx = new AudioCtx();
			this.masterGain = this.ctx.createGain();
			this.masterGain.gain.value = this.muted ? 0 : 0.6;
			this.masterGain.connect(this.ctx.destination);

			this.bgmGain = this.ctx.createGain();
			this.bgmGain.gain.value = 0.22;
			this.bgmGain.connect(this.masterGain);

			this.sfxGain = this.ctx.createGain();
			this.sfxGain.gain.value = 0.55;
			this.sfxGain.connect(this.masterGain);
		}
		if (this.ctx.state === 'suspended') {
			void this.ctx.resume();
		}
		return this.ctx;
	}

	unlock(): void {
		this.ensureContext();
	}

	setMuted(muted: boolean): void {
		this.muted = muted;
		if (this.masterGain && this.ctx) {
			this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.6, this.ctx.currentTime, 0.02);
		}
	}

	isMuted(): boolean {
		return this.muted;
	}

	private playTone(
		freq: number,
		duration: number,
		type: OscillatorType,
		volume: number,
		delay = 0,
		slideTo?: number,
		destination?: GainNode | null
	): void {
		const ctx = this.ensureContext();
		if (!ctx || this.muted) return;
		const dest = destination ?? this.sfxGain;
		if (!dest) return;

		const now = ctx.currentTime + delay;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = type;
		osc.frequency.setValueAtTime(freq, now);
		if (slideTo !== undefined) {
			osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
		}

		gain.gain.setValueAtTime(0.0001, now);
		gain.gain.linearRampToValueAtTime(volume, now + 0.008);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

		osc.connect(gain);
		gain.connect(dest);

		osc.start(now);
		osc.stop(now + duration + 0.02);
	}

	private playNoise(duration: number, volume: number, delay = 0, filterFreq = 1200): void {
		const ctx = this.ensureContext();
		if (!ctx || this.muted || !this.sfxGain) return;

		const now = ctx.currentTime + delay;
		const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
		const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}

		const src = ctx.createBufferSource();
		src.buffer = buffer;

		const filter = ctx.createBiquadFilter();
		filter.type = 'bandpass';
		filter.frequency.setValueAtTime(filterFreq, now);
		filter.Q.value = 1.2;

		const gain = ctx.createGain();
		gain.gain.setValueAtTime(volume, now);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

		src.connect(filter);
		filter.connect(gain);
		gain.connect(this.sfxGain);

		src.start(now);
		src.stop(now + duration + 0.01);
	}

	// ---- GAMEPLAY SFX ----

	swordSwing(): void {
		this.playNoise(0.09, 0.32, 0, 2200);
		this.playTone(540, 0.075, 'triangle', 0.2, 0, 170);
	}

	enemyHit(): void {
		this.playTone(220, 0.07, 'square', 0.25, 0, 95);
		this.playNoise(0.06, 0.25, 0, 900);
	}

	shieldClink(): void {
		this.playTone(1240, 0.07, 'square', 0.22, 0, 960);
		this.playTone(1860, 0.09, 'triangle', 0.18, 0.01, 1480);
	}

	enemyDefeat(): void {
		this.playTone(320, 0.08, 'square', 0.22, 0, 140);
		this.playTone(240, 0.12, 'sawtooth', 0.2, 0.06, 70);
		this.playNoise(0.14, 0.25, 0.04, 650);
	}

	playerHurt(): void {
		this.playTone(280, 0.11, 'sawtooth', 0.3, 0, 110);
		this.playTone(190, 0.16, 'square', 0.28, 0.06, 85);
	}

	dash(): void {
		this.playNoise(0.11, 0.22, 0, 1600);
		this.playTone(280, 0.09, 'sine', 0.15, 0, 520);
	}

	blockPush(): void {
		this.playNoise(0.16, 0.25, 0, 320);
		this.playTone(95, 0.15, 'triangle', 0.25, 0, 72);
	}

	crystalToggle(): void {
		this.playTone(660, 0.08, 'triangle', 0.24, 0);
		this.playTone(990, 0.12, 'square', 0.2, 0.055);
	}

	brazierIgnite(): void {
		this.playNoise(0.18, 0.28, 0, 1400);
		this.playTone(330, 0.12, 'sawtooth', 0.18, 0, 620);
	}

	boomerangThrow(): void {
		this.playTone(420, 0.12, 'triangle', 0.18, 0, 740);
		this.playTone(700, 0.12, 'triangle', 0.14, 0.08, 380);
	}

	fireballCast(): void {
		this.playNoise(0.14, 0.26, 0, 1900);
		this.playTone(460, 0.13, 'sawtooth', 0.2, 0, 180);
	}

	bombPlace(): void {
		this.playTone(180, 0.08, 'triangle', 0.22, 0, 120);
	}

	bombExplode(): void {
		this.playNoise(0.38, 0.5, 0, 360);
		this.playTone(120, 0.32, 'sawtooth', 0.35, 0, 34);
		this.playTone(80, 0.36, 'square', 0.25, 0.02, 28);
	}

	pickupHeart(): void {
		this.playTone(587.33, 0.08, 'triangle', 0.24, 0);
		this.playTone(880.0, 0.14, 'triangle', 0.24, 0.07);
	}

	pickupGem(): void {
		this.playTone(987.77, 0.06, 'square', 0.18, 0);
		this.playTone(1318.51, 0.11, 'square', 0.18, 0.055);
	}

	pickupKey(): void {
		const notes = [659.25, 783.99, 1046.5, 1318.51];
		notes.forEach((n, idx) => {
			this.playTone(n, 0.1, 'square', 0.2, idx * 0.06);
		});
	}

	doorUnlock(): void {
		this.playTone(260, 0.09, 'square', 0.24, 0, 340);
		this.playTone(520, 0.16, 'triangle', 0.26, 0.08, 780);
	}

	doorSlam(): void {
		this.playNoise(0.12, 0.3, 0, 420);
		this.playTone(110, 0.14, 'square', 0.28, 0, 55);
	}

	/** Classic iconic rising secret/puzzle solved chime! */
	puzzleSolved(): void {
		const notes = [392.0, 369.99, 311.13, 220.0, 207.65, 329.63, 415.3, 523.25];
		notes.forEach((freq, i) => {
			this.playTone(freq, 0.14, 'square', 0.2, i * 0.085);
			this.playTone(freq * 0.5, 0.14, 'triangle', 0.16, i * 0.085);
		});
	}

	/** Triumphant treasure chest fanfare! */
	chestFanfare(): void {
		const melody = [
			{ f: 440.0, t: 0.0, d: 0.12 },
			{ f: 493.88, t: 0.12, d: 0.12 },
			{ f: 523.25, t: 0.24, d: 0.12 },
			{ f: 587.33, t: 0.36, d: 0.14 },
			{ f: 659.25, t: 0.5, d: 0.38 }
		];
		for (const n of melody) {
			this.playTone(n.f, n.d, 'square', 0.22, n.t);
			this.playTone(n.f * 0.5, n.d, 'triangle', 0.2, n.t);
		}
	}

	stairsDescend(): void {
		const notes = [523.25, 493.88, 440.0, 392.0, 329.63, 293.66, 220.0];
		notes.forEach((f, i) => {
			this.playTone(f, 0.12, 'triangle', 0.22, i * 0.065);
		});
	}

	gameOver(): void {
		const notes = [392.0, 369.99, 349.23, 329.63, 261.63];
		notes.forEach((f, i) => {
			this.playTone(f, i === notes.length - 1 ? 0.5 : 0.18, 'sawtooth', 0.2, i * 0.18);
		});
	}

	// ---- PROCEDURAL DUNGEON BGM ----

	startBgm(biome: BiomeDefinition): void {
		this.activeBiome = biome;
		this.stopBgm();
		if (typeof window === 'undefined') return;

		const stepMs = Math.round((60 / biome.bgmTempo / 2) * 1000); // 8th notes
		const bassPattern = [0, -1, 0, 3, 2, -1, 4, 3, 0, -1, 0, 5, 4, -1, 3, 2];
		const leadPattern = [-1, 5, 7, 6, 5, -1, 4, 5, -1, 7, 9, 8, 7, -1, 5, 4];

		this.bgmStep = 0;
		this.bgmTimer = window.setInterval(() => {
			if (this.muted || !this.activeBiome || !this.ctx || this.ctx.state !== 'running') return;
			const scale = this.activeBiome.bgmScale;
			const i = this.bgmStep % 16;

			const bassIdx = bassPattern[i];
			if (bassIdx >= 0 && bassIdx < scale.length) {
				this.playTone(scale[bassIdx] * 0.5, stepMs / 1000 * 0.9, 'triangle', 0.24, 0, undefined, this.bgmGain);
			}

			// Play lead arpeggio on alternating bars for atmospheric dungeon breathing room
			const bar = Math.floor(this.bgmStep / 16) % 4;
			const leadIdx = leadPattern[i];
			if (bar !== 3 && leadIdx >= 0 && leadIdx < scale.length) {
				const octaveShift = bar === 2 ? 1.0 : 1.0;
				this.playTone(
					scale[leadIdx] * octaveShift,
					stepMs / 1000 * 0.72,
					'square',
					0.1,
					0,
					undefined,
					this.bgmGain
				);
			}

			this.bgmStep++;
		}, stepMs);
	}

	stopBgm(): void {
		if (this.bgmTimer !== null && typeof window !== 'undefined') {
			window.clearInterval(this.bgmTimer);
			this.bgmTimer = null;
		}
	}
}

export const sound = new SoundEngine();
