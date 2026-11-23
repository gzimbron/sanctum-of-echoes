import { describe, expect, it } from 'vitest';
import { parseSavedRun } from './runStore';

describe('parseSavedRun checkpoint validation', () => {
	it('parses a valid floor checkpoint and sanitizes invalid tools/relics', () => {
		const raw = JSON.stringify({
			version: 1,
			seed: ' echo42 ',
			floorNumber: 4,
			biomeId: 'ember_crypt',
			hp: 10,
			maxHp: 8,
			gems: 45,
			score: 1850,
			roomsCleared: 14,
			puzzlesSolved: 6,
			enemiesDefeated: 29,
			tools: ['boomerang', 'invalid_tool', 'fire_rod'],
			equippedTool: 'fire_rod',
			relics: ['solar_blade', 'bogus_relic'],
			savedAt: 1700000000000
		});

		const parsed = parseSavedRun(raw);
		expect(parsed).not.toBeNull();
		expect(parsed?.seed).toBe('ECHO42');
		expect(parsed?.floorNumber).toBe(4);
		expect(parsed?.biomeId).toBe('ember_crypt');
		expect(parsed?.hp).toBe(8); // clamped to maxHp
		expect(parsed?.tools).toEqual(['boomerang', 'fire_rod']);
		expect(parsed?.equippedTool).toBe('fire_rod');
		expect(parsed?.relics).toEqual(['solar_blade']);
	});

	it('rejects malformed, wrong-version, or corrupted checkpoint payloads', () => {
		expect(parseSavedRun(null)).toBeNull();
		expect(parseSavedRun('{bad-json')).toBeNull();
		expect(parseSavedRun(JSON.stringify({ version: 2, seed: 'ABC', floorNumber: 1, hp: 6, maxHp: 6 }))).toBeNull();
		expect(parseSavedRun(JSON.stringify({ version: 1, seed: '', floorNumber: 1, hp: 6, maxHp: 6 }))).toBeNull();
		expect(parseSavedRun(JSON.stringify({ version: 1, seed: 'ABC', floorNumber: 0, hp: 6, maxHp: 6 }))).toBeNull();
	});
});
