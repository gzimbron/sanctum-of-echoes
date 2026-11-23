import { writable } from 'svelte/store';
import type { BiomeId, HudState, HudToast, RelicId, SavedRunState, ToolId } from '../types';
import { generateRandomSeedCode } from '../rng';

const RECORDS_STORAGE_KEY = 'sanctum_of_echoes_records_v1';
const SAVE_STORAGE_KEY = 'sanctum_of_echoes_save_v1';

const VALID_BIOMES = new Set<BiomeId>([
	'stone_sanctum',
	'ember_crypt',
	'verdant_ruins',
	'astral_vault'
]);
const VALID_TOOLS = new Set<ToolId>(['boomerang', 'fire_rod', 'bomb']);
const VALID_RELICS = new Set<RelicId>([
	'heart_container',
	'solar_blade',
	'gale_boots',
	'aegis_charm',
	'vampiric_ring'
]);

interface SavedRecords {
	bestFloor: number;
	bestScore: number;
	muted: boolean;
}

function loadRecords(): SavedRecords {
	if (typeof window === 'undefined') {
		return { bestFloor: 0, bestScore: 0, muted: false };
	}
	try {
		const raw = window.localStorage.getItem(RECORDS_STORAGE_KEY);
		if (!raw) return { bestFloor: 0, bestScore: 0, muted: false };
		const parsed = JSON.parse(raw) as Partial<SavedRecords>;
		return {
			bestFloor: typeof parsed.bestFloor === 'number' ? parsed.bestFloor : 0,
			bestScore: typeof parsed.bestScore === 'number' ? parsed.bestScore : 0,
			muted: Boolean(parsed.muted)
		};
	} catch {
		return { bestFloor: 0, bestScore: 0, muted: false };
	}
}

export function saveRecords(records: SavedRecords): void {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
	} catch {
		// ignore quota errors
	}
}

export function parseSavedRun(raw: string | null): SavedRunState | null {
	if (!raw) return null;
	try {
		const p = JSON.parse(raw) as Partial<SavedRunState>;
		if (p.version !== 1) return null;
		if (typeof p.seed !== 'string' || p.seed.trim().length === 0) return null;
		if (typeof p.floorNumber !== 'number' || !Number.isInteger(p.floorNumber) || p.floorNumber < 1) {
			return null;
		}
		if (typeof p.maxHp !== 'number' || p.maxHp < 2 || p.maxHp > 20) return null;
		if (typeof p.hp !== 'number' || p.hp < 1) return null;

		const biomeId: BiomeId = VALID_BIOMES.has(p.biomeId as BiomeId)
			? (p.biomeId as BiomeId)
			: 'stone_sanctum';
		const tools = Array.isArray(p.tools)
			? p.tools.filter((t): t is ToolId => VALID_TOOLS.has(t as ToolId))
			: [];
		const relics = Array.isArray(p.relics)
			? p.relics.filter((r): r is RelicId => VALID_RELICS.has(r as RelicId))
			: [];
		const equippedTool: ToolId | null =
			p.equippedTool && tools.includes(p.equippedTool as ToolId)
				? (p.equippedTool as ToolId)
				: (tools[0] ?? null);

		return {
			version: 1,
			seed: p.seed.trim().toUpperCase(),
			floorNumber: p.floorNumber,
			biomeId,
			hp: Math.min(p.maxHp, Math.max(1, Math.floor(p.hp))),
			maxHp: Math.floor(p.maxHp),
			gems: typeof p.gems === 'number' && p.gems >= 0 ? Math.floor(p.gems) : 0,
			score: typeof p.score === 'number' && p.score >= 0 ? Math.floor(p.score) : 0,
			roomsCleared: typeof p.roomsCleared === 'number' && p.roomsCleared >= 0 ? Math.floor(p.roomsCleared) : 0,
			puzzlesSolved: typeof p.puzzlesSolved === 'number' && p.puzzlesSolved >= 0 ? Math.floor(p.puzzlesSolved) : 0,
			enemiesDefeated:
				typeof p.enemiesDefeated === 'number' && p.enemiesDefeated >= 0 ? Math.floor(p.enemiesDefeated) : 0,
			tools,
			equippedTool,
			relics,
			savedAt: typeof p.savedAt === 'number' ? p.savedAt : Date.now()
		};
	} catch {
		return null;
	}
}

