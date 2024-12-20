<script lang="ts">
	import { onMount } from 'svelte'
	import { Platform } from './platformer-logic/Platform'
	import { Player } from './platformer-logic/Player'
	import { effects, projectiles } from '$lib/stores'
	import type { Effect } from './platformer-logic/Effect'

	interface Props {
		children?: import('svelte').Snippet
	}

	let { children }: Props = $props()

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

	const mouse = {
		x: 0,
		y: 0
	}

	let lastTime = performance.now() // Initial timestamp for delta time calculation
	let shootingInterval: number | null = null

	const onkeydown = (e: KeyboardEvent) => {
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

	const onkeyup = (e: KeyboardEvent) => {
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

	const startShooting = () => {
		player.shoot()
		if (shootingInterval === null) {
			// Prevent multiple intervals
			shootingInterval = window.setInterval(() => {
				player.shoot()
			}, 100) // Adjust the interval time as needed (200ms = 5 shots/sec)
		}
	}

	const stopShooting = () => {
		if (shootingInterval !== null) {
			window.clearInterval(shootingInterval)
			shootingInterval = null // Reset interval ID
		}
	}

	const onmousemove = (e: MouseEvent) => {
		mouse.x = e.clientX
		mouse.y = e.clientY
	}

	const animate = (timestamp = performance.now()) => {
		const deltaTime = (timestamp - lastTime) / 12 // Time elapsed since last frame in seconds
		lastTime = timestamp // Update lastTime for the next frame

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

		$projectiles?.forEach((projectile) => {
			projectile.update(deltaTime)
			projectile.draw(ctx)
		})

		player.update(canvas, keys, mouse, platforms, deltaTime)
		player.draw(ctx, deltaTime)

		$effects?.forEach((effect: Effect) => {
			effect.draw(ctx)
		})

		requestAnimationFrame(animate)
	}

	onMount(() => {
		player = new Player({ x: 0, y: 0 })

		canvas = document.querySelector('canvas') as HTMLCanvasElement
		ctx = canvas.getContext('2d') as CanvasRenderingContext2D

		animate() // Start the animation loop
	})
</script>

<div class="wrapper">
	<canvas class="z-10"></canvas>

	<div class="content">
		{@render children?.()}
	</div>
</div>

<svelte:window
	{onkeydown}
	{onkeyup}
	{onmousemove}
	onmousedown={startShooting}
	onmouseup={stopShooting}
/>

<style>
	.wrapper {
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: 1fr;
		min-height: 100vh;
		user-select: none;
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
