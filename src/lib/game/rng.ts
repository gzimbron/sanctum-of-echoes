/**
 * Deterministic seeded PRNG (Mulberry32) + string seed hashing.
 * Ensures every generated dungeon floor is reproducible and shareable by seed.
 */
export function hashSeed(input: string | number): number {
	if (typeof input === 'number' && Number.isFinite(input)) {
		return (input >>> 0) || 0x9e3779b9;
	}
	const str = String(input).trim() || 'SANCTUM';
	let h = 2166136261 >>> 0;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return (h >>> 0) || 0x9e3779b9;
}

export function generateRandomSeedCode(): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	let out = '';
	for (let i = 0; i < 6; i++) {
		out += chars[Math.floor(Math.random() * chars.length)];
	}
	return out;
}

export class SeededRng {
	private state: number;

	constructor(seed: number | string) {
		this.state = hashSeed(seed);
	}

	/** Returns float in [0, 1). */
	next(): number {
		let t = (this.state += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	/** Inclusive integer range [min, max]. */
	int(min: number, max: number): number {
		return Math.floor(this.next() * (max - min + 1)) + min;
	}

	chance(probability: number): boolean {
		return this.next() < probability;
	}

	pick<T>(items: readonly T[]): T {
		if (items.length === 0) {
			throw new Error('Cannot pick from an empty array');
		}
		return items[Math.floor(this.next() * items.length)];
	}

	shuffle<T>(items: readonly T[]): T[] {
		const arr = [...items];
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(this.next() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}
}
