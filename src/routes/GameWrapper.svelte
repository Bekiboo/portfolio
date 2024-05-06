<script lang="ts">
	import { onMount } from 'svelte'
	import { Platform } from './platformer-logic/Platform'
	import { Player } from './platformer-logic/Player'
	import { effects } from '$lib/stores'
	import type { Effect } from './platformer-logic/Effect'

	let canvas: HTMLCanvasElement
	let ctx: CanvasRenderingContext2D

	let player: Player

	const keys = {
		left: false,
		right: false,
		up: false,
		down: false,
		punch: false
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
				keys.up = true
				player.jump()
				break
			case 'KeyS':
				keys.down = true
				break
			case 'KeyK':
				keys.punch = true
				player.punch(keys)
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
			case 'KeyK':
				keys.punch = false
				break
		}
	}

	const animate = () => {
		canvas.width = canvas.clientWidth
		canvas.height = canvas.clientHeight

		ctx.clearRect(0, 0, canvas.width, canvas.height)

		let collidingElements = document.querySelectorAll('[data-colliding]')

		let platforms: Platform[] = []

		for (let i = 0; i < collidingElements.length; i++) {
			let el = collidingElements[i].getBoundingClientRect()
			let platform = new Platform(el.width, el.height, el.y, el.x)
			platforms.push(platform)

			platform.draw(ctx)
		}

		player.draw(ctx)
		player.update(canvas, keys, platforms)

		$effects?.forEach((effect: Effect) => {
			effect.draw(ctx)
		})

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
	<canvas class="z-10" />

	<div class="content">
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
		position: fixed;
		grid-column: 1;
		grid-row: 1;
		width: 100vw;
		height: 100vh;
		pointer-events: none;
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
