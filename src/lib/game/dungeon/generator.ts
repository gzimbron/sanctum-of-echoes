import {
	ROOM_COLS,
	ROOM_ROWS,
	TileCode,
	type CardinalDir,
	type ChestReward,
	type FloorData,
	type RelicId,
	type RoomData,
	type RoomType,
	type ToolId
} from '../types';
import { hashSeed, SeededRng } from '../rng';
import { getBiomeForFloor } from './biomes';
import {
	buildCombatRoom,
	buildExitRoom,
	buildPuzzleRoom,
	buildStartRoom,
	buildTreasureRoom
} from './templates';

const DIR_OFFSETS: Record<CardinalDir, { dx: number; dy: number; opposite: CardinalDir }> = {
	north: { dx: 0, dy: -1, opposite: 'south' },
	south: { dx: 0, dy: 1, opposite: 'north' },
	east: { dx: 1, dy: 0, opposite: 'west' },
	west: { dx: -1, dy: 0, opposite: 'east' }
};

const ALL_DIRS: CardinalDir[] = ['north', 'south', 'east', 'west'];
const TOOL_UNLOCK_ORDER: ToolId[] = ['boomerang', 'fire_rod', 'bomb'];
const RELIC_POOL: RelicId[] = [
	'solar_blade',
	'gale_boots',
	'aegis_charm',
	'vampiric_ring',
	'heart_container'
];

function coordKey(gx: number, gy: number): string {
	return `${gx},${gy}`;
}

interface GraphNode {
	id: string;
	gx: number;
	gy: number;
	neighbors: Partial<Record<CardinalDir, string>>;
	distFromStart: number;
}

function buildFloorGraph(targetRooms: number, rng: SeededRng): Map<string, GraphNode> {
	const nodes = new Map<string, GraphNode>();
	const startId = coordKey(0, 0);
	nodes.set(startId, {
		id: startId,
		gx: 0,
		gy: 0,
		neighbors: {},
		distFromStart: 0
	});

	// Grow organic branching dungeon tree (favoring crisp Zelda branches, not single hallways)
	let safety = 0;
	while (nodes.size < targetRooms && safety < 500) {
		safety++;
		const existing = Array.from(nodes.values());
		// Slight bias toward nodes with fewer neighbors for cleaner branching
		const candidates = existing.filter((n) => Object.keys(n.neighbors).length < 3);
		const parent = candidates.length > 0 ? rng.pick(candidates) : rng.pick(existing);

		const dirs = rng.shuffle(ALL_DIRS);
		for (const dir of dirs) {
			const { dx, dy, opposite } = DIR_OFFSETS[dir];
			const nx = parent.gx + dx;
			const ny = parent.gy + dy;
			const nId = coordKey(nx, ny);
			if (nodes.has(nId)) continue;

			// Avoid dense 2x2 blobs to preserve classic dungeon topology
			let adjacentCount = 0;
			for (const d of ALL_DIRS) {
				if (nodes.has(coordKey(nx + DIR_OFFSETS[d].dx, ny + DIR_OFFSETS[d].dy))) {
					adjacentCount++;
				}
			}
			if (adjacentCount > 1 && rng.chance(0.75)) continue;

			const child: GraphNode = {
				id: nId,
				gx: nx,
				gy: ny,
				neighbors: { [opposite]: parent.id },
				distFromStart: parent.distFromStart + 1
			};
			parent.neighbors[dir] = nId;
			nodes.set(nId, child);
			break;
		}
	}

	// Recompute exact BFS distances from start
	const queue: string[] = [startId];
	const visited = new Set<string>([startId]);
	nodes.get(startId)!.distFromStart = 0;
	while (queue.length > 0) {
		const curId = queue.shift()!;
		const cur = nodes.get(curId)!;
		for (const nextId of Object.values(cur.neighbors)) {
			if (nextId && !visited.has(nextId)) {
				visited.add(nextId);
				nodes.get(nextId)!.distFromStart = cur.distFromStart + 1;
				queue.push(nextId);
			}
		}
	}

	return nodes;
}

