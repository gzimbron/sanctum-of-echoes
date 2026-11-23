<script lang="ts">
	import { base } from '$app/paths';
	import { generateRandomSeedCode } from '$lib/game/rng';
	import { localeStore, setLocale, TRANSLATIONS, type Locale } from '$lib/game/i18n';
	import type { SavedRunState } from '$lib/game/types';

	interface Props {
		initialSeed: string;
		bestFloor: number;
		bestScore: number;
		savedRun: SavedRunState | null;
		onStart: (seed: string) => void;
		onContinue: () => void;
		onLocaleChange: () => void;
	}

	let { initialSeed, bestFloor, bestScore, savedRun, onStart, onContinue, onLocaleChange }: Props = $props();
	let seedInput = $state('');
	let locale = $derived($localeStore);
	let t = $derived(TRANSLATIONS[locale]);

	$effect(() => {
		if (!seedInput && initialSeed) {
			seedInput = initialSeed;
		}
	});

	function randomizeSeed() {
		seedInput = generateRandomSeedCode();
	}

	function handleStartNew(e: SubmitEvent) {
		e.preventDefault();
		onStart(seedInput.trim().toUpperCase() || generateRandomSeedCode());
	}

	function chooseLang(lang: Locale) {
		setLocale(lang);
		onLocaleChange();
	}
</script>

