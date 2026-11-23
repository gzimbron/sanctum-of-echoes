import {
	ROOM_COLS,
	ROOM_ROWS,
	TileCode,
	type BrazierSpec,
	type ChestReward,
	type ChestSpec,
	type CrackedBlockSpec,
	type CrystalSwitchSpec,
	type EnemyKind,
	type EnemySpawnSpec,
	type PuzzleType,
	type PushBlockSpec,
	type SpikeSpec,
	type ToggleBarrierSpec,
	type ToolId
} from '../types';
import type { SeededRng } from '../rng';

export interface RoomTemplateResult {
	templateId: string;
	puzzle: PuzzleType;
	tiles: number[][];
	pushBlocks: PushBlockSpec[];
	crackedBlocks: CrackedBlockSpec[];
	braziers: BrazierSpec[];
	crystalSwitches: CrystalSwitchSpec[];
	toggleBarriers: ToggleBarrierSpec[];
	chests: ChestSpec[];
	enemies: EnemySpawnSpec[];
	spikes: SpikeSpec[];
	crystalState: 'blue' | 'red';
}

export function createBaseRoomTiles(rng: SeededRng): number[][] {
	const tiles: number[][] = [];
	for (let r = 0; r < ROOM_ROWS; r++) {
		const row: number[] = [];
		for (let c = 0; c < ROOM_COLS; c++) {
			if (r === 0) {
				row.push(TileCode.WallFront);
			} else if (r === ROOM_ROWS - 1 || c === 0 || c === ROOM_COLS - 1) {
				row.push(TileCode.WallTop);
			} else {
				const roll = rng.next();
				if (roll < 0.62) row.push(TileCode.FloorA);
				else if (roll < 0.88) row.push(TileCode.FloorB);
				else row.push(TileCode.FloorC);
			}
		}
		tiles.push(row);
	}
	return tiles;
}

function emptyResult(templateId: string, puzzle: PuzzleType, rng: SeededRng): RoomTemplateResult {
	return {
		templateId,
		puzzle,
		tiles: createBaseRoomTiles(rng),
		pushBlocks: [],
		crackedBlocks: [],
		braziers: [],
		crystalSwitches: [],
		toggleBarriers: [],
		chests: [],
		enemies: [],
		spikes: [],
		crystalState: 'blue'
	};
}

function pickEnemyKind(floorNumber: number, rng: SeededRng): EnemyKind {
	const roll = rng.next();
	if (floorNumber === 1) {
		return roll < 0.7 ? 'slime' : 'knight';
	}
	if (floorNumber === 2) {
		if (roll < 0.45) return 'slime';
		if (roll < 0.8) return 'knight';
		return 'wizzrobe';
	}
	if (roll < 0.3) return 'slime';
	if (roll < 0.65) return 'knight';
	return 'wizzrobe';
}

/** Start Room: Warm ceremonial foyer with medallion & lit corner braziers. */
export function buildStartRoom(rng: SeededRng): RoomTemplateResult {
	const res = emptyResult('start_hall', 'none', rng);
	res.tiles[5][7] = TileCode.Medallion;
	res.tiles[4][7] = TileCode.FloorA;
	res.tiles[6][7] = TileCode.FloorA;
	res.tiles[5][6] = TileCode.FloorA;
	res.tiles[5][8] = TileCode.FloorA;
	// Atmospheric lit corner braziers (kept clear of doorway aprons)
	res.braziers.push(
		{ col: 3, row: 2, lit: true },
		{ col: 11, row: 2, lit: true },
		{ col: 3, row: 8, lit: true },
		{ col: 11, row: 8, lit: true }
	);
	return res;
}

/** Treasure Shrine: Ornate chest on a decorative pedestal flanked by pillars & braziers. */
export function buildTreasureRoom(
	roomId: string,
	reward: ChestReward,
	rng: SeededRng
): RoomTemplateResult {
	const res = emptyResult('treasure_shrine', 'none', rng);
	for (let r = 4; r <= 6; r++) {
		for (let c = 6; c <= 8; c++) {
			res.tiles[r][c] = TileCode.Medallion;
		}
	}
	res.tiles[2][4] = TileCode.Pillar;
	res.tiles[2][10] = TileCode.Pillar;
	res.tiles[8][4] = TileCode.Pillar;
	res.tiles[8][10] = TileCode.Pillar;
	res.braziers.push(
		{ col: 5, row: 4, lit: true },
		{ col: 9, row: 4, lit: true },
		{ col: 5, row: 6, lit: true },
		{ col: 9, row: 6, lit: true }
	);
	res.chests.push({
		id: `${roomId}_treasure`,
		col: 7,
		row: 5,
		ornate: true,
		hiddenUntilSolved: false,
		reward,
		opened: false
	});
	return res;
}

