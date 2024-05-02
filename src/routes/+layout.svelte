<script>
	import '../app.css'
	import GameWrapper from './GameWrapper.svelte'

	let windowWidth = 0
</script>

<div class="text-slate-200 bg-slate-800">
	{#if windowWidth > 1024}
		<GameWrapper>
			<slot />
		</GameWrapper>
	{:else}
		<slot />
	{/if}
</div>

<svelte:window bind:innerWidth={windowWidth} />
