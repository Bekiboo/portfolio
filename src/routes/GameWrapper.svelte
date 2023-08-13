<script lang="ts">
	import { onMount } from 'svelte'
	import { Platform } from './platformer-logic/Platform'
	import { Player } from './platformer-logic/Player'

	let content: HTMLDivElement

	let canvas: HTMLCanvasElement
	let ctx: CanvasRenderingContext2D

	let player: Player

	const keys = {
		left: false,
		right: false,
		up: false,
		down: false
	}

	const onKeyDown = (e: KeyboardEvent) => {
		switch (e.code) {
			case 'KeyA':
				keys.left = true
				break
			case 'KeyD':
				keys.right = true
				break
			case 'KeyW':
				player.velocity.y = -12
				break
			case 'KeyS':
				keys.down = true
				break
		}
	}

	const onKeyUp = (e: KeyboardEvent) => {
		switch (e.code) {
			case 'KeyA':
				keys.left = false
				break
			case 'KeyD':
				keys.right = false
				break
			case 'KeyW':
				keys.up = false
				break
			case 'KeyS':
				keys.down = false
				break
		}
	}

	const animate = () => {
		canvas.width = content.clientWidth
		canvas.height = content.clientHeight

		ctx.clearRect(0, 0, canvas.width, canvas.height)

		let collidingElements = document.getElementsByClassName('colliding')
		let platforms: Platform[] = []

		for (let i = 0; i < collidingElements.length; i++) {
			let el = collidingElements[i] as HTMLDivElement
			let platform = new Platform(el.offsetWidth, el.offsetHeight, el.offsetTop, el.offsetLeft)
			platforms.push(platform)

			platform.draw(ctx)
		}

		player.draw(ctx)
		player.update(canvas, keys, platforms)

		requestAnimationFrame(animate)
	}

	onMount(() => {
		player = new Player({ x: 0, y: 0 })

		canvas = document.querySelector('canvas') as HTMLCanvasElement
		ctx = canvas.getContext('2d') as CanvasRenderingContext2D

		animate()
	})
</script>

<div class="wrapper">
	<canvas />

	<div class="content" bind:this={content}>
		<slot />
	</div>
</div>

<svelte:window on:keydown={onKeyDown} on:keyup={onKeyUp} />

<style>
	.wrapper {
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: 1fr;
		min-height: 100vh;
	}
	canvas {
		grid-column: 1;
		grid-row: 1;
		width: 100%;
		height: 100%;
	}

	.content {
		grid-column: 1;
		grid-row: 1;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}
</style>
