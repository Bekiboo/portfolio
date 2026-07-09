<script>
	import '../app.css'
	import { gameStatus } from '$lib/game'

	/** @type {{children?: import('svelte').Snippet}} */
	let { children } = $props()

	let windowWidth = $state(0)

	// Once a run starts the portfolio disappears entirely and we're "in the game" (the arena is a
	// self-contained backdrop drawn on the canvas). In portfolio mode ('idle') the CV is live and
	// the character can roam/climb it. Only decoupled on wide viewports (the game is desktop-only).
	let inGame = $derived($gameStatus !== 'idle' && windowWidth > 1024)

	/** @type {typeof import('./GameWrapper.svelte').default | null} */
	let GameWrapper = $state(null)

	// Lazy-load the background platformer (its JS chunk + sprite images) only on
	// wide viewports and only after hydration, so it never touches the critical
	// path or the mobile experience. The page content always renders in the same
	// place, so mounting the game never re-parents (and re-animates) it.
	$effect(() => {
		if (windowWidth > 1024 && !GameWrapper) {
			import('./GameWrapper.svelte').then((m) => (GameWrapper = m.default))
		}
	})
</script>

<div
	class="relative min-h-screen text-slate-200 bg-linear-to-br from-slate-950 via-50% bg-opacity-50 via-slate-900 to-[#330a0a]"
>
	<!-- The portfolio content: faded out + made inert while a run is active, so the game owns the
	     screen. Left mounted (not removed) so returning to idle restores it instantly in place. -->
	<div class="portfolio" class:in-game={inGame} inert={inGame}>
		{@render children?.()}
	</div>
	{#if windowWidth > 1024 && GameWrapper}
		<GameWrapper />
	{/if}
</div>

<svelte:window bind:innerWidth={windowWidth} />

<style>
	/* Entering a run no longer just fades the whole CV out — the two columns part like curtains:
	   the header slides left, each right-column section slides right + fades, staggered top-to-
	   bottom, so the transition into the arena reads as motion rather than a hard cut. */
	.portfolio :global(header),
	.portfolio :global(main > section) {
		transition:
			transform 0.5s cubic-bezier(0.4, 0, 0.2, 1),
			opacity 0.4s ease;
		will-change: transform, opacity;
	}
	.portfolio.in-game {
		pointer-events: none;
	}
	.portfolio.in-game :global(header) {
		opacity: 0;
		transform: translateX(-14%);
	}
	.portfolio.in-game :global(main > section) {
		opacity: 0;
		transform: translateX(16%);
	}
	/* Staggered exit: sections leave one after another, top to bottom. */
	.portfolio.in-game :global(main > section:nth-of-type(1)) {
		transition-delay: 0.04s;
	}
	.portfolio.in-game :global(main > section:nth-of-type(2)) {
		transition-delay: 0.11s;
	}
	.portfolio.in-game :global(main > section:nth-of-type(3)) {
		transition-delay: 0.18s;
	}
	.portfolio.in-game :global(main > section:nth-of-type(4)) {
		transition-delay: 0.25s;
	}
</style>
