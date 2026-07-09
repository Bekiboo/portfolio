<script lang="ts">
	import Button from './Button.svelte'
	import { gameStatus, requestLaunch, pauseGame } from '$lib/game'

	// While playing, the button pauses (opens the Continue/Quit modal — same as Escape)
	// rather than stopping outright; from idle it opens the starting-weapon picker (which
	// then begins the run).
	const toggle = () => ($gameStatus === 'playing' ? pauseGame() : requestLaunch())
</script>

<!--
	Bottom-left "hub" for the background platformer. The Start/Stop button doubles
	as the little platform the character pops onto (it carries data-spawn, read by
	GameWrapper, and data-colliding, so it is a real platform). Shows a controls
	hint when idle; the in-play HUD (hearts + score) and the game-over card are
	drawn by GameWrapper so they sit above the focus-mode veil. Desktop only.
-->
<div class="hidden select-none lg:block">
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

	<!-- Fixed width so the pedestal (data-spawn platform) stays a constant size whether it reads
	     START or STOP, and a little wider than the label needs. data-spawn/data-colliding land on
	     the real <button> (read by the engine); the label swaps with the run state. -->
	<Button
		text={$gameStatus === 'playing' ? 'STOP' : 'START'}
		classes="uppercase w-36"
		data-colliding
		data-spawn
		onclick={toggle}
		aria-label={$gameStatus === 'playing' ? 'Pause the game' : 'Start the game'}
	/>
</div>

<style>
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
