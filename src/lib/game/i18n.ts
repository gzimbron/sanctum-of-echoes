import { get, writable } from 'svelte/store';
import type { BiomeId, RelicId, ToolId } from './types';

export type Locale = 'en' | 'es';

const LOCALE_STORAGE_KEY = 'sanctum_of_echoes_locale_v1';

function detectInitialLocale(): Locale {
	if (typeof window === 'undefined') return 'en';
	try {
		const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
		if (saved === 'en' || saved === 'es') return saved;
	} catch {
		// ignore storage errors
	}
	const nav = (window.navigator.language || 'en').toLowerCase();
	return nav.startsWith('es') ? 'es' : 'en';
}

export const localeStore = writable<Locale>(detectInitialLocale());

export function setLocale(next: Locale): void {
	localeStore.set(next);
	if (typeof window !== 'undefined') {
		try {
			window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
		} catch {
			// ignore storage errors
		}
	}
}

export function toggleLocale(): Locale {
	const next: Locale = get(localeStore) === 'en' ? 'es' : 'en';
	setLocale(next);
	return next;
}

export function getCurrentLocale(): Locale {
	return get(localeStore);
}

export interface TranslationBundle {
	meta: {
		langCode: string;
		switchTooltip: string;
		githubLabel: string;
		githubTitle: string;
	};
	title: {
		eyebrow: string;
		tagline: string;
		enterBtn: string;
		continueBtn: (floor: number) => string;
		newRunBtn: string;
		savedMeta: (floor: number, biome: string, seed: string) => string;
		seedLabel: string;
		newSeedBtn: string;
		newSeedTitle: string;
		deepestFloor: string;
		highScore: string;
		moveHint: string;
		attackHint: string;
		toolHint: string;
		dashHint: string;
	};
	hud: {
		floorPrefix: string;
		pts: string;
		mute: string;
		sfx: string;
		pause: string;
		map: string;
		chest: string;
		stairs: string;
		lockedToolHint: (name: string) => string;
		quickAttack: string;
		quickTool: string;
		quickDash: string;
	};
	pause: {
		title: string;
		seedLabel: string;
		copySeedTitle: string;
		controlsHeading: string;
		inventoryHeading: string;
		emptyInventory: string;
		tipMouse: string;
		resume: string;
		retryFloor: (floor: number) => string;
		newRun: string;
		titleScreen: string;
		controls: {
			move: string;
			attack: string;
			tool: string;
			dash: string;
			switchTool: string;
			resetBlocks: string;
		};
	};
	gameover: {
		newRecord: string;
		title: string;
		floorLabel: string;
		seedLabel: string;
		floorReached: string;
		finalScore: string;
		puzzlesSolved: string;
		foesVanquished: string;
		newDungeon: string;
		retryFloor: (floor: number) => string;
		retrySeed: string;
		titleBtn: string;
	};
	touch: {
		tool: string;
		dash: string;
		sword: string;
	};
	biomes: Record<BiomeId, { name: string; subtitle: string }>;
	tools: Record<ToolId, { name: string; description: string }>;
	relics: Record<RelicId, { name: string; description: string; shortTag: string }>;
	rooms: {
		entryLabel: string;
		entryHint: string;
		treasureLabel: string;
		treasureHint: string;
		guardianLabel: string;
		descentLabel: string;
		exitClearedHint: string;
		exitGuardedHint: string;
		blockKeyLabel: string;
		blockLabel: string;
		blockSolvedHint: string;
		blockHint: string;
		crystalKeyLabel: string;
		crystalLabel: string;
		crystalHint: string;
		brazierKeyLabel: string;
		brazierLabel: string;
		brazierSolvedHint: string;
		brazierHint: string;
		bombKeyLabel: string;
		bombLabel: string;
		bombHint: string;
		spikeKeyLabel: string;
		spikeLabel: string;
		spikeHint: string;
		combatKeyLabel: string;
		combatLabel: string;
		combatClearedHint: string;
		combatHint: string;
	};
	toasts: {
		floorTitle: (floor: number, biomeName: string) => string;
		floorSavedSuffix: string;
		blocksResetTitle: string;
		blocksResetSub: string;
		gateUnlockedTitle: string;
		gateUnlockedSub: string;
		doorLockedTitle: string;
		doorLockedSub: string;
		platesActivated: string;
		braziersLit: string;
		guardianDefeated: string;
		chamberCleared: string;
		puzzleBonusSub: string;
		keyObtainedTitle: string;
		keyObtainedSub: string;
		toolAcquiredTitle: (name: string) => string;
		toolAcquiredSub: (desc: string) => string;
		relicTitle: (name: string) => string;
		gemsTitle: (amount: number) => string;
		gemsSub: string;
		heartsTitle: string;
		heartsSub: string;
	};
}

