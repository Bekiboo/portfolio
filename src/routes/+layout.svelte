<script>
	import '../app.css'
	import GameWrapper from './GameWrapper.svelte'
	/** @type {{children?: import('svelte').Snippet}} */
	let { children } = $props();

	let windowWidth = $state(0)
</script>

<div class="text-slate-200 bg-slate-800">
	{#if windowWidth > 1024}
		<GameWrapper>
			{@render children?.()}
		</GameWrapper>
	{:else}
		{@render children?.()}
	{/if}
</div>

<svelte:window bind:innerWidth={windowWidth} />
