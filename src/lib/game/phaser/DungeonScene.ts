import Phaser from 'phaser';
import { base } from '$app/paths';
import {
	ROOM_COLS,
	ROOM_HEIGHT,
	ROOM_ROWS,
	ROOM_WIDTH,
	TILE_SIZE,
	TileCode,
	type CardinalDir,
	type ChestReward,
	type ChestSpec,
	type EnemyKind,
	type FacingDir,
	type FloorData,
	type MinimapRoomInfo,
	type RelicId,
	type RoomData,
	type SavedRunState,
	type ToolId
} from '../types';
import { generateDungeonFloor } from '../dungeon/generator';
import { sound } from '../audio';
import { hudStore } from '../state/runStore';
import { getTranslations } from '../i18n';

interface ActivePushBlock {
	col: number;
	row: number;
	initialCol: number;
	initialRow: number;
	sprite: Phaser.GameObjects.Sprite;
	moving: boolean;
}

interface ActiveCrackedBlock {
	col: number;
	row: number;
	sprite: Phaser.GameObjects.Sprite;
	destroyed: boolean;
}

interface ActiveBrazier {
	col: number;
	row: number;
	lit: boolean;
	sprite: Phaser.GameObjects.Sprite;
	glow: Phaser.GameObjects.Arc;
}

interface ActiveCrystalSwitch {
	col: number;
	row: number;
	sprite: Phaser.GameObjects.Sprite;
	cooldown: number;
}

interface ActiveToggleBarrier {
	col: number;
	row: number;
	color: 'blue' | 'red';
	sprite: Phaser.GameObjects.Sprite;
}

interface ActiveChest {
	spec: ChestSpec;
	sprite: Phaser.GameObjects.Sprite;
	visible: boolean;
}

interface ActiveDoorVisual {
	dir: CardinalDir;
	col: number;
	row: number;
	sprite: Phaser.GameObjects.Sprite;
}

interface ActiveSpike {
	col: number;
	row: number;
	phaseOffset: number;
	extended: boolean;
	sprite: Phaser.GameObjects.Sprite;
}

interface ActiveEnemy {
	id: string;
	kind: EnemyKind;
	elite: boolean;
	x: number;
	y: number;
	vx: number;
	vy: number;
	hp: number;
	maxHp: number;
	facing: FacingDir;
	sprite: Phaser.GameObjects.Sprite;
	hpBarBg?: Phaser.GameObjects.Rectangle;
	hpBarFill?: Phaser.GameObjects.Rectangle;
	stunTimer: number;
	hurtTimer: number;
	aiTimer: number;
	aiState: 'idle' | 'move' | 'windup' | 'charge' | 'recover' | 'blink';
	turnTimer: number;
	guardHits: number;
	guardResetTimer: number;
	animTime: number;
	knockVx: number;
	knockVy: number;
}

interface ActivePickup {
	kind: 'heart' | 'gem1' | 'gem5' | 'gem20';
	x: number;
	y: number;
	sprite: Phaser.GameObjects.Sprite;
	age: number;
}

interface ActiveProjectile {
	kind: 'fireball' | 'arcane';
	fromPlayer: boolean;
	x: number;
	y: number;
	vx: number;
	vy: number;
	sprite: Phaser.GameObjects.Sprite;
	life: number;
}

interface ActiveBoomerang {
	x: number;
	y: number;
	vx: number;
	vy: number;
	returning: boolean;
	age: number;
	sprite: Phaser.GameObjects.Sprite;
	hitIds: Set<string>;
}

interface ActiveBomb {
	x: number;
	y: number;
	fuse: number;
	sprite: Phaser.GameObjects.Sprite;
}

export interface VirtualInputState {
	up: boolean;
	down: boolean;
	left: boolean;
	right: boolean;
}

const FACING_VEC: Record<FacingDir, { x: number; y: number; row: number }> = {
	down: { x: 0, y: 1, row: 0 },
	up: { x: 0, y: -1, row: 1 },
	left: { x: -1, y: 0, row: 2 },
	right: { x: 1, y: 0, row: 3 }
};

export class DungeonScene extends Phaser.Scene {
	// Run state
	private runSeed = 'ECHO01';
	private floorNumber = 1;
	private floorData!: FloorData;
	private currentRoomId = '0,0';
	private paused = false;
	private gameOver = false;
	private isTransitioning = false;
	private stairsCooldown = 0;
	private chestHoldTimer = 0;
	private chestHoldElapsed = 0;
	private heldItemSprite: Phaser.GameObjects.Sprite | null = null;
	private heldItemHalo: Phaser.GameObjects.Arc | null = null;
	private heldItemColor = 0xffd559;
	private heldSparkleTimer = 0;

	// Player stats & inventory
	private hp = 6;
	private maxHp = 6;
	private keys = 0;
	private gems = 0;
	private score = 0;
	private roomsCleared = 0;
	private puzzlesSolved = 0;
	private enemiesDefeated = 0;
	private tools: ToolId[] = [];
	private equippedTool: ToolId | null = null;
	private relics: RelicId[] = [];

	// Player physics & combat
	private hero!: Phaser.GameObjects.Sprite;
	private heroX = ROOM_WIDTH / 2;
	private heroY = ROOM_HEIGHT / 2;
	private lastSafeX = ROOM_WIDTH / 2;
	private lastSafeY = ROOM_HEIGHT / 2;
	private heroFacing: FacingDir = 'down';
	private heroAnimTime = 0;
	private invulnTimer = 0;
	private hurtKnockVx = 0;
	private hurtKnockVy = 0;
	private hitStopTimer = 0;

	private swordTimer = 0;
	private swordCooldown = 0;
	private swordHitIds = new Set<string>();
	private swordGraphics!: Phaser.GameObjects.Graphics;
	private aimGraphics!: Phaser.GameObjects.Graphics;

	// Input buffers for snappy, forgiving action-RPG responsiveness
	private attackBuffer = 0;
	private dashBuffer = 0;
	private toolBuffer = 0;
	private mouseAimActive = false;
	private mouseWorldX = ROOM_WIDTH / 2;
	private mouseWorldY = ROOM_HEIGHT / 2;
	private mouseIdleTimer = 0;

	private dashTimer = 0;
	private dashCooldown = 0;
	private dashDirX = 0;
	private dashDirY = 0;
	private ghostSpawnTimer = 0;

	private fireCooldown = 0;
	private pushCandidate: { block: ActivePushBlock; dx: number; dy: number; timer: number } | null = null;
	private lockNoticeCooldown = 0;
	private spikeCycleTimer = 0;

	// Room visual containers & entities
	private roomLayer!: Phaser.GameObjects.Container;
	private tileSprites: Phaser.GameObjects.Image[][] = [];
	private pushBlocks: ActivePushBlock[] = [];
	private crackedBlocks: ActiveCrackedBlock[] = [];
	private braziers: ActiveBrazier[] = [];
	private crystalSwitches: ActiveCrystalSwitch[] = [];
	private toggleBarriers: ActiveToggleBarrier[] = [];
	private chests: ActiveChest[] = [];
	private doorVisuals: ActiveDoorVisual[] = [];
	private spikes: ActiveSpike[] = [];
	private enemies: ActiveEnemy[] = [];
	private pickups: ActivePickup[] = [];
	private projectiles: ActiveProjectile[] = [];
	private boomerang: ActiveBoomerang | null = null;
	private bombs: ActiveBomb[] = [];
	private stairsGlow: Phaser.GameObjects.Arc | null = null;

	// Input
	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	private keyW!: Phaser.Input.Keyboard.Key;
	private keyA!: Phaser.Input.Keyboard.Key;
	private keyS!: Phaser.Input.Keyboard.Key;
	private keyD!: Phaser.Input.Keyboard.Key;
	private virtualInput: VirtualInputState = { up: false, down: false, left: false, right: false };

	constructor() {
		super({ key: 'DungeonScene' });
	}

	preload(): void {
		this.load.spritesheet('tiles', `${base}/assets/tiles.png`, { frameWidth: 16, frameHeight: 16 });
		this.load.spritesheet('hero', `${base}/assets/hero.png`, { frameWidth: 24, frameHeight: 24 });
		this.load.spritesheet('enemies', `${base}/assets/enemies.png`, { frameWidth: 24, frameHeight: 24 });
		this.load.spritesheet('objects', `${base}/assets/objects.png`, { frameWidth: 16, frameHeight: 16 });
	}

	create(): void {
		this.roomLayer = this.add.container(0, 0).setDepth(1);
		this.aimGraphics = this.add.graphics().setDepth(14);
		this.swordGraphics = this.add.graphics().setDepth(22);

		this.hero = this.add.sprite(this.heroX, this.heroY, 'hero', 0).setDepth(18);

		this.setupInputs();
		this.cameras.main.setBackgroundColor('#12161f');

		this.paused = true;
		this.startNewRun(this.runSeed, true);
	}

	private setupInputs(): void {
		const kb = this.input.keyboard;
		if (!kb) return;

		this.cursors = kb.createCursorKeys();
		this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
		this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
		this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
		this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);

		// Ergonomic multi-style controls:
		// Attack: Left Click (aims at cursor), Space, Z, J
		kb.on('keydown-SPACE', () => this.queueAttack());
		kb.on('keydown-Z', () => this.queueAttack());
		kb.on('keydown-J', () => this.queueAttack());

		// Dash: Shift, C, K
		kb.on('keydown-SHIFT', () => this.queueDash());
		kb.on('keydown-C', () => this.queueDash());
		kb.on('keydown-K', () => this.queueDash());

		// Use Equipped Tool: Right Click (aims at cursor), X, E, F, L
		kb.on('keydown-X', () => this.queueTool());
		kb.on('keydown-E', () => this.queueTool());
		kb.on('keydown-F', () => this.queueTool());
		kb.on('keydown-L', () => this.queueTool());

		// Tool switching & puzzle reset
		kb.on('keydown-Q', () => this.cycleTool());
		kb.on('keydown-ONE', () => this.selectToolByIndex(0));
		kb.on('keydown-TWO', () => this.selectToolByIndex(1));
		kb.on('keydown-THREE', () => this.selectToolByIndex(2));
		kb.on('keydown-R', () => this.resetPushBlocks());

