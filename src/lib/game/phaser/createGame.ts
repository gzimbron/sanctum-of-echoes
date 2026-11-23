import Phaser from 'phaser';
import { ROOM_HEIGHT, ROOM_WIDTH } from '../types';
import { DungeonScene } from './DungeonScene';

export interface GameController {
	game: Phaser.Game;
	getScene: () => DungeonScene | null;
	destroy: () => void;
}

export function createSanctumGame(parent: HTMLElement): GameController {
	const scene = new DungeonScene();

	const game = new Phaser.Game({
		type: Phaser.AUTO,
		parent,
		width: ROOM_WIDTH,
		height: ROOM_HEIGHT,
		pixelArt: true,
		antialias: false,
		roundPixels: true,
		backgroundColor: '#12161f',
		scale: {
			mode: Phaser.Scale.FIT,
			autoCenter: Phaser.Scale.CENTER_BOTH,
			width: ROOM_WIDTH,
			height: ROOM_HEIGHT
		},
		scene: [scene]
	});

	return {
		game,
		getScene: () => {
			const s = game.scene.getScene('DungeonScene');
			return s instanceof DungeonScene ? s : null;
		},
		destroy: () => {
			game.destroy(true);
		}
	};
}
