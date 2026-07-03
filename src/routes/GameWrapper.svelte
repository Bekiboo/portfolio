<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { Platform } from './platformer-logic/Platform'
	import { Player } from './platformer-logic/Player'
	import { Enemy } from './platformer-logic/Enemy'
	import { XpGem } from './platformer-logic/XpGem'
	import { effects, projectiles, effectsStore, enemies, enemiesStore, projectilesStore, xpGems, xpGemsStore } from '$lib/stores'
	import { Effect } from './platformer-logic/Effect'
	import { collision } from './platformer-logic/utils'
	import { keys } from './platformer-logic/controller'
	import { gameStarted, gameStatus, score, playerHp, MAX_HP, wave, xp, startRun, stopRun, gameOver } from '$lib/game'
	import { get } from 'svelte/store'
	import Button from './components/Button.svelte'

	// Fixed full-viewport canvas overlay (pointer-events: none) that renders the
	// background platformer. It sits on top of the page content but never wraps it,
	// so the page layout is unaffected and can be lazy-mounted without re-parenting.
	let canvas: HTMLCanvasElement
	let ctx: CanvasRenderingContext2D

	let player: Player

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

	// Platforms are derived from DOM elements; they only move on scroll/resize,
	// so cache them and recompute lazily instead of every frame (avoids layout thrash).
	let platforms: Platform[] = []
	let platformsDirty = true
	let canvasDirty = true
	const markDirty = () => {
		platformsDirty = true
		canvasDirty = true
	}

	// Auto-attack: the player fires at the nearest enemy on this cadence while a run
	// is active. No mouse — the pointer stays free to read/scroll the CV.
	const PLAYER_FIRE_STEPS = 20 // physics steps between shots (~3/s at 60 Hz)
	let playerFireCooldown = 0

	const onKeyDown = (e: KeyboardEvent) => {
		// Escape bails out of a run / dismisses game-over; everything else is movement.
		if (e.code === 'Escape') {
			if (get(gameStatus) !== 'idle') stopRun()
			return
		}
		keys.onkeydown(e, player)
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

	// --- Enemies & waves (mini-game) -----------------------------------------
	// Difficulty escalates continuously: every WAVE_DURATION of play the wave
	// steps up, shrinking the spawn interval and raising the enemy count/speed
	// (speed stays below the player's so they can always be outrun).
	const WAVE_DURATION = 14000 // ms of play per wave
	const INVULN_STEPS = 72 // ~1.2s of i-frames after the player is hit
	const waveSpawnInterval = (w: number) => Math.max(520, 1400 - (w - 1) * 130)
	const waveEnemyCap = (w: number) => Math.min(12, 6 + (w - 1))
	const waveEnemySpeed = (w: number) => Math.min(4.2, 2.4 + (w - 1) * 0.22)
	// Guaranteed flyers in the field (from wave 1) so a perched player is always
	// hunted from the air, even when the ground is clogged with unreachable bikers.
	const waveFlyerFloor = (w: number) => Math.min(4, 1 + Math.floor((w - 1) / 2))
	// Ranged gunners join from wave 2 and pepper perches out of melee reach.
	const waveShooterFloor = (w: number) => (w < 2 ? 0 : Math.min(3, 1 + Math.floor((w - 2) / 2)))
	// Enemy toughness: bikers 3 HP, flyers/shooters 2, +1 for every 3 waves cleared.
	const waveEnemyHealth = (kind: 'biker' | 'flyer' | 'shooter', w: number) =>
		(kind === 'biker' ? 3 : 2) + Math.floor((w - 1) / 3)
	let spawnTimer = 0
	let spawnSide = 0
	let invuln = 0
	let wasPlaying = false
	let dimAlpha = 0 // eased screen-dim while playing (focus mode)
	let waveTimer = 0 // ms elapsed in the current wave
	const WAVE_BANNER_MS = 1400 // how long the "WAVE N" flash shows on advance
	let waveBanner = 0 // ms remaining on the current banner

	const spawnEnemy = (kind: 'biker' | 'flyer' | 'shooter') => {
		const w = get(wave)
		// Alternate the side each enemy walks/flies in from.
		const fromLeft = spawnSide++ % 2 === 0
		const x = fromLeft ? -60 : canvas.width + 60
		// Flyers enter higher up; ground units (biker/shooter) walk in at floor level.
		const y = kind === 'flyer' ? canvas.height * 0.35 : canvas.height - 80
		// Flyers a touch slower than bikers; shooters are near-stationary gunners.
		const speed =
			kind === 'flyer' ? waveEnemySpeed(w) * 0.8 : kind === 'shooter' ? 1.6 : waveEnemySpeed(w)
		enemiesStore.add(new Enemy({ x, y }, { kind, speed, health: waveEnemyHealth(kind, w) }))
	}

	// Decide what to spawn on a tick: keep the field topped up to the wave cap and
	// always maintain the flyer floor. If the field is already full of bikers that
	// a camping player has clogged (they can't reach a perch), retire the one stuck
	// furthest below the player and swap in a flyer instead — no perch stays safe.
	const spawnFromBudget = () => {
		const w = get(wave)
		const list = get(enemies)
		const flyers = list.filter((e) => e.kind === 'flyer').length
		const shooters = list.filter((e) => e.kind === 'shooter').length
		// Keep air and ranged pressure topped up first, then fill with bikers.
		const wanted: 'flyer' | 'shooter' | null =
			flyers < waveFlyerFloor(w) ? 'flyer' : shooters < waveShooterFloor(w) ? 'shooter' : null
		if (list.length < waveEnemyCap(w)) {
			spawnEnemy(wanted ?? 'biker')
		} else if (wanted) {
			// Field capped but missing air/ranged pressure (a camping player has
			// clogged it with unreachable bikers): retire the biker stuck furthest
			// below the player and swap in the type we need.
			let stuck: Enemy | null = null
			let worst = -Infinity
			for (const e of list) {
				if (e.kind !== 'biker') continue
				const below = e.pos.y - player.pos.y
				if (below > worst) {
					worst = below
					stuck = e
				}
			}
			if (stuck) {
				enemiesStore.delete(stuck)
				spawnEnemy(wanted)
			}
		}
	}

	const spawnPlayerOnPedestal = () => {
		// Pop the player onto the Start button ([data-spawn]) with a smoke puff and
		// zero its motion. Used on mount and at the start of every run.
		const spawnEl = document.querySelector('[data-spawn]')
		if (!spawnEl) return
		const r = spawnEl.getBoundingClientRect()
		player.pos.x = r.x + r.width / 2 - player.width / 2
		player.pos.y = r.top - player.height
		player.prevPos.x = player.pos.x
		player.prevPos.y = player.pos.y
		player.velocity.x = 0
		player.velocity.y = 0
		effectsStore.add(new Effect({ x: player.pos.x, y: player.pos.y + 28 }, 'smoke_12'))
	}

	// Canvas HUD (hearts + score), drawn on top so the focus-mode veil doesn't dim it.
	const drawHud = () => {
		const cx = canvas.width / 2
		ctx.save()
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		const hp = get(playerHp)
		ctx.font = '22px sans-serif'
		for (let i = 0; i < MAX_HP; i++) {
			ctx.fillStyle = i < hp ? '#ef4444' : '#475569'
			ctx.fillText('♥', cx + (i - (MAX_HP - 1) / 2) * 26, 34)
		}
		ctx.font = '600 15px ui-monospace, monospace'
		ctx.fillStyle = '#cbd5e1'
		ctx.fillText(`WAVE ${get(wave)}   ·   SCORE ${get(score)}`, cx, 62)
		ctx.font = '600 13px ui-monospace, monospace'
		ctx.fillStyle = '#34d399' // emerald-400 — the collectable currency
		ctx.fillText(`XP ${get(xp)}`, cx, 82)
		ctx.restore()
	}

	// Brief "WAVE N" flash when the difficulty steps up.
	const drawWaveBanner = () => {
		const t = waveBanner / WAVE_BANNER_MS // 1 → 0 over the banner's life
		ctx.save()
		ctx.globalAlpha = Math.min(1, t * 2) // hold, then fade out over the last half
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillStyle = '#f87171' // red-400
		ctx.font = '700 34px ui-monospace, monospace'
		ctx.fillText(`WAVE ${get(wave)}`, canvas.width / 2, canvas.height * 0.26)
		ctx.restore()
	}

	// Nearest enemy to the player (by squared distance), for auto-aim. null if none.
	const nearestEnemy = (): Enemy | null => {
		const foes = $enemies ?? []
		let best: Enemy | null = null
		let bestD = Infinity
		const px = player.pos.x + player.width / 2
		const py = player.pos.y + player.height / 2
		for (const e of foes) {
			const dx = e.pos.x + e.width / 2 - px
			const dy = e.pos.y + e.height / 2 - py
			const d = dx * dx + dy * dy
			if (d < bestD) {
				bestD = d
				best = e
			}
		}
		return best
	}

	// Bullet → enemy hits. Snapshot both lists first: delete() swaps the store
	// arrays, and we don't want the live subscription shifting under the loop.
	const resolveHits = () => {
		const projs = $projectiles ?? []
		const foes = $enemies ?? []
		if (!projs.length || !foes.length) return
		for (const projectile of projs) {
			if (projectile.hostile) continue // enemy shots don't hit enemies
			const projRect = {
				width: projectile.width,
				height: projectile.height,
				top: projectile.pos.y - projectile.height / 2,
				left: projectile.pos.x - projectile.width / 2
			}
			for (const enemy of foes) {
				const enemyRect = {
					width: enemy.width,
					height: enemy.height,
					top: enemy.pos.y,
					left: enemy.pos.x
				}
				if (collision(enemyRect, projRect)) {
					if (enemy.hit()) {
						score.update((s) => s + 1)
						// Drop an XP gem where it fell; it tumbles to the floor under
						// gravity, so the player must leave a safe perch to bank it.
						xpGemsStore.add(
							new XpGem({ x: enemy.pos.x + enemy.width / 2 - 7, y: enemy.pos.y + enemy.height / 2 })
						)
					}
					projectilesStore.delete(projectile)
					break
				}
			}
		}
	}

	// One point of damage + i-frames; 0 HP ends the run. Shared by contact and shots.
	const damagePlayer = () => {
		const hp = get(playerHp) - 1
		playerHp.set(hp)
		invuln = INVULN_STEPS
		effectsStore.add(new Effect({ x: player.pos.x, y: player.pos.y + 28 }, 'smoke_12'))
		if (hp <= 0) gameOver()
	}

	// Enemy contact → player takes a hit (unless in i-frames).
	const resolvePlayerDamage = () => {
		if (invuln > 0) return
		const playerRect = {
			width: player.width,
			height: player.height,
			top: player.pos.y,
			left: player.pos.x
		}
		for (const enemy of $enemies ?? []) {
			const enemyRect = {
				width: enemy.width,
				height: enemy.height,
				top: enemy.pos.y,
				left: enemy.pos.x
			}
			if (collision(playerRect, enemyRect)) {
				damagePlayer()
				break
			}
		}
	}

	// Hostile bolt hits the player → a hit, and the bolt is spent.
	const resolveEnemyShots = () => {
		if (invuln > 0) return
		const playerRect = {
			width: player.width,
			height: player.height,
			top: player.pos.y,
			left: player.pos.x
		}
		for (const projectile of $projectiles ?? []) {
			if (!projectile.hostile) continue
			const projRect = {
				width: projectile.width,
				height: projectile.height,
				top: projectile.pos.y - projectile.height / 2,
				left: projectile.pos.x - projectile.width / 2
			}
			if (collision(playerRect, projRect)) {
				damagePlayer()
				projectilesStore.delete(projectile)
				break
			}
		}
	}

	// Walk over a dropped gem (the pickup magnet eases the last few pixels) to bank
	// its XP. Uncollected gems expire on the floor, so a pure camper forfeits them.
	const resolveGemPickups = () => {
		const gems = $xpGems ?? []
		if (!gems.length) return
		const playerRect = {
			width: player.width,
			height: player.height,
			top: player.pos.y,
			left: player.pos.x
		}
		for (const gem of gems) {
			const gemRect = { width: gem.width, height: gem.height, top: gem.pos.y, left: gem.pos.x }
			if (collision(playerRect, gemRect)) {
				xp.update((n) => n + gem.value)
				xpGemsStore.delete(gem)
			}
		}
	}

	const animate = (timestamp: number) => {
		if (lastTime === 0) lastTime = timestamp
		const frameTime = Math.min(timestamp - lastTime, MAX_FRAME_TIME)
		lastTime = timestamp

		if (canvasDirty) resizeCanvas()
		if (platformsDirty) collectPlatforms()

		const playing = get(gameStarted)

		// On the rising edge of a run, clear the field and any leftover bolts. The
		// player keeps its current position — no teleport onto the pedestal.
		if (playing && !wasPlaying) {
			enemiesStore.set([])
			projectilesStore.set([])
			xpGemsStore.set([])
			spawnTimer = 0
			invuln = 0
			waveTimer = 0
			waveBanner = 0
		}
		wasPlaying = playing

		// Advance the wave on a timer, then spawn enemies at the current wave's
		// rate/cap; clear the field once the game is stopped.
		if (playing) {
			waveTimer += frameTime
			if (waveTimer >= WAVE_DURATION) {
				waveTimer -= WAVE_DURATION
				wave.update((w) => w + 1)
				waveBanner = WAVE_BANNER_MS
			}
			spawnTimer += frameTime
			if (spawnTimer >= waveSpawnInterval(get(wave))) {
				spawnFromBudget()
				spawnTimer = 0
			}
		} else {
			if ($enemies?.length) enemiesStore.set([])
			if ($projectiles?.length) projectilesStore.set([])
			if ($xpGems?.length) xpGemsStore.set([])
			invuln = 0
			waveBanner = 0
		}

		// Advance physics in fixed steps, consuming the elapsed real time.
		accumulator += frameTime
		while (accumulator >= FIXED_STEP) {
			$projectiles?.forEach((projectile) => projectile.update(STEP_DELTA, platforms))
			$xpGems?.forEach((gem) => gem.update(canvas, player, platforms, STEP_DELTA))
			if (playing) $enemies?.forEach((enemy) => enemy.update(canvas, player, platforms, STEP_DELTA, $enemies ?? []))
			player.update(canvas, keys, platforms, STEP_DELTA)
			// Auto-attack: aim at the nearest enemy and fire on a cadence while playing.
			const target = playing ? nearestEnemy() : null
			player.aimAt(target)
			if (playing) {
				if (target) {
					if (playerFireCooldown > 0) playerFireCooldown--
					else {
						player.shoot()
						playerFireCooldown = PLAYER_FIRE_STEPS
					}
				}
				resolveHits()
				resolveGemPickups()
				if (invuln > 0) invuln--
				resolvePlayerDamage()
				resolveEnemyShots()
			}
			accumulator -= FIXED_STEP
		}
		const alpha = accumulator / FIXED_STEP // fractional progress toward the next step

		// Render once per frame, interpolating entities between their last two steps.
		ctx.clearRect(0, 0, canvas.width, canvas.height)
		// Focus mode: ease a dark veil over the page behind the sprites while playing.
		dimAlpha += ((playing ? 0.5 : 0) - dimAlpha) * 0.12
		if (dimAlpha > 0.01) {
			ctx.fillStyle = `rgba(2, 6, 23, ${dimAlpha})`
			ctx.fillRect(0, 0, canvas.width, canvas.height)
			// Keep the interactive platforms (section titles, buttons) at full
			// brightness by punching the veil out over their rects — only the
			// surrounding CV dims.
			for (const p of platforms) ctx.clearRect(p.left, p.top, p.width, p.height)
		}
		for (const platform of platforms) platform.draw(ctx)
		$xpGems?.forEach((gem) => gem.draw(ctx, alpha))
		$enemies?.forEach((enemy) => enemy.draw(ctx, frameTime / 12, alpha))
		$projectiles?.forEach((projectile) => projectile.draw(ctx, alpha))
		// Blink the player while invulnerable after a hit.
		if (invuln <= 0 || Math.floor(invuln / 6) % 2 === 0) {
			player.draw(ctx, frameTime / 12, alpha)
		}
		$effects?.forEach((effect: Effect) => effect.draw(ctx))

		if (playing) {
			drawHud()
			if (waveBanner > 0) drawWaveBanner()
		}
		if (waveBanner > 0) waveBanner -= frameTime

		rafId = requestAnimationFrame(animate)
	}

	onMount(() => {
		canvas = document.querySelector('canvas') as HTMLCanvasElement
		ctx = canvas.getContext('2d') as CanvasRenderingContext2D

		player = new Player({ x: 0, y: 0 })
		spawnPlayerOnPedestal()

		rafId = requestAnimationFrame(animate) // Start the animation loop
	})

	onDestroy(() => {
		// Stop the loop so remounting (e.g. crossing the 1024px breakpoint) doesn't
		// stack multiple animation loops.
		if (rafId !== null) cancelAnimationFrame(rafId)
		enemiesStore.set([])
		projectilesStore.set([])
		xpGemsStore.set([])
	})
</script>

<canvas class="z-10"></canvas>

{#if $gameStatus === 'over'}
	<div class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
		<div class="game-over pointer-events-auto select-none text-center">
			<div class="font-bauhaus text-3xl font-bold tracking-widest text-red-500">GAME OVER</div>
			<div class="mt-2 font-mono text-sm tracking-widest text-slate-300">
				WAVE <span class="text-red-400">{$wave}</span>
				<span class="mx-1 text-slate-600">·</span>
				SCORE <span class="text-blue-400">{$score}</span>
				<span class="mx-1 text-slate-600">·</span>
				XP <span class="text-emerald-400">{$xp}</span>
			</div>
			<div class="mt-4 flex flex-col items-center gap-2">
				<button onclick={startRun} aria-label="Restart the game">
					<Button text="RESTART" classes="uppercase" />
				</button>
				<button
					onclick={stopRun}
					class="text-xs tracking-widest text-slate-500 uppercase transition hover:text-slate-300"
					aria-label="Quit the game"
				>
					Quit
				</button>
			</div>
		</div>
	</div>
{/if}

<svelte:window
	onkeydown={onKeyDown}
	onkeyup={(e) => keys.onkeyup(e, player)}
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

	.game-over {
		padding: 1.5rem 2.5rem;
		background: rgb(15 23 42 / 0.9); /* slate-900/90 */
		border: 1px solid rgb(51 65 85); /* slate-700 */
		border-radius: 0.5rem;
		box-shadow: 0 10px 40px rgb(0 0 0 / 0.5);
	}
</style>
