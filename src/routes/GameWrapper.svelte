<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { Platform } from './platformer-logic/Platform'
	import { Player } from './platformer-logic/Player'
	import { effects, projectiles } from '$lib/stores'
	import type { Effect } from './platformer-logic/Effect'
	import { keys } from './platformer-logic/controller'

	// Fixed full-viewport canvas overlay (pointer-events: none) that renders the
	// background platformer. It sits on top of the page content but never wraps it,
	// so the page layout is unaffected and can be lazy-mounted without re-parenting.
	let canvas: HTMLCanvasElement
	let ctx: CanvasRenderingContext2D

	let player: Player

	const mouse = {
		x: 0,
		y: 0
	}

	// Fixed-timestep physics with render interpolation ("Fix Your Timestep"):
	// the simulation advances in constant 60 Hz steps (deterministic and
	// refresh-rate independent) while draw() interpolates between the last two
	// steps, so motion stays smooth at the display's native refresh rate.
	const FIXED_STEP = 1000 / 60 // physics tick length (ms)
	const STEP_DELTA = FIXED_STEP / 12 // delta unit expected by the entities
	const MAX_FRAME_TIME = 100 // clamp accumulated time to avoid a spiral after the tab was hidden

	let lastTime = 0
	let accumulator = 0
	let rafId: number | null = null
	let shootingInterval: number | null = null

	// Platforms are derived from DOM elements; they only move on scroll/resize,
	// so cache them and recompute lazily instead of every frame (avoids layout thrash).
	let platforms: Platform[] = []
	let platformsDirty = true
	let canvasDirty = true
	const markDirty = () => {
		platformsDirty = true
		canvasDirty = true
	}

	const startShooting = () => {
		player.shoot()
		if (shootingInterval === null) {
			// Prevent multiple intervals
			shootingInterval = window.setInterval(() => {
				player.shoot()
			}, 200) // Adjust the interval time as needed (200ms = 5 shots/sec)
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

	const resizeCanvas = () => {
		canvas.width = canvas.clientWidth
		canvas.height = canvas.clientHeight
		canvasDirty = false
	}

	const collectPlatforms = () => {
		const collidingElements = document.querySelectorAll('[data-colliding]')
		platforms = []
		for (let i = 0; i < collidingElements.length; i++) {
			const el = collidingElements[i].getBoundingClientRect()
			platforms.push(new Platform(el.width, el.height, el.y, el.x))
		}
		platformsDirty = false
	}

	const animate = (timestamp: number) => {
		if (lastTime === 0) lastTime = timestamp
		const frameTime = Math.min(timestamp - lastTime, MAX_FRAME_TIME)
		lastTime = timestamp

		if (canvasDirty) resizeCanvas()
		if (platformsDirty) collectPlatforms()

		// Advance physics in fixed steps, consuming the elapsed real time.
		accumulator += frameTime
		while (accumulator >= FIXED_STEP) {
			$projectiles?.forEach((projectile) => projectile.update(STEP_DELTA, platforms))
			player.update(canvas, keys, mouse, platforms, STEP_DELTA)
			accumulator -= FIXED_STEP
		}
		const alpha = accumulator / FIXED_STEP // fractional progress toward the next step

		// Render once per frame, interpolating entities between their last two steps.
		ctx.clearRect(0, 0, canvas.width, canvas.height)
		for (const platform of platforms) platform.draw(ctx)
		$projectiles?.forEach((projectile) => projectile.draw(ctx, alpha))
		player.draw(ctx, frameTime / 12, alpha)
		$effects?.forEach((effect: Effect) => effect.draw(ctx))

		rafId = requestAnimationFrame(animate)
	}

	onMount(() => {
		canvas = document.querySelector('canvas') as HTMLCanvasElement
		ctx = canvas.getContext('2d') as CanvasRenderingContext2D

		player = new Player({ x: 0, y: 0 })

		rafId = requestAnimationFrame(animate) // Start the animation loop
	})

	onDestroy(() => {
		// Stop the loop and timers so remounting (e.g. crossing the 1024px breakpoint)
		// doesn't stack multiple animation loops.
		if (rafId !== null) cancelAnimationFrame(rafId)
		stopShooting()
	})
</script>

<canvas class="z-10"></canvas>

<svelte:window
	onkeydown={(e) => keys.onkeydown(e, player)}
	onkeyup={(e) => keys.onkeyup(e, player)}
	{onmousemove}
	onmousedown={startShooting}
	onmouseup={stopShooting}
	onscroll={markDirty}
	onresize={markDirty}
/>

<style>
	canvas {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		pointer-events: none;
	}
</style>