/** Exit Sanctum: Glowing Stairs Down, guarded by a Sanctum Guardian every 3rd floor. */
export function buildExitRoom(
	roomId: string,
	floorNumber: number,
	rng: SeededRng
): { result: RoomTemplateResult; hasGuardian: boolean } {
	const hasGuardian = floorNumber % 3 === 0;
	const res = emptyResult(hasGuardian ? 'exit_guardian' : 'exit_sanctum', hasGuardian ? 'combat_clear' : 'none', rng);

	// Ceremonial tiles around center stairs
	for (let r = 4; r <= 6; r++) {
		for (let c = 6; c <= 8; c++) {
			res.tiles[r][c] = TileCode.Medallion;
		}
	}
	res.tiles[5][7] = TileCode.StairsDown;

	// Pillars & torches framing the sanctum
	res.tiles[2][3] = TileCode.Pillar;
	res.tiles[2][11] = TileCode.Pillar;
	res.tiles[8][3] = TileCode.Pillar;
	res.tiles[8][11] = TileCode.Pillar;
	res.braziers.push(
		{ col: 5, row: 3, lit: true },
		{ col: 9, row: 3, lit: true },
		{ col: 5, row: 7, lit: true },
		{ col: 9, row: 7, lit: true }
	);

	if (hasGuardian) {
		res.enemies.push({
			id: `${roomId}_guardian`,
			col: 7,
			row: 4,
			kind: 'guardian',
			elite: true
		});
		if (floorNumber >= 6) {
			res.enemies.push(
				{ id: `${roomId}_escort_1`, col: 4, row: 5, kind: 'wizzrobe' },
				{ id: `${roomId}_escort_2`, col: 10, row: 5, kind: 'knight' }
			);
		}
		// Defeating the Guardian spawns an ornate bonus relic chest!
		res.chests.push({
			id: `${roomId}_guardian_reward`,
			col: 7,
			row: 7,
			ornate: true,
			hiddenUntilSolved: true,
			reward: { kind: 'relic', relic: 'heart_container' },
			opened: false
		});
	} else {
		// Light ceremonial guards on deeper non-guardian floors
		const guardCount = floorNumber >= 2 ? 2 : 1;
		const spots: [number, number][] = [
			[4, 5],
			[10, 5]
		];
		for (let i = 0; i < guardCount; i++) {
			res.enemies.push({
				id: `${roomId}_guard_${i}`,
				col: spots[i][0],
				row: spots[i][1],
				kind: pickEnemyKind(floorNumber, rng)
			});
		}
		res.puzzle = 'combat_clear';
	}

	return { result: res, hasGuardian };
}