export const TRANSLATIONS: Record<Locale, TranslationBundle> = {
	en: {
		meta: {
			langCode: 'EN',
			switchTooltip: 'Switch language (EN / ES)',
			githubLabel: 'GitHub',
			githubTitle: 'View source code on GitHub'
		},
		title: {
			eyebrow: 'ENDLESS 2D DUNGEON ADVENTURE',
			tagline: 'Procedural Zelda-inspired temples · Puzzles · Relics · Infinite Floors',
			enterBtn: 'ENTER THE SANCTUM',
			continueBtn: (floor) => `CONTINUE · FLOOR ${String(floor).padStart(2, '0')}`,
			newRunBtn: 'NEW RUN',
			savedMeta: (floor, biome, seed) => `Saved: Floor ${floor} · ${biome} · Seed ${seed}`,
			seedLabel: 'SEED',
			newSeedBtn: 'NEW',
			newSeedTitle: 'Generate new random seed',
			deepestFloor: 'DEEPEST FLOOR',
			highScore: 'HIGH SCORE',
			moveHint: 'Move',
			attackHint: 'Sword (aims at cursor)',
			toolHint: 'Tool',
			dashHint: 'Dash'
		},
		hud: {
			floorPrefix: 'FLOOR',
			pts: 'PTS',
			mute: 'MUTE',
			sfx: 'SFX',
			pause: 'ESC',
			map: 'MAP',
			chest: 'Chest',
			stairs: 'Stairs',
			lockedToolHint: (name) => `Find ${name} in a Treasure Shrine`,
			quickAttack: 'Sword',
			quickTool: 'Tool',
			quickDash: 'Dash'
		},
		pause: {
			title: 'PAUSED',
			seedLabel: 'SEED',
			copySeedTitle: 'Click to copy run seed',
			controlsHeading: 'CONTROLS',
			inventoryHeading: 'INVENTORY & RELICS',
			emptyInventory:
				'Explore Treasure Shrines to unlock the Gale Boomerang, Ember Rod, Sanctum Bombs, and ancient relics.',
			tipMouse: 'Tip: Mouse clicks automatically aim your sword & tools toward the cursor!',
			resume: 'RESUME',
			retryFloor: (floor) => `RETRY FLOOR ${String(floor).padStart(2, '0')}`,
			newRun: 'NEW RUN (FLOOR 1)',
			titleScreen: 'TITLE SCREEN',
			controls: {
				move: 'Move & Push Blocks',
				attack: 'Sword Slash / Open Chest',
				tool: 'Use Equipped Tool',
				dash: 'Dash Roll (Vaults Pits & Spikes)',
				switchTool: 'Switch Tool',
				resetBlocks: 'Reset Push Blocks'
			}
		},
		gameover: {
			newRecord: 'NEW HIGH SCORE',
			title: 'FALLEN IN THE SANCTUM',
			floorLabel: 'Floor',
			seedLabel: 'Seed',
			floorReached: 'FLOOR REACHED',
			finalScore: 'FINAL SCORE',
			puzzlesSolved: 'PUZZLES SOLVED',
			foesVanquished: 'FOES VANQUISHED',
			newDungeon: 'NEW RUN (FLOOR 1)',
			retryFloor: (floor) => `RETRY FLOOR ${String(floor).padStart(2, '0')}`,
			retrySeed: 'RETRY SEED',
			titleBtn: 'TITLE'
		},
		touch: {
			tool: 'TOOL',
			dash: 'DASH',
			sword: 'SWORD'
		},
		biomes: {
			stone_sanctum: {
				name: 'Stone Sanctum',
				subtitle: 'Mossy Halls of the First Keep'
			},
			ember_crypt: {
				name: 'Ember Crypt',
				subtitle: 'Cinder Vaults Beneath the Basalt'
			},
			verdant_ruins: {
				name: 'Verdant Ruins',
				subtitle: 'Overgrown Shrine of Ancient Roots'
			},
			astral_vault: {
				name: 'Astral Vault',
				subtitle: 'Starlit Chambers Beyond Time'
			}
		},
		tools: {
			boomerang: {
				name: 'Gale Boomerang',
				description: 'Stuns enemies, flips crystal switches across gaps, and retrieves pickups.'
			},
			fire_rod: {
				name: 'Ember Rod',
				description: 'Launches searing fireballs that ignite braziers and burn foes.'
			},
			bomb: {
				name: 'Sanctum Bombs',
				description: 'Blasts cracked stone walls and deals heavy area damage.'
			}
		},
		relics: {
			heart_container: {
				name: 'Heart Vessel',
				description: '+1 Max Heart & restores full vitality.',
				shortTag: '+1 HP'
			},
			solar_blade: {
				name: 'Solar Edge',
				description: 'Infuses your blade with +1 attack damage.',
				shortTag: '+1 ATK'
			},
			gale_boots: {
				name: 'Gale Boots',
				description: 'Faster movement and quicker dash recovery.',
				shortTag: '+SPD'
			},
			aegis_charm: {
				name: 'Aegis Charm',
				description: 'Wider sword arc and extended dash invulnerability.',
				shortTag: '+ARC'
			},
			vampiric_ring: {
				name: 'Crimson Band',
				description: 'Restores half a heart when clearing hostile rooms.',
				shortTag: 'HEAL'
			}
		},
		rooms: {
			entryLabel: 'Sanctum Entry',
			entryHint: 'Explore chambers, find the Floor Key, and unlock the Golden Exit Door.',
			treasureLabel: 'Treasure Shrine',
			treasureHint: 'Open the ornate chest to claim a dungeon tool or ancient relic.',
			guardianLabel: 'Guardian Sanctum',
			descentLabel: 'Descent Chamber',
			exitClearedHint: 'Step onto the glowing stairs to descend deeper!',
			exitGuardedHint: 'Defeat the chamber guards to unseal the stairs.',
			blockKeyLabel: 'Key Trial — Rune Blocks',
			blockLabel: 'Puzzle — Rune Blocks',
			blockSolvedHint: 'Puzzle solved! Claim your reward.',
			blockHint: 'Push stone blocks onto all rune plates. Press [R] to reset blocks.',
			crystalKeyLabel: 'Key Trial — Crystal Gate',
			crystalLabel: 'Puzzle — Crystal Gate',
			crystalHint: 'Strike the Crystal Switch (Sword or Boomerang) to lower Blue barriers.',
			brazierKeyLabel: 'Key Trial — Ember Braziers',
			brazierLabel: 'Puzzle — Ember Braziers',
			brazierSolvedHint: 'All braziers lit!',
			brazierHint: 'Ignite every unlit brazier with the Ember Rod (Right-Click / X / E).',
			bombKeyLabel: 'Key Trial — Cracked Vault',
			bombLabel: 'Puzzle — Cracked Vault',
			bombHint: 'Place a Sanctum Bomb (Right-Click / X / E) beside a cracked block to breach.',
			spikeKeyLabel: 'Key Trial — Spike Ring',
			spikeLabel: 'Trial — Spike Ring',
			spikeHint: 'Time the spikes or Dash [Shift / C] cleanly into the center medallion.',
			combatKeyLabel: 'Key Ambush Chamber',
			combatLabel: 'Combat Chamber',
			combatClearedHint: 'Chamber cleared.',
			combatHint: 'Defeat all enemies to unbar the iron gates!'
		},
		toasts: {
			floorTitle: (floor, biomeName) => `Floor ${floor} — ${biomeName}`,
			floorSavedSuffix: 'Auto-saved',
			blocksResetTitle: 'Blocks Reset',
			blocksResetSub: 'Try another sequence to cover all rune plates.',
			gateUnlockedTitle: 'Sanctum Gate Unlocked!',
			gateUnlockedSub: 'The path to the deeper floor opens.',
			doorLockedTitle: 'Locked Sanctum Door',
			doorLockedSub: 'Find the Floor Key in another chamber first.',
			platesActivated: 'Rune Plates Activated!',
			braziersLit: 'All Braziers Lit!',
			guardianDefeated: 'Sanctum Guardian Defeated!',
			chamberCleared: 'Chamber Cleared!',
			puzzleBonusSub: '+150 Score — Check the revealed treasure!',
			keyObtainedTitle: 'Floor Key Obtained!',
			keyObtainedSub: 'Unlock the Golden Sanctum Door to descend.',
			toolAcquiredTitle: (name) => `Acquired ${name}!`,
			toolAcquiredSub: (desc) => `Right-Click / X / E to use — ${desc}`,
			relicTitle: (name) => `Relic: ${name}`,
			gemsTitle: (amount) => `+${amount} Sanctum Gems!`,
			gemsSub: 'Bonus treasure claimed.',
			heartsTitle: 'Vitality Restored!',
			heartsSub: 'Recovered hearts from the chest.'
		}
	},
	es: {
		meta: {
			langCode: 'ES',
			switchTooltip: 'Cambiar idioma (ES / EN)',
			githubLabel: 'GitHub',
			githubTitle: 'Ver código fuente en GitHub'
		},
		title: {
			eyebrow: 'AVENTURA DE MAZMORRAS 2D INFINITAS',
			tagline: 'Templos procedurales estilo Zelda · Acertijos · Reliquias · Niveles Infinitos',
			enterBtn: 'ENTRAR AL SANTUARIO',
			continueBtn: (floor) => `CONTINUAR · PISO ${String(floor).padStart(2, '0')}`,
			newRunBtn: 'NUEVA PARTIDA',
			savedMeta: (floor, biome, seed) => `Guardado: Piso ${floor} · ${biome} · Semilla ${seed}`,
			seedLabel: 'SEMILLA',
			newSeedBtn: 'NUEVA',
			newSeedTitle: 'Generar nueva semilla aleatoria',
			deepestFloor: 'PISO MÁS PROFUNDO',
			highScore: 'RÉCORD',
			moveHint: 'Mover',
			attackHint: 'Espada (apunta al cursor)',
			toolHint: 'Objeto',
			dashHint: 'Esquivar'
		},
		hud: {
			floorPrefix: 'PISO',
			pts: 'PTS',
			mute: 'MUDO',
			sfx: 'SONIDO',
			pause: 'ESC',
			map: 'MAPA',
			chest: 'Cofre',
			stairs: 'Escaleras',
			lockedToolHint: (name) => `Encuentra ${name} en un Santuario del Tesoro`,
			quickAttack: 'Espada',
			quickTool: 'Objeto',
			quickDash: 'Dash'
		},
		pause: {
			title: 'PAUSA',
			seedLabel: 'SEMILLA',
			copySeedTitle: 'Clic para copiar la semilla',
			controlsHeading: 'CONTROLES',
			inventoryHeading: 'INVENTARIO Y RELIQUIAS',
			emptyInventory:
				'Explora los Santuarios del Tesoro para desbloquear el Búmeran, la Vara de Brasas, las Bombas y reliquias antiguas.',
			tipMouse: 'Consejo: al hacer clic con el ratón, la espada y tus objetos apuntan automáticamente al cursor.',
			resume: 'CONTINUAR',
			retryFloor: (floor) => `REINTENTAR PISO ${String(floor).padStart(2, '0')}`,
			newRun: 'REINICIAR (PISO 1)',
			titleScreen: 'MENÚ PRINCIPAL',
			controls: {
				move: 'Moverse y empujar bloques',
				attack: 'Espada / Abrir cofre',
				tool: 'Usar objeto equipado',
				dash: 'Esquive / Dash (cruza fosos y pinchos)',
				switchTool: 'Cambiar objeto',
				resetBlocks: 'Reiniciar bloques'
			}
		},
		gameover: {
			newRecord: 'NUEVO RÉCORD',
			title: 'CAÍDO EN EL SANTUARIO',
			floorLabel: 'Piso',
			seedLabel: 'Semilla',
			floorReached: 'PISO ALCANZADO',
			finalScore: 'PUNTUACIÓN FINAL',
			puzzlesSolved: 'ACERTIJOS RESUELTOS',
			foesVanquished: 'ENEMIGOS VENCIDOS',
			newDungeon: 'REINICIAR (PISO 1)',
			retryFloor: (floor) => `REINTENTAR PISO ${String(floor).padStart(2, '0')}`,
			retrySeed: 'REPETIR SEMILLA',
			titleBtn: 'INICIO'
		},
		touch: {
			tool: 'OBJETO',
			dash: 'DASH',
			sword: 'ESPADA'
		},
		biomes: {
			stone_sanctum: {
				name: 'Santuario de Piedra',
				subtitle: 'Salas Musgosas del Primer Bastión'
			},
			ember_crypt: {
				name: 'Cripta de las Brasas',
				subtitle: 'Bóvedas de Ceniza bajo el Basalto'
			},
			verdant_ruins: {
				name: 'Ruinas Verdes',
				subtitle: 'Templo Cubierto de Raíces Antiguas'
			},
			astral_vault: {
				name: 'Bóveda Astral',
				subtitle: 'Cámaras Estelares Fuera del Tiempo'
			}
		},
		tools: {
			boomerang: {
				name: 'Búmeran del Vendaval',
				description: 'Aturde enemigos, activa cristales a distancia y recoge objetos.'
			},
			fire_rod: {
				name: 'Vara de Brasas',
				description: 'Lanza bolas de fuego que encienden antorchas y queman enemigos.'
			},
			bomb: {
				name: 'Bombas del Santuario',
				description: 'Destruye bloques agrietados e inflige gran daño en área.'
			}
		},
		relics: {
			heart_container: {
				name: 'Contenedor de Corazón',
				description: '+1 Corazón máximo y restaura toda tu salud.',
				shortTag: '+1 VIDA'
			},
			solar_blade: {
				name: 'Filo Solar',
				description: 'Imbuye tu espada con +1 de daño adicional.',
				shortTag: '+1 ATQ'
			},
			gale_boots: {
				name: 'Botas del Vendaval',
				description: 'Mayor velocidad y recuperación de dash más rápida.',
				shortTag: '+VEL'
			},
			aegis_charm: {
				name: 'Amuleto de la Égida',
				description: 'Arco de espada más amplio y mayor invulnerabilidad al esquivar.',
				shortTag: '+ARCO'
			},
			vampiric_ring: {
				name: 'Anillo Carmesí',
				description: 'Restaura medio corazón al despejar salas hostiles.',
				shortTag: 'CURA'
			}
		},
		rooms: {
			entryLabel: 'Entrada del Santuario',
			entryHint: 'Explora las salas, consigue la Llave del Piso y abre la Puerta Dorada.',
			treasureLabel: 'Santuario del Tesoro',
			treasureHint: 'Abre el cofre ornamentado para obtener una herramienta o reliquia.',
			guardianLabel: 'Santuario del Guardián',
			descentLabel: 'Cámara de Descenso',
			exitClearedHint: 'Pisa las escaleras brillantes para bajar al siguiente piso.',
			exitGuardedHint: 'Derrota a los guardianes de la sala para desbloquear las escaleras.',
			blockKeyLabel: 'Prueba de Llave — Bloques Rúnicos',
			blockLabel: 'Acertijo — Bloques Rúnicos',
			blockSolvedHint: '¡Acertijo resuelto! Recoge tu recompensa.',
			blockHint: 'Empuja los bloques sobre todas las placas de runas. Pulsa [R] para reiniciarlos.',
			crystalKeyLabel: 'Prueba de Llave — Puerta de Cristal',
			crystalLabel: 'Acertijo — Puerta de Cristal',
			crystalHint: 'Golpea el Cristal (Espada o Búmeran) para bajar las barreras azules.',
			brazierKeyLabel: 'Prueba de Llave — Braseros',
			brazierLabel: 'Acertijo — Braseros',
			brazierSolvedHint: '¡Todos los braseros encendidos!',
			brazierHint: 'Enciende cada brasero apagado con la Vara de Brasas (Clic Der. / X / E).',
			bombKeyLabel: 'Prueba de Llave — Bóveda Agrietada',
			bombLabel: 'Acertijo — Bóveda Agrietada',
			bombHint: 'Coloca una Bomba (Clic Der. / X / E) junto a un bloque agrietado para abrir paso.',
			spikeKeyLabel: 'Prueba de Llave — Anillo de Pinchos',
			spikeLabel: 'Prueba — Anillo de Pinchos',
			spikeHint: 'Calcula el ritmo o haz Dash [Shift / C] hacia el medallón central.',
			combatKeyLabel: 'Emboscada de la Llave',
			combatLabel: 'Sala de Combate',
			combatClearedHint: 'Sala despejada.',
			combatHint: '¡Derrota a todos los enemigos para abrir las rejas!'
		},
		toasts: {
			floorTitle: (floor, biomeName) => `Piso ${floor} — ${biomeName}`,
			floorSavedSuffix: 'Autoguardado',
			blocksResetTitle: 'Bloques Reiniciados',
			blocksResetSub: 'Prueba otra secuencia para cubrir todas las placas.',
			gateUnlockedTitle: '¡Puerta del Santuario Abierta!',
			gateUnlockedSub: 'El camino hacia el siguiente piso queda libre.',
			doorLockedTitle: 'Puerta Sellada',
			doorLockedSub: 'Encuentra primero la Llave del Piso en otra sala.',
			platesActivated: '¡Placas de Runas Activadas!',
			braziersLit: '¡Todos los Braseros Encendidos!',
			guardianDefeated: '¡Guardián del Santuario Derrotado!',
			chamberCleared: '¡Sala Despejada!',
			puzzleBonusSub: '+150 puntos — ¡Recoge el tesoro revelado!',
			keyObtainedTitle: '¡Llave del Piso Obtenida!',
			keyObtainedSub: 'Abre la Puerta Dorada del Santuario para descender.',
			toolAcquiredTitle: (name) => `¡Obtuviste ${name}!`,
			toolAcquiredSub: (desc) => `Clic Der. / X / E para usar — ${desc}`,
			relicTitle: (name) => `Reliquia: ${name}`,
			gemsTitle: (amount) => `¡+${amount} Gemas del Santuario!`,
			gemsSub: 'Tesoro adicional reclamado.',
			heartsTitle: '¡Vitalidad Restaurada!',
			heartsSub: 'Corazones recuperados del cofre.'
		}
	}
};

export function getTranslations(locale?: Locale): TranslationBundle {
	return TRANSLATIONS[locale ?? getCurrentLocale()];
}
