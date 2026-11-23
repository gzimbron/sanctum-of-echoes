<script lang="ts">
	import { base } from '$app/paths';
	import { TOOL_CATALOG, type HudState, type ToolId } from '$lib/game/types';
	import { localeStore, toggleLocale, TRANSLATIONS } from '$lib/game/i18n';

	interface Props {
		hud: HudState;
		onSelectTool: (tool: ToolId) => void;
		onToggleMute: () => void;
		onPause: () => void;
		onLocaleChange: () => void;
	}

	let { hud, onSelectTool, onToggleMute, onPause, onLocaleChange }: Props = $props();
	let t = $derived(TRANSLATIONS[$localeStore]);

	const TOOL_SLOTS: ToolId[] = ['boomerang', 'fire_rod', 'bomb'];

	let hearts = $derived.by(() => {
		const count = Math.ceil(hud.maxHp / 2);
		const arr: ('full' | 'half' | 'empty')[] = [];
		for (let i = 0; i < count; i++) {
			const rem = hud.hp - i * 2;
			if (rem >= 2) arr.push('full');
			else if (rem === 1) arr.push('half');
			else arr.push('empty');
		}
		return arr;
	});

	function toolBgPos(frameIndex: number): string {
		const col = frameIndex % 8;
		const row = Math.floor(frameIndex / 8);
		return `${-col * 32}px ${-row * 32}px`;
	}

	function handleToolClick(e: MouseEvent, toolId: ToolId) {
		(e.currentTarget as HTMLButtonElement).blur();
		onSelectTool(toolId);
	}

	function handleMuteClick(e: MouseEvent) {
		(e.currentTarget as HTMLButtonElement).blur();
		onToggleMute();
	}

	function handlePauseClick(e: MouseEvent) {
		(e.currentTarget as HTMLButtonElement).blur();
		onPause();
	}

	function handleLangClick(e: MouseEvent) {
		(e.currentTarget as HTMLButtonElement).blur();
		toggleLocale();
		onLocaleChange();
	}
</script>

