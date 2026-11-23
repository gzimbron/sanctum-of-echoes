<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import '../app.css';
	import { createSanctumGame, type GameController } from '$lib/game/phaser/createGame';
	import { hudStore } from '$lib/game/state/runStore';
	import { sound } from '$lib/game/audio';
	import { generateRandomSeedCode } from '$lib/game/rng';
	import { localeStore, setLocale, TRANSLATIONS } from '$lib/game/i18n';
	import type { ToolId } from '$lib/game/types';
	import TitleScreen from '$lib/components/TitleScreen.svelte';
	import GameHud from '$lib/components/GameHud.svelte';
	import Minimap from '$lib/components/Minimap.svelte';
	import PauseOverlay from '$lib/components/PauseOverlay.svelte';
	import GameOverModal from '$lib/components/GameOverModal.svelte';
	import TouchControls from '$lib/components/TouchControls.svelte';

	let hostEl: HTMLDivElement;
	let controller: GameController | null = null;
	let hud = $derived($hudStore);
	let t = $derived(TRANSLATIONS[$localeStore]);

	onMount(() => {
		sound.setMuted($hudStore.muted);
		controller = createSanctumGame(hostEl);

		// Support shareable ?seed=XXXX&play=1&lang=es URLs
		const params = new URLSearchParams(window.location.search);
		const urlLang = params.get('lang');
		if (urlLang === 'es' || urlLang === 'en') {
			setLocale(urlLang);
		}
		const urlSeed = params.get('seed');
		const autoPlay = params.get('play') === '1';
		if (urlSeed) {
			hudStore.patch({ seed: urlSeed.toUpperCase() });
		}
		if (autoPlay) {
			const startWhenReady = () => {
				const scene = controller?.getScene();
				if (scene && scene.scene.isActive()) {
					scene.startNewRun(urlSeed?.toUpperCase() || $hudStore.seed, false);
				} else {
					window.setTimeout(startWhenReady, 60);
				}
			};
			window.setTimeout(startWhenReady, 120);
		}

		const onKeyDown = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement | null)?.tagName;
			const isTyping = tag === 'INPUT' || tag === 'TEXTAREA';

			// Prevent browser page scroll / focused button re-click while actively playing!
			if (
				!isTyping &&
				$hudStore.phase === 'playing' &&
				(e.code === 'Space' || e.code.startsWith('Arrow'))
			) {
				e.preventDefault();
			}

			if (e.key === 'Escape' || (!isTyping && e.key.toLowerCase() === 'p' && $hudStore.phase !== 'title')) {
				if ($hudStore.phase === 'playing') {
					controller?.getScene()?.setPaused(true);
				} else if ($hudStore.phase === 'paused') {
					controller?.getScene()?.setPaused(false);
				}
			}
		};
		window.addEventListener('keydown', onKeyDown);

		return () => {
			window.removeEventListener('keydown', onKeyDown);
			sound.stopBgm();
			controller?.destroy();
			controller = null;
		};
	});

	function handleStartRun(seed: string) {
		sound.unlock();
		controller?.getScene()?.startNewRun(seed, false);
	}

	function handleContinueRun() {
		const saved = hud.savedRun;
		if (!saved) {
			handleStartRun(hud.seed);
			return;
		}
		sound.unlock();
		controller?.getScene()?.resumeSavedRun(saved, false);
	}

	function handleRetryFloor() {
		const saved = hud.savedRun;
		if (!saved) {
			handleStartRun(hud.seed);
			return;
		}
		sound.unlock();
		controller?.getScene()?.resumeSavedRun(saved, true);
	}

	function handleNewRandomRun() {
		handleStartRun(generateRandomSeedCode());
	}

	function handleToggleMute() {
		const next = !hud.muted;
		sound.setMuted(next);
		hudStore.patch({ muted: next });
	}

	function handlePause() {
		controller?.getScene()?.setPaused(true);
	}

	function handleResume() {
		controller?.getScene()?.setPaused(false);
	}

	function handleReturnTitle() {
		sound.stopBgm();
		controller?.getScene()?.setPaused(true);
		hudStore.patch({ phase: 'title' });
	}

	function handleSelectTool(tool: ToolId) {
		controller?.getScene()?.selectTool(tool);
	}

	function handleLocaleChange() {
		controller?.getScene()?.refreshLocalization();
	}
</script>

