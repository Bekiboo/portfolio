<script lang="ts">
	let { text, classes } = $props()
</script>

<button class={classes}>
	<span>{text}</span>
	<helper-1 classname="jsx-3254698753"></helper-1>
	<shine></shine>
	<ripple></ripple>
</button>

<style>
	button {
		--border-width: 1px;
		--border-cut: 22px;
		--button-shape: polygon(
			100% 0,
			100% calc(100% - var(--border-cut)),
			calc(100% - var(--border-cut)) 100%,
			0 100%,
			0 0
		);
	}

	button {
		--font-family: Jura, monospace;
		--font-size: 16px;
		--color: white;
		--background-color: #2563eb;
	}

	button {
		font-family: var(--font-family);
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
		white-space: nowrap;
		z-index: 1;
		user-select: none;
		outline: 0;
		padding: 15px 30px;
		background-color: transparent;
		margin-left: 0.5rem;
	}

	button:before {
		content: '';
		position: absolute;
		inset: 0 auto 0 -10px;
		width: 5px;
		background: var(--background-color);
		box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.5);
	}

	button:after {
		content: '';
		position: absolute;
		height: 6px;
		width: 22px;
		background: var(--background-color);
		clip-path: polygon(5px 0%, calc(100% - 5px) 0%, 100% 100%, 0% 100%);
		transform: rotate(135deg);
		bottom: 3px;
		right: -5px;
		box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.5);
	}

	button helper-1:before {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--background-color);
		z-index: -1;
		clip-path: var(--button-shape);
		box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.5);
	}

	shine {
		position: absolute;
		inset: 0;
		overflow: hidden;
		-webkit-clip-path: var(--button-shape);
		clip-path: var(--button-shape);
	}

	shine:after {
		content: '';
		position: absolute;
		inset: 0 auto 0 -70px;
		width: 30px;
		opacity: 0.8;
		background: rgb(255, 255, 255);
		transition: all 0.3s linear;
		transform: skewX(-15deg) translateX(0);
	}

	button:hover shine:after {
		animation: shine 3.5s ease-in-out;
	}

	ripple {
		inset: 0;
		position: absolute;
		overflow: hidden;
		-webkit-clip-path: var(--button-shape);
		clip-path: var(--button-shape);
	}

	ripple:before {
		content: '';
		--ripple-color: rgb(255, 255, 255);
		position: absolute;
		inset: 50%;
		transform: skewX(-10deg);
		border-radius: 100vh;
	}

	ripple:after {
		content: '';
		--ripple-gradient: rgb(255, 255, 255);
		position: absolute;
		inset: 0 auto 0 -200%;
		width: 200%;
		transform: skewX(-20deg);
		opacity: 0.5;
		background-image: linear-gradient(to right, transparent, var(--ripple-gradient), transparent);
	}

	ripple:active:before {
		background: var(--ripple-color);
		animation: ripple 0.1s linear;
	}

	@keyframes ripple {
		0% {
			box-shadow: 0 0 0 0 var(--ripple-color);
			opacity: 0.6;
		}

		to {
			box-shadow: 0 0 0 150px var(--ripple-color);
			opacity: 0;
		}
	}

	button:after {
		content: '';
		position: absolute;
		height: 6px;
		width: 22px;
		background: var(--background-color);
		clip-path: polygon(5px 0%, calc(100% - 5px) 0%, 100% 100%, 0% 100%);
		transform: rotate(135deg);
		bottom: 3px;
		right: -5px;
		box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.5);
	}

	@keyframes shine {
		0% {
			left: -70px;
		}

		20% {
			left: calc(100% + 70px);
		}
		100% {
			left: calc(100% + 70px);
		}
	}
</style>