/** Carve open doorway floor tiles into room boundary walls for each connected door. */
function carveDoorways(room: RoomData): void {
	const midC = Math.floor(ROOM_COLS / 2); // 7
	const midR = Math.floor(ROOM_ROWS / 2); // 5

	if (room.doors.north) {
		room.tiles[0][midC] = TileCode.DoorFloor;
	}
	if (room.doors.south) {
		room.tiles[ROOM_ROWS - 1][midC] = TileCode.DoorFloor;
	}
	if (room.doors.west) {
		room.tiles[midR][0] = TileCode.DoorFloor;
	}
	if (room.doors.east) {
		room.tiles[midR][ROOM_COLS - 1] = TileCode.DoorFloor;
	}
}

export interface GenerateFloorOptions {
	floorNumber: number;
	runSeed: string | number;
	unlockedTools: ToolId[];
	ownedRelics: RelicId[];
}

/**
 * Generates an entire procedurally-created, guaranteed-solvable dungeon floor.
 *
 * Solvability invariants:
 * 1. Exit room is strictly a leaf node locked behind a single Locked Door.
 * 2. Key room is always placed inside the non-exit connected subgraph -> Key is ALWAYS reachable before Exit!
 * 3. Puzzle rooms only require tools already present in unlockedTools.
 */
