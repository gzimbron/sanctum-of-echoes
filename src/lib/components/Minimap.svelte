<script lang="ts">
	import type { MinimapRoomInfo } from '$lib/game/types';
	import { localeStore, TRANSLATIONS } from '$lib/game/i18n';

	interface Props {
		rooms: MinimapRoomInfo[];
		accent: string;
	}

	let { rooms, accent }: Props = $props();
	let t = $derived(TRANSLATIONS[$localeStore]);

	let bounds = $derived.by(() => {
		const visible = rooms.filter((r) => r.discovered);
		const list = visible.length > 0 ? visible : rooms;
		if (list.length === 0) {
			return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
		}
		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;
		for (const r of list) {
			if (r.gx < minX) minX = r.gx;
			if (r.gx > maxX) maxX = r.gx;
			if (r.gy < minY) minY = r.gy;
			if (r.gy > maxY) maxY = r.gy;
		}
		return { minX: minX - 1, maxX: maxX + 1, minY: minY - 1, maxY: maxY + 1 };
	});

	let adjacentIds = $derived.by(() => {
		const set = new Set<string>();
		const byCoord = new Map(rooms.map((r) => [`${r.gx},${r.gy}`, r]));
		for (const r of rooms) {
			if (!r.discovered) continue;
			for (const d of r.doors) {
				const dx = d.dir === 'east' ? 1 : d.dir === 'west' ? -1 : 0;
				const dy = d.dir === 'south' ? 1 : d.dir === 'north' ? -1 : 0;
				const neighbor = byCoord.get(`${r.gx + dx},${r.gy + dy}`);
				if (neighbor && !neighbor.discovered) {
					set.add(neighbor.id);
				}
			}
		}
		return set;
	});

	const cellW = 18;
	const cellH = 14;
	const gap = 4;
	const stepX = cellW + gap;
	const stepY = cellH + gap;

	let svgW = $derived(Math.max(96, (bounds.maxX - bounds.minX + 1) * stepX + 12));
	let svgH = $derived(Math.max(72, (bounds.maxY - bounds.minY + 1) * stepY + 12));
</script>

<div class="minimap-shell" aria-label={t.hud.map}>
	<div class="minimap-header">
		<span class="minimap-title">{t.hud.map}</span>
		<span class="minimap-count">
			{rooms.filter((r) => r.discovered).length}/{rooms.length}
		</span>
	</div>

	<svg viewBox="0 0 {svgW} {svgH}" class="minimap-svg">
		{#each rooms as room (room.id)}
			{@const isAdj = adjacentIds.has(room.id)}
			{#if room.discovered || isAdj}
				{@const rx = 6 + (room.gx - bounds.minX) * stepX}
				{@const ry = 6 + (room.gy - bounds.minY) * stepY}

				{#if room.discovered}
					{#each room.doors as door}
						{#if door.dir === 'east'}
							<rect x={rx + cellW} y={ry + cellH / 2 - 2} width={gap} height={4} fill={door.locked ? '#e8b948' : '#6f84a3'} />
						{:else if door.dir === 'west'}
							<rect x={rx - gap} y={ry + cellH / 2 - 2} width={gap} height={4} fill={door.locked ? '#e8b948' : '#6f84a3'} />
						{:else if door.dir === 'south'}
							<rect x={rx + cellW / 2 - 2} y={ry + cellH} width={4} height={gap} fill={door.locked ? '#e8b948' : '#6f84a3'} />
						{:else if door.dir === 'north'}
							<rect x={rx + cellW / 2 - 2} y={ry - gap} width={4} height={gap} fill={door.locked ? '#e8b948' : '#6f84a3'} />
						{/if}
					{/each}
				{/if}

				<rect
					x={rx}
					y={ry}
					width={cellW}
					height={cellH}
					rx="2"
					fill={room.current
						? accent
						: room.discovered
							? room.type === 'exit'
								? '#4c2635'
								: room.type === 'treasure'
									? '#4d3c1a'
									: '#283448'
							: 'rgba(40, 52, 72, 0.35)'}
					stroke={room.current
						? '#ffffff'
						: room.discovered
							? room.type === 'exit'
								? '#ff6b81'
								: room.type === 'treasure'
									? '#e8b948'
									: '#677b9c'
							: 'rgba(120, 142, 176, 0.3)'}
					stroke-width={room.current ? 1.5 : 1}
					stroke-dasharray={room.discovered ? undefined : '2 2'}
				/>

				{#if room.discovered}
					{#if room.type === 'exit'}
						<text x={rx + cellW / 2} y={ry + 10.5} text-anchor="middle" font-size="8" fill="#fff0a8" font-family="monospace" font-weight="bold">S</text>
					{:else if room.hasUnopenedChest && (room.type === 'treasure' || room.type === 'key')}
						<circle cx={rx + cellW / 2} cy={ry + cellH / 2} r="2.6" fill="#ffd559" />
					{:else if room.current}
						<circle cx={rx + cellW / 2} cy={ry + cellH / 2} r="2.4" fill="#0c1018" />
					{/if}
				{:else if room.type === 'exit'}
					<text x={rx + cellW / 2} y={ry + 10} text-anchor="middle" font-size="7" fill="#e8b948" font-family="monospace">?</text>
				{/if}
			{/if}
		{/each}
	</svg>

	<div class="minimap-legend">
		<span><i class="dot dot-gold"></i>{t.hud.chest}</span>
		<span><i class="dot dot-exit"></i>{t.hud.stairs}</span>
	</div>
</div>

<style>
	.minimap-shell {
		background: var(--bg-panel);
		border: 1px solid var(--border-stone);
		border-radius: 8px;
		padding: 0.5rem 0.6rem;
		backdrop-filter: blur(8px);
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 144px;
		max-width: 196px;
	}

	.minimap-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-family: var(--font-pixel);
		font-size: 0.62rem;
		color: var(--text-muted);
		letter-spacing: 0.08em;
	}

	.minimap-title {
		color: var(--gold);
	}

	.minimap-svg {
		width: 100%;
		height: auto;
		max-height: 120px;
		display: block;
	}

	.minimap-legend {
		display: flex;
		gap: 0.65rem;
		font-size: 0.65rem;
		color: var(--text-muted);
		justify-content: center;
	}

	.minimap-legend span {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.dot {
		display: inline-block;
		width: 7px;
		height: 7px;
		border-radius: 999px;
	}

	.dot-gold {
		background: #ffd559;
	}

	.dot-exit {
		background: #ff6b81;
	}
</style>