/** Combat Room Templates: Varied arena layouts with pillars/hazards & scaling squads. */
export function buildCombatRoom(
	roomId: string,
	floorNumber: number,
	rng: SeededRng,
	bonusChestReward?: ChestReward
): RoomTemplateResult {
	const variant = rng.int(0, 3);
	const res = emptyResult(`combat_arena_${variant}`, 'combat_clear', rng);

	let spawnCandidates: [number, number][] = [];

	if (variant === 0) {
		// Four-Pillar Coliseum
		res.tiles[3][4] = TileCode.Pillar;
		res.tiles[3][10] = TileCode.Pillar;
		res.tiles[7][4] = TileCode.Pillar;
		res.tiles[7][10] = TileCode.Pillar;
		res.tiles[5][7] = TileCode.Medallion;
		spawnCandidates = [
			[5, 3],
			[9, 3],
			[5, 7],
			[9, 7],
			[7, 5],
			[3, 5],
			[11, 5]
		];
	} else if (variant === 1) {
		// Twin Hazard Basins (great for Boomerang / Fire Rod kiting!)
		for (let r = 3; r <= 7; r++) {
			if (r !== 5) {
				res.tiles[r][4] = TileCode.Hazard;
				res.tiles[r][10] = TileCode.Hazard;
			}
		}
		spawnCandidates = [
			[6, 3],
			[8, 3],
			[6, 7],
			[8, 7],
			[7, 5],
			[2, 3],
			[12, 7]
		];
	} else if (variant === 2) {
		// Crosswalk Pit Arena
		for (const [c, r] of [
			[3, 3],
			[4, 3],
			[10, 3],
			[11, 3],
			[3, 7],
			[4, 7],
			[10, 7],
			[11, 7]
		]) {
			res.tiles[r][c] = TileCode.Pit;
		}
		spawnCandidates = [
			[6, 4],
			[8, 4],
			[6, 6],
			[8, 6],
			[7, 3],
			[7, 7]
		];
	} else {
		// Torchlit Crypt Brawl
		res.braziers.push(
			{ col: 4, row: 3, lit: true },
			{ col: 10, row: 3, lit: true },
			{ col: 4, row: 7, lit: true },
			{ col: 10, row: 7, lit: true }
		);
		res.tiles[5][5] = TileCode.Pillar;
		res.tiles[5][9] = TileCode.Pillar;
		spawnCandidates = [
			[7, 3],
			[7, 7],
			[3, 5],
			[11, 5],
			[6, 5],
			[8, 5]
		];
	}

	const enemyCount = Math.min(5, 2 + Math.floor((floorNumber + 1) / 2) + rng.int(0, 1));
	const chosenSpots = rng.shuffle(spawnCandidates).slice(0, enemyCount);

	chosenSpots.forEach(([col, row], i) => {
		const kind = pickEnemyKind(floorNumber, rng);
		const elite = floorNumber >= 3 && i === 0 && rng.chance(0.35);
		res.enemies.push({
			id: `${roomId}_e_${i}`,
			col,
			row,
			kind,
			elite
		});
	});

	if (bonusChestReward) {
		res.chests.push({
			id: `${roomId}_chest`,
			col: 7,
			row: 5,
			ornate: bonusChestReward.kind === 'key',
			hiddenUntilSolved: true,
			reward: bonusChestReward,
			opened: false
		});
	}

	return res;
}

/**
 * Handcrafted, 100% Solvable Zelda Puzzle Room Templates.
 * Filtered strictly by unlockedTools so the player is NEVER given an unsolvable room.
 */
export function buildPuzzleRoom(
	roomId: string,
	floorNumber: number,
	unlockedTools: ToolId[],
	reward: ChestReward,
	rng: SeededRng
): RoomTemplateResult {
	const available: PuzzleType[] = ['block_plate', 'crystal_gate', 'spike_trial'];
	if (unlockedTools.includes('fire_rod')) {
		available.push('light_braziers', 'light_braziers'); // weight nicely once unlocked
	}
	if (unlockedTools.includes('bomb')) {
		available.push('bomb_vault', 'bomb_vault');
	}

	const chosen = rng.pick(available);

	switch (chosen) {
		case 'block_plate':
			return buildBlockPlatePuzzle(roomId, floorNumber, reward, rng);
		case 'crystal_gate':
			return buildCrystalGatePuzzle(roomId, floorNumber, unlockedTools.includes('boomerang'), reward, rng);
		case 'light_braziers':
			return buildBrazierPuzzle(roomId, floorNumber, reward, rng);
		case 'bomb_vault':
			return buildBombVaultPuzzle(roomId, floorNumber, reward, rng);
		case 'spike_trial':
		default:
			return buildSpikeTrialPuzzle(roomId, floorNumber, reward, rng);
	}
}

