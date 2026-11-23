export const ROOM_COLS = 15;
export const ROOM_ROWS = 11;
export const TILE_SIZE = 16;
export const ROOM_WIDTH = ROOM_COLS * TILE_SIZE; // 240
export const ROOM_HEIGHT = ROOM_ROWS * TILE_SIZE; // 176

export type CardinalDir = 'north' | 'south' | 'east' | 'west';
export type FacingDir = 'down' | 'up' | 'left' | 'right';

export type BiomeId = 'stone_sanctum' | 'ember_crypt' | 'verdant_ruins' | 'astral_vault';

export interface BiomeDefinition {
	id: BiomeId;
	name: string;
	subtitle: string;
	tileRow: number;
	bgHex: string;
	accentHex: string;
	ambientLightHex: string;
	bgmScale: number[];
	bgmTempo: number;
}

export type ToolId = 'boomerang' | 'fire_rod' | 'bomb';

export type RelicId =
	| 'heart_container'
	| 'solar_blade'
	| 'gale_boots'
	| 'aegis_charm'
	| 'vampiric_ring';

export interface RelicMeta {
	id: RelicId;
	name: string;
	description: string;
	shortTag: string;
}

export const RELIC_CATALOG: Record<RelicId, RelicMeta> = {
	heart_container: {
		id: 'heart_container',
		name: 'Heart Vessel',
		description: '+1 Max Heart & restores full vitality.',
		shortTag: '+1 HP'
	},
	solar_blade: {
		id: 'solar_blade',
		name: 'Solar Edge',
		description: 'Infuses your blade with +1 attack damage.',
		shortTag: '+1 ATK'
	},
	gale_boots: {
		id: 'gale_boots',
		name: 'Gale Boots',
		description: 'Faster movement and quicker dash recovery.',
		shortTag: '+SPD'
	},
	aegis_charm: {
		id: 'aegis_charm',
		name: 'Aegis Charm',
		description: 'Wider sword arc and extended dash invulnerability.',
		shortTag: '+ARC'
	},
	vampiric_ring: {
		id: 'vampiric_ring',
		name: 'Crimson Band',
		description: 'Restores half a heart when clearing hostile rooms.',
		shortTag: 'HEAL'
	}
};

export interface ToolMeta {
	id: ToolId;
	name: string;
	description: string;
	hotkey: string;
	frameIndex: number;
}

export const TOOL_CATALOG: Record<ToolId, ToolMeta> = {
	boomerang: {
		id: 'boomerang',
		name: 'Gale Boomerang',
		description: 'Stuns enemies, flips crystal switches across gaps, and retrieves pickups.',
		hotkey: '1',
		frameIndex: 22
	},
	fire_rod: {
		id: 'fire_rod',
		name: 'Ember Rod',
		description: 'Launches searing fireballs that ignite braziers and burn foes.',
		hotkey: '2',
		frameIndex: 23
	},
	bomb: {
		id: 'bomb',
		name: 'Sanctum Bombs',
		description: 'Blasts cracked stone walls and deals heavy area damage.',
		hotkey: '3',
		frameIndex: 24
	}
};

export type RoomType = 'start' | 'combat' | 'puzzle' | 'treasure' | 'key' | 'exit';

export type PuzzleType =
	| 'none'
	| 'combat_clear'
	| 'block_plate'
	| 'crystal_gate'
	| 'light_braziers'
	| 'bomb_vault'
	| 'spike_trial';

export type EnemyKind = 'slime' | 'knight' | 'wizzrobe' | 'guardian';

export type ChestReward =
	| { kind: 'key' }
	| { kind: 'tool'; tool: ToolId }
	| { kind: 'relic'; relic: RelicId }
	| { kind: 'gems'; amount: number }
	| { kind: 'hearts'; amount: number };

export interface DoorSpec {
	targetRoomId: string;
	locked: boolean;
	barred: boolean;
}

export interface PushBlockSpec {
	col: number;
	row: number;
}

export interface CrackedBlockSpec {
	col: number;
	row: number;
}