		// Pointer aiming & combat (WASD + Mouse feels natural immediately!)
		this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
			if (this.paused || this.gameOver) return;
			this.mouseWorldX = pointer.worldX;
			this.mouseWorldY = pointer.worldY;
			this.mouseAimActive = true;
			this.mouseIdleTimer = 2.6;
		});

		this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
			if (this.paused || this.gameOver) return;
			sound.unlock();
			this.mouseWorldX = pointer.worldX;
			this.mouseWorldY = pointer.worldY;
			this.mouseAimActive = true;
			this.mouseIdleTimer = 2.6;
			this.faceTowards(pointer.worldX, pointer.worldY);

			if (pointer.rightButtonDown()) {
				if (this.equippedTool) {
					this.queueTool();
				} else {
					this.queueDash();
				}
			} else {
				this.queueAttack();
			}
		});

		// Mouse wheel cycles tools smoothly
		this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _objs: unknown, _dx: number, dy: number) => {
			if (this.paused || this.gameOver || this.tools.length <= 1) return;
			if (dy > 0) this.cycleTool(1);
			else if (dy < 0) this.cycleTool(-1);
		});

		this.input.mouse?.disableContextMenu();
	}

	private faceTowards(targetX: number, targetY: number): void {
		const dx = targetX - this.heroX;
		const dy = targetY - this.heroY;
		if (Math.hypot(dx, dy) < 3) return;
		if (Math.abs(dx) >= Math.abs(dy)) {
			this.heroFacing = dx < 0 ? 'left' : 'right';
		} else {
			this.heroFacing = dy < 0 ? 'up' : 'down';
		}
	}

	// ---- PUBLIC API FOR SVELTE UI ----

	public refreshLocalization(): void {
		if (!this.floorData) return;
		this.syncHud();
	}

	public startNewRun(seed: string, stayOnTitle = false): void {
		this.runSeed = seed.trim().toUpperCase() || 'ECHO01';
		this.floorNumber = 1;
		this.hp = 6;
		this.maxHp = 6;
		this.keys = 0;
		this.gems = 0;
		this.score = 0;
		this.roomsCleared = 0;
		this.puzzlesSolved = 0;
		this.enemiesDefeated = 0;
		this.tools = [];
		this.equippedTool = null;
		this.relics = [];
		this.gameOver = false;
		this.paused = stayOnTitle;
		this.isTransitioning = false;
		this.invulnTimer = 0;
		this.attackBuffer = 0;
		this.dashBuffer = 0;
		this.toolBuffer = 0;
		this.hero.clearTint();

		if (!stayOnTitle) {
			sound.unlock();
			hudStore.resetForRun(this.runSeed);
		}

		this.loadFloor(1, !stayOnTitle, !stayOnTitle);
	}

	public resumeSavedRun(saved: SavedRunState, restoreFullHp = false): void {
		this.runSeed = saved.seed.trim().toUpperCase() || 'ECHO01';
		this.floorNumber = Math.max(1, saved.floorNumber);
		this.maxHp = Math.min(20, Math.max(6, saved.maxHp));
		this.hp = restoreFullHp ? this.maxHp : Math.min(this.maxHp, Math.max(2, saved.hp));
		this.keys = 0;
		this.gems = Math.max(0, saved.gems);
		this.score = Math.max(0, saved.score);
		this.roomsCleared = Math.max(0, saved.roomsCleared);
		this.puzzlesSolved = Math.max(0, saved.puzzlesSolved);
		this.enemiesDefeated = Math.max(0, saved.enemiesDefeated);
		this.tools = [...saved.tools];
		this.equippedTool = saved.equippedTool && this.tools.includes(saved.equippedTool)
			? saved.equippedTool
			: (this.tools[0] ?? null);
		this.relics = [...saved.relics];
		this.gameOver = false;
		this.paused = false;
		this.isTransitioning = false;
		this.invulnTimer = 0;
		this.attackBuffer = 0;
		this.dashBuffer = 0;
		this.toolBuffer = 0;
		this.hero.clearTint();

		sound.unlock();
		hudStore.patch({
			phase: 'playing',
			seed: this.runSeed,
			newRecord: false
		});

		this.loadFloor(this.floorNumber, true, false);
	}

	private saveFloorCheckpoint(): void {
		hudStore.saveCheckpoint({
			version: 1,
			seed: this.runSeed,
			floorNumber: this.floorNumber,
			biomeId: this.floorData.biome.id,
			hp: this.hp,
			maxHp: this.maxHp,
			gems: this.gems,
			score: this.score,
			roomsCleared: this.roomsCleared,
			puzzlesSolved: this.puzzlesSolved,
			enemiesDefeated: this.enemiesDefeated,
			tools: [...this.tools],
			equippedTool: this.equippedTool,
			relics: [...this.relics],
			savedAt: Date.now()
		});
	}

	public setPaused(paused: boolean): void {
		this.paused = paused;
		if (!this.gameOver) {
			hudStore.patch({ phase: paused ? 'paused' : 'playing' });
		}
	}

	public selectTool(tool: ToolId): void {
		if (!this.tools.includes(tool)) return;
		this.equippedTool = tool;
		this.syncHud();
	}

	public selectToolByIndex(idx: number): void {
		if (this.paused || this.gameOver) return;
		const order: ToolId[] = ['boomerang', 'fire_rod', 'bomb'];
		const target = order[idx];
		if (target && this.tools.includes(target)) {
			this.equippedTool = target;
			this.syncHud();
		}
	}

	public cycleTool(step = 1): void {
		if (this.paused || this.gameOver || this.tools.length <= 1) return;
		const curIdx = this.equippedTool ? this.tools.indexOf(this.equippedTool) : 0;
		const len = this.tools.length;
		this.equippedTool = this.tools[((curIdx + step) % len + len) % len];
		this.syncHud();
	}

	public setVirtualInput(partial: Partial<VirtualInputState>): void {
		this.virtualInput = { ...this.virtualInput, ...partial };
	}

	public triggerAttack(): void {
		this.queueAttack();
	}

	public triggerDash(): void {
		this.queueDash();
	}

	public triggerTool(): void {
		this.queueTool();
	}

	private queueAttack(): void {
		if (this.paused || this.gameOver || this.isTransitioning) return;
		if (this.chestHoldTimer > 0) {
			if (this.chestHoldElapsed >= 0.42) {
				this.finishChestHold();
			}
			return;
		}
		this.attackBuffer = 0.13;
		this.tryConsumeActionBuffers();
	}

	private queueDash(): void {
		if (this.paused || this.gameOver || this.isTransitioning || this.chestHoldTimer > 0) return;
		this.dashBuffer = 0.13;
		this.tryConsumeActionBuffers();
	}

	private queueTool(): void {
		if (this.paused || this.gameOver || this.isTransitioning || this.chestHoldTimer > 0) return;
		this.toolBuffer = 0.13;
		this.tryConsumeActionBuffers();
	}

	private tryConsumeActionBuffers(): void {
		if (this.dashBuffer > 0 && this.dashCooldown <= 0 && this.dashTimer <= 0) {
			this.dashBuffer = 0;
			this.executeDash();
			return;
		}
		if (this.attackBuffer > 0 && this.swordCooldown <= 0 && this.dashTimer <= 0) {
			this.attackBuffer = 0;
			this.executeAttack();
			return;
		}
		if (this.toolBuffer > 0 && this.equippedTool && this.dashTimer <= 0) {
			if (this.executeTool()) {
				this.toolBuffer = 0;
			}
		}
	}

	private executeAttack(): void {
		sound.unlock();
		this.swordTimer = 0.14;
		this.swordCooldown = 0.23;
		this.swordHitIds.clear();
		sound.swordSwing();
	}

	private executeDash(): void {
		sound.unlock();
		const { dx, dy } = this.getMoveVector();
		if (dx !== 0 || dy !== 0) {
			const len = Math.hypot(dx, dy);
			this.dashDirX = dx / len;
			this.dashDirY = dy / len;
			if (Math.abs(dx) >= Math.abs(dy)) {
				this.heroFacing = dx < 0 ? 'left' : 'right';
			} else {
				this.heroFacing = dy < 0 ? 'up' : 'down';
			}
		} else {
			const fv = FACING_VEC[this.heroFacing];
			this.dashDirX = fv.x;
			this.dashDirY = fv.y;
		}

		const hasBoots = this.relics.includes('gale_boots');
		const hasAegis = this.relics.includes('aegis_charm');
		this.dashTimer = 0.17;
		this.dashCooldown = hasBoots ? 0.46 : 0.66;
		this.invulnTimer = Math.max(this.invulnTimer, hasAegis ? 0.36 : 0.25);
		sound.dash();
		this.spawnParticles(this.heroX, this.heroY + 5, 0xc8f5ff, 6, 45);
	}

	private executeTool(): boolean {
		if (!this.equippedTool) return false;
		sound.unlock();

		if (this.equippedTool === 'boomerang') {
			if (this.boomerang) return false;
			const fv = FACING_VEC[this.heroFacing];
			const sprite = this.add.sprite(this.heroX + fv.x * 8, this.heroY + fv.y * 8, 'objects', 22).setDepth(21);
			this.boomerang = {
				x: sprite.x,
				y: sprite.y,
				vx: fv.x * 170,
				vy: fv.y * 170,
				returning: false,
				age: 0,
				sprite,
				hitIds: new Set()
			};
			sound.boomerangThrow();
			return true;
		} else if (this.equippedTool === 'fire_rod') {
			if (this.fireCooldown > 0) return false;
			this.fireCooldown = 0.34;
			const fv = FACING_VEC[this.heroFacing];
			const sprite = this.add.sprite(this.heroX + fv.x * 10, this.heroY + fv.y * 10, 'objects', 28).setDepth(21);
			this.projectiles.push({
				kind: 'fireball',
				fromPlayer: true,
				x: sprite.x,
				y: sprite.y,
				vx: fv.x * 158,
				vy: fv.y * 158,
				sprite,
				life: 1.4
			});
			sound.fireballCast();
			return true;
		} else if (this.equippedTool === 'bomb') {
			if (this.bombs.length >= 2) return false;
			const fv = FACING_VEC[this.heroFacing];
			const bx = Phaser.Math.Clamp(this.heroX + fv.x * 10, TILE_SIZE * 1.4, ROOM_WIDTH - TILE_SIZE * 1.4);
			const by = Phaser.Math.Clamp(this.heroY + fv.y * 10, TILE_SIZE * 1.4, ROOM_HEIGHT - TILE_SIZE * 1.4);
			const sprite = this.add.sprite(bx, by, 'objects', 24).setDepth(14);
			this.bombs.push({ x: bx, y: by, fuse: 1.1, sprite });
			sound.bombPlace();
			return true;
		}
		return false;
	}

	public resetPushBlocks(): void {
		if (this.paused || this.gameOver || this.isTransitioning) return;
		const room = this.currentRoom();
		if (room.puzzle !== 'block_plate' || room.puzzleSolved || this.pushBlocks.length === 0) return;
		for (const pb of this.pushBlocks) {
			if (pb.moving) continue;
			pb.col = pb.initialCol;
			pb.row = pb.initialRow;
			pb.sprite.setPosition(this.tileCenterX(pb.col), this.tileCenterY(pb.row));
			this.spawnParticles(pb.sprite.x, pb.sprite.y, 0x7ef6ff, 6, 35);
		}
		this.updatePressurePlates();
		sound.crystalToggle();
		const t = getTranslations();
		hudStore.showToast(t.toasts.blocksResetTitle, t.toasts.blocksResetSub, 'cyan', 1600);
	}

	// ---- FLOOR & ROOM LIFECYCLE ----

	private loadFloor(floorNum: number, playAudio: boolean, persistCheckpoint = true): void {
		this.floorNumber = floorNum;
		this.keys = 0;
		this.floorData = generateDungeonFloor({
			floorNumber: floorNum,
			runSeed: this.runSeed,
			unlockedTools: this.tools,
			ownedRelics: this.relics
		});

		this.cameras.main.setBackgroundColor(this.floorData.biome.bgHex);
		this.currentRoomId = this.floorData.startRoomId;
		this.heroX = this.tileCenterX(7);
		this.heroY = this.tileCenterY(5);
		this.lastSafeX = this.heroX;
		this.lastSafeY = this.heroY;
		this.hero.setPosition(this.heroX, this.heroY);
		this.heroFacing = 'down';
		this.stairsCooldown = 0.8;

		this.clearTransientEntities();
		this.renderRoomIntoContainer(this.currentRoom(), this.roomLayer);

		if (playAudio && persistCheckpoint) {
			this.saveFloorCheckpoint();
		}

		if (playAudio) {
			const t = getTranslations();
			const biomeMeta = t.biomes[this.floorData.biome.id];
			sound.startBgm(this.floorData.biome);
			const subtitle = persistCheckpoint
				? `${biomeMeta.subtitle} · ${t.toasts.floorSavedSuffix}`
				: biomeMeta.subtitle;
			hudStore.showToast(t.toasts.floorTitle(floorNum, biomeMeta.name), subtitle, 'cyan', 2600);
		}
		this.syncHud();
	}

	private currentRoom(): RoomData {
		return this.floorData.rooms[this.currentRoomId];
	}

	private tileCenterX(col: number): number {
		return col * TILE_SIZE + TILE_SIZE / 2;
	}

	private tileCenterY(row: number): number {
		return row * TILE_SIZE + TILE_SIZE / 2;
	}

	private clearTransientEntities(): void {
		for (const e of this.enemies) {
			e.sprite.destroy();
			e.hpBarBg?.destroy();
			e.hpBarFill?.destroy();
		}
		this.enemies = [];

		for (const p of this.pickups) p.sprite.destroy();
		this.pickups = [];

		for (const pr of this.projectiles) pr.sprite.destroy();
		this.projectiles = [];

		if (this.boomerang) {
			this.boomerang.sprite.destroy();
			this.boomerang = null;
		}

		for (const b of this.bombs) b.sprite.destroy();
		this.bombs = [];

		this.swordGraphics.clear();
		this.aimGraphics.clear();
		this.pushCandidate = null;
		this.stairsGlow = null;
		this.clearHeldItemVisuals();
		this.chestHoldTimer = 0;
		this.chestHoldElapsed = 0;
	}

	private renderRoomIntoContainer(room: RoomData, container: Phaser.GameObjects.Container): void {
		container.removeAll(true);
		this.tileSprites = [];
		this.pushBlocks = [];
		this.crackedBlocks = [];
		this.braziers = [];
		this.crystalSwitches = [];
		this.toggleBarriers = [];
		this.chests = [];
		this.doorVisuals = [];
		this.spikes = [];
		this.stairsGlow = null;

		const tileRowOffset = this.floorData.biome.tileRow * 16;

		for (let r = 0; r < ROOM_ROWS; r++) {
			const rowArr: Phaser.GameObjects.Image[] = [];
			for (let c = 0; c < ROOM_COLS; c++) {
				const code = room.tiles[r][c];
				const tileImg = this.add.image(
					this.tileCenterX(c),
					this.tileCenterY(r),
					'tiles',
					tileRowOffset + code
				);
				container.add(tileImg);
				rowArr.push(tileImg);

				if (code === TileCode.StairsDown) {
					this.stairsGlow = this.add
						.circle(this.tileCenterX(c), this.tileCenterY(r), 10, 0x58f2c8, 0.22)
						.setBlendMode(Phaser.BlendModes.ADD);
					container.add(this.stairsGlow);
				}
			}
			this.tileSprites.push(rowArr);
		}

		const doorCoords: Record<CardinalDir, { col: number; row: number }> = {
			north: { col: 7, row: 0 },
			south: { col: 7, row: ROOM_ROWS - 1 },
			west: { col: 0, row: 5 },
			east: { col: ROOM_COLS - 1, row: 5 }
		};

		const shouldBarRoom = !room.cleared && room.enemies.length > 0 && room.puzzle === 'combat_clear';
		for (const dir of ['north', 'south', 'east', 'west'] as CardinalDir[]) {
			const spec = room.doors[dir];
			if (!spec) continue;
			spec.barred = shouldBarRoom;
			const { col, row } = doorCoords[dir];
			const doorSprite = this.add.sprite(this.tileCenterX(col), this.tileCenterY(row), 'objects', 7);
			if (spec.locked) {
				doorSprite.setTexture('tiles', tileRowOffset + TileCode.LockedSeal);
				doorSprite.setVisible(true);
			} else if (spec.barred) {
				doorSprite.setTexture('objects', 7);
				doorSprite.setVisible(true);
			} else {
				doorSprite.setVisible(false);
			}
			container.add(doorSprite);
			this.doorVisuals.push({ dir, col, row, sprite: doorSprite });
		}

		for (const tb of room.toggleBarriers) {
			const raised = tb.color === room.crystalState;
			const frame = tb.color === 'blue' ? (raised ? 8 : 9) : raised ? 10 : 11;
			const sp = this.add.sprite(this.tileCenterX(tb.col), this.tileCenterY(tb.row), 'objects', frame);
			container.add(sp);
			this.toggleBarriers.push({ col: tb.col, row: tb.row, color: tb.color, sprite: sp });
		}

		for (const s of room.spikes) {
			const sp = this.add.sprite(
				this.tileCenterX(s.col),
				this.tileCenterY(s.row),
				'tiles',
				tileRowOffset + TileCode.SpikesRetracted
			);
			container.add(sp);
			this.spikes.push({
				col: s.col,
				row: s.row,
				phaseOffset: s.phaseOffset,
				extended: false,
				sprite: sp
			});
		}

		for (const br of room.braziers) {
			const glow = this.add
				.circle(this.tileCenterX(br.col), this.tileCenterY(br.row) - 2, 16, 0xff9b33, br.lit ? 0.16 : 0)
				.setBlendMode(Phaser.BlendModes.ADD);
			const sp = this.add.sprite(
				this.tileCenterX(br.col),
				this.tileCenterY(br.row),
				'objects',
				br.lit ? 3 : 2
			);
			container.add(glow);
			container.add(sp);
			this.braziers.push({ col: br.col, row: br.row, lit: br.lit, sprite: sp, glow });
		}

		for (const cs of room.crystalSwitches) {
			const sp = this.add.sprite(
				this.tileCenterX(cs.col),
				this.tileCenterY(cs.row),
				'objects',
				room.crystalState === 'blue' ? 5 : 6
			);
			container.add(sp);
			this.crystalSwitches.push({ col: cs.col, row: cs.row, sprite: sp, cooldown: 0 });
		}

		for (const cb of room.crackedBlocks) {
			const sp = this.add.sprite(this.tileCenterX(cb.col), this.tileCenterY(cb.row), 'objects', 1);
			container.add(sp);
			this.crackedBlocks.push({ col: cb.col, row: cb.row, sprite: sp, destroyed: false });
		}

		for (const pb of room.pushBlocks) {
			const sp = this.add.sprite(this.tileCenterX(pb.col), this.tileCenterY(pb.row), 'objects', 0);
			if (room.puzzle === 'block_plate' && room.puzzleSolved) {
				sp.setTint(0xd4ffe8);
			}
			container.add(sp);
			this.pushBlocks.push({
				col: pb.col,
				row: pb.row,
				initialCol: pb.col,
				initialRow: pb.row,
				sprite: sp,
				moving: false
			});
		}

		for (const ch of room.chests) {
			const visible = !ch.hiddenUntilSolved || room.puzzleSolved || ch.opened;
			const frame = ch.ornate ? (ch.opened ? 15 : 14) : ch.opened ? 13 : 12;
			const sp = this.add
				.sprite(this.tileCenterX(ch.col), this.tileCenterY(ch.row), 'objects', frame)
				.setVisible(visible);
			container.add(sp);
			this.chests.push({ spec: ch, sprite: sp, visible });
		}

		if (!room.cleared) {
			for (const es of room.enemies) {
				this.spawnEnemy(es.id, es.kind, this.tileCenterX(es.col), this.tileCenterY(es.row), Boolean(es.elite));
			}
		}

		this.updatePressurePlates();
		if (shouldBarRoom && !this.paused) {
			sound.doorSlam();
		}
	}

	private spawnEnemy(id: string, kind: EnemyKind, x: number, y: number, elite: boolean): void {
		const rowMap: Record<EnemyKind, number> = {
			slime: 0,
			knight: 1,
			wizzrobe: 2,
			guardian: 3
		};
		const baseFrame = rowMap[kind] * 8 + (kind === 'slime' && elite ? 6 : 0);
		const sprite = this.add.sprite(x, y, 'enemies', baseFrame).setDepth(16);

		const floorScale = Math.floor((this.floorNumber - 1) / 3);
		let maxHp = 2 + floorScale;
		if (kind === 'knight') maxHp = 3 + floorScale;
		if (kind === 'wizzrobe') maxHp = 2 + floorScale;
		if (kind === 'guardian') maxHp = 10 + this.floorNumber * 2;
		if (elite && kind !== 'guardian') {
			maxHp += 2;
			sprite.setTint(0xffb8ff);
		}
		if (kind === 'guardian') {
			sprite.setScale(1.25);
		}

		const enemy: ActiveEnemy = {
			id,
			kind,
			elite,
			x,
			y,
			vx: 0,
			vy: 0,
			hp: maxHp,
			maxHp,
			facing: 'down',
			sprite,
			stunTimer: 0,
			hurtTimer: 0,
			aiTimer: 0.4 + Math.random() * 0.6,
			aiState: kind === 'knight' ? 'move' : 'idle',
			turnTimer: 0.45,
			guardHits: 0,
			guardResetTimer: 0,
			animTime: Math.random() * 4,
			knockVx: 0,
			knockVy: 0
		};

		if (kind === 'guardian' || elite) {
			const barW = kind === 'guardian' ? 28 : 16;
			enemy.hpBarBg = this.add.rectangle(x, y - 16, barW, 3, 0x16121a).setDepth(23);
			enemy.hpBarFill = this.add.rectangle(x, y - 16, barW - 2, 1.5, 0xff425b).setDepth(24);
		}

		this.enemies.push(enemy);
	}

	// ---- ROOM TRANSITION ----

	private transitionToRoom(dir: CardinalDir): void {
		const room = this.currentRoom();
		const door = room.doors[dir];
		if (!door) return;

		if (door.barred) return;
		if (door.locked) {
			const t = getTranslations();
			if (this.keys > 0) {
				this.keys--;
				door.locked = false;
				sound.doorUnlock();
				const dv = this.doorVisuals.find((d) => d.dir === dir);
				if (dv) {
					dv.sprite.setVisible(false);
					this.spawnParticles(dv.sprite.x, dv.sprite.y, 0xffd559, 14, 65);
				}
				hudStore.showToast(t.toasts.gateUnlockedTitle, t.toasts.gateUnlockedSub, 'gold', 2200);
				this.syncHud();
			} else {
				if (this.lockNoticeCooldown <= 0) {
					this.lockNoticeCooldown = 1.6;
					sound.shieldClink();
					hudStore.showToast(t.toasts.doorLockedTitle, t.toasts.doorLockedSub, 'crimson', 2000);
				}
				return;
			}
		}

		const targetRoom = this.floorData.rooms[door.targetRoomId];
		if (!targetRoom) return;

		this.isTransitioning = true;
		this.clearTransientEntities();

		const dirVec: Record<CardinalDir, { dx: number; dy: number; spawnCol: number; spawnRow: number }> = {
			north: { dx: 0, dy: -1, spawnCol: 7, spawnRow: ROOM_ROWS - 2 },
			south: { dx: 0, dy: 1, spawnCol: 7, spawnRow: 1 },
			west: { dx: -1, dy: 0, spawnCol: ROOM_COLS - 2, spawnRow: 5 },
			east: { dx: 1, dy: 0, spawnCol: 1, spawnRow: 5 }
		};
		const { dx, dy, spawnCol, spawnRow } = dirVec[dir];

		const oldLayer = this.roomLayer;
		const newLayer = this.add.container(dx * ROOM_WIDTH, dy * ROOM_HEIGHT).setDepth(1);
		this.roomLayer = newLayer;

		this.currentRoomId = targetRoom.id;
		targetRoom.discovered = true;
		this.renderRoomIntoContainer(targetRoom, newLayer);

		const destX = this.tileCenterX(spawnCol);
		const destY = this.tileCenterY(spawnRow);

		for (const e of this.enemies) {
			e.sprite.setVisible(false);
			e.hpBarBg?.setVisible(false);
			e.hpBarFill?.setVisible(false);
		}

		this.tweens.add({
			targets: oldLayer,
			x: -dx * ROOM_WIDTH,
			y: -dy * ROOM_HEIGHT,
			duration: 250,
			ease: 'Cubic.easeOut'
		});

		this.tweens.add({
			targets: newLayer,
			x: 0,
			y: 0,
			duration: 250,
			ease: 'Cubic.easeOut'
		});

		this.tweens.add({
			targets: this.hero,
			x: destX,
			y: destY,
			duration: 250,
			ease: 'Cubic.easeOut',
			onComplete: () => {
				oldLayer.destroy(true);
				this.heroX = destX;
				this.heroY = destY;
				this.lastSafeX = destX;
				this.lastSafeY = destY;
				this.hero.setPosition(destX, destY);
				this.isTransitioning = false;
				for (const e of this.enemies) {
					e.sprite.setVisible(true);
					e.hpBarBg?.setVisible(true);
					e.hpBarFill?.setVisible(true);
				}
				this.syncHud();
			}
		});
	}

	// ---- MAIN UPDATE LOOP ----

	update(_time: number, deltaMs: number): void {
		const dt = Math.min(0.05, deltaMs / 1000);

		this.animateRoomAmbience(dt);

		if (this.paused || this.gameOver || this.isTransitioning) {
			return;
		}

		if (this.chestHoldTimer > 0) {
			this.updateChestHold(dt);
			return;
		}

		if (this.hitStopTimer > 0) {
			this.hitStopTimer -= dt;
			return;
		}

		this.invulnTimer = Math.max(0, this.invulnTimer - dt);
		this.swordCooldown = Math.max(0, this.swordCooldown - dt);
		this.dashCooldown = Math.max(0, this.dashCooldown - dt);
		this.fireCooldown = Math.max(0, this.fireCooldown - dt);
		this.lockNoticeCooldown = Math.max(0, this.lockNoticeCooldown - dt);
		this.stairsCooldown = Math.max(0, this.stairsCooldown - dt);

		this.attackBuffer = Math.max(0, this.attackBuffer - dt);
		this.dashBuffer = Math.max(0, this.dashBuffer - dt);
		this.toolBuffer = Math.max(0, this.toolBuffer - dt);

		if (this.mouseAimActive) {
			this.mouseIdleTimer -= dt;
			if (this.mouseIdleTimer <= 0) {
				this.mouseAimActive = false;
			}
		}

		for (const cs of this.crystalSwitches) {
			cs.cooldown = Math.max(0, cs.cooldown - dt);
		}

		this.tryConsumeActionBuffers();
		this.updateSpikes(dt);
		this.updateHero(dt);
		this.drawAimIndicator();
		this.updateSword(dt);
		this.updateBoomerang(dt);
		this.updateProjectiles(dt);
		this.updateBombs(dt);
		this.updateEnemies(dt);
		this.updatePickups(dt);
		this.checkChestInteraction();
		this.checkStairsDescent();
	}

	private drawAimIndicator(): void {
		this.aimGraphics.clear();
		if (!this.mouseAimActive || this.paused || this.gameOver) return;

		const ang = Phaser.Math.Angle.Between(this.heroX, this.heroY + 2, this.mouseWorldX, this.mouseWorldY);
		const dist = 13;
		const tipX = this.heroX + Math.cos(ang) * dist;
		const tipY = this.heroY + 2 + Math.sin(ang) * dist;
		const wingA = ang + 2.45;
		const wingB = ang - 2.45;

		this.aimGraphics.fillStyle(0x58f2c8, 0.55);
		this.aimGraphics.fillTriangle(
			tipX,
			tipY,
			tipX + Math.cos(wingA) * 3.8,
			tipY + Math.sin(wingA) * 3.8,
			tipX + Math.cos(wingB) * 3.8,
			tipY + Math.sin(wingB) * 3.8
		);
	}

	private animateRoomAmbience(dt: number): void {
		const t = this.time.now * 0.008;
		for (const br of this.braziers) {
			if (br.lit) {
				const frame = Math.floor(t + br.col) % 2 === 0 ? 3 : 4;
				br.sprite.setFrame(frame);
				br.glow.setAlpha(0.14 + Math.sin(t * 2 + br.row) * 0.04);
			}
		}
		if (this.stairsGlow) {
			const room = this.currentRoom();
			const ready = room.cleared;
			this.stairsGlow.setFillStyle(ready ? 0x58f2c8 : 0xff425b, ready ? 0.25 + Math.sin(t) * 0.1 : 0.14);
		}
		for (const p of this.pickups) {
			p.age += dt;
			p.sprite.y = p.y + Math.sin(p.age * 5) * 1.5;
		}
	}

	private updateSpikes(dt: number): void {
		if (this.spikes.length === 0) return;
		this.spikeCycleTimer += dt;
		const tileRowOffset = this.floorData.biome.tileRow * 16;

		for (const sp of this.spikes) {
			const cycle = (this.spikeCycleTimer + sp.phaseOffset * 1.1) % 2.2;
			sp.extended = cycle > 1.2;
			sp.sprite.setFrame(tileRowOffset + (sp.extended ? TileCode.SpikesExtended : TileCode.SpikesRetracted));

			if (sp.extended && this.dashTimer <= 0 && this.invulnTimer <= 0) {
				const dx = Math.abs(this.heroX - this.tileCenterX(sp.col));
				const dy = Math.abs(this.heroY + 3 - this.tileCenterY(sp.row));
				if (dx < 6.5 && dy < 6.5) {
					this.damageHero(1, this.tileCenterX(sp.col), this.tileCenterY(sp.row));
				}
			}
		}
	}

	private getMoveVector(): { dx: number; dy: number } {
		let dx = 0;
		let dy = 0;
		if (this.cursors?.left?.isDown || this.keyA?.isDown || this.virtualInput.left) dx -= 1;
		if (this.cursors?.right?.isDown || this.keyD?.isDown || this.virtualInput.right) dx += 1;
		if (this.cursors?.up?.isDown || this.keyW?.isDown || this.virtualInput.up) dy -= 1;
		if (this.cursors?.down?.isDown || this.keyS?.isDown || this.virtualInput.down) dy += 1;
		return { dx, dy };
	}

	private updateHero(dt: number): void {
		const { dx, dy } = this.getMoveVector();

		if (this.swordTimer <= 0 && this.dashTimer <= 0) {
			if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
				if (Math.abs(dx) >= Math.abs(dy)) {
					this.heroFacing = dx < 0 ? 'left' : 'right';
				} else {
					this.heroFacing = dy < 0 ? 'up' : 'down';
				}
			}
		}

		const baseSpeed = this.relics.includes('gale_boots') ? 106 : 90;
		let vx = 0;
		let vy = 0;

		const wasDashing = this.dashTimer > 0;
		if (wasDashing) {
			this.dashTimer = Math.max(0, this.dashTimer - dt);
			vx = this.dashDirX * 212;
			vy = this.dashDirY * 212;

			this.ghostSpawnTimer -= dt;
			if (this.ghostSpawnTimer <= 0) {
				this.ghostSpawnTimer = 0.04;
				const ghost = this.add
					.sprite(this.heroX, this.heroY, 'hero', FACING_VEC[this.heroFacing].row * 8 + 6)
					.setTint(0x7ef6ff)
					.setAlpha(0.45)
					.setDepth(17);
				this.tweens.add({
					targets: ghost,
					alpha: 0,
					duration: 170,
					onComplete: () => ghost.destroy()
				});
			}
		} else if (Math.hypot(this.hurtKnockVx, this.hurtKnockVy) > 15) {
			vx = this.hurtKnockVx;
			vy = this.hurtKnockVy;
			this.hurtKnockVx *= Math.pow(0.02, dt);
			this.hurtKnockVy *= Math.pow(0.02, dt);
		} else {
			if (dx !== 0 || dy !== 0) {
				const len = Math.hypot(dx, dy);
				const swingSlow = this.swordTimer > 0 ? 0.55 : 1;
				vx = (dx / len) * baseSpeed * swingSlow;
				vy = (dy / len) * baseSpeed * swingSlow;
			}
		}

		const ignoreHazards = wasDashing;

		// Horizontal move with forgiving corner-sliding (even on diagonal doorway approach!)
		if (vx !== 0) {
			const nextX = this.heroX + vx * dt;
			if (!this.collidesAt(nextX, this.heroY, ignoreHazards)) {
				this.heroX = nextX;
			} else if (!wasDashing) {
				for (const nudge of [-1, 1]) {
					if (!this.collidesAt(nextX, this.heroY + nudge * 5.5, ignoreHazards)) {
						this.heroY += nudge * baseSpeed * 0.65 * dt;
						break;
					}
				}
			}
		}

		// Vertical move with forgiving corner-sliding
		if (vy !== 0) {
			const nextY = this.heroY + vy * dt;
			if (!this.collidesAt(this.heroX, nextY, ignoreHazards)) {
				this.heroY = nextY;
			} else if (!wasDashing) {
				for (const nudge of [-1, 1]) {
					if (!this.collidesAt(this.heroX + nudge * 5.5, nextY, ignoreHazards)) {
						this.heroX += nudge * baseSpeed * 0.65 * dt;
						break;
					}
				}
			}
		}

		// Ensure hero never stays trapped on a Pit/Water hazard or raised barrier after dashing!
		if (this.dashTimer <= 0) {
			this.resolveHazardOrStuckPosition();
		}

		this.updatePushBlockIntent(dx, dy, dt);

		// Forgiving doorway transitions
		const midX = this.tileCenterX(7);
		const midY = this.tileCenterY(5);
		if (this.heroY < 15 && Math.abs(this.heroX - midX) < 13 && this.currentRoom().doors.north) {
			this.transitionToRoom('north');
			return;
		}
		if (this.heroY > ROOM_HEIGHT - 15 && Math.abs(this.heroX - midX) < 13 && this.currentRoom().doors.south) {
			this.transitionToRoom('south');
			return;
		}
		if (this.heroX < 15 && Math.abs(this.heroY - midY) < 13 && this.currentRoom().doors.west) {
			this.transitionToRoom('west');
			return;
		}
		if (this.heroX > ROOM_WIDTH - 15 && Math.abs(this.heroY - midY) < 13 && this.currentRoom().doors.east) {
			this.transitionToRoom('east');
			return;
		}

		this.hero.setPosition(Math.round(this.heroX), Math.round(this.heroY));
		const row = FACING_VEC[this.heroFacing].row;
		let col = 0;
		if (this.dashTimer > 0) {
			col = 6;
		} else if (this.swordTimer > 0) {
			col = this.swordTimer > 0.07 ? 4 : 5;
		} else if (dx !== 0 || dy !== 0) {
			this.heroAnimTime += dt * 9.5;
			col = Math.floor(this.heroAnimTime) % 4;
		} else {
			col = 0;
		}
		this.hero.setFrame(row * 8 + col);

		if (this.invulnTimer > 0 && this.dashTimer <= 0) {
			this.hero.setAlpha(Math.floor(this.time.now / 55) % 2 === 0 ? 0.45 : 1);
		} else {
			this.hero.setAlpha(1);
		}
	}

	private resolveHazardOrStuckPosition(): void {
		if (!this.collidesAt(this.heroX, this.heroY, false)) {
			this.lastSafeX = this.heroX;
			this.lastSafeY = this.heroY;
			return;
		}

		// Step 1: Generous ledge-snap if the player barely clipped the far edge of a 1-tile chasm/water
		if (Math.hypot(this.dashDirX, this.dashDirY) > 0.1) {
			for (const dist of [2, 4, 6, 8, 10, 12]) {
				const cx = this.heroX + this.dashDirX * dist;
				const cy = this.heroY + this.dashDirY * dist;
				if (!this.collidesAt(cx, cy, false)) {
					this.heroX = cx;
					this.heroY = cy;
					this.lastSafeX = cx;
					this.lastSafeY = cy;
					return;
				}
			}
		}

		const dirs: [number, number][] = [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1],
			[0.707, 0.707],
			[-0.707, 0.707],
			[0.707, -0.707],
			[-0.707, -0.707]
		];
		for (const dist of [3, 6, 9, 11]) {
			for (const [ox, oy] of dirs) {
				const cx = this.heroX + ox * dist;
				const cy = this.heroY + oy * dist;
				if (!this.collidesAt(cx, cy, false)) {
					this.heroX = cx;
					this.heroY = cy;
					this.lastSafeX = cx;
					this.lastSafeY = cy;
					return;
				}
			}
		}

		// Step 2: Deep inside a multi-tile pit/water basin — rescue cleanly back to last safe ground
		this.spawnParticles(this.heroX, this.heroY + 3, 0x62b8d9, 10, 55);
		sound.dash();
		this.hurtKnockVx = 0;
		this.hurtKnockVy = 0;
		this.invulnTimer = Math.max(this.invulnTimer, 0.35);
		this.heroX = this.lastSafeX;
		this.heroY = this.lastSafeY;
		this.spawnParticles(this.heroX, this.heroY + 3, 0xc8f5ff, 6, 40);
	}

	private updatePushBlockIntent(dx: number, dy: number, dt: number): void {
		if (
			this.currentRoom().puzzleSolved ||
			(dx !== 0 && dy !== 0) ||
			(dx === 0 && dy === 0) ||
			this.dashTimer > 0 ||
			this.swordTimer > 0
		) {
			if (this.pushCandidate && !this.pushCandidate.block.moving) {
				this.pushCandidate.block.sprite.setPosition(
					this.tileCenterX(this.pushCandidate.block.col),
					this.tileCenterY(this.pushCandidate.block.row)
				);
			}
			this.pushCandidate = null;
			return;
		}

		const probeX = this.heroX + dx * 9.5;
		const probeY = this.heroY + 3 + dy * 9.5;
		const col = Math.floor(probeX / TILE_SIZE);
		const row = Math.floor(probeY / TILE_SIZE);

		const block = this.pushBlocks.find((b) => !b.moving && b.col === col && b.row === row);
		if (!block) {
			if (this.pushCandidate && !this.pushCandidate.block.moving) {
				this.pushCandidate.block.sprite.setPosition(
					this.tileCenterX(this.pushCandidate.block.col),
					this.tileCenterY(this.pushCandidate.block.row)
				);
			}
			this.pushCandidate = null;
			return;
		}

		if (
			this.pushCandidate &&
			this.pushCandidate.block === block &&
			this.pushCandidate.dx === dx &&
			this.pushCandidate.dy === dy
		) {
			this.pushCandidate.timer += dt;
			// Tactile 1px lean feedback so player immediately feels the block engaging
			block.sprite.setPosition(
				this.tileCenterX(block.col) + dx * 1,
				this.tileCenterY(block.row) + dy * 1
			);
			if (this.pushCandidate.timer >= 0.11) {
				this.tryPushBlock(block, dx, dy);
				this.pushCandidate = null;
			}
		} else {
			this.pushCandidate = { block, dx, dy, timer: 0 };
		}
	}

	private tryPushBlock(block: ActivePushBlock, dx: number, dy: number): void {
		const resetPos = () => {
			block.sprite.setPosition(this.tileCenterX(block.col), this.tileCenterY(block.row));
		};

		if (this.currentRoom().puzzleSolved) {
			resetPos();
			return;
		}

		const destCol = block.col + dx;
		const destRow = block.row + dy;

		if (destCol < 1 || destCol > ROOM_COLS - 2 || destRow < 1 || destRow > ROOM_ROWS - 2) {
			resetPos();
			return;
		}

		const tile = this.currentRoom().tiles[destRow][destCol];
		const allowedTile =
			tile === TileCode.FloorA ||
			tile === TileCode.FloorB ||
			tile === TileCode.FloorC ||
			tile === TileCode.Medallion ||
			tile === TileCode.PlateUnpressed ||
			tile === TileCode.PlatePressed;
		if (!allowedTile) {
			resetPos();
			return;
		}

		if (
			this.pushBlocks.some((b) => b !== block && b.col === destCol && b.row === destRow) ||
			this.crackedBlocks.some((b) => !b.destroyed && b.col === destCol && b.row === destRow) ||
			this.braziers.some((b) => b.col === destCol && b.row === destRow) ||
			this.crystalSwitches.some((c) => c.col === destCol && c.row === destRow) ||
			this.chests.some((c) => c.visible && c.spec.col === destCol && c.spec.row === destRow) ||
			this.toggleBarriers.some((tb) => tb.col === destCol && tb.row === destRow)
		) {
			resetPos();
			return;
		}

		block.moving = true;
		block.col = destCol;
		block.row = destRow;
		sound.blockPush();

		this.tweens.add({
			targets: block.sprite,
			x: this.tileCenterX(destCol),
			y: this.tileCenterY(destRow),
			duration: 155,
			ease: 'Sine.easeInOut',
			onComplete: () => {
				block.moving = false;
				this.updatePressurePlates();
			}
		});
	}

	private updatePressurePlates(): void {
		const room = this.currentRoom();
		const tileRowOffset = this.floorData.biome.tileRow * 16;
		let totalPlates = 0;
		let coveredPlates = 0;

		for (let r = 1; r < ROOM_ROWS - 1; r++) {
			for (let c = 1; c < ROOM_COLS - 1; c++) {
				const code = room.tiles[r][c];
				if (code === TileCode.PlateUnpressed || code === TileCode.PlatePressed) {
					totalPlates++;
					const covered = this.pushBlocks.some((b) => b.col === c && b.row === r);
					if (covered) coveredPlates++;
					const nextCode = covered ? TileCode.PlatePressed : TileCode.PlateUnpressed;
					room.tiles[r][c] = nextCode;
					this.tileSprites[r]?.[c]?.setFrame(tileRowOffset + nextCode);
				}
			}
		}

		if (totalPlates > 0 && coveredPlates === totalPlates && !room.puzzleSolved) {
			room.pushBlocks = this.pushBlocks.map((b) => ({ col: b.col, row: b.row }));
			this.pushCandidate = null;
			for (const b of this.pushBlocks) {
				b.sprite.setTint(0xd4ffe8);
				this.spawnParticles(b.sprite.x, b.sprite.y, 0x58f2c8, 8, 45);
			}
			this.markPuzzleSolved(getTranslations().toasts.platesActivated);
		}
	}

	private collidesAt(x: number, y: number, ignoreHazards = false): boolean {
		const halfW = 4.2;
		const footY = y + 3;
		const halfH = 4.2;

		const corners: [number, number][] = [
			[x - halfW, footY - halfH],
			[x + halfW, footY - halfH],
			[x - halfW, footY + halfH],
			[x + halfW, footY + halfH]
		];

		for (const [cx, cy] of corners) {
			const col = Math.floor(cx / TILE_SIZE);
			const row = Math.floor(cy / TILE_SIZE);
			if (this.isTileSolid(col, row, ignoreHazards)) {
				return true;
			}
		}
		return false;
	}

	private isTileSolid(col: number, row: number, ignoreHazards = false): boolean {
		if (col < 0 || col >= ROOM_COLS || row < 0 || row >= ROOM_ROWS) return true;
		const room = this.currentRoom();
		const code = room.tiles[row][col];

		if (code === TileCode.DoorFloor) {
			for (const dv of this.doorVisuals) {
				if (dv.col === col && dv.row === row) {
					const doorSpec = room.doors[dv.dir];
					if (doorSpec?.barred) return true;
					if (doorSpec?.locked) {
						if (this.keys > 0) {
							this.transitionToRoom(dv.dir);
							return false;
						}
						if (this.lockNoticeCooldown <= 0) {
							this.lockNoticeCooldown = 1.6;
							sound.shieldClink();
							const t = getTranslations();
							hudStore.showToast(t.toasts.doorLockedTitle, t.toasts.doorLockedSub, 'crimson', 2000);
						}
						return true;
					}
				}
			}
			return false;
		}

		if (code === TileCode.WallTop || code === TileCode.WallFront || code === TileCode.Pillar) {
			return true;
		}
		if (!ignoreHazards && (code === TileCode.Pit || code === TileCode.Hazard)) {
			return true;
		}

		if (this.pushBlocks.some((b) => b.col === col && b.row === row)) return true;
		if (this.crackedBlocks.some((b) => !b.destroyed && b.col === col && b.row === row)) return true;
		if (this.braziers.some((b) => b.col === col && b.row === row)) return true;
		if (this.crystalSwitches.some((c) => c.col === col && c.row === row)) return true;
		if (this.chests.some((c) => c.visible && c.spec.col === col && c.spec.row === row)) return true;
		if (this.toggleBarriers.some((tb) => tb.col === col && tb.row === row && tb.color === room.crystalState)) {
			return true;
		}

		return false;
	}

	// ---- SWORD & TOOLS ----

	private updateSword(dt: number): void {
		this.swordGraphics.clear();
		if (this.swordTimer <= 0) return;

		this.swordTimer -= dt;
		const progress = 1 - Math.max(0, this.swordTimer) / 0.14;
		const hasSolar = this.relics.includes('solar_blade');
		const hasAegis = this.relics.includes('aegis_charm');
		const radius = hasAegis ? 20 : 17;

		const baseAngles: Record<FacingDir, number> = {
			right: 0,
			down: Math.PI / 2,
			left: Math.PI,
			up: -Math.PI / 2
		};
		const centerAngle = baseAngles[this.heroFacing];
		const sweepHalf = hasAegis ? 1.25 : 1.08;
		const startA = centerAngle - sweepHalf;
		const endA = centerAngle - sweepHalf + sweepHalf * 2 * Math.min(1, progress * 1.25);

		this.swordGraphics.lineStyle(4, hasSolar ? 0xffc845 : 0x8cd6ff, 0.78);
		this.swordGraphics.beginPath();
		this.swordGraphics.arc(this.heroX, this.heroY + 2, radius, startA, endA, false);
		this.swordGraphics.strokePath();

		this.swordGraphics.lineStyle(2, 0xffffff, 0.95);
		this.swordGraphics.beginPath();
		this.swordGraphics.arc(this.heroX, this.heroY + 2, radius - 1.5, startA + 0.15, endA, false);
		this.swordGraphics.strokePath();

		const fv = FACING_VEC[this.heroFacing];
		const hitX = this.heroX + fv.x * 13;
		const hitY = this.heroY + 2 + fv.y * 13;
		const hitRadius = hasAegis ? 16.5 : 14;

		const swordDamage = 1 + this.relics.filter((r) => r === 'solar_blade').length;

		for (const enemy of [...this.enemies]) {
			if (this.swordHitIds.has(enemy.id)) continue;
			if (Phaser.Math.Distance.Between(hitX, hitY, enemy.x, enemy.y) <= hitRadius + (enemy.kind === 'guardian' ? 6 : 3.5)) {
				this.swordHitIds.add(enemy.id);

				if (
					enemy.kind === 'knight' &&
					enemy.stunTimer <= 0 &&
					enemy.aiState === 'move' &&
					this.isFrontalBlock(enemy)
				) {
					enemy.guardHits++;
					enemy.guardResetTimer = 1.6;
					const pushHeroAng = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.heroX, this.heroY);
					const pushEnemyAng = Phaser.Math.Angle.Between(this.heroX, this.heroY, enemy.x, enemy.y);

					if (enemy.guardHits >= 2) {
						// 2 consecutive frontal strikes break the Knight's guard!
						enemy.guardHits = 0;
						enemy.stunTimer = 1.05;
						enemy.knockVx = Math.cos(pushEnemyAng) * 95;
						enemy.knockVy = Math.sin(pushEnemyAng) * 95;
						sound.enemyHit();
						this.spawnParticles(enemy.x, enemy.y, 0x7ef6ff, 12, 80);
					} else {
						sound.shieldClink();
						this.spawnParticles(enemy.x, enemy.y, 0xfff0a8, 7, 65);
						this.hurtKnockVx = Math.cos(pushHeroAng) * 75;
						this.hurtKnockVy = Math.sin(pushHeroAng) * 75;
						enemy.knockVx = Math.cos(pushEnemyAng) * 55;
						enemy.knockVy = Math.sin(pushEnemyAng) * 55;
					}
					continue;
				}

				this.damageEnemy(enemy, swordDamage, this.heroX, this.heroY, true);
			}
		}

		for (const cs of this.crystalSwitches) {
			if (cs.cooldown > 0) continue;
			const sx = this.tileCenterX(cs.col);
			const sy = this.tileCenterY(cs.row);
			if (Phaser.Math.Distance.Between(hitX, hitY, sx, sy) <= hitRadius + 4) {
				this.flipCrystalSwitches(cs);
			}
		}

		for (const ch of this.chests) {
			if (!ch.visible || ch.spec.opened) continue;
			const cx = this.tileCenterX(ch.spec.col);
			const cy = this.tileCenterY(ch.spec.row);
			if (Phaser.Math.Distance.Between(hitX, hitY, cx, cy) <= hitRadius + 3) {
				this.openChest(ch);
			}
		}
	}

	private isFrontalBlock(enemy: ActiveEnemy): boolean {
		const dx = this.heroX - enemy.x;
		const dy = this.heroY - enemy.y;
		const ev = FACING_VEC[enemy.facing];
		const dot = dx * ev.x + dy * ev.y;
		const dist = Math.hypot(dx, dy) || 1;
		return dot / dist > 0.62;
	}

	private flipCrystalSwitches(source: ActiveCrystalSwitch): void {
		const room = this.currentRoom();
		if (
			room.puzzle === 'crystal_gate' &&
			room.crystalState === 'red' &&
			room.chests.length > 0 &&
			room.chests.every((c) => c.opened)
		) {
			return;
		}

		source.cooldown = 0.35;
		room.crystalState = room.crystalState === 'blue' ? 'red' : 'blue';
		sound.crystalToggle();

		for (const cs of this.crystalSwitches) {
			cs.cooldown = 0.35;
			cs.sprite.setFrame(room.crystalState === 'blue' ? 5 : 6);
			this.spawnParticles(
				cs.sprite.x,
				cs.sprite.y,
				room.crystalState === 'blue' ? 0x3da6ff : 0xff425b,
				8,
				55
			);
		}

		for (const tb of this.toggleBarriers) {
			const raised = tb.color === room.crystalState;
			const frame = tb.color === 'blue' ? (raised ? 8 : 9) : raised ? 10 : 11;
			tb.sprite.setFrame(frame);
		}
	}

	private updateBoomerang(dt: number): void {
		const bm = this.boomerang;
		if (!bm) return;

		bm.age += dt;
		bm.sprite.rotation += dt * 18;

		if (!bm.returning && bm.age >= 0.52) {
			bm.returning = true;
		}

		if (bm.returning) {
			const ang = Phaser.Math.Angle.Between(bm.x, bm.y, this.heroX, this.heroY);
			bm.vx = Math.cos(ang) * 195;
			bm.vy = Math.sin(ang) * 195;
			if (Phaser.Math.Distance.Between(bm.x, bm.y, this.heroX, this.heroY) < 12 || bm.age > 2.4) {
				bm.sprite.destroy();
				this.boomerang = null;
				return;
			}
		}

		bm.x += bm.vx * dt;
		bm.y += bm.vy * dt;
		bm.sprite.setPosition(bm.x, bm.y);

		const col = Math.floor(bm.x / TILE_SIZE);
		const row = Math.floor(bm.y / TILE_SIZE);
		if (
			!bm.returning &&
			(col <= 0 ||
				col >= ROOM_COLS - 1 ||
				row <= 0 ||
				row >= ROOM_ROWS - 1 ||
				this.currentRoom().tiles[row]?.[col] === TileCode.Pillar)
		) {
			bm.returning = true;
			sound.shieldClink();
			this.spawnParticles(bm.x, bm.y, 0x9ce2ff, 5, 45);
		}

		for (const cs of this.crystalSwitches) {
			if (cs.cooldown > 0) continue;
			if (Phaser.Math.Distance.Between(bm.x, bm.y, cs.sprite.x, cs.sprite.y) < 12) {
				this.flipCrystalSwitches(cs);
				bm.returning = true;
			}
		}

		for (const e of [...this.enemies]) {
			if (bm.hitIds.has(e.id)) continue;
			if (Phaser.Math.Distance.Between(bm.x, bm.y, e.x, e.y) < 13) {
				bm.hitIds.add(e.id);
				e.stunTimer = e.kind === 'guardian' ? 0.9 : 2.1;
				this.spawnParticles(e.x, e.y - 6, 0xfff0a8, 7, 50);
				if (e.kind === 'slime' || e.kind === 'wizzrobe') {
					this.damageEnemy(e, 1, bm.x, bm.y, false);
				} else {
					sound.enemyHit();
				}
				bm.returning = true;
			}
		}

		for (const p of this.pickups) {
			if (Phaser.Math.Distance.Between(bm.x, bm.y, p.x, p.y) < 14) {
				p.x = bm.x;
				p.y = bm.y;
				p.sprite.setPosition(p.x, p.y);
			}
		}
	}

	private updateProjectiles(dt: number): void {
		for (let i = this.projectiles.length - 1; i >= 0; i--) {
			const pr = this.projectiles[i];
			pr.life -= dt;
			pr.x += pr.vx * dt;
			pr.y += pr.vy * dt;
			pr.sprite.setPosition(pr.x, pr.y);
			pr.sprite.rotation += dt * 10;

			let destroy = pr.life <= 0;
			const col = Math.floor(pr.x / TILE_SIZE);
			const row = Math.floor(pr.y / TILE_SIZE);
			const tile = this.currentRoom().tiles[row]?.[col];

			if (
				col <= 0 ||
				col >= ROOM_COLS - 1 ||
				row <= 0 ||
				row >= ROOM_ROWS - 1 ||
				tile === TileCode.WallTop ||
				tile === TileCode.WallFront ||
				tile === TileCode.Pillar
			) {
				destroy = true;
			}

			if (pr.fromPlayer && pr.kind === 'fireball') {
				for (const br of this.braziers) {
					if (!br.lit && Phaser.Math.Distance.Between(pr.x, pr.y, br.sprite.x, br.sprite.y) < 12) {
						br.lit = true;
						br.sprite.setFrame(3);
						br.glow.setAlpha(0.18);
						sound.brazierIgnite();
						this.spawnParticles(br.sprite.x, br.sprite.y - 3, 0xff9b29, 10, 55);
						this.checkBraziersPuzzle();
						destroy = true;
					}
				}
				for (const e of [...this.enemies]) {
					if (Phaser.Math.Distance.Between(pr.x, pr.y, e.x, e.y) < 12) {
						this.damageEnemy(e, 2, pr.x, pr.y, false);
						this.spawnParticles(e.x, e.y, 0xff8c24, 9, 60);
						destroy = true;
						break;
					}
				}
			} else if (!pr.fromPlayer) {
				if (this.invulnTimer <= 0 && Phaser.Math.Distance.Between(pr.x, pr.y, this.heroX, this.heroY + 2) < 9) {
					this.damageHero(1, pr.x, pr.y);
					destroy = true;
				}
			}

			if (destroy) {
				this.spawnParticles(pr.x, pr.y, pr.kind === 'fireball' ? 0xff9b29 : 0xcc54ff, 5, 40);
				pr.sprite.destroy();
				this.projectiles.splice(i, 1);
			}
		}
	}

	private checkBraziersPuzzle(): void {
		const room = this.currentRoom();
		if (room.puzzle !== 'light_braziers' || room.puzzleSolved) return;
		if (this.braziers.length > 0 && this.braziers.every((b) => b.lit)) {
			room.braziers.forEach((b) => (b.lit = true));
			this.markPuzzleSolved(getTranslations().toasts.braziersLit);
		}
	}

	private updateBombs(dt: number): void {
		for (let i = this.bombs.length - 1; i >= 0; i--) {
			const b = this.bombs[i];
			b.fuse -= dt;
			const flashFreq = b.fuse < 0.4 ? 22 : 10;
			b.sprite.setFrame(Math.floor(b.fuse * flashFreq) % 2 === 0 ? 25 : 24);

			if (b.fuse <= 0) {
				this.detonateBomb(b.x, b.y);
				b.sprite.destroy();
				this.bombs.splice(i, 1);
			}
		}
	}

	private detonateBomb(x: number, y: number): void {
		sound.bombExplode();
		this.cameras.main.shake(150, 0.012);
		this.spawnParticles(x, y, 0xff8824, 16, 85);
		this.spawnParticles(x, y, 0xfff085, 8, 55);

		const blast = this.add.sprite(x, y, 'objects', 26).setScale(1.8).setDepth(24);
		this.time.delayedCall(90, () => blast.setFrame(27).setScale(2.1));
		this.time.delayedCall(210, () => blast.destroy());

		const blastRadius = 30;
		const room = this.currentRoom();
		let brokeAny = false;
		for (const cb of this.crackedBlocks) {
			if (cb.destroyed) continue;
			if (Phaser.Math.Distance.Between(x, y, cb.sprite.x, cb.sprite.y) <= blastRadius) {
				cb.destroyed = true;
				cb.sprite.setVisible(false);
				brokeAny = true;
				this.spawnParticles(cb.sprite.x, cb.sprite.y, 0xa89485, 10, 65);
			}
		}
		if (brokeAny) {
			room.crackedBlocks = this.crackedBlocks
				.filter((cb) => !cb.destroyed)
				.map((cb) => ({ col: cb.col, row: cb.row }));
		}

		for (const cs of this.crystalSwitches) {
			if (cs.cooldown <= 0 && Phaser.Math.Distance.Between(x, y, cs.sprite.x, cs.sprite.y) <= blastRadius) {
				this.flipCrystalSwitches(cs);
			}
		}

		for (const e of [...this.enemies]) {
			if (Phaser.Math.Distance.Between(x, y, e.x, e.y) <= blastRadius + 4) {
				this.damageEnemy(e, 4, x, y, false);
			}
		}
	}

	// ---- ENEMY AI & COMBAT ----

	private updateEnemies(dt: number): void {
		for (const e of [...this.enemies]) {
			e.animTime += dt * 7;

			if (e.hurtTimer > 0) {
				e.hurtTimer -= dt;
				e.sprite.setTintFill(0xffffff);
			} else if (e.stunTimer > 0) {
				e.stunTimer -= dt;
				e.sprite.setTint(0x8ce2ff);
				e.sprite.setPosition(e.x + Math.sin(this.time.now * 0.06) * 1.2, e.y);
				this.updateEnemyHpBar(e);
				continue;
			} else {
				if (e.elite && e.kind !== 'guardian') e.sprite.setTint(0xffb8ff);
				else e.sprite.clearTint();
			}

			if (Math.hypot(e.knockVx, e.knockVy) > 12) {
				const nx = e.x + e.knockVx * dt;
				const ny = e.y + e.knockVy * dt;
				if (!this.enemyBlocked(nx, e.y, e.kind === 'wizzrobe')) e.x = nx;
				if (!this.enemyBlocked(e.x, ny, e.kind === 'wizzrobe')) e.y = ny;
				e.knockVx *= Math.pow(0.008, dt);
				e.knockVy *= Math.pow(0.008, dt);
			} else {
				this.stepEnemyAI(e, dt);
			}

			e.sprite.setPosition(Math.round(e.x), Math.round(e.y));
			this.updateEnemyHpBar(e);

			if (this.invulnTimer <= 0 && e.aiState !== 'blink') {
				const contactDist = e.kind === 'guardian' ? 13 : 9.5;
				if (Phaser.Math.Distance.Between(e.x, e.y, this.heroX, this.heroY + 2) < contactDist) {
					this.damageHero(e.kind === 'guardian' ? 2 : 1, e.x, e.y);
				}
			}
		}
	}

	private stepEnemyAI(e: ActiveEnemy, dt: number): void {
		const dx = this.heroX - e.x;
		const dy = this.heroY - e.y;
		const dist = Math.hypot(dx, dy) || 1;
		e.aiTimer -= dt;

		if (e.kind === 'slime') {
			const baseFrame = e.elite ? 6 : 0;
			if (e.aiState === 'idle') {
				e.sprite.setFrame(baseFrame + (Math.floor(e.animTime) % 2));
				if (e.aiTimer <= 0) {
					e.aiState = 'move';
					e.aiTimer = 0.42;
					const speed = e.elite ? 68 : 52;
					e.vx = (dx / dist) * speed;
					e.vy = (dy / dist) * speed;
				}
			} else {
				e.sprite.setFrame(e.elite ? 7 : 4);
				const nx = e.x + e.vx * dt;
				const ny = e.y + e.vy * dt;
				if (!this.enemyBlocked(nx, e.y, false)) e.x = nx;
				if (!this.enemyBlocked(e.x, ny, false)) e.y = ny;
				if (e.aiTimer <= 0) {
					e.aiState = 'idle';
					e.aiTimer = 0.55 + Math.random() * 0.45;
				}
			}
		} else if (e.kind === 'knight') {
			if (e.guardResetTimer > 0) {
				e.guardResetTimer -= dt;
				if (e.guardResetTimer <= 0) e.guardHits = 0;
			}

			if (e.aiState === 'windup') {
				e.sprite.setFrame(8 + 4);
				if (e.aiTimer <= 0) {
					e.aiState = 'charge';
					e.aiTimer = 0.34;
					const fv = FACING_VEC[e.facing];
					e.vx = fv.x * 102;
					e.vy = fv.y * 102;
				}
			} else if (e.aiState === 'charge') {
				e.sprite.setFrame(8 + 5);
				const nx = e.x + e.vx * dt;
				const ny = e.y + e.vy * dt;
				if (!this.enemyBlocked(nx, e.y, false)) e.x = nx;
				if (!this.enemyBlocked(e.x, ny, false)) e.y = ny;
				if (e.aiTimer <= 0) {
					// Post-lunge recovery window: guard is wide open for sword punishes!
					e.aiState = 'recover';
					e.aiTimer = 0.68;
				}
			} else if (e.aiState === 'recover') {
				e.sprite.setFrame(8 + 6);
				if (e.aiTimer <= 0) {
					e.aiState = 'move';
					e.aiTimer = 1.0 + Math.random() * 0.5;
					e.turnTimer = 0.1;
				}
			} else {
				// Periodic turn commitment (0.55s) so flanking or dashing behind works cleanly!
				e.turnTimer -= dt;
				if (e.turnTimer <= 0) {
					e.turnTimer = 0.55;
					if (Math.abs(dx) > Math.abs(dy)) e.facing = dx < 0 ? 'left' : 'right';
					else e.facing = dy < 0 ? 'up' : 'down';
					e.sprite.setFlipX(e.facing === 'right');
				}
				e.sprite.setFrame(8 + (Math.floor(e.animTime) % 4));
				const speed = e.elite ? 42 : 32;
				const nx = e.x + (dx / dist) * speed * dt;
				const ny = e.y + (dy / dist) * speed * dt;
				if (!this.enemyBlocked(nx, e.y, false)) e.x = nx;
				if (!this.enemyBlocked(e.x, ny, false)) e.y = ny;
				if (e.aiTimer <= 0 && dist < 85) {
					// Lock facing right before windup so the charge is telegraphed and dodgeable
					if (Math.abs(dx) > Math.abs(dy)) e.facing = dx < 0 ? 'left' : 'right';
					else e.facing = dy < 0 ? 'up' : 'down';
					e.sprite.setFlipX(e.facing === 'right');
					e.aiState = 'windup';
					e.aiTimer = 0.34;
				}
			}
		} else if (e.kind === 'wizzrobe') {
			if (e.aiState === 'blink') {
				e.sprite.setFrame(16 + 6);
				e.sprite.setAlpha(0.35);
				if (e.aiTimer <= 0) {
					for (let attempt = 0; attempt < 15; attempt++) {
						const tc = Phaser.Math.Between(2, ROOM_COLS - 3);
						const tr = Phaser.Math.Between(2, ROOM_ROWS - 3);
						const tx = this.tileCenterX(tc);
						const ty = this.tileCenterY(tr);
						if (!this.enemyBlocked(tx, ty, false) && Phaser.Math.Distance.Between(tx, ty, this.heroX, this.heroY) > 48) {
							e.x = tx;
							e.y = ty;
							break;
						}
					}
					e.sprite.setAlpha(1);
					e.aiState = 'windup';
					e.aiTimer = 0.55;
				}
			} else if (e.aiState === 'windup') {
				e.sprite.setFrame(16 + 4 + (Math.floor(e.animTime) % 2));
				if (e.aiTimer <= 0) {
					const orbSp = this.add.sprite(e.x, e.y, 'objects', 29).setDepth(20);
					const speed = e.elite ? 102 : 84;
					this.projectiles.push({
						kind: 'arcane',
						fromPlayer: false,
						x: e.x,
						y: e.y,
						vx: (dx / dist) * speed,
						vy: (dy / dist) * speed,
						sprite: orbSp,
						life: 2.2
					});
					e.aiState = 'idle';
					e.aiTimer = 1.15;
				}
			} else {
				e.sprite.setFrame(16 + (Math.floor(e.animTime) % 4));
				if (e.aiTimer <= 0) {
					e.aiState = 'blink';
					e.aiTimer = 0.65;
				}
			}
		} else if (e.kind === 'guardian') {
			if (e.aiState === 'windup') {
				e.sprite.setFrame(24 + 4 + (Math.floor(e.animTime * 2) % 2));
				if (e.aiTimer <= 0) {
					if (Math.random() < 0.5) {
						e.aiState = 'charge';
						e.aiTimer = 0.48;
						e.vx = (dx / dist) * 115;
						e.vy = (dy / dist) * 115;
					} else {
						e.sprite.setFrame(24 + 6);
						const dirs = [
							[1, 0],
							[-1, 0],
							[0, 1],
							[0, -1],
							[0.7, 0.7],
							[-0.7, 0.7],
							[0.7, -0.7],
							[-0.7, -0.7]
						];
						for (const [ox, oy] of dirs) {
							const orbSp = this.add.sprite(e.x, e.y, 'objects', 29).setDepth(20);
							this.projectiles.push({
								kind: 'arcane',
								fromPlayer: false,
								x: e.x,
								y: e.y,
								vx: ox * 78,
								vy: oy * 78,
								sprite: orbSp,
								life: 2.0
							});
						}
						this.cameras.main.shake(90, 0.008);
						e.aiState = 'move';
						e.aiTimer = 1.4;
					}
				}
			} else if (e.aiState === 'charge') {
				e.sprite.setFrame(24 + 5);
				const nx = e.x + e.vx * dt;
				const ny = e.y + e.vy * dt;
				if (!this.enemyBlocked(nx, e.y, false)) e.x = nx;
				if (!this.enemyBlocked(e.x, ny, false)) e.y = ny;
				if (e.aiTimer <= 0) {
					e.aiState = 'move';
					e.aiTimer = 1.25;
				}
			} else {
				e.sprite.setFrame(24 + (Math.floor(e.animTime) % 4));
				const speed = 38;
				const nx = e.x + (dx / dist) * speed * dt;
				const ny = e.y + (dy / dist) * speed * dt;
				if (!this.enemyBlocked(nx, e.y, false)) e.x = nx;
				if (!this.enemyBlocked(e.x, ny, false)) e.y = ny;
				if (e.aiTimer <= 0) {
					e.aiState = 'windup';
					e.aiTimer = 0.48;
				}
			}
		}
	}

	private updateEnemyHpBar(e: ActiveEnemy): void {
		if (!e.hpBarBg || !e.hpBarFill) return;
		const ratio = Math.max(0, e.hp / e.maxHp);
		const fullW = e.kind === 'guardian' ? 26 : 14;
		e.hpBarBg.setPosition(e.x, e.y - 16);
		e.hpBarFill.setPosition(e.x - (fullW * (1 - ratio)) / 2, e.y - 16);
		e.hpBarFill.width = fullW * ratio;
	}

	private enemyBlocked(x: number, y: number, canFloat: boolean): boolean {
		const col = Math.floor(x / TILE_SIZE);
		const row = Math.floor((y + 3) / TILE_SIZE);
		if (col <= 0 || col >= ROOM_COLS - 1 || row <= 0 || row >= ROOM_ROWS - 1) return true;
		return this.isTileSolid(col, row, canFloat);
	}

	private damageEnemy(e: ActiveEnemy, amount: number, srcX: number, srcY: number, hitStop: boolean): void {
		e.hp -= amount;
		e.hurtTimer = 0.12;
		const ang = Phaser.Math.Angle.Between(srcX, srcY, e.x, e.y);
		const knock = e.kind === 'guardian' ? 60 : 125;
		e.knockVx = Math.cos(ang) * knock;
		e.knockVy = Math.sin(ang) * knock;

		if (hitStop) this.hitStopTimer = 0.036;
		this.spawnParticles(e.x, e.y, 0xfff0a8, 7, 65);

		if (e.hp <= 0) {
			sound.enemyDefeat();
			this.spawnParticles(e.x, e.y, e.kind === 'guardian' ? 0xff9b42 : 0x8cf5a5, 14, 80);
			this.enemiesDefeated++;
			this.score += e.kind === 'guardian' ? 400 : e.elite ? 120 : 50;

			const roll = Math.random();
			if (roll < 0.28 || (this.hp < this.maxHp && roll < 0.45)) {
				this.spawnPickup('heart', e.x, e.y);
			} else if (roll < 0.78) {
				this.spawnPickup(e.elite || e.kind === 'guardian' ? 'gem20' : Math.random() < 0.3 ? 'gem5' : 'gem1', e.x, e.y);
			}

			e.sprite.destroy();
			e.hpBarBg?.destroy();
			e.hpBarFill?.destroy();
			this.enemies = this.enemies.filter((item) => item !== e);

			this.checkRoomCleared();
			this.syncHud();
		} else {
			sound.enemyHit();
		}
	}

	private checkRoomCleared(): void {
		const room = this.currentRoom();
		if (this.enemies.length > 0) return;

		if (!room.cleared) {
			room.cleared = true;
			this.roomsCleared++;
			this.score += 100;

			if (this.relics.includes('vampiric_ring') && this.hp < this.maxHp) {
				this.hp = Math.min(this.maxHp, this.hp + 1);
				sound.pickupHeart();
			}

			let unbarredAny = false;
			for (const dv of this.doorVisuals) {
				const spec = room.doors[dv.dir];
				if (spec?.barred) {
					spec.barred = false;
					if (!spec.locked) dv.sprite.setVisible(false);
					unbarredAny = true;
					this.spawnParticles(dv.sprite.x, dv.sprite.y, 0x7ef6ff, 8, 50);
				}
			}

			const t = getTranslations();
			if (room.puzzle === 'combat_clear') {
				this.markPuzzleSolved(
					room.hasGuardian ? t.toasts.guardianDefeated : t.toasts.chamberCleared,
					!unbarredAny
				);
			} else if (unbarredAny) {
				sound.puzzleSolved();
			}
			this.syncHud();
		}
	}

	private markPuzzleSolved(toastTitle: string, silent = false): void {
		const room = this.currentRoom();
		if (room.puzzleSolved) return;
		room.puzzleSolved = true;
		this.puzzlesSolved++;
		this.score += 150;

		if (!silent) sound.puzzleSolved();

		for (const ch of this.chests) {
			if (!ch.visible) {
				ch.visible = true;
				ch.sprite.setVisible(true);
				this.spawnParticles(ch.sprite.x, ch.sprite.y, 0xffd559, 16, 70);
			}
		}

		hudStore.showToast(toastTitle, getTranslations().toasts.puzzleBonusSub, 'emerald', 2200);
		this.syncHud();
	}

	private damageHero(amount: number, srcX: number, srcY: number): void {
		if (this.invulnTimer > 0 || this.gameOver) return;

		this.hp = Math.max(0, this.hp - amount);
		this.invulnTimer = this.relics.includes('aegis_charm') ? 1.15 : 0.85;
		const ang = Phaser.Math.Angle.Between(srcX, srcY, this.heroX, this.heroY);
		this.hurtKnockVx = Math.cos(ang) * 145;
		this.hurtKnockVy = Math.sin(ang) * 145;

		this.cameras.main.shake(110, 0.01);
		this.spawnParticles(this.heroX, this.heroY, 0xff425b, 10, 70);

		if (this.hp <= 0) {
			this.triggerGameOver();
		} else {
			sound.playerHurt();
		}
		this.syncHud();
	}

	private triggerGameOver(): void {
		this.gameOver = true;
		sound.stopBgm();
		sound.gameOver();
		this.hero.setTint(0xff425b);
		hudStore.patch({
			phase: 'gameover',
			hp: 0,
			floorNumber: this.floorNumber,
			score: this.score,
			roomsCleared: this.roomsCleared,
			puzzlesSolved: this.puzzlesSolved,
			enemiesDefeated: this.enemiesDefeated
		});
	}

	// ---- PICKUPS, CHESTS & STAIRS ----

	private spawnPickup(kind: ActivePickup['kind'], x: number, y: number): void {
		const frameMap: Record<ActivePickup['kind'], number> = {
			heart: 16,
			gem1: 19,
			gem5: 20,
			gem20: 21
		};
		const sprite = this.add.sprite(x, y, 'objects', frameMap[kind]).setDepth(15);
		this.pickups.push({ kind, x, y, sprite, age: 0 });
	}

	private updatePickups(_dt: number): void {
		for (let i = this.pickups.length - 1; i >= 0; i--) {
			const p = this.pickups[i];
			if (Phaser.Math.Distance.Between(p.x, p.y, this.heroX, this.heroY + 2) < 12) {
				if (p.kind === 'heart') {
					this.hp = Math.min(this.maxHp, this.hp + 2);
					sound.pickupHeart();
				} else {
					const val = p.kind === 'gem20' ? 20 : p.kind === 'gem5' ? 5 : 1;
					this.gems += val;
					this.score += val * 10;
					sound.pickupGem();
				}
				this.spawnParticles(p.x, p.y, 0xfff0a8, 6, 45);
				p.sprite.destroy();
				this.pickups.splice(i, 1);
				this.syncHud();
			}
		}
	}

	private checkChestInteraction(): void {
		for (const ch of this.chests) {
			if (!ch.visible || ch.spec.opened) continue;
			const dist = Phaser.Math.Distance.Between(this.heroX, this.heroY + 2, ch.sprite.x, ch.sprite.y);
			if (dist < 15) {
				this.openChest(ch);
			}
		}
	}

	private getRewardVisual(reward: ChestReward): { frame: number; glowColor: number; duration: number } {
		if (reward.kind === 'key') {
			return { frame: 18, glowColor: 0xffd559, duration: 1.2 };
		}
		if (reward.kind === 'tool') {
			const toolFrames: Record<ToolId, number> = { boomerang: 22, fire_rod: 23, bomb: 24 };
			return { frame: toolFrames[reward.tool], glowColor: 0x7ef6ff, duration: 1.45 };
		}
		if (reward.kind === 'relic') {
			return {
				frame: reward.relic === 'heart_container' ? 30 : 31,
				glowColor: 0xffd559,
				duration: 1.35
			};
		}
		if (reward.kind === 'gems') {
			const frame = reward.amount >= 20 ? 21 : reward.amount >= 5 ? 20 : 19;
			return { frame, glowColor: 0x58f2c8, duration: 0.95 };
		}
		return { frame: 16, glowColor: 0xff4a64, duration: 0.95 };
	}

	private clearHeldItemVisuals(): void {
		if (this.heldItemSprite) {
			this.tweens.killTweensOf(this.heldItemSprite);
			this.heldItemSprite.destroy();
			this.heldItemSprite = null;
		}
		if (this.heldItemHalo) {
			this.tweens.killTweensOf(this.heldItemHalo);
			this.heldItemHalo.destroy();
			this.heldItemHalo = null;
		}
	}

	private startChestHold(
		chestX: number,
		chestY: number,
		frame: number,
		glowColor: number,
		duration: number
	): void {
		this.clearHeldItemVisuals();

		// Stop combat/movement momentum cleanly and strike classic Zelda triumphant pose
		this.swordTimer = 0;
		this.swordGraphics.clear();
		this.aimGraphics.clear();
		this.dashTimer = 0;
		this.hurtKnockVx = 0;
		this.hurtKnockVy = 0;
		this.attackBuffer = 0;
		this.dashBuffer = 0;
		this.toolBuffer = 0;
		this.invulnTimer = Math.max(this.invulnTimer, duration + 0.35);

		this.heroFacing = 'down';
		this.hero.setPosition(Math.round(this.heroX), Math.round(this.heroY));
		this.hero.setAlpha(1);
		this.hero.setFrame(7); // Row 0, Col 7: two-arms-raised item-hold pose!

		const targetX = Math.round(this.heroX);
		const targetY = Math.round(this.heroY - 15);

		this.heldItemColor = glowColor;
		this.heldItemHalo = this.add
			.circle(chestX, chestY, 10, glowColor, 0.32)
			.setDepth(27)
			.setScale(0.4)
			.setBlendMode(Phaser.BlendModes.ADD);
		this.heldItemSprite = this.add
			.sprite(chestX, chestY, 'objects', frame)
			.setDepth(28)
			.setScale(0.75);

		this.tweens.add({
			targets: this.heldItemSprite,
			x: targetX,
			y: targetY,
			scale: 1.35,
			duration: 240,
			ease: 'Back.easeOut'
		});
		this.tweens.add({
			targets: this.heldItemHalo,
			x: targetX,
			y: targetY,
			scale: 1.3,
			duration: 240,
			ease: 'Cubic.easeOut'
		});

		this.chestHoldTimer = duration;
		this.chestHoldElapsed = 0;
		this.heldSparkleTimer = 0.08;
	}

	private updateChestHold(dt: number): void {
		this.chestHoldElapsed += dt;
		this.chestHoldTimer -= dt;
		this.hero.setFrame(7);

		// Gentle radiant bob & halo pulse once item arrives overhead
		if (this.chestHoldElapsed >= 0.25 && this.heldItemSprite && this.heldItemHalo) {
			const bob = Math.sin((this.chestHoldElapsed - 0.25) * 9) * 1.3;
			const baseY = Math.round(this.heroY - 15);
			this.heldItemSprite.setPosition(Math.round(this.heroX), baseY + bob);
			this.heldItemHalo.setPosition(Math.round(this.heroX), baseY + bob);
			this.heldItemHalo.setAlpha(0.24 + Math.sin(this.chestHoldElapsed * 12) * 0.12);
		}

		this.heldSparkleTimer -= dt;
		if (this.heldSparkleTimer <= 0 && this.heldItemSprite) {
			this.heldSparkleTimer = 0.14;
			this.spawnParticles(
				this.heldItemSprite.x + (Math.random() - 0.5) * 10,
				this.heldItemSprite.y + (Math.random() - 0.5) * 8,
				this.heldItemColor,
				2,
				28
			);
		}

		if (this.chestHoldTimer <= 0) {
			this.finishChestHold();
		}
	}

	private finishChestHold(): void {
		if (this.heldItemSprite) {
			this.spawnParticles(this.heldItemSprite.x, this.heldItemSprite.y, this.heldItemColor, 10, 55);
		}
		this.clearHeldItemVisuals();
		this.chestHoldTimer = 0;
		this.chestHoldElapsed = 0;
		this.hero.setFrame(0);
	}

	private openChest(ch: ActiveChest): void {
		if (ch.spec.opened) return;
		ch.spec.opened = true;
		ch.sprite.setFrame(ch.spec.ornate ? 15 : 13);
		sound.chestFanfare();
		this.spawnParticles(ch.sprite.x, ch.sprite.y - 4, 0xffd559, 18, 75);

		const t = getTranslations();
		const reward = ch.spec.reward;
		const visual = this.getRewardVisual(reward);
		this.startChestHold(ch.sprite.x, ch.sprite.y - 2, visual.frame, visual.glowColor, visual.duration);

		if (reward.kind === 'key') {
			this.keys++;
			this.score += 150;
			sound.pickupKey();
			hudStore.showToast(t.toasts.keyObtainedTitle, t.toasts.keyObtainedSub, 'gold', 2800, visual.frame);
		} else if (reward.kind === 'tool') {
			if (!this.tools.includes(reward.tool)) {
				this.tools = [...this.tools, reward.tool];
			}
			this.equippedTool = reward.tool;
			this.score += 300;
			const meta = t.tools[reward.tool];
			hudStore.showToast(
				t.toasts.toolAcquiredTitle(meta.name),
				t.toasts.toolAcquiredSub(meta.description),
				'cyan',
				3600,
				visual.frame
			);
		} else if (reward.kind === 'relic') {
			const meta = t.relics[reward.relic];
			this.score += 250;
			if (reward.relic === 'heart_container') {
				this.maxHp = Math.min(20, this.maxHp + 2);
				this.hp = this.maxHp;
			} else if (!this.relics.includes(reward.relic) || reward.relic === 'solar_blade') {
				this.relics = [...this.relics, reward.relic];
			}
			hudStore.showToast(t.toasts.relicTitle(meta.name), meta.description, 'gold', 3200, visual.frame);
		} else if (reward.kind === 'gems') {
			this.gems += reward.amount;
			this.score += reward.amount * 15;
			hudStore.showToast(t.toasts.gemsTitle(reward.amount), t.toasts.gemsSub, 'emerald', 2200, visual.frame);
		} else if (reward.kind === 'hearts') {
			this.hp = Math.min(this.maxHp, this.hp + reward.amount);
			hudStore.showToast(t.toasts.heartsTitle, t.toasts.heartsSub, 'crimson', 2000, visual.frame);
		}

		this.syncHud();
	}

	private checkStairsDescent(): void {
		if (this.stairsCooldown > 0) return;
		const room = this.currentRoom();
		if (room.type !== 'exit' || !room.cleared) return;

		const dist = Phaser.Math.Distance.Between(
			this.heroX,
			this.heroY + 3,
			this.tileCenterX(7),
			this.tileCenterY(5)
		);
		if (dist < 10) {
			this.isTransitioning = true;
			sound.stairsDescend();
			this.score += 250 * this.floorNumber;
			this.cameras.main.fadeOut(320, 8, 10, 16);
			this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
				this.loadFloor(this.floorNumber + 1, true);
				this.cameras.main.fadeIn(320, 8, 10, 16);
				this.isTransitioning = false;
			});
		}
	}

	// ---- VFX & HUD SYNC ----

	private spawnParticles(x: number, y: number, color: number, count: number, speed: number): void {
		for (let i = 0; i < count; i++) {
			const ang = Math.random() * Math.PI * 2;
			const spd = speed * (0.4 + Math.random() * 0.7);
			const dot = this.add.rectangle(x, y, 2, 2, color).setDepth(26);
			this.tweens.add({
				targets: dot,
				x: x + Math.cos(ang) * spd * 0.35,
				y: y + Math.sin(ang) * spd * 0.35,
				alpha: 0,
				duration: 200 + Math.random() * 140,
				onComplete: () => dot.destroy()
			});
		}
	}

	private getRoomContextInfo(room: RoomData): { label: string; hint: string } {
		const r = getTranslations().rooms;
		if (room.type === 'start') {
			return { label: r.entryLabel, hint: r.entryHint };
		}
		if (room.type === 'treasure') {
			return { label: r.treasureLabel, hint: r.treasureHint };
		}
		if (room.type === 'exit') {
			return {
				label: room.hasGuardian ? r.guardianLabel : r.descentLabel,
				hint: room.cleared ? r.exitClearedHint : r.exitGuardedHint
			};
		}
		if (room.puzzle === 'block_plate') {
			return {
				label: room.type === 'key' ? r.blockKeyLabel : r.blockLabel,
				hint: room.puzzleSolved ? r.blockSolvedHint : r.blockHint
			};
		}
		if (room.puzzle === 'crystal_gate') {
			return {
				label: room.type === 'key' ? r.crystalKeyLabel : r.crystalLabel,
				hint: r.crystalHint
			};
		}
		if (room.puzzle === 'light_braziers') {
			return {
				label: room.type === 'key' ? r.brazierKeyLabel : r.brazierLabel,
				hint: room.puzzleSolved ? r.brazierSolvedHint : r.brazierHint
			};
		}
		if (room.puzzle === 'bomb_vault') {
			return {
				label: room.type === 'key' ? r.bombKeyLabel : r.bombLabel,
				hint: r.bombHint
			};
		}
		if (room.puzzle === 'spike_trial') {
			return {
				label: room.type === 'key' ? r.spikeKeyLabel : r.spikeLabel,
				hint: r.spikeHint
			};
		}
		return {
			label: room.type === 'key' ? r.combatKeyLabel : r.combatLabel,
			hint: room.cleared ? r.combatClearedHint : r.combatHint
		};
	}

	private syncHud(): void {
		const room = this.currentRoom();
		const { label, hint } = this.getRoomContextInfo(room);
		const t = getTranslations();
		const biomeMeta = t.biomes[this.floorData.biome.id];

		const minimap: MinimapRoomInfo[] = Object.values(this.floorData.rooms).map((r) => ({
			id: r.id,
			gx: r.gx,
			gy: r.gy,
			type: r.type,
			discovered: r.discovered,
			cleared: r.cleared,
			current: r.id === this.currentRoomId,
			hasUnopenedChest: r.chests.some((c) => !c.opened),
			doors: (['north', 'south', 'east', 'west'] as CardinalDir[])
				.filter((d) => Boolean(r.doors[d]))
				.map((d) => ({
					dir: d,
					locked: Boolean(r.doors[d]?.locked),
					barred: Boolean(r.doors[d]?.barred)
				}))
		}));

		hudStore.patch({
			floorNumber: this.floorNumber,
			biomeId: this.floorData.biome.id,
			biomeName: biomeMeta.name,
			biomeSubtitle: biomeMeta.subtitle,
			biomeAccent: this.floorData.biome.accentHex,
			seed: this.runSeed,
			hp: this.hp,
			maxHp: this.maxHp,
			keys: this.keys,
			gems: this.gems,
			score: this.score,
			roomsCleared: this.roomsCleared,
			puzzlesSolved: this.puzzlesSolved,
			enemiesDefeated: this.enemiesDefeated,
			tools: this.tools,
			equippedTool: this.equippedTool,
			relics: this.relics,
			roomLabel: label,
			roomHint: hint,
			minimap
		});
	}
}