/** Classic Zelda Push-Block onto Rune Pressure Plate(s). */
function buildBlockPlatePuzzle(
	roomId: string,
	floorNumber: number,
	reward: ChestReward,
	rng: SeededRng
): RoomTemplateResult {
	const dual = floorNumber >= 2 || rng.chance(0.45);
	const res = emptyResult(dual ? 'puzzle_block_dual' : 'puzzle_block_single', 'block_plate', rng);

	if (!dual) {
		// Single block with subtle pillar obstacle requiring 2-3 smart pushes
		res.tiles[3][5] = TileCode.Pillar;
		res.tiles[7][9] = TileCode.Pillar;
		res.tiles[5][10] = TileCode.PlateUnpressed;
		res.pushBlocks.push({ col: 5, row: 5 });
		// Decorative floor track hint
		res.tiles[5][6] = TileCode.Medallion;
		res.tiles[5][8] = TileCode.Medallion;
		res.chests.push({
			id: `${roomId}_puzzle_chest`,
			col: 7,
			row: 3,
			ornate: reward.kind === 'key',
			hiddenUntilSolved: true,
			reward,
			opened: false
		});
	} else {
		// Dual mirrored blocks -> twin rune plates!
		res.tiles[3][4] = TileCode.PlateUnpressed;
		res.tiles[7][10] = TileCode.PlateUnpressed;
		res.tiles[5][5] = TileCode.Pillar;
		res.tiles[5][9] = TileCode.Pillar;
		res.pushBlocks.push({ col: 4, row: 6 }, { col: 10, row: 4 });
		res.chests.push({
			id: `${roomId}_puzzle_chest`,
			col: 7,
			row: 5,
			ornate: reward.kind === 'key',
			hiddenUntilSolved: true,
			reward,
			opened: false
		});
	}

	// Add 1-2 light enemies to keep tension alive without interfering with block push
	if (floorNumber >= 2) {
		res.enemies.push({
			id: `${roomId}_pe_0`,
			col: 3,
			row: 3,
			kind: 'slime'
		});
	}

	return res;
}

/** Classic Zelda Crystal Switch & Toggle Blue/Red Barriers Sanctuary. */
function buildCrystalGatePuzzle(
	roomId: string,
	floorNumber: number,
	hasBoomerang: boolean,
	reward: ChestReward,
	rng: SeededRng
): RoomTemplateResult {
	const res = emptyResult(
		hasBoomerang ? 'puzzle_crystal_ranged' : 'puzzle_crystal_melee',
		'crystal_gate',
		rng
	);

	// Central treasure enclosure ringed by pillars & Blue toggle barriers!
	// Starts with crystalState = 'blue' (so blue barriers are RAISED blocking the chest).
	// Hitting the crystal switch flips to 'red' -> blue barriers LOWER, opening the chest!
	res.crystalState = 'blue';

	// Enclosure walls around (7,5)
	const pillarCoords: [number, number][] = [
		[5, 3],
		[6, 3],
		[8, 3],
		[9, 3],
		[5, 7],
		[6, 7],
		[8, 7],
		[9, 7],
		[5, 4],
		[5, 6],
		[9, 4],
		[9, 6]
	];
	for (const [c, r] of pillarCoords) {
		res.tiles[r][c] = TileCode.Pillar;
	}

	// Four blue barrier gates into the inner vault
	res.toggleBarriers.push(
		{ col: 7, row: 3, color: 'blue' },
		{ col: 7, row: 7, color: 'blue' },
		{ col: 5, row: 5, color: 'blue' },
		{ col: 9, row: 5, color: 'blue' }
	);

	// Red barriers guarding a shortcut corner (optional secondary flavor)
	res.toggleBarriers.push(
		{ col: 3, row: 3, color: 'red' },
		{ col: 11, row: 7, color: 'red' }
	);

	if (hasBoomerang) {
		// Crystal switch sits across a 1-tile chasm basin -> throw Boomerang!
		// (Also reachable via Dash across single hazard tile if clever!)
		for (let r = 2; r <= 4; r++) {
			for (let c = 10; c <= 12; c++) {
				if (!(c === 11 && r === 3)) {
					res.tiles[r][c] = TileCode.Hazard;
				}
			}
		}
		res.crystalSwitches.push({ col: 11, row: 3 });
	} else {
		// Melee-reachable crystal switch in the corner, guarded by a slime/knight
		res.crystalSwitches.push({ col: 3, row: 7 });
		res.crystalSwitches.push({ col: 11, row: 3 });
	}

	// Chest is already visible inside the barrier cage — once barriers lower, walk in & open!
	res.chests.push({
		id: `${roomId}_crystal_chest`,
		col: 7,
		row: 5,
		ornate: reward.kind === 'key',
		hiddenUntilSolved: false,
		reward,
		opened: false
	});

	res.enemies.push({
		id: `${roomId}_ce_0`,
		col: 3,
		row: 2,
		kind: floorNumber >= 2 ? 'knight' : 'slime'
	});

	return res;
}