<div class="game-shell">
	<GameHud
		{hud}
		onSelectTool={handleSelectTool}
		onToggleMute={handleToggleMute}
		onPause={handlePause}
		onLocaleChange={handleLocaleChange}
	/>

	<main class="viewport-stage">
		<div class="canvas-frame" style="--frame-accent: {hud.biomeAccent}">
			<div bind:this={hostEl} class="phaser-host"></div>

			{#if hud.phase === 'playing' && hud.minimap.length > 0}
				<div class="minimap-anchor">
					<Minimap rooms={hud.minimap} accent={hud.biomeAccent} />
				</div>
			{/if}

			{#if hud.toast && hud.phase === 'playing'}
				<div
					class="toast-banner toast-{hud.toast.accent ?? 'gold'}"
					class:has-icon={hud.toast.iconFrame !== undefined}
					style="--objects-url: url('{base}/assets/objects.png')"
					role="status"
				>
					{#if hud.toast.iconFrame !== undefined}
						{@const frame = hud.toast.iconFrame}
						<span
							class="toast-icon pixelated"
							style="background-position: {-(frame % 8) * 32}px {-Math.floor(frame / 8) * 32}px;"
						></span>
					{/if}
					<div class="toast-copy">
						<strong class="toast-title">{hud.toast.title}</strong>
						{#if hud.toast.subtitle}
							<span class="toast-sub">{hud.toast.subtitle}</span>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<footer class="chamber-footer">
			<div class="chamber-info">
				<span class="chamber-name">{hud.roomLabel}</span>
				<span class="chamber-sep">—</span>
				<span class="chamber-hint">{hud.roomHint}</span>
			</div>
			<div class="quick-keys">
				<span><kbd class="kbd">Click</kbd>/<kbd class="kbd">Space</kbd> {t.hud.quickAttack}</span>
				<span><kbd class="kbd">R-Click</kbd>/<kbd class="kbd">X</kbd> {t.hud.quickTool}</span>
				<span><kbd class="kbd">Shift</kbd> {t.hud.quickDash}</span>
			</div>
		</footer>
	</main>

	{#if hud.phase === 'playing'}
		<TouchControls
			onMove={(p) => controller?.getScene()?.setVirtualInput(p)}
			onAttack={() => controller?.getScene()?.triggerAttack()}
			onDash={() => controller?.getScene()?.triggerDash()}
			onTool={() => controller?.getScene()?.triggerTool()}
		/>
	{/if}

	{#if hud.phase === 'title'}
		<TitleScreen
			initialSeed={hud.seed}
			bestFloor={hud.bestFloor}
			bestScore={hud.bestScore}
			savedRun={hud.savedRun}
			onStart={handleStartRun}
			onContinue={handleContinueRun}
			onLocaleChange={handleLocaleChange}
		/>
	{/if}

	{#if hud.phase === 'paused'}
		<PauseOverlay
			{hud}
			onResume={handleResume}
			onRetryFloor={handleRetryFloor}
			onRestart={handleNewRandomRun}
			onTitle={handleReturnTitle}
			onLocaleChange={handleLocaleChange}
		/>
	{/if}

	{#if hud.phase === 'gameover'}
		<GameOverModal
			{hud}
			onRetryFloor={handleRetryFloor}
			onNewRun={handleNewRandomRun}
			onTitle={handleReturnTitle}
		/>
	{/if}
</div>

<style>
	.game-shell {
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-direction: column;
		background:
			radial-gradient(ellipse at 50% 40%, #151c2b 0%, #090c14 75%);
		overflow: hidden;
	}

	.viewport-stage {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.65rem 1rem 0.55rem;
		gap: 0.55rem;
	}

	.canvas-frame {
		position: relative;
		flex: 1;
		min-height: 0;
		width: 100%;
		max-width: 1060px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, var(--frame-accent) 30%, rgba(148, 174, 212, 0.25));
		background: #0d1017;
		box-shadow:
			0 20px 60px rgba(0, 0, 0, 0.72),
			0 0 36px color-mix(in srgb, var(--frame-accent) 12%, transparent);
		overflow: hidden;
	}

	.phaser-host {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.minimap-anchor {
		position: absolute;
		top: 0.7rem;
		right: 0.7rem;
		z-index: 15;
		pointer-events: none;
	}

	.toast-banner {
		position: absolute;
		top: 0.8rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 18;
		padding: 0.55rem 1.15rem;
		border-radius: 8px;
		background: rgba(11, 15, 25, 0.94);
		border: 1px solid var(--gold);
		box-shadow: 0 10px 32px rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.7rem;
		pointer-events: none;
		animation: toastPop 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.toast-copy {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.14rem;
	}

	.toast-banner.has-icon .toast-copy {
		align-items: flex-start;
		text-align: left;
	}

	.toast-icon {
		width: 32px;
		height: 32px;
		flex-shrink: 0;
		background-image: var(--objects-url);
		background-size: 256px 128px;
		filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.65));
	}

	.toast-gold { border-color: var(--gold); }
	.toast-emerald { border-color: var(--emerald); }
	.toast-cyan { border-color: #7ef6ff; }
	.toast-crimson { border-color: var(--crimson); }

	.toast-title {
		font-family: var(--font-pixel);
		font-size: 0.78rem;
		color: var(--gold-bright);
		letter-spacing: 0.04em;
	}

	.toast-emerald .toast-title { color: var(--emerald); }
	.toast-cyan .toast-title { color: #7ef6ff; }
	.toast-crimson .toast-title { color: #ff7a8d; }

	.toast-sub {
		font-size: 0.74rem;
		color: var(--text-primary);
	}

	@keyframes toastPop {
		from {
			opacity: 0;
			transform: translate(-50%, -10px) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translate(-50%, 0) scale(1);
		}
	}

	.chamber-footer {
		width: 100%;
		max-width: 1060px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.38rem 0.85rem;
		border-radius: 8px;
		background: rgba(14, 19, 30, 0.82);
		border: 1px solid var(--border-stone);
		font-size: 0.78rem;
	}

	.chamber-info {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		min-width: 0;
	}

	.chamber-name {
		font-family: var(--font-pixel);
		font-size: 0.68rem;
		color: var(--gold);
		white-space: nowrap;
	}

	.chamber-sep {
		color: var(--text-muted);
	}

	.chamber-hint {
		color: var(--text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.quick-keys {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		color: var(--text-muted);
		font-size: 0.71rem;
		white-space: nowrap;
	}

	.quick-keys span {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	@media (max-width: 860px) {
		.quick-keys,
		.minimap-anchor {
			display: none;
		}
	}
</style>
