<script lang="ts">
	interface Props {
		message: string;
		x: number;
		y: number;
	}

	let { message, x, y }: Props = $props();
	let tooltipWidth: number = $state()
</script>

<div
	bind:clientWidth={tooltipWidth}
	style="
		top: {y - 56}px;
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
