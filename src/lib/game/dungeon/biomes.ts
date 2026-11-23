import type { BiomeDefinition } from '../types';

export const BIOMES: readonly BiomeDefinition[] = [
	{
		id: 'stone_sanctum',
		name: 'Stone Sanctum',
		subtitle: 'Mossy Halls of the First Keep',
		tileRow: 0,
		bgHex: '#12161f',
		accentHex: '#58f2c8',
		ambientLightHex: '#384354',
		// D Dorian / Minor pentatonic adventure motif (Hz)
		bgmScale: [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 329.63, 349.23, 392.0, 440.0],
		bgmTempo: 122
	},
	{
		id: 'ember_crypt',
		name: 'Ember Crypt',
		subtitle: 'Cinder Vaults Beneath the Basalt',
		tileRow: 1,
		bgHex: '#170d10',
		accentHex: '#ff9b42',
		ambientLightHex: '#423135',
		// E Phrygian dramatic motif
		bgmScale: [164.81, 174.61, 207.65, 220.0, 246.94, 261.63, 293.66, 329.63, 349.23, 392.0],
		bgmTempo: 130
	},
	{
		id: 'verdant_ruins',
		name: 'Verdant Ruins',
		subtitle: 'Overgrown Shrine of Ancient Roots',
		tileRow: 2,
		bgHex: '#10150e',
		accentHex: '#88f79c',
		ambientLightHex: '#484b39',
		// G Minor mystical temple motif
		bgmScale: [196.0, 220.0, 233.08, 261.63, 293.66, 311.13, 349.23, 392.0, 440.0, 466.16],
		bgmTempo: 116
	},
	{
		id: 'astral_vault',
		name: 'Astral Vault',
		subtitle: 'Starlit Chambers Beyond Time',
		tileRow: 3,
		bgHex: '#0b0a17',
		accentHex: '#7ef6ff',
		ambientLightHex: '#353454',
		// C Harmonic Minor celestial dungeon motif
		bgmScale: [130.81, 146.83, 155.56, 174.61, 196.0, 207.65, 246.94, 261.63, 293.66, 311.13],
		bgmTempo: 126
	}
];

export function getBiomeForFloor(floorNumber: number): BiomeDefinition {
	// Switch biome every 2 floors for crisp progression feel, cycling infinitely
	const idx = Math.floor((Math.max(1, floorNumber) - 1) / 2) % BIOMES.length;
	return BIOMES[idx];
}