/** Classic Zelda Brazier Lighting Puzzle (requires Ember Rod). */
function buildBrazierPuzzle(
	roomId: string,
	floorNumber: number,
	reward: ChestReward,
	rng: SeededRng
): RoomTemplateResult {
	const res = emptyResult('puzzle_braziers', 'light_braziers', rng);

	// Four unlit braziers placed around a central hazard moat — fireballs fly over!
	for (const [c, r] of [
		[4, 3],
		[10, 3],
		[4, 7],
		[10, 7]
	]) {
		res.braziers.push({ col: c, row: r, lit: false });
	}

	// Decorative hazard corners near the braziers
	res.tiles[3][5] = TileCode.Hazard;
	res.tiles[3][9] = TileCode.Hazard;
	res.tiles[7][5] = TileCode.Hazard;
	res.tiles[7][9] = TileCode.Hazard;
	res.tiles[5][7] = TileCode.Medallion;

	res.chests.push({
		id: `${roomId}_brazier_chest`,
		col: 7,
		row: 5,
		ornate: reward.kind === 'key',
		hiddenUntilSolved: true,
		reward,
		opened: false
	});

	res.enemies.push(
		{ id: `${roomId}_be_0`, col: 6, row: 4, kind: 'wizzrobe' },
		{ id: `${roomId}_be_1`, col: 8, row: 6, kind: floorNumber >= 4 ? 'knight' : 'slime' }
	);

	return res;
}

/** Classic Zelda Bomb-Cracked Vault Puzzle (requires Sanctum Bombs). */
function buildBombVaultPuzzle(
	roomId: string,
	floorNumber: number,
	reward: ChestReward,
	rng: SeededRng
): RoomTemplateResult {
	const res = emptyResult('puzzle_bomb_vault', 'bomb_vault', rng);

	// Inner vault sealed with stone pillars and 4 cracked stone doors -> bomb any to breach!
	for (const [c, r] of [
		[5, 3],
		[6, 3],
		[8, 3],
		[9, 3],
		[5, 7],
		[6, 7],
		[8, 7],
		[9, 7],
		[5, 4],
		[5, 6],
		[9, 4],
		[9, 6]
	]) {
		res.tiles[r][c] = TileCode.Pillar;
	}

	res.crackedBlocks.push(
		{ col: 7, row: 3 },
		{ col: 7, row: 7 },
		{ col: 5, row: 5 },
		{ col: 9, row: 5 }
	);

	res.chests.push({
		id: `${roomId}_bomb_chest`,
		col: 7,
		row: 5,
		ornate: reward.kind === 'key',
		hiddenUntilSolved: false,
		reward,
		opened: false
	});

	res.enemies.push(
		{ id: `${roomId}_ve_0`, col: 3, row: 3, kind: 'knight' },
		{ id: `${roomId}_ve_1`, col: 11, row: 7, kind: floorNumber >= 4 ? 'wizzrobe' : 'slime' }
	);

	return res;
}

/** Spike Timing & Dash Trial guarding a chest in the center medallion! */
function buildSpikeTrialPuzzle(
	roomId: string,
	floorNumber: number,
	reward: ChestReward,
	rng: SeededRng
): RoomTemplateResult {
	const res = emptyResult('puzzle_spike_trial', 'spike_trial', rng);

	// Ring of alternating timed floor spikes around center (7,5)
	const ring: [number, number, number][] = [
		[6, 4, 0],
		[7, 4, 1],
		[8, 4, 0],
		[8, 5, 1],
		[8, 6, 0],
		[7, 6, 1],
		[6, 6, 0],
		[6, 5, 1]
	];
	for (const [c, r, phase] of ring) {
		res.tiles[r][c] = TileCode.SpikesRetracted;
		res.spikes.push({ col: c, row: r, phaseOffset: phase });
	}
	res.tiles[5][7] = TileCode.Medallion;

	// Corner pillars for cover
	res.tiles[2][3] = TileCode.Pillar;
	res.tiles[2][11] = TileCode.Pillar;
	res.tiles[8][3] = TileCode.Pillar;
	res.tiles[8][11] = TileCode.Pillar;

	res.chests.push({
		id: `${roomId}_spike_chest`,
		col: 7,
		row: 5,
		ornate: reward.kind === 'key',
		hiddenUntilSolved: false,
		reward,
		opened: false
	});

	if (floorNumber >= 2) {
		res.enemies.push({
			id: `${roomId}_se_0`,
			col: 4,
			row: 5,
			kind: 'wizzrobe'
		});
	}

	return res;
}
