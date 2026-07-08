<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { GameWorld } from './platformer-logic/GameWorld.svelte'
	import {
		gameStatus,
		score,
		wave,
		xp,
		level,
		stopRun,
		paused,
		resumeGame,
		weaponSelectOpen,
		requestLaunch,
		launchWith,
		cancelLaunch
	} from '$lib/game'
	import { WEAPON_TYPES } from './platformer-logic/weaponTypes'
	import Button from './components/Button.svelte'

	// The starting-weapon choices, in a stable order for the launch picker (keys 1–4).
	const weaponList = Object.values(WEAPON_TYPES)

	// Fixed full-viewport canvas overlay (pointer-events: none) that renders the
	// background platformer. It sits on top of the page content but never wraps it,
	// so the page layout is unaffected and can be lazy-mounted without re-parenting.
	// All simulation (loop, spawns, combat, upgrades) lives in GameWorld — this shell
	// just mounts it, forwards window events, and renders the game-over / level-up
	// modals from its reactive fields (world.levelUpOpen / choices / rerolls).
	let canvasEl: HTMLCanvasElement
	const world = new GameWorld()

	// While the launch picker is open, number keys pick the starter and Escape cancels;
	// otherwise keys go to the game. (The mid-run milestone picker is handled in GameWorld.)
	const PICK_KEYS: Record<string, number> = {
		Digit1: 0, Numpad1: 0, Digit2: 1, Numpad2: 1,
		Digit3: 2, Numpad3: 2, Digit4: 3, Numpad4: 3
	}
	function onKeyDown(e: KeyboardEvent) {
		if ($weaponSelectOpen) {
			const idx = PICK_KEYS[e.code]
			if (idx !== undefined && idx < weaponList.length) launchWith(weaponList[idx].kind)
			else if (e.code === 'Escape') cancelLaunch()
			return
		}
		world.handleKeyDown(e)
	}

	onMount(() => world.mount(canvasEl))
	onDestroy(() => world.destroy())
</script>

<canvas bind:this={canvasEl} class="z-10"></canvas>