export function generateDungeonFloor(options: GenerateFloorOptions): FloorData {
	const { floorNumber, runSeed, unlockedTools, ownedRelics } = options;
	const floorSeed = hashSeed(`${runSeed}-FLOOR-${floorNumber}`);
	const rng = new SeededRng(floorSeed);
	const biome = getBiomeForFloor(floorNumber);

	// Scale room count smoothly from 6 rooms (Floor 1) up to 14 rooms on deep floors
	const targetRooms = Math.min(14, 5 + Math.floor(floorNumber * 1.15));
	const graph = buildFloorGraph(targetRooms, rng);
	const startId = coordKey(0, 0);

	const allNodes = Array.from(graph.values());
	const nonStartNodes = allNodes.filter((n) => n.id !== startId);

	// 1. Pick Exit Room: farthest leaf node from Start (guaranteed single entrance -> clean Locked Door!)
	const leafNodes = nonStartNodes.filter((n) => Object.keys(n.neighbors).length === 1);
	const sortedLeaves = [...(leafNodes.length > 0 ? leafNodes : nonStartNodes)].sort(
		(a, b) => b.distFromStart - a.distFromStart
	);
	const exitNode = sortedLeaves[0];

	// 2. Add a couple of optional loop connections ONLY among non-exit nodes so Exit remains a strict leaf
	for (const node of nonStartNodes) {
		if (node.id === exitNode.id) continue;
		for (const dir of ALL_DIRS) {
			if (node.neighbors[dir]) continue;
			const { dx, dy, opposite } = DIR_OFFSETS[dir];
			const adjId = coordKey(node.gx + dx, node.gy + dy);
			if (adjId === exitNode.id) continue;
			const adj = graph.get(adjId);
			if (adj && rng.chance(0.14)) {
				node.neighbors[dir] = adjId;
				adj.neighbors[opposite] = node.id;
			}
		}
	}

	// 3. Pick Key Room: farthest non-start, non-exit node (guaranteed reachable without crossing Exit!)
	const remainingForSpecial = nonStartNodes.filter((n) => n.id !== exitNode.id);
	const sortedForKey = [...remainingForSpecial].sort((a, b) => {
		const leafBonusA = Object.keys(a.neighbors).length === 1 ? 1.5 : 0;
		const leafBonusB = Object.keys(b.neighbors).length === 1 ? 1.5 : 0;
		return b.distFromStart + leafBonusB - (a.distFromStart + leafBonusA);
	});
	const keyNode = sortedForKey[0];

	// 4. Pick Treasure Room: another distinct branch/leaf
	const treasureCandidates = remainingForSpecial.filter((n) => n.id !== keyNode.id);
	const sortedForTreasure = [...treasureCandidates].sort((a, b) => {
		const leafA = Object.keys(a.neighbors).length === 1 ? 2 : 0;
		const leafB = Object.keys(b.neighbors).length === 1 ? 2 : 0;
		return b.distFromStart + leafB - (a.distFromStart + leafA);
	});
	const treasureNode = sortedForTreasure.length > 0 ? sortedForTreasure[0] : null;

	// Choose Treasure Room reward: missing core tool first (Floor 1 Boomerang, Floor 2 Fire Rod, Floor 3 Bombs), then Relics!
	const missingTool = TOOL_UNLOCK_ORDER.find((t) => !unlockedTools.includes(t));
	let treasureReward: ChestReward;
	if (missingTool) {
		treasureReward = { kind: 'tool', tool: missingTool };
	} else {
		const unownedRelics = RELIC_POOL.filter((r) => !ownedRelics.includes(r));
		if (unownedRelics.length > 0) {
			treasureReward = { kind: 'relic', relic: rng.pick(unownedRelics) };
		} else {
			treasureReward = {
				kind: 'relic',
				relic: rng.chance(0.55) ? 'heart_container' : 'solar_blade'
			};
		}
	}

	// Assign room types
	const roomTypes = new Map<string, RoomType>();
	roomTypes.set(startId, 'start');
	roomTypes.set(exitNode.id, 'exit');
	roomTypes.set(keyNode.id, 'key');
	if (treasureNode) {
		roomTypes.set(treasureNode.id, 'treasure');
	}

	const regularNodes = remainingForSpecial.filter(
		(n) => n.id !== keyNode.id && n.id !== treasureNode?.id
	);
	// Alternate puzzle & combat rooms so every floor feels unmistakably like Zelda!
	const shuffledRegular = rng.shuffle(regularNodes);
	shuffledRegular.forEach((node, idx) => {
		roomTypes.set(node.id, idx % 2 === 0 ? 'puzzle' : 'combat');
	});

	// Build each RoomData
	const rooms: Record<string, RoomData> = {};

	for (const node of allNodes) {
		const type = roomTypes.get(node.id) ?? 'combat';
		let template;
		let hasGuardian = false;

		if (type === 'start') {
			template = buildStartRoom(rng);
		} else if (type === 'treasure') {
			template = buildTreasureRoom(node.id, treasureReward, rng);
		} else if (type === 'exit') {
			const built = buildExitRoom(node.id, floorNumber, rng);
			template = built.result;
			hasGuardian = built.hasGuardian;
		} else if (type === 'key') {
			// Key room is a fun Zelda Puzzle (~70%) or Combat Gauntlet (~30%)!
			if (rng.chance(0.7)) {
				template = buildPuzzleRoom(node.id, floorNumber, unlockedTools, { kind: 'key' }, rng);
			} else {
				template = buildCombatRoom(node.id, floorNumber, rng, { kind: 'key' });
			}
		} else if (type === 'puzzle') {
			const bonusReward: ChestReward = rng.chance(0.55)
				? { kind: 'gems', amount: 15 + floorNumber * 5 }
				: { kind: 'hearts', amount: 4 };
			template = buildPuzzleRoom(node.id, floorNumber, unlockedTools, bonusReward, rng);
		} else {
			const bonusReward: ChestReward | undefined = rng.chance(0.35)
				? { kind: 'gems', amount: 10 + floorNumber * 5 }
				: undefined;
			template = buildCombatRoom(node.id, floorNumber, rng, bonusReward);
		}

		// Build doors from graph neighbors; lock the door entering the Exit room!
		const doors: RoomData['doors'] = {};
		for (const dir of ALL_DIRS) {
			const targetId = node.neighbors[dir];
			if (!targetId) continue;
			const leadsToExit = targetId === exitNode.id;
			doors[dir] = {
				targetRoomId: targetId,
				locked: leadsToExit,
				barred: false
			};
		}

		const room: RoomData = {
			id: node.id,
			gx: node.gx,
			gy: node.gy,
			type,
			puzzle: template.puzzle,
			templateId: template.templateId,
			tiles: template.tiles,
			doors,
			pushBlocks: template.pushBlocks,
			crackedBlocks: template.crackedBlocks,
			braziers: template.braziers,
			crystalSwitches: template.crystalSwitches,
			toggleBarriers: template.toggleBarriers,
			chests: template.chests,
			enemies: template.enemies,
			spikes: template.spikes,
			discovered: type === 'start',
			cleared: template.enemies.length === 0,
			puzzleSolved:
				template.puzzle === 'none' ||
				template.puzzle === 'crystal_gate' ||
				template.puzzle === 'bomb_vault' ||
				template.puzzle === 'spike_trial',
			crystalState: template.crystalState,
			hasGuardian
		};

		carveDoorways(room);
		rooms[room.id] = room;
	}

	return {
		floorNumber,
		seed: floorSeed,
		biome,
		rooms,
		startRoomId: startId,
		keyRoomId: keyNode.id,
		treasureRoomId: treasureNode?.id ?? null,
		exitRoomId: exitNode.id
	};
}
