<script lang="ts">
	export let message: string
	export let x: number
	export let y: number
	let tooltipWidth: number
</script>

<div
	bind:clientWidth={tooltipWidth}
	style="
		top: {y - 36}px;
		left: {x - tooltipWidth / 2}px;"
>
	{message}
</div>

<style>
	div {
		background: var(--delft-blue);
		color: var(--white);
		border-radius: 4px;
		padding: 4px;
		position: absolute;
	}
</style>