export function loadSavedRun(): SavedRunState | null {
	if (typeof window === 'undefined') return null;
	try {
		return parseSavedRun(window.localStorage.getItem(SAVE_STORAGE_KEY));
	} catch {
		return null;
	}
}

function persistSavedRun(run: SavedRunState | null): void {
	if (typeof window === 'undefined') return;
	try {
		if (run === null) {
			window.localStorage.removeItem(SAVE_STORAGE_KEY);
		} else {
			window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(run));
		}
	} catch {
		// ignore quota errors
	}
}

const initialRecords = loadRecords();
const initialSavedRun = loadSavedRun();

export const INITIAL_HUD_STATE: HudState = {
	phase: 'title',
	floorNumber: initialSavedRun?.floorNumber ?? 1,
	biomeId: initialSavedRun?.biomeId ?? 'stone_sanctum',
	biomeName: 'Stone Sanctum',
	biomeSubtitle: 'Mossy Halls of the First Keep',
	biomeAccent: '#58f2c8',
	seed: initialSavedRun?.seed ?? generateRandomSeedCode(),
	hp: 6,
	maxHp: 6,
	keys: 0,
	gems: 0,
	score: 0,
	roomsCleared: 0,
	puzzlesSolved: 0,
	enemiesDefeated: 0,
	tools: [],
	equippedTool: null,
	relics: [],
	roomLabel: 'Entry Hall',
	roomHint: 'Explore the sanctum, find the Floor Key, and unlock the stairs.',
	minimap: [],
	bestFloor: initialRecords.bestFloor,
	bestScore: initialRecords.bestScore,
	muted: initialRecords.muted,
	toast: null,
	newRecord: false,
	savedRun: initialSavedRun
};

function createHudStore() {
	const { subscribe, update } = writable<HudState>(INITIAL_HUD_STATE);
	let toastCounter = 0;
	let toastTimer: number | null = null;

	return {
		subscribe,
		patch(partial: Partial<HudState>) {
			update((state) => {
				let bestFloor = state.bestFloor;
				let bestScore = state.bestScore;
				let newRecord = partial.newRecord ?? state.newRecord;
				const nextFloor = partial.floorNumber ?? state.floorNumber;
				const nextScore = partial.score ?? state.score;
				let changedRecords = false;

				const activePhase = partial.phase ?? state.phase;
				const trackRecords = activePhase === 'playing' || activePhase === 'gameover';

				if (trackRecords && nextFloor > bestFloor) {
					bestFloor = nextFloor;
					changedRecords = true;
				}
				if (trackRecords && nextScore > bestScore) {
					bestScore = nextScore;
					newRecord = true;
					changedRecords = true;
				}
				const nextMuted = partial.muted ?? state.muted;
				if (nextMuted !== state.muted) {
					changedRecords = true;
				}
				if (changedRecords) {
					saveRecords({ bestFloor, bestScore, muted: nextMuted });
				}

				return {
					...state,
					...partial,
					bestFloor,
					bestScore,
					newRecord
				};
			});
		},
		saveCheckpoint(snapshot: SavedRunState) {
			persistSavedRun(snapshot);
			update((s) => ({ ...s, savedRun: snapshot }));
		},
		clearCheckpoint() {
			persistSavedRun(null);
			update((s) => ({ ...s, savedRun: null }));
		},
		showToast(
			title: string,
			subtitle?: string,
			accent: HudToast['accent'] = 'gold',
			durationMs = 2600,
			iconFrame?: number
		) {
			const id = ++toastCounter;
			update((s) => ({ ...s, toast: { id, title, subtitle, accent, iconFrame } }));
			if (typeof window !== 'undefined') {
				if (toastTimer !== null) window.clearTimeout(toastTimer);
				toastTimer = window.setTimeout(() => {
					update((s) => (s.toast?.id === id ? { ...s, toast: null } : s));
				}, durationMs);
			}
		},
		resetForRun(seed: string) {
			update((s) => ({
				...INITIAL_HUD_STATE,
				phase: 'playing',
				seed,
				bestFloor: s.bestFloor,
				bestScore: s.bestScore,
				muted: s.muted,
				savedRun: s.savedRun,
				newRecord: false
			}));
		}
	};
}

export const hudStore = createHudStore();
