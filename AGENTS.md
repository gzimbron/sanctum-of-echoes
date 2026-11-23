# AGENTS.md — Sanctum of Echoes

Concise engineering guide for AI coding agents and contributors working in this repository.

## Quick Path

| Task | Command |
| --- | --- |
| Install dependencies | `pnpm install` |
| Start local dev server | `pnpm dev` |
| Run unit tests (Vitest) | `pnpm test` |
| Type & Svelte check | `pnpm check` |
| Production static build | `pnpm build` |
| Test GitHub Pages subpath build | `BASE_PATH=/sanctum-of-echoes pnpm build` |
| Regenerate pixel-art spritesheets | `pnpm assets` (requires Python 3 + Pillow) |

> **Package manager note:** This repository uses `pnpm` v12 with `pnpm-workspace.yaml` (`allowBuilds: { esbuild: true }`). Keep `pnpm-lock.yaml` in sync so GitHub Actions `--frozen-lockfile` succeeds.

## Architecture Map

| Path | Responsibility |
| --- | --- |
| `scripts/generate-assets.py` | Deterministic 16-bit pixel-art spritesheet & tileset generator (`tiles.png`, `hero.png`, `enemies.png`, `objects.png`, `favicon.png`). |
| `static/assets/` | Runtime static assets (`title-art.png`, spritesheets, `favicon.png`). |
| `static/.nojekyll` | Prevents GitHub Pages Jekyll processing from stripping SvelteKit's `_app/` directory. |
| `src/lib/game/types.ts` | Shared domain types, tile codes, tool/relic catalogs, `SavedRunState`, and `HudState`. |
| `src/lib/game/rng.ts` | Deterministic `Mulberry32` seeded PRNG and string seed hashing. |
| `src/lib/game/i18n.ts` | Typed bilingual (`en` / `es`) translation store with `localStorage` persistence. |
| `src/lib/game/audio.ts` | Zero-dependency Web Audio API chiptune SFX and dynamic per-biome BGM synthesizer. |
| `src/lib/game/dungeon/biomes.ts` | 4 cycling dungeon biomes (`stone_sanctum`, `ember_crypt`, `verdant_ruins`, `astral_vault`). |
| `src/lib/game/dungeon/templates.ts` | Handcrafted, solvable puzzle and combat room blueprints (`15×11` tiles). |
| `src/lib/game/dungeon/generator.ts` | Graph-based procedural floor generator with BFS solvability guarantees. |
| `src/lib/game/state/runStore.ts` | Svelte HUD state, global records, and persistent per-floor checkpoint save/validation (`sanctum_of_echoes_save_v1`). |
| `src/lib/game/phaser/createGame.ts` | Phaser 3 bootstrap (`pixelArt: true`, `Scale.FIT`, `240×176` logical room viewport). |
| `src/lib/game/phaser/DungeonScene.ts` | Core real-time action engine: room scrolling, movement, mouse/keyboard combat, input buffering, tools, puzzles, enemy AI, and HUD bridge. |
| `src/lib/components/` | Svelte 5 reactive UI (`TitleScreen`, `GameHud`, `Minimap`, `PauseOverlay`, `GameOverModal`, `TouchControls`). |
| `src/routes/+page.svelte` | Main viewport mounting Phaser canvas, overlays, URL query support (`?seed=&play=&lang=`), and global key guards. |
| `.github/workflows/deploy.yml` | CI test/check + automated GitHub Pages deployment via `@sveltejs/adapter-static`. |

## Critical Invariants (Do Not Break)

1. **Guaranteed Dungeon Solvability** (`generator.ts`, `templates.ts`):
   - The Exit room must remain a strict **leaf node** gated by a single locked door.
   - The Key room must live inside the non-exit connected subgraph (verified by BFS in `generator.test.ts`).
   - Puzzle templates requiring a tool (`light_braziers` → `fire_rod`, `bomb_vault` → `bomb`) must only spawn when that tool is already in `unlockedTools`.
   - Keep doorway entry aprons `(7,1..2)`, `(7,8..9)`, `(1..2,5)`, and `(12..13,5)` free of permanent solid obstacles.
2. **Dash Landing Safety** (`DungeonScene.ts`):
   - Dashing temporarily ignores pits/water (`ignoreHazards`). Exiting a dash must always pass through `resolveHazardOrStuckPosition()` (ledge-snap up to `12px`, otherwise rescue to `lastSafeX/Y`) so the player can never get trapped on hazard tiles.
3. **GitHub Pages Base Path Portability**:
   - Never hardcode root-relative `/assets/...` paths in `.ts` or `.svelte` files. Always import `{ base } from '$app/paths'` and prefix asset URLs with `${base}/assets/...`.
   - Keep `paths.base: process.env.BASE_PATH ?? ''` in `svelte.config.js` and `static/.nojekyll` intact.
4. **Pixel-Art Frame Boundaries** (`scripts/generate-assets.py`):
   - Every sprite frame must stay strictly inside its cell (`16×16` for `tiles.png`/`objects.png`, `24×24` for `hero.png`/`enemies.png`) so adjacent frames never bleed.
5. **Typed Multi-Language Copy** (`src/lib/game/i18n.ts`):
   - Keep all UI strings, room hints, biome names, tool/relic copy, and toast messages inside `TRANSLATIONS` for both `en` and `es`. Never hardcode user-facing prose in components or `DungeonScene.ts`.
6. **Per-Floor Auto-Save Contract** (`runStore.ts`, `DungeonScene.ts`):
   - Save checkpoints at floor entry (`saveFloorCheckpoint()`).
   - Never delete the checkpoint on player death — restarting from Floor 1 must always be an explicit user action.
   - Validate all loaded `localStorage` data through `parseSavedRun()`.
7. **Browser Focus & Input Hygiene**:
   - Blur interactive HUD buttons on click and prevent default browser scrolling on `Space`/`Arrow*` during active play so keyboard controls stay responsive.

## Verification Checklist

Before finishing any change:

- [ ] `pnpm test` passes (dungeon solvability, determinism, checkpoint sanitization).
- [ ] `pnpm check` reports 0 errors and 0 warnings.
- [ ] `BASE_PATH=/sanctum-of-echoes pnpm build` completes cleanly with `@sveltejs/adapter-static`.
- [ ] If sprite sheets changed, visually inspect the updated PNGs in `static/assets/`.
