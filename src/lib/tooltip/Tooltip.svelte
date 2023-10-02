<script lang="ts">
	export let message: string
	export let x: number
	export let y: number
</script>

<div
	style="
		top: {y + 5}px;
		left: {x + 10}px;"
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
