<script lang="ts">
	import type { HudState } from '$lib/game/types';
	import { localeStore, TRANSLATIONS } from '$lib/game/i18n';

	interface Props {
		hud: HudState;
		onRetryFloor: () => void;
		onNewRun: () => void;
		onTitle: () => void;
	}

	let { hud, onRetryFloor, onNewRun, onTitle }: Props = $props();
	let t = $derived(TRANSLATIONS[$localeStore]);
</script>

<div class="overlay-backdrop">
	<div class="gameover-card" role="dialog" aria-modal="true" aria-label={t.gameover.title}>
		{#if hud.newRecord}
			<span class="record-badge">{t.gameover.newRecord}</span>
		{/if}
		<h2 class="go-title">{t.gameover.title}</h2>
		<p class="go-sub">
			{t.gameover.floorLabel} {hud.floorNumber} · {t.biomes[hud.biomeId]?.name ?? hud.biomeName} · {t.gameover.seedLabel} <strong>{hud.seed}</strong>
		</p>

		<div class="stats-grid">
			<div class="stat-box">
				<span class="stat-label">{t.gameover.floorReached}</span>
				<span class="stat-val accent-cyan">{hud.floorNumber}</span>
			</div>
			<div class="stat-box">
				<span class="stat-label">{t.gameover.finalScore}</span>
				<span class="stat-val accent-gold">{hud.score.toLocaleString()}</span>
			</div>
			<div class="stat-box">
				<span class="stat-label">{t.gameover.puzzlesSolved}</span>
				<span class="stat-val">{hud.puzzlesSolved}</span>
			</div>
			<div class="stat-box">
				<span class="stat-label">{t.gameover.foesVanquished}</span>
				<span class="stat-val">{hud.enemiesDefeated}</span>
			</div>
		</div>

		<div class="go-actions">
			<button type="button" class="btn-primary" onclick={onRetryFloor}>
				{t.gameover.retryFloor(hud.floorNumber)}
			</button>
			<button type="button" class="btn-ghost" onclick={onNewRun}>{t.gameover.newDungeon}</button>
			<button type="button" class="btn-ghost" onclick={onTitle}>{t.gameover.titleBtn}</button>
		</div>
	</div>
</div>

<style>
	.overlay-backdrop {
		position: fixed;
		inset: 0;
		z-index: 55;
		background: rgba(12, 6, 10, 0.84);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.gameover-card {
		width: 100%;
		max-width: 500px;
		background: var(--bg-panel-solid);
		border: 1px solid rgba(255, 74, 100, 0.5);
		border-radius: 12px;
		padding: 1.75rem 1.5rem;
		text-align: center;
		box-shadow: 0 24px 64px rgba(0, 0, 0, 0.78);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.9rem;
	}

	.record-badge {
		padding: 0.2rem 0.65rem;
		border-radius: 999px;
		background: rgba(232, 185, 72, 0.2);
		border: 1px solid var(--gold);
		color: var(--gold-bright);
		font-family: var(--font-pixel);
		font-size: 0.64rem;
		letter-spacing: 0.08em;
	}

	.go-title {
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.7rem;
		letter-spacing: 0.08em;
		color: #ff6e84;
	}

	.go-sub {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.go-sub strong {
		color: var(--text-primary);
		font-family: var(--font-pixel);
		font-size: 0.76rem;
	}

	.stats-grid {
		width: 100%;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.65rem;
		margin: 0.35rem 0;
	}

	.stat-box {
		padding: 0.75rem;
		border-radius: 8px;
		background: rgba(18, 24, 38, 0.85);
		border: 1px solid var(--border-stone);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-label {
		font-family: var(--font-pixel);
		font-size: 0.56rem;
		color: var(--text-muted);
		letter-spacing: 0.06em;
	}

	.stat-val {
		font-family: var(--font-pixel);
		font-size: 1.25rem;
		color: var(--text-primary);
	}

	.accent-cyan {
		color: var(--emerald);
	}

	.accent-gold {
		color: var(--gold-bright);
	}

	.go-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.6rem;
		margin-top: 0.3rem;
	}
</style>