export interface BrazierSpec {
	col: number;
	row: number;
	lit: boolean;
}

export interface CrystalSwitchSpec {
	col: number;
	row: number;
}

export interface ToggleBarrierSpec {
	col: number;
	row: number;
	color: 'blue' | 'red';
}

export interface ChestSpec {
	id: string;
	col: number;
	row: number;
	ornate: boolean;
	hiddenUntilSolved: boolean;
	reward: ChestReward;
	opened: boolean;
}

export interface EnemySpawnSpec {
	id: string;
	col: number;
	row: number;
	kind: EnemyKind;
	elite?: boolean;
}

export interface SpikeSpec {
	col: number;
	row: number;
	phaseOffset: number;
}

export enum TileCode {
	FloorA = 0,
	FloorB = 1,
	FloorC = 2,
	Medallion = 3,
	WallTop = 4,
	WallFront = 5,
	Pillar = 6,
	Pit = 7,
	Hazard = 8,
	PlateUnpressed = 9,
	PlatePressed = 10,
	StairsDown = 11,
	SpikesRetracted = 12,
	SpikesExtended = 13,
	DoorFloor = 14,
	LockedSeal = 15
}

export interface RoomData {
	id: string;
	gx: number;
	gy: number;
	type: RoomType;
	puzzle: PuzzleType;
	templateId: string;
	tiles: number[][]; // [row][col] -> TileCode
	doors: Partial<Record<CardinalDir, DoorSpec>>;
	pushBlocks: PushBlockSpec[];
	crackedBlocks: CrackedBlockSpec[];
	braziers: BrazierSpec[];
	crystalSwitches: CrystalSwitchSpec[];
	toggleBarriers: ToggleBarrierSpec[];
	chests: ChestSpec[];
	enemies: EnemySpawnSpec[];
	spikes: SpikeSpec[];
	discovered: boolean;
	cleared: boolean;
	puzzleSolved: boolean;
	crystalState: 'blue' | 'red';
	hasGuardian?: boolean;
}

export interface FloorData {
	floorNumber: number;
	seed: number;
	biome: BiomeDefinition;
	rooms: Record<string, RoomData>;
	startRoomId: string;
	keyRoomId: string;
	treasureRoomId: string | null;
	exitRoomId: string;
}

export interface MinimapRoomInfo {
	id: string;
	gx: number;
	gy: number;
	type: RoomType;
	discovered: boolean;
	cleared: boolean;
	current: boolean;
	hasUnopenedChest: boolean;
	doors: {
		dir: CardinalDir;
		locked: boolean;
		barred: boolean;
	}[];
}

export interface HudToast {
	id: number;
	title: string;
	subtitle?: string;
	accent?: 'gold' | 'emerald' | 'crimson' | 'cyan';
	iconFrame?: number;
}

export interface SavedRunState {
	version: 1;
	seed: string;
	floorNumber: number;
	biomeId: BiomeId;
	hp: number;
	maxHp: number;
	gems: number;
	score: number;
	roomsCleared: number;
	puzzlesSolved: number;
	enemiesDefeated: number;
	tools: ToolId[];
	equippedTool: ToolId | null;
	relics: RelicId[];
	savedAt: number;
}

export interface HudState {
	phase: 'title' | 'playing' | 'paused' | 'gameover';
	floorNumber: number;
	biomeId: BiomeId;
	biomeName: string;
	biomeSubtitle: string;
	biomeAccent: string;
	seed: string;
	hp: number; // half-hearts (e.g., 6 = 3 full hearts)
	maxHp: number;
	keys: number;
	gems: number;
	score: number;
	roomsCleared: number;
	puzzlesSolved: number;
	enemiesDefeated: number;
	tools: ToolId[];
	equippedTool: ToolId | null;
	relics: RelicId[];
	roomLabel: string;
	roomHint: string;
	minimap: MinimapRoomInfo[];
	bestFloor: number;
	bestScore: number;
	muted: boolean;
	toast: HudToast | null;
	newRecord: boolean;
	savedRun: SavedRunState | null;
}