<div class="title-screen">
	<img src="{base}/assets/title-art.png" alt="Ancient glowing dungeon archway" class="title-backdrop pixelated" />
	<div class="title-vignette"></div>

	<div class="lang-switch" role="group" aria-label="Language">
		<button
			type="button"
			class="lang-btn"
			class:active={locale === 'es'}
			onclick={() => chooseLang('es')}
		>ES</button>
		<button
			type="button"
			class="lang-btn"
			class:active={locale === 'en'}
			onclick={() => chooseLang('en')}
		>EN</button>
	</div>

	<div class="title-content">
		<div class="hero-header">
			<p class="eyebrow">{t.title.eyebrow}</p>
			<h1 class="game-title">SANCTUM OF ECHOES</h1>
			<p class="tagline">{t.title.tagline}</p>
		</div>

		<form class="action-dock" onsubmit={handleStartNew}>
			{#if savedRun}
				<div class="continue-block">
					<button type="button" class="btn-primary start-btn" onclick={onContinue}>
						{t.title.continueBtn(savedRun.floorNumber)}
					</button>
					<span class="saved-meta">
						{t.title.savedMeta(savedRun.floorNumber, t.biomes[savedRun.biomeId].name, savedRun.seed)}
					</span>
				</div>

				<div class="dock-row secondary-row">
					<button type="submit" class="btn-ghost new-run-btn">
						{t.title.newRunBtn}
					</button>

					<div class="seed-box">
						<label for="seed-input" class="seed-label">{t.title.seedLabel}</label>
						<input
							id="seed-input"
							type="text"
							maxlength="12"
							bind:value={seedInput}
							class="seed-input"
							placeholder="ECHO01"
						/>
						<button
							type="button"
							class="seed-roll"
							onclick={randomizeSeed}
							title={t.title.newSeedTitle}
						>
							{t.title.newSeedBtn}
						</button>
					</div>
				</div>
			{:else}
				<div class="dock-row">
					<button type="submit" class="btn-primary start-btn">
						{t.title.enterBtn}
					</button>

					<div class="seed-box">
						<label for="seed-input" class="seed-label">{t.title.seedLabel}</label>
						<input
							id="seed-input"
							type="text"
							maxlength="12"
							bind:value={seedInput}
							class="seed-input"
							placeholder="ECHO01"
						/>
						<button
							type="button"
							class="seed-roll"
							onclick={randomizeSeed}
							title={t.title.newSeedTitle}
						>
							{t.title.newSeedBtn}
						</button>
					</div>
				</div>
			{/if}

			{#if bestFloor > 0}
				<div class="records-strip">
					<span>{t.title.deepestFloor} <strong>{bestFloor}</strong></span>
					<span class="sep">·</span>
					<span>{t.title.highScore} <strong>{bestScore.toLocaleString()}</strong></span>
				</div>
			{/if}

			<div class="controls-preview">
				<span><kbd class="kbd">WASD</kbd> {t.title.moveHint}</span>
				<span><kbd class="kbd">CLICK</kbd> / <kbd class="kbd">SPACE</kbd> {t.title.attackHint}</span>
				<span><kbd class="kbd">R-CLICK</kbd> / <kbd class="kbd">X</kbd> {t.title.toolHint}</span>
				<span><kbd class="kbd">SHIFT</kbd> / <kbd class="kbd">C</kbd> {t.title.dashHint}</span>
			</div>
		</form>
	</div>
</div>

<style>
	.title-screen {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: flex;
		align-items: stretch;
		justify-content: center;
		background: #080b12;
		overflow: hidden;
	}

	.lang-switch {
		position: absolute;
		top: 1rem;
		right: 1.1rem;
		z-index: 5;
		display: inline-flex;
		padding: 3px;
		border-radius: 8px;
		background: rgba(10, 14, 24, 0.86);
		border: 1px solid var(--border-stone);
		backdrop-filter: blur(8px);
		gap: 3px;
	}

	.lang-btn {
		padding: 0.35rem 0.65rem;
		border: none;
		border-radius: 5px;
		background: transparent;
		color: var(--text-muted);
		font-family: var(--font-pixel);
		font-size: 0.66rem;
		cursor: pointer;
		transition: background 120ms ease, color 120ms ease;
	}

	.lang-btn:hover {
		color: var(--text-primary);
	}

	.lang-btn.active {
		background: var(--gold);
		color: #161108;
		font-weight: 700;
	}

	.title-backdrop {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 55%;
		filter: brightness(0.9);
	}

	.title-vignette {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(180deg, rgba(6, 9, 16, 0.86) 0%, rgba(6, 9, 16, 0.18) 38%, rgba(6, 9, 16, 0.28) 62%, rgba(6, 9, 16, 0.94) 100%),
			radial-gradient(circle at 50% 48%, transparent 32%, rgba(5, 8, 14, 0.7) 100%);
	}

	.title-content {
		position: relative;
		z-index: 2;
		width: 100%;
		max-width: 920px;
		padding: clamp(1.5rem, 4vh, 3.2rem) 1.5rem clamp(1.25rem, 3.5vh, 2.5rem);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
		text-align: center;
	}

	.hero-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.45rem;
	}

	.eyebrow {
		margin: 0;
		font-family: var(--font-pixel);
		font-size: 0.72rem;
		letter-spacing: 0.2em;
		color: var(--emerald);
		text-shadow: 0 2px 10px rgba(88, 242, 200, 0.45);
	}

	.game-title {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(2.1rem, 6vw, 4.1rem);
		font-weight: 900;
		letter-spacing: 0.08em;
		line-height: 1.05;
		color: #f4cb62;
		text-shadow:
			0 3px 0 #57370b,
			0 6px 20px rgba(0, 0, 0, 0.9);
	}

	.tagline {
		margin: 0.25rem 0 0;
		color: rgba(236, 242, 252, 0.84);
		font-size: 0.92rem;
		letter-spacing: 0.03em;
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9);
	}

	.action-dock {
		width: 100%;
		max-width: 740px;
		padding: 1.05rem 1.3rem;
		border-radius: 12px;
		background: rgba(10, 14, 24, 0.86);
		border: 1px solid rgba(232, 185, 72, 0.34);
		backdrop-filter: blur(12px);
		box-shadow: 0 18px 48px rgba(0, 0, 0, 0.68);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.continue-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
	}

	.saved-meta {
		font-family: var(--font-pixel);
		font-size: 0.64rem;
		color: var(--emerald);
		letter-spacing: 0.03em;
	}

	.dock-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		width: 100%;
	}

	.secondary-row {
		padding-top: 0.45rem;
		border-top: 1px solid rgba(148, 174, 212, 0.16);
	}

	.start-btn {
		padding: 0.85rem 1.9rem;
		font-size: 0.95rem;
	}

	.new-run-btn {
		padding: 0.56rem 1rem;
	}

	.seed-box {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.45rem 0.35rem 0.7rem;
		border-radius: 6px;
		border: 1px solid var(--border-stone);
		background: rgba(16, 22, 36, 0.9);
	}

	.seed-label {
		font-family: var(--font-pixel);
		font-size: 0.62rem;
		color: var(--text-muted);
	}

	.seed-input {
		width: 96px;
		background: transparent;
		border: none;
		color: var(--gold-bright);
		font-family: var(--font-pixel);
		font-size: 0.78rem;
		text-transform: uppercase;
		outline: none;
	}

	.seed-roll {
		padding: 0.35rem 0.55rem;
		border: 1px solid var(--border-stone);
		border-radius: 4px;
		background: rgba(34, 46, 68, 0.75);
		color: var(--text-primary);
		font-family: var(--font-pixel);
		font-size: 0.6rem;
		cursor: pointer;
	}

	.seed-roll:hover {
		border-color: var(--border-gold);
	}

	.records-strip {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		font-family: var(--font-pixel);
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.records-strip strong {
		color: var(--emerald);
	}

	.controls-preview {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.65rem 1rem;
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.controls-preview span {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}
</style>
