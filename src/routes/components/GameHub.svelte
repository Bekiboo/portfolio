<script lang="ts">
	import Button from './Button.svelte'
	import { gameStatus, startRun, stopRun, character, selectCharacter } from '$lib/game'
	import { CHARACTER_LIST } from '../platformer-logic/characters'

	const toggle = () => ($gameStatus === 'playing' ? stopRun() : startRun())
</script>

<!--
	Bottom-left "hub" for the background platformer. The Start/Stop button doubles
	as the little platform the character pops onto (it carries data-spawn, read by
	GameWrapper, and data-colliding, so it is a real platform). Shows a controls
	hint when idle; the in-play HUD (hearts + score) and the game-over card are
	drawn by GameWrapper so they sit above the focus-mode veil. Desktop only.
-->
<div class="hidden select-none lg:block">
	{#if $gameStatus === 'idle'}
		<!-- Pick a class before starting. Each plays differently (Punk mitraille à
		     distance, Biker fracasse, Cyborg déploie). Click a card or press 1/2/3. -->
		<div class="mb-3 flex flex-col gap-1.5">
			{#each CHARACTER_LIST as c, i (c.kind)}
				<button
					class="char-card"
					class:selected={$character === c.kind}
					style="--accent: {c.accent}"
					onclick={() => selectCharacter(c.kind)}
					aria-pressed={$character === c.kind}
					aria-label={`Jouer ${c.name}`}
				>
					<span class="char-key">{i + 1}</span>
					<span class="flex min-w-0 flex-col items-start">
						<span class="char-name">{c.name}</span>
						<span class="char-tag">{c.tagline}</span>
					</span>
				</button>
			{/each}
		</div>
		<div class="mb-3 space-y-1.5 text-slate-500" aria-hidden="true">
			<div class="flex items-center gap-1">
				<kbd class="hub-key">W</kbd>
				<kbd class="hub-key">A</kbd>
				<kbd class="hub-key">S</kbd>
				<kbd class="hub-key">D</kbd>
				<span class="ml-2 text-xs tracking-widest uppercase">/ ZQSD — move</span>
			</div>
			<div class="text-xs tracking-widest uppercase">Fire — automatic</div>
		</div>
	{/if}

	<button
		data-colliding
		data-spawn
		onclick={toggle}
		aria-label={$gameStatus === 'playing' ? 'Stop the game' : 'Start the game'}
	>
		<Button text={$gameStatus === 'playing' ? 'STOP' : 'START'} classes="uppercase" />
	</button>
</div>

<style>
	/* Class-selection cards (idle only). Accent per class via the --accent var; the
	   selected one gets an accent ring. Same visual idiom as the level-up upgrade cards. */
	.char-card {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		width: 16rem;
		max-width: 80vw;
		padding: 0.45rem 0.6rem;
		text-align: left;
		border: 1px solid rgb(51 65 85); /* slate-700 */
		border-left: 3px solid var(--accent);
		border-radius: 0.45rem;
		background: rgb(15 23 42 / 0.55); /* slate-900 */
		transition:
			border-color 0.15s,
			background 0.15s,
			transform 0.1s;
	}
	.char-card:hover {
		background: rgb(30 41 59 / 0.7); /* slate-800 */
		transform: translateY(-1px);
	}
	.char-card.selected {
		border-color: var(--accent);
		background: rgb(30 41 59 / 0.85);
		box-shadow:
			0 0 0 1px var(--accent) inset,
			0 0 12px -4px var(--accent);
	}
	.char-key {
		display: flex;
		flex: none;
		align-items: center;
		justify-content: center;
		width: 1.4rem;
		height: 1.4rem;
		border-radius: 0.3rem;
		background: rgb(2 6 23 / 0.7); /* slate-950 */
		font-family: ui-monospace, monospace;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--accent);
	}
	.char-name {
		font-family: Jura, sans-serif;
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		line-height: 1.1;
		color: rgb(226 232 240); /* slate-200 */
	}
	.char-tag {
		font-size: 0.66rem;
		line-height: 1.15;
		color: rgb(148 163 184); /* slate-400 */
	}

	.hub-key {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.5rem;
		height: 1.5rem;
		padding: 0 0.3rem;
		border: 1px solid rgb(51 65 85); /* slate-700 */
		border-bottom-width: 2px;
		border-radius: 0.3rem;
		font-family: Jura, monospace;
		font-size: 0.72rem;
		color: rgb(148 163 184); /* slate-400 */
		background: rgb(15 23 42 / 0.4); /* slate-900/40 */
	}
</style>
