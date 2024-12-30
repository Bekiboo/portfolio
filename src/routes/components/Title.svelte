<script lang="ts">
	let { title } = $props()
</script>

<!-- <h2 data-colliding class="flex mb-2 text-2xl border-y-2 border-slate-700 title">
	<span>{title}</span>
</h2> -->

<div data-colliding class="box">
	<span>{title}</span>
	<helper-1></helper-1>
	<helper-2></helper-2>
</div>

<style>
	.box {
		--border-width: 1px;
		--border-cut: 5px;
		--button-shape: polygon(
			0 var(--border-cut),
			var(--border-cut) 0,
			calc(100% - var(--border-cut)) 0,
			100% var(--border-cut),
			100% calc(100% - var(--border-cut)),
			calc(100% - var(--border-cut)) 100%,
			calc(calc(50% - var(--border-cut) - 25%) + var(--border-cut) + 50% + var(--border-cut)) 100%,
			calc(calc(50% - var(--border-cut) - 25%) + var(--border-cut) + 50%)
				calc(100% - var(--border-cut)),
			calc(calc(50% - var(--border-cut) - 25%) + var(--border-cut)) calc(100% - var(--border-cut)),
			calc(50% - var(--border-cut) - 25%) 100%,
			var(--border-cut) 100%,
			0% calc(100% - var(--border-cut))
		);
	}

	.box {
		font-family: var(--font-family);
		text-transform: uppercase;
		font-size: var(--font-size);
		color: var(--color) !important;
		border: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		justify-self: center;
		align-self: center;
		vertical-align: middle;
		appearance: none;
		box-sizing: border-box;
		text-decoration: none;
		position: relative;
		word-spacing: 3px;
		letter-spacing: 0.4px;
		cursor: pointer;
		transition: 0.3s;
		line-height: initial;
		min-height: 30px;
		min-width: 70px;
		width: 100%;
		white-space: nowrap;
		z-index: 1;
		user-select: none;
		outline: 0;
		padding: 1rem 2rem;
		background-color: transparent;
		margin-bottom: 0.5rem;
	}

	.box {
		--font-family: Jura, monospace;
		--font-size: 1.2rem;
		--color: white;
		--background-color: hsl(217, 33%, 12%);
		--border-color: #2563eb;
	}

	.box::before {
		content: '';
		inset: 0;
		background: var(--border-color);
		position: absolute;
		z-index: -1;
		clip-path: var(--button-shape);
		box-shadow: inset 0 0 25px -10px var(--border-color);
	}

	.box::after,
	.box::before {
		content: '';
		inset: 0;
		background: var(--border-color);
		position: absolute;
		z-index: -1;
		clip-path: var(--button-shape);
		box-shadow: inset 0 0 25px -10px var(--border-color);
	}

	.box::after {
		inset: var(--border-width);
		background: var(--background-color);
	}

	helper-1::before {
		content: '';
		position: absolute;
		height: calc(var(--border-cut) - 2px);
		width: 50%;
		background: var(--border-color);
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		clip-path: polygon(2px 0%, calc(100% - 2px) 0%, 100% 100%, 0% 100%);
	}

	helper-2:before,
	helper-2:after {
		content: '';
		position: absolute;
		height: 80%;
		width: 3px;
		top: 50%;
		left: 5px;
		transform: translateY(-50%);
		clip-path: polygon(0 0, 100% 3px, 100% calc(100% - 3px), 0 100%);
		background: var(--border-color);
		opacity: 0.3;
	}

	helper-2:after {
		left: unset;
		clip-path: polygon(0 3px, 100% 0, 100% 100%, 0 calc(100% - 3px));
		right: 5px;
	}
</style>
