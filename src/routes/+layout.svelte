<script>
	import '../app.css'
	import GameWrapper from './GameWrapper.svelte'
	/** @type {{children?: import('svelte').Snippet}} */
	let { children } = $props()

	let windowWidth = $state(0)
</script>

<div class="relative text-slate-200 bg-gradient-to-br from-slate-950 via-50% bg-opacity-50 via-slate-900 to-[#330a0a]">
	{#if windowWidth > 1024}
		<GameWrapper>
			{@render children?.()}
		</GameWrapper>
	{:else}
		{@render children?.()}
	{/if}
</div>

<svelte:window bind:innerWidth={windowWidth} />
