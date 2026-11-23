<script lang="ts">
	import type { VirtualInputState } from '$lib/game/phaser/DungeonScene';
	import { localeStore, TRANSLATIONS } from '$lib/game/i18n';

	interface Props {
		onMove: (partial: Partial<VirtualInputState>) => void;
		onAttack: () => void;
		onDash: () => void;
		onTool: () => void;
	}

	let { onMove, onAttack, onDash, onTool }: Props = $props();
	let t = $derived(TRANSLATIONS[$localeStore]);
</script>

<div class="touch-controls" aria-label="Touch Controls">
	<div class="dpad">
		<button
			type="button"
			class="dpad-btn up"
			onpointerdown={() => onMove({ up: true })}
			onpointerup={() => onMove({ up: false })}
			onpointerleave={() => onMove({ up: false })}
		>▲</button>
		<button
			type="button"
			class="dpad-btn left"
			onpointerdown={() => onMove({ left: true })}
			onpointerup={() => onMove({ left: false })}
			onpointerleave={() => onMove({ left: false })}
		>◀</button>
		<button
			type="button"
			class="dpad-btn right"
			onpointerdown={() => onMove({ right: true })}
			onpointerup={() => onMove({ right: false })}
			onpointerleave={() => onMove({ right: false })}
		>▶</button>
		<button
			type="button"
			class="dpad-btn down"
			onpointerdown={() => onMove({ down: true })}
			onpointerup={() => onMove({ down: false })}
			onpointerleave={() => onMove({ down: false })}
		>▼</button>
	</div>

	<div class="action-pad">
		<button type="button" class="act-btn act-tool" onpointerdown={onTool}>{t.touch.tool}</button>
		<button type="button" class="act-btn act-dash" onpointerdown={onDash}>{t.touch.dash}</button>
		<button type="button" class="act-btn act-atk" onpointerdown={onAttack}>{t.touch.sword}</button>
	</div>
</div>

<style>
	.touch-controls {
		display: none;
	}

	@media (hover: none) and (pointer: coarse) {
		.touch-controls {
			position: fixed;
			left: 0;
			right: 0;
			bottom: 0.85rem;
			padding: 0 1rem;
			display: flex;
			justify-content: space-between;
			align-items: flex-end;
			pointer-events: none;
			z-index: 30;
		}
	}

	.dpad {
		pointer-events: auto;
		display: grid;
		grid-template-columns: repeat(3, 44px);
		grid-template-rows: repeat(3, 44px);
		gap: 4px;
	}

	.dpad-btn {
		border-radius: 8px;
		border: 1px solid rgba(180, 200, 230, 0.32);
		background: rgba(14, 20, 32, 0.72);
		color: var(--text-primary);
		font-size: 0.9rem;
		touch-action: none;
	}

	.up { grid-column: 2; grid-row: 1; }
	.left { grid-column: 1; grid-row: 2; }
	.right { grid-column: 3; grid-row: 2; }
	.down { grid-column: 2; grid-row: 3; }

	.action-pad {
		pointer-events: auto;
		display: flex;
		gap: 0.5rem;
	}

	.act-btn {
		width: 58px;
		height: 58px;
		border-radius: 999px;
		border: 1px solid var(--border-gold);
		background: rgba(18, 26, 40, 0.82);
		color: var(--gold-bright);
		font-family: var(--font-pixel);
		font-size: 0.54rem;
		touch-action: none;
	}

	.act-atk {
		background: rgba(232, 185, 72, 0.25);
	}
</style>
