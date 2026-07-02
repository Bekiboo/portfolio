<script>
	import '../app.css'

	/** @type {{children?: import('svelte').Snippet}} */
	let { children } = $props()

	let windowWidth = $state(0)

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
	class:select-none={windowWidth > 1024}
>
	{@render children?.()}
	{#if windowWidth > 1024 && GameWrapper}
		<GameWrapper />
	{/if}
</div>

<svelte:window bind:innerWidth={windowWidth} />