<header class="hud-bar" style="--objects-url: url('{base}/assets/objects.png')">
	<!-- Left: Vitality + Resources -->
	<div class="hud-group hud-vitals">
		<div class="hearts-row" aria-label="Health">
			{#each hearts as state, i (i)}
				<svg class="heart-icon" viewBox="0 0 16 16" aria-hidden="true">
					{#if state === 'full'}
						<path
							d="M3 2h3l2 2 2-2h3l2 2v3l-7 7-7-7V4z"
							fill="#e82c48"
							stroke="#16121a"
							stroke-width="1.4"
						/>
						<rect x="3.5" y="4" width="2.2" height="2.2" fill="#ff9eb0" />
					{:else if state === 'half'}
						<path
							d="M3 2h3l2 2 2-2h3l2 2v3l-7 7-7-7V4z"
							fill="#252c3d"
							stroke="#16121a"
							stroke-width="1.4"
						/>
						<path d="M3 2h3l2 2v10L1 7V4z" fill="#e82c48" />
						<rect x="3.5" y="4" width="2" height="2" fill="#ff9eb0" />
					{:else}
						<path
							d="M3 2h3l2 2 2-2h3l2 2v3l-7 7-7-7V4z"
							fill="#212736"
							stroke="#16121a"
							stroke-width="1.4"
						/>
					{/if}
				</svg>
			{/each}
		</div>

		<div class="counters-row">
			<span class="counter counter-key">
				<span class="sprite-icon pixelated" style="background-position: {-2 * 24}px {-2 * 24}px;"></span>
				{hud.keys}
			</span>
			<span class="counter counter-gem">
				<span class="sprite-icon pixelated" style="background-position: {-3 * 24}px {-2 * 24}px;"></span>
				{hud.gems}
			</span>
			<span class="counter counter-score">
				{t.hud.pts} <strong>{hud.score.toLocaleString()}</strong>
			</span>
		</div>
	</div>

	<!-- Center: Floor & Biome Badge -->
	<div class="hud-center">
		<div class="floor-badge" style="--biome-accent: {hud.biomeAccent}">
			<span class="floor-num">{t.hud.floorPrefix} {String(hud.floorNumber).padStart(2, '0')}</span>
			<span class="floor-sep">·</span>
			<span class="biome-name">{t.biomes[hud.biomeId]?.name ?? hud.biomeName}</span>
		</div>
		{#if hud.relics.length > 0}
			<div class="relic-strip">
				{#each hud.relics as relicId, idx (`${relicId}-${idx}`)}
					<span class="relic-pill" title={t.relics[relicId].description}>
						{t.relics[relicId].shortTag}
					</span>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Right: Tool Slots + Controls -->
	<div class="hud-group hud-actions">
		<div class="tool-belt" aria-label="Dungeon Tools">
			{#each TOOL_SLOTS as toolId (toolId)}
				{@const unlocked = hud.tools.includes(toolId)}
				{@const active = hud.equippedTool === toolId}
				{@const meta = TOOL_CATALOG[toolId]}
				{@const loc = t.tools[toolId]}
				<button
					type="button"
					class="tool-slot"
					class:unlocked
					class:active
					disabled={!unlocked}
					onclick={(e) => handleToolClick(e, toolId)}
					title={unlocked ? `${loc.name} [${meta.hotkey}] — ${loc.description}` : t.hud.lockedToolHint(loc.name)}
				>
					<span class="slot-key">{meta.hotkey}</span>
					{#if unlocked}
						<span
							class="tool-sprite pixelated"
							style="background-position: {toolBgPos(meta.frameIndex)};"
						></span>
					{:else}
						<span class="slot-locked">?</span>
					{/if}
				</button>
			{/each}
		</div>

		<button type="button" class="icon-btn lang-toggle" onclick={handleLangClick} title={t.meta.switchTooltip}>
			{t.meta.langCode}
		</button>
		<button type="button" class="icon-btn" onclick={handleMuteClick}>
			{hud.muted ? t.hud.mute : t.hud.sfx}
		</button>
		<button type="button" class="icon-btn" onclick={handlePauseClick}>
			{t.hud.pause}
		</button>
	</div>
</header>

<style>
	.hud-bar {
		width: 100%;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 0.75rem;
		padding: 0.55rem 1rem;
		background: linear-gradient(180deg, rgba(13, 17, 27, 0.96) 0%, rgba(13, 17, 27, 0.84) 100%);
		border-bottom: 1px solid var(--border-stone);
		z-index: 20;
	}

	.hud-group {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.hud-vitals {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.3rem;
	}

	.hearts-row {
		display: flex;
		align-items: center;
		gap: 0.16rem;
		flex-wrap: wrap;
	}

	.heart-icon {
		width: 19px;
		height: 19px;
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
	}

	.counters-row {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		font-family: var(--font-pixel);
		font-size: 0.72rem;
	}

	.counter {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--text-primary);
	}

	.counter-key {
		color: var(--gold-bright);
	}

	.counter-gem {
		color: #88f79c;
	}

	.counter-score {
		color: var(--text-muted);
	}

	.counter-score strong {
		color: var(--text-primary);
	}

	.sprite-icon {
		width: 24px;
		height: 24px;
		background-image: var(--objects-url);
		background-size: 192px 96px;
		display: inline-block;
	}

	.hud-center {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.floor-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.32rem 0.9rem;
		border-radius: 999px;
		background: rgba(18, 24, 38, 0.9);
		border: 1px solid color-mix(in srgb, var(--biome-accent) 45%, transparent);
		font-family: var(--font-pixel);
		font-size: 0.76rem;
		letter-spacing: 0.05em;
	}

	.floor-num {
		color: var(--biome-accent);
		font-weight: 700;
	}

	.floor-sep {
		color: var(--text-muted);
	}

	.biome-name {
		color: var(--text-primary);
	}

	.relic-strip {
		display: flex;
		gap: 0.3rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.relic-pill {
		padding: 0.08rem 0.4rem;
		border-radius: 4px;
		background: rgba(232, 185, 72, 0.16);
		border: 1px solid rgba(232, 185, 72, 0.4);
		color: var(--gold-bright);
		font-family: var(--font-pixel);
		font-size: 0.58rem;
	}

	.hud-actions {
		justify-content: flex-end;
	}

	.tool-belt {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.tool-slot {
		position: relative;
		width: 42px;
		height: 42px;
		border-radius: 6px;
		border: 1px solid var(--border-stone);
		background: rgba(16, 22, 34, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		transition: border-color 120ms ease, transform 120ms ease, box-shadow 120ms ease;
	}

	.tool-slot:disabled {
		opacity: 0.42;
		cursor: default;
	}

	.tool-slot.unlocked:hover {
		border-color: var(--border-gold);
		transform: translateY(-1px);
	}

	.tool-slot.active {
		border-color: var(--emerald);
		background: rgba(34, 62, 68, 0.65);
		box-shadow: 0 0 14px rgba(88, 242, 200, 0.35);
	}

	.slot-key {
		position: absolute;
		top: 2px;
		left: 4px;
		font-family: var(--font-pixel);
		font-size: 0.52rem;
		color: var(--text-muted);
	}

	.slot-locked {
		font-family: var(--font-pixel);
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.tool-sprite {
		width: 32px;
		height: 32px;
		background-image: var(--objects-url);
		background-size: 256px 128px;
		display: block;
	}

	.icon-btn {
		padding: 0.42rem 0.62rem;
		border: 1px solid var(--border-stone);
		border-radius: 6px;
		background: rgba(20, 26, 40, 0.8);
		color: var(--text-muted);
		font-family: var(--font-pixel);
		font-size: 0.64rem;
		cursor: pointer;
	}

	.icon-btn:hover {
		color: var(--text-primary);
		border-color: var(--border-gold);
	}

	.lang-toggle {
		color: var(--gold-bright);
		border-color: rgba(232, 185, 72, 0.35);
	}

	@media (max-width: 860px) {
		.hud-bar {
			grid-template-columns: 1fr auto;
			padding: 0.45rem 0.65rem;
		}
		.hud-center {
			display: none;
		}
	}
</style>
