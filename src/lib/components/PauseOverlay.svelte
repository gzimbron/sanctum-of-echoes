<script lang="ts">
	import type { HudState } from '$lib/game/types';
	import { localeStore, setLocale, TRANSLATIONS, type Locale } from '$lib/game/i18n';

	interface Props {
		hud: HudState;
		onResume: () => void;
		onRetryFloor: () => void;
		onRestart: () => void;
		onTitle: () => void;
		onLocaleChange: () => void;
	}

	let { hud, onResume, onRetryFloor, onRestart, onTitle, onLocaleChange }: Props = $props();
	let copied = $state(false);
	let locale = $derived($localeStore);
	let t = $derived(TRANSLATIONS[locale]);

	async function copySeed() {
		try {
			await navigator.clipboard.writeText(hud.seed);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// clipboard unavailable
		}
	}

	function chooseLang(lang: Locale) {
		setLocale(lang);
		onLocaleChange();
	}
</script>

<div class="overlay-backdrop">
	<div class="modal-card" role="dialog" aria-modal="true" aria-label={t.pause.title}>
		<div class="modal-top">
			<h2 class="modal-title">{t.pause.title}</h2>
			<div class="top-right">
				<div class="lang-pill" role="group" aria-label="Language">
					<button type="button" class:active={locale === 'es'} onclick={() => chooseLang('es')}>ES</button>
					<button type="button" class:active={locale === 'en'} onclick={() => chooseLang('en')}>EN</button>
				</div>
				<button type="button" class="seed-pill" onclick={copySeed} title={t.pause.copySeedTitle}>
					{t.pause.seedLabel}: <strong>{hud.seed}</strong> {copied ? '✓' : ''}
				</button>
			</div>
		</div>

		<div class="section-grid">
			<div class="panel">
				<h3>{t.pause.controlsHeading}</h3>
				<ul class="key-list">
					<li><span>{t.pause.controls.move}</span><span><kbd class="kbd">WASD</kbd> / <kbd class="kbd">↑↓←→</kbd></span></li>
					<li><span>{t.pause.controls.attack}</span><span><kbd class="kbd">Click</kbd> / <kbd class="kbd">SPACE</kbd> / <kbd class="kbd">Z</kbd></span></li>
					<li><span>{t.pause.controls.tool}</span><span><kbd class="kbd">R-Click</kbd> / <kbd class="kbd">X</kbd> / <kbd class="kbd">E</kbd></span></li>
					<li><span>{t.pause.controls.dash}</span><span><kbd class="kbd">SHIFT</kbd> / <kbd class="kbd">C</kbd></span></li>
					<li><span>{t.pause.controls.switchTool}</span><span><kbd class="kbd">1-3</kbd> / <kbd class="kbd">Q</kbd> / Wheel</span></li>
					<li><span>{t.pause.controls.resetBlocks}</span><span><kbd class="kbd">R</kbd></span></li>
				</ul>
				<p class="mouse-tip">{t.pause.tipMouse}</p>
			</div>

			<div class="panel">
				<h3>{t.pause.inventoryHeading}</h3>
				{#if hud.tools.length === 0 && hud.relics.length === 0}
					<p class="empty-note">{t.pause.emptyInventory}</p>
				{:else}
					<ul class="item-list">
						{#each hud.tools as toolId (toolId)}
							<li>
								<strong>{t.tools[toolId].name}</strong>
								<span>{t.tools[toolId].description}</span>
							</li>
						{/each}
						{#each hud.relics as relicId, idx (`${relicId}-${idx}`)}
							<li>
								<strong class="relic-name">{t.relics[relicId].name}</strong>
								<span>{t.relics[relicId].description}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>

		<div class="modal-actions">
			<button type="button" class="btn-primary" onclick={onResume}>{t.pause.resume}</button>
			<button type="button" class="btn-ghost" onclick={onRetryFloor}>
				{t.pause.retryFloor(hud.floorNumber)}
			</button>
			<button type="button" class="btn-ghost" onclick={onRestart}>{t.pause.newRun}</button>
			<button type="button" class="btn-ghost" onclick={onTitle}>{t.pause.titleScreen}</button>
		</div>
	</div>
</div>

<style>
	.overlay-backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: rgba(6, 9, 16, 0.78);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.modal-card {
		width: 100%;
		max-width: 720px;
		background: var(--bg-panel-solid);
		border: 1px solid var(--border-gold);
		border-radius: 12px;
		padding: 1.4rem;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.72);
		display: flex;
		flex-direction: column;
		gap: 1.15rem;
	}

	.modal-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.top-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.lang-pill {
		display: inline-flex;
		padding: 2px;
		border-radius: 6px;
		border: 1px solid var(--border-stone);
		background: rgba(20, 27, 42, 0.9);
		gap: 2px;
	}

	.lang-pill button {
		padding: 0.28rem 0.52rem;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--text-muted);
		font-family: var(--font-pixel);
		font-size: 0.62rem;
		cursor: pointer;
	}

	.lang-pill button.active {
		background: var(--gold);
		color: #161108;
		font-weight: 700;
	}

	.modal-title {
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.55rem;
		letter-spacing: 0.1em;
		color: var(--gold-bright);
	}

	.seed-pill {
		padding: 0.35rem 0.7rem;
		border: 1px solid var(--border-stone);
		border-radius: 999px;
		background: rgba(24, 32, 48, 0.8);
		color: var(--text-muted);
		font-family: var(--font-pixel);
		font-size: 0.66rem;
		cursor: pointer;
	}

	.seed-pill strong {
		color: var(--emerald);
	}

	.section-grid {
		display: grid;
		grid-template-columns: 1.15fr 1fr;
		gap: 0.9rem;
	}

	.panel {
		background: rgba(16, 22, 34, 0.75);
		border: 1px solid var(--border-stone);
		border-radius: 8px;
		padding: 0.85rem;
	}

	.panel h3 {
		margin: 0 0 0.65rem;
		font-family: var(--font-pixel);
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		color: var(--gold);
	}

	.key-list,
	.item-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.48rem;
		font-size: 0.78rem;
	}

	.key-list li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-muted);
	}

	.mouse-tip {
		margin: 0.75rem 0 0;
		padding-top: 0.6rem;
		border-top: 1px solid var(--border-stone);
		font-size: 0.73rem;
		line-height: 1.4;
		color: var(--emerald);
	}

	.item-list li {
		display: flex;
		flex-direction: column;
		gap: 0.12rem;
	}

	.item-list strong {
		color: var(--emerald);
		font-size: 0.8rem;
	}

	.item-list strong.relic-name {
		color: var(--gold-bright);
	}

	.item-list span {
		color: var(--text-muted);
		font-size: 0.74rem;
		line-height: 1.35;
	}

	.empty-note {
		margin: 0;
		color: var(--text-muted);
		font-size: 0.78rem;
		line-height: 1.45;
	}

	.modal-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.65rem;
	}

	@media (max-width: 640px) {
		.section-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
