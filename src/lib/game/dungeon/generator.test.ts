import { describe, expect, it } from 'vitest';
import { generateDungeonFloor } from './generator';
import { ROOM_COLS, ROOM_ROWS, TileCode, type ToolId } from '../types';

describe('generateDungeonFloor solvability & invariants', () => {
	it('generates guaranteed-solvable floors across 25 infinite floors and seeds', () => {
		const toolsByFloor: ToolId[][] = [
			[],
			['boomerang'],
			['boomerang', 'fire_rod'],
			['boomerang', 'fire_rod', 'bomb']
		];

		for (let floor = 1; floor <= 25; floor++) {
			const unlockedTools = toolsByFloor[Math.min(floor - 1, toolsByFloor.length - 1)];
			const data = generateDungeonFloor({
				floorNumber: floor,
				runSeed: `TEST-SEED-${floor}`,
				unlockedTools,
				ownedRelics: []
			});

			const roomIds = Object.keys(data.rooms);
			expect(roomIds.length).toBeGreaterThanOrEqual(5);

			// 1. Start, Key, and Exit rooms must be distinct
			expect(data.startRoomId).not.toBe(data.exitRoomId);
			expect(data.keyRoomId).not.toBe(data.exitRoomId);
			expect(data.keyRoomId).not.toBe(data.startRoomId);

			// 2. Exit room must be a leaf (1 door) and have StairsDown
			const exitRoom = data.rooms[data.exitRoomId];
			expect(Object.keys(exitRoom.doors).length).toBe(1);
			expect(exitRoom.tiles[5][7]).toBe(TileCode.StairsDown);

			// 3. Key room must contain a chest with reward.kind === 'key'
			const keyRoom = data.rooms[data.keyRoomId];
			expect(keyRoom.chests.some((c) => c.reward.kind === 'key')).toBe(true);

			// 4. BFS from Start WITHOUT crossing locked doors MUST reach the Key Room
			const visited = new Set<string>([data.startRoomId]);
			const queue = [data.startRoomId];
			while (queue.length > 0) {
				const cur = data.rooms[queue.shift()!];
				for (const door of Object.values(cur.doors)) {
					if (!door || door.locked) continue;
					if (!visited.has(door.targetRoomId)) {
						visited.add(door.targetRoomId);
						queue.push(door.targetRoomId);
					}
				}
			}
			expect(visited.has(data.keyRoomId)).toBe(true);
			expect(visited.has(data.exitRoomId)).toBe(false); // Locked until key is obtained!

			// 5. Never generate puzzles requiring locked tools
			for (const room of Object.values(data.rooms)) {
				expect(room.tiles.length).toBe(ROOM_ROWS);
				expect(room.tiles[0].length).toBe(ROOM_COLS);
				if (room.puzzle === 'light_braziers') {
					expect(unlockedTools).toContain('fire_rod');
				}
				if (room.puzzle === 'bomb_vault') {
					expect(unlockedTools).toContain('bomb');
				}
			}
		}
	});

	it('is deterministic for identical runSeed and floorNumber', () => {
		const a = generateDungeonFloor({
			floorNumber: 3,
			runSeed: 'ECHO99',
			unlockedTools: ['boomerang', 'fire_rod'],
			ownedRelics: []
		});
		const b = generateDungeonFloor({
			floorNumber: 3,
			runSeed: 'ECHO99',
			unlockedTools: ['boomerang', 'fire_rod'],
			ownedRelics: []
		});
		expect(JSON.stringify(a)).toBe(JSON.stringify(b));
	});
});