{#if $gameStatus === 'over' && !$weaponSelectOpen}
	<div class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
		<div class="game-over pointer-events-auto select-none text-center">
			<div class="font-bauhaus text-3xl font-bold tracking-widest text-red-500">GAME OVER</div>
			<div class="mt-2 font-mono text-sm tracking-widest text-slate-300">
				WAVE <span class="text-red-400">{$wave}</span>
				<span class="mx-1 text-slate-600">·</span>
				SCORE <span class="text-blue-400">{$score}</span>
				<span class="mx-1 text-slate-600">·</span>
				XP <span class="text-emerald-400">{$xp}</span>
			</div>
			<div class="mt-4 flex flex-col items-center gap-2">
				<button onclick={requestLaunch} aria-label="Restart the game">
					<Button text="RESTART" classes="uppercase" />
				</button>
				<button
					onclick={stopRun}
					class="text-xs tracking-widest text-slate-500 uppercase transition hover:text-slate-300"
					aria-label="Quit the game"
				>
					Quit
				</button>
			</div>
		</div>
	</div>
{/if}

{#if $paused && $gameStatus === 'playing'}
	<!-- Pause menu: same entry point as Escape. Freezes the run (nothing cleared) and offers
	     to resume or quit. Full-screen catcher so clicks don't fall through to the hub. -->
	<div class="fixed inset-0 z-50 flex items-center justify-center select-none">
		<div class="pause-menu text-center">
			<div class="font-bauhaus text-2xl font-bold tracking-widest text-slate-200">PAUSE</div>
			<div class="mt-1 font-mono text-xs tracking-widest text-slate-400">
				WAVE <span class="text-red-400">{$wave}</span>
				<span class="mx-1 text-slate-600">·</span>
				SCORE <span class="text-blue-400">{$score}</span>
			</div>
			<div class="mt-5 flex flex-col items-center gap-2">
				<button onclick={resumeGame} aria-label="Resume the game">
					<Button text="CONTINUER" classes="uppercase" />
				</button>
				<button
					onclick={stopRun}
					class="text-xs tracking-widest text-slate-500 uppercase transition hover:text-slate-300"
					aria-label="Quit the game"
				>
					Quitter
				</button>
			</div>
			<div class="mt-4 font-mono text-[10px] tracking-widest text-slate-500 uppercase">
				Échap pour reprendre
			</div>
		</div>
	</div>
{/if}

{#if world.levelUpOpen}
	<!-- Full-screen catcher (default pointer-events) so clicks land on the modal and
	     not the Start/Stop hub behind it. Forces a pick before play resumes. -->
	<div class="fixed inset-0 z-50 flex items-center justify-center select-none">
		<div class="level-up text-center">
			{#if world.milestone === 'weapon'}
				<div class="font-bauhaus text-2xl font-bold tracking-widest text-fuchsia-400">
					NOUVELLE ARME
				</div>
				<div class="mt-1 font-mono text-xs tracking-widest text-slate-400">
					Choisis ta deuxième arme
				</div>
			{:else if world.milestone === 'power'}
				<div class="font-bauhaus text-2xl font-bold tracking-widest text-indigo-400">
					NOUVEAU POUVOIR
				</div>
				<div class="mt-1 font-mono text-xs tracking-widest text-slate-400">
					Choisis ton pouvoir spécial (touche S)
				</div>
			{:else}
				<div class="font-bauhaus text-2xl font-bold tracking-widest text-emerald-400">
					LEVEL UP
				</div>
				<div class="mt-1 font-mono text-xs tracking-widest text-slate-400">NIVEAU {$level}</div>
			{/if}
			<div class="mt-4 flex flex-col gap-2">
				{#each world.choices as choice, i (choice.id)}
					<button class="upgrade" data-kind={choice.kind} onclick={() => world.chooseUpgrade(choice)}>
						<span class="key">{i + 1}</span>
						<span class="flex flex-col items-start">
							<span class="name">{choice.name}</span>
							<span class="desc">{choice.desc}</span>
						</span>
					</button>
				{/each}
			</div>
			{#if !world.milestone}
				<button
					class="reroll"
					onclick={() => world.reroll()}
					disabled={world.rerolls <= 0}
					aria-label="Relancer les choix"
				>
					↻ Relancer <span class="reroll-count">{world.rerolls}</span>
				</button>
				<div class="mt-3 font-mono text-[10px] tracking-widest text-slate-500 uppercase">
					Clic ou touches 1 · 2 · 3 · R relance
				</div>
			{:else}
				<div class="mt-3 font-mono text-[10px] tracking-widest text-slate-500 uppercase">
					Clic ou touches 1 · 2 · 3 — définitif
				</div>
			{/if}
		</div>
	</div>
{/if}

{#if $weaponSelectOpen}
	<!-- Pre-run starting-weapon picker. Choosing one commits the starter and begins the run;
	     the second weapon is earned later at the level milestone. -->
	<div class="fixed inset-0 z-50 flex items-center justify-center select-none">
		<div class="level-up text-center">
			<div class="font-bauhaus text-2xl font-bold tracking-widest text-fuchsia-400">
				ARME DE DÉPART
			</div>
			<div class="mt-1 font-mono text-xs tracking-widest text-slate-400">Choisis ton arme</div>
			<div class="mt-4 flex flex-col gap-2">
				{#each weaponList as weapon, i (weapon.kind)}
					<button class="upgrade" data-kind="weapon" onclick={() => launchWith(weapon.kind)}>
						<span class="key">{i + 1}</span>
						<span class="flex flex-col items-start">
							<span class="name">{weapon.name}</span>
							<span class="desc">{weapon.blurb}</span>
						</span>
					</button>
				{/each}
			</div>
			<button
				onclick={cancelLaunch}
				class="mt-3 text-xs tracking-widest text-slate-500 uppercase transition hover:text-slate-300"
				aria-label="Annuler"
			>
				Annuler
			</button>
			<div class="mt-2 font-mono text-[10px] tracking-widest text-slate-500 uppercase">
				Clic ou touches 1 · 2 · 3 · 4
			</div>
		</div>
	</div>
{/if}

<svelte:window
	onkeydown={onKeyDown}
	onkeyup={(e) => world.handleKeyUp(e)}
	onscroll={() => world.markDirty()}
	onresize={() => world.markDirty()}
/>

<style>
	canvas {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		pointer-events: none;
	}

	.game-over {
		padding: 1.5rem 2.5rem;
		background: rgb(15 23 42 / 0.9); /* slate-900/90 */
		border: 1px solid rgb(51 65 85); /* slate-700 */
		border-radius: 0.5rem;
		box-shadow: 0 10px 40px rgb(0 0 0 / 0.5);
	}

	.level-up {
		width: min(90vw, 340px);
		padding: 1.5rem 1.75rem;
		background: rgb(15 23 42 / 0.94); /* slate-900 */
		border: 1px solid rgb(51 65 85); /* slate-700 */
		border-radius: 0.6rem;
		box-shadow: 0 10px 40px rgb(0 0 0 / 0.55);
	}
	.pause-menu {
		width: min(90vw, 300px);
		padding: 1.5rem 2rem;
		background: rgb(15 23 42 / 0.92); /* slate-900/92 */
		border: 1px solid rgb(51 65 85); /* slate-700 */
		border-radius: 0.5rem;
		box-shadow: 0 10px 40px rgb(0 0 0 / 0.5);
	}
	.upgrade {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.6rem 0.8rem;
		text-align: left;
		border: 1px solid rgb(51 65 85); /* slate-700 */
		border-radius: 0.45rem;
		background: rgb(30 41 59 / 0.6); /* slate-800 */
		transition:
			border-color 0.15s,
			background 0.15s,
			transform 0.1s;
	}
	.upgrade:hover {
		background: rgb(51 65 85 / 0.7);
		transform: translateY(-1px);
	}
	.upgrade .key {
		display: flex;
		flex: none;
		align-items: center;
		justify-content: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 0.35rem;
		background: rgb(15 23 42 / 0.8); /* slate-900 */
		font-family: ui-monospace, monospace;
		font-size: 0.85rem;
		font-weight: 700;
		color: rgb(226 232 240); /* slate-200 */
	}
	.upgrade .name {
		font-family: Jura, sans-serif;
		font-size: 0.9rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: rgb(226 232 240); /* slate-200 */
	}
	.upgrade .desc {
		font-size: 0.72rem;
		color: rgb(148 163 184); /* slate-400 */
	}
	/* Accent the badge + border by upgrade family. */
	.upgrade[data-kind='atk'] {
		border-color: rgb(248 113 113 / 0.5); /* red-400 */
	}
	.upgrade[data-kind='atk'] .key {
		color: rgb(248 113 113);
	}
	.upgrade[data-kind='def'] {
		border-color: rgb(96 165 250 / 0.5); /* blue-400 */
	}
	.upgrade[data-kind='def'] .key {
		color: rgb(96 165 250);
	}
	.upgrade[data-kind='util'] {
		border-color: rgb(52 211 153 / 0.5); /* emerald-400 */
	}
	.upgrade[data-kind='util'] .key {
		color: rgb(52 211 153);
	}
	/* Weapon-milestone cards: fuchsia, and beefier since it's a rare, permanent pick. */
	.upgrade[data-kind='weapon'] {
		border-color: rgb(232 121 249 / 0.6); /* fuchsia-400 */
		background: rgb(112 26 117 / 0.25);
	}
	.upgrade[data-kind='weapon'] .key {
		color: rgb(232 121 249);
	}
	/* Power-milestone cards: indigo, same beefier treatment as the weapon pick. */
	.upgrade[data-kind='power'] {
		border-color: rgb(129 140 248 / 0.6); /* indigo-400 */
		background: rgb(49 46 129 / 0.3); /* indigo-900 */
	}
	.upgrade[data-kind='power'] .key {
		color: rgb(129 140 248);
	}
	.reroll {
		margin-top: 0.75rem;
		width: 100%;
		padding: 0.4rem 0.8rem;
		border: 1px dashed rgb(71 85 105); /* slate-600 */
		border-radius: 0.45rem;
		background: rgb(30 41 59 / 0.4); /* slate-800 */
		font-family: ui-monospace, monospace;
		font-size: 0.75rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgb(148 163 184); /* slate-400 */
		transition:
			border-color 0.15s,
			background 0.15s,
			color 0.15s;
	}
	.reroll:hover:not(:disabled) {
		border-color: rgb(148 163 184); /* slate-400 */
		background: rgb(51 65 85 / 0.6);
		color: rgb(226 232 240); /* slate-200 */
	}
	.reroll:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.reroll-count {
		color: rgb(226 232 240); /* slate-200 */
		font-weight: 700;
	}
</style>
