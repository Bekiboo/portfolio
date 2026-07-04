import { get } from 'svelte/store'
import { Platform } from './Platform'
import { Player } from './Player'
import { Enemy } from './Enemy'
import { XpGem } from './XpGem'
import { HealthPack } from './HealthPack'
import { Effect } from './Effect'
import { ENEMY_TYPES, type EnemyKind } from './enemyTypes'
import {
	effectsStore,
	enemiesStore,
	projectilesStore,
	xpGemsStore,
	bombsStore,
	healthPacksStore
} from '$lib/stores'
import { collision } from './utils'
import { keys } from './controller'
import { gameStatus, score, playerHp, maxHp, wave, addXp, gameOver, stopRun } from '$lib/game'
import {
	WAVE_DURATION,
	waveSpawnInterval,
	waveEnemyCap,
	waveEnemySpeed,
	chargerChance,
	waveEnemyHealth,
	waveContactDamage,
	PRESSURE_KINDS,
	ELITE_KINDS
} from './waves'
import { drawHud, drawWaveBanner, WAVE_BANNER_MS } from './hud'
import { nearestEnemy } from './los'
import {
	rollChoices,
	BASE_FIRE_STEPS,
	BASE_INVULN,
	BASE_MAGNET,
	BASE_SPEED,
	BASE_SPREAD,
	BASE_REROLLS,
	type Upgrade
} from './upgrades'

// Fixed-timestep physics with render interpolation ("Fix Your Timestep"): the
// simulation advances in constant 60 Hz steps (deterministic and refresh-rate
// independent) while draw() interpolates between the last two steps, so motion
// stays smooth at the display's native refresh rate.
const FIXED_STEP = 1000 / 60 // physics tick length (ms)
const STEP_DELTA = FIXED_STEP / 12 // delta unit expected by the entities
const MAX_FRAME_TIME = 100 // clamp accumulated time to avoid a spiral after the tab was hidden

// The mini-game simulation: owns the canvas, the player, the fixed-timestep loop,
// the spawn director, combat resolution and the run-scoped upgrade state. The Svelte
// component is a thin shell that mounts this and renders the modals from the reactive
// fields below (levelUpOpen / choices / rerolls). Difficulty policy lives in waves.ts,
// the upgrade table in upgrades.ts, HUD drawing in hud.ts and auto-aim in los.ts.
export class GameWorld {
	// --- Rendering context (set on mount) ---
	private canvas!: HTMLCanvasElement
	private ctx!: CanvasRenderingContext2D
	player!: Player

	// --- Timestep bookkeeping ---
	private lastTime = 0
	private accumulator = 0
	private rafId: number | null = null

	// Platforms are derived from DOM elements; they only move on scroll/resize, so
	// cache them and recompute lazily instead of every frame (avoids layout thrash).
	private platforms: Platform[] = []
	private platformsDirty = true
	private canvasDirty = true

	// Auto-attack: the player fires at the nearest enemy on this cadence while a run
	// is active. No mouse — the pointer stays free to read/scroll the CV.
	private playerFireCooldown = 0

	// Run tunables, bumped by the level-up upgrades (upgrades.ts mutates these) and
	// restored to their baseline by resetUpgrades() on a fresh run.
	fireSteps = BASE_FIRE_STEPS
	invulnSteps = BASE_INVULN
	magnetRadius = BASE_MAGNET
	xpMul = 1 // XP banked per gem

	// --- Level-up pick state (read by the Svelte template, hence reactive) ---
	// gameStatus stays 'playing' during the pick (so the field isn't cleared); these
	// freeze the sim and drive the pick modal until a choice is made.
	levelUpOpen = $state(false)
	choices = $state<Upgrade[]>([])
	rerolls = $state(0)
	private pendingLevelUps = 0

	// --- Wave / run timing ---
	private spawnTimer = 0
	private spawnSide = 0
	private invuln = 0
	private wasPlaying = false
	private dimAlpha = 0 // eased screen-dim while playing (focus mode)
	private waveTimer = 0 // ms elapsed in the current wave
	private waveBanner = 0 // ms remaining on the current banner

	// --- Lifecycle -----------------------------------------------------------
	mount(canvas: HTMLCanvasElement) {
		this.canvas = canvas
		this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D
		this.player = new Player({ x: 0, y: 0 })
		this.spawnPlayerOnPedestal()
		this.rafId = requestAnimationFrame(this.animate) // Start the animation loop
	}

	destroy() {
		// Stop the loop so remounting (e.g. crossing the 1024px breakpoint) doesn't
		// stack multiple animation loops.
		if (this.rafId !== null) cancelAnimationFrame(this.rafId)
		enemiesStore.clear()
		projectilesStore.clear()
		xpGemsStore.clear()
		bombsStore.clear()
		healthPacksStore.clear()
	}

	// --- Input ----------------------------------------------------------------
	handleKeyDown(e: KeyboardEvent) {
		// During a level-up pause, 1/2/3 pick an upgrade, R rerolls, Escape quits;
		// swallow the rest so movement keys don't leak into the frozen sim.
		if (this.levelUpOpen) {
			if (e.code === 'Escape') stopRun()
			else if (e.code === 'Digit1' || e.code === 'Numpad1') this.chooseUpgrade(this.choices[0])
			else if (e.code === 'Digit2' || e.code === 'Numpad2') this.chooseUpgrade(this.choices[1])
			else if (e.code === 'Digit3' || e.code === 'Numpad3') this.chooseUpgrade(this.choices[2])
			else if (e.code === 'KeyR') this.reroll()
			return
		}
		// Escape bails out of a run / dismisses game-over; everything else is movement.
		if (e.code === 'Escape') {
			if (get(gameStatus) !== 'idle') stopRun()
			return
		}
		keys.onkeydown(e, this.player)
	}

	handleKeyUp(e: KeyboardEvent) {
		keys.onkeyup(e, this.player)
	}

	// Platforms/canvas are cached; mark them stale on scroll/resize.
	markDirty = () => {
		this.platformsDirty = true
		this.canvasDirty = true
	}

	private resizeCanvas() {
		this.canvas.width = this.canvas.clientWidth
		this.canvas.height = this.canvas.clientHeight
		this.canvasDirty = false
	}

	private collectPlatforms() {
		const collidingElements = document.querySelectorAll('[data-colliding]')
		this.platforms = []
		for (let i = 0; i < collidingElements.length; i++) {
			const el = collidingElements[i].getBoundingClientRect()
			this.platforms.push(new Platform(el.width, el.height, el.y, el.x))
		}
		this.platformsDirty = false
	}

	private spawnPlayerOnPedestal() {
		// Pop the player onto the Start button ([data-spawn]) with a smoke puff and
		// zero its motion. Used on mount and at the start of every run.
		const spawnEl = document.querySelector('[data-spawn]')
		if (!spawnEl) return
		const r = spawnEl.getBoundingClientRect()
		this.player.pos.x = r.x + r.width / 2 - this.player.width / 2
		this.player.pos.y = r.top - this.player.height
		this.player.prevPos.x = this.player.pos.x
		this.player.prevPos.y = this.player.pos.y
		this.player.velocity.x = 0
		this.player.velocity.y = 0
		effectsStore.add(new Effect({ x: this.player.pos.x, y: this.player.pos.y + 28 }, 'smoke_12'))
	}

	// --- Upgrades -------------------------------------------------------------
	private resetUpgrades() {
		this.fireSteps = BASE_FIRE_STEPS
		this.invulnSteps = BASE_INVULN
		this.magnetRadius = BASE_MAGNET
		this.xpMul = 1
		this.player.speed = BASE_SPEED
		this.player.projectileCount = 1
		this.player.damage = 1
		this.player.spread = BASE_SPREAD
	}

	// Spend a reroll to redraw the current choices (no-op when none are left).
	reroll() {
		if (!this.levelUpOpen || this.rerolls <= 0) return
		this.rerolls--
		this.choices = rollChoices(this)
	}

	// Queue the level-ups earned this step; open the modal on the first one.
	private queueLevelUps(n: number) {
		this.pendingLevelUps += n
		if (!this.levelUpOpen) {
			this.choices = rollChoices(this)
			this.levelUpOpen = true
		}
	}

	// Apply the pick, then present the next queued level-up (if any) or resume play.
	chooseUpgrade(u: Upgrade) {
		if (!this.levelUpOpen || !u) return
		u.apply(this)
		this.pendingLevelUps--
		if (this.pendingLevelUps > 0) this.choices = rollChoices(this)
		else this.levelUpOpen = false
	}

	// --- Spawn director -------------------------------------------------------
	private spawnEnemy(kind: EnemyKind) {
		const w = get(wave)
		const t = ENEMY_TYPES[kind]
		// Alternate the side each enemy walks/flies in from.
		const fromLeft = this.spawnSide++ % 2 === 0
		// 'onscreen' kinds (the anchored turret) deploy in view; the rest enter from
		// off the nearest side.
		const x =
			t.spawnX === 'onscreen'
				? this.canvas.width * (0.15 + Math.random() * 0.7)
				: fromLeft
					? -60
					: this.canvas.width + 60
		// 'air' kinds enter high in an altitude band; ground kinds at floor level —
		// offset by their own height so a tall brute doesn't spawn sunk into the floor.
		const y =
			t.spawnY === 'air' ? this.canvas.height * (t.altitude ?? 0.32) : this.canvas.height - t.height
		// Chase kinds scale speed with the wave (waveSpeedMul); fixed kinds use their base.
		const speed = t.waveSpeedMul != null ? waveEnemySpeed(w) * t.waveSpeedMul : t.speed
		enemiesStore.add(
			new Enemy(
				{ x, y },
				{ kind, speed, health: waveEnemyHealth(kind, w), damage: waveContactDamage(kind, w) }
			)
		)
	}

	// Decide what to spawn on a tick: keep the field topped up to the wave cap while
	// maintaining every pressure floor. If the field is capped and a camping player
	// has clogged it with unreachable ground units, retire the one stuck furthest
	// below the player and swap in the missing pressure type — no spot stays safe.
	private spawnFromBudget() {
		const w = get(wave)
		const list = enemiesStore.list
		const count = (k: EnemyKind) => list.filter((e) => e.kind === k).length
		// Among the pressure types below their floor, pick one weighted by how far
		// below it sits. Weighting by the deficit — rather than always taking the
		// first unmet floor — stops a low-priority type (the bomber, last in the
		// list) from starving forever: while the player keeps culling the flyers and
		// shooters ahead of it, the strict-order version never climbed to the bomber
		// rung. A totally-absent bomber (deficit 2) now outweighs a flyer that's just
		// one short (deficit 1), so every vector eventually shows up.
		const deficits = PRESSURE_KINDS.map((kind) => ({
			kind,
			need: ENEMY_TYPES[kind].floor!(w) - count(kind)
		})).filter((p) => p.need > 0)
		let missing: EnemyKind | null = null
		if (deficits.length) {
			let r = Math.random() * deficits.reduce((s, p) => s + p.need, 0)
			missing = deficits[deficits.length - 1].kind // guard against FP undershoot
			for (const p of deficits) {
				r -= p.need
				if (r < 0) {
					missing = p.kind
					break
				}
			}
		}
		const groundKind: EnemyKind = Math.random() < chargerChance(w) ? 'charger' : 'biker'

		if (list.length < waveEnemyCap(w)) {
			this.spawnEnemy(missing ?? groundKind)
		} else if (missing) {
			// Field is capped and a pressure type is missing: retire the cullable ground
			// unit stuck furthest below the player to free a slot for the missing vector.
			let stuck: Enemy | null = null
			let worst = -Infinity
			for (const e of list) {
				if (!ENEMY_TYPES[e.kind].cullable) continue
				const below = e.pos.y - this.player.pos.y
				if (below > worst) {
					worst = below
					stuck = e
				}
			}
			if (stuck) {
				enemiesStore.delete(stuck)
				this.spawnEnemy(missing)
			}
		}
	}

	// --- Combat resolution ----------------------------------------------------
	// Bullet → enemy hits. Snapshot both pools first: delete() swaps the store arrays
	// mid-loop, so iterate copies (the old writable froze the loop the same way).
	private resolveHits() {
		const projs = projectilesStore.list.slice()
		const foes = enemiesStore.list.slice()
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
					if (enemy.hit(projectile.damage)) {
						score.update((s) => s + 1)
						// Drop an XP gem where it fell; it tumbles to the floor under
						// gravity, so the player must leave a safe perch to bank it. Tough
						// enemies (turrets/bombers/brutes) drop a fatter gem — focus pays.
						xpGemsStore.add(
							new XpGem(
								{ x: enemy.pos.x + enemy.width / 2 - 7, y: enemy.pos.y + enemy.height / 2 },
								{ value: enemy.xpValue }
							)
						)
						// Occasionally drop a med-kit — but only while the player is hurt, so
						// heals show up when they matter instead of cluttering a full-HP run.
						if (get(playerHp) < get(maxHp)) {
							if (Math.random() < ENEMY_TYPES[enemy.kind].medkitDrop) {
								healthPacksStore.add(
									new HealthPack({
										x: enemy.pos.x + enemy.width / 2 - 9,
										y: enemy.pos.y + enemy.height / 2
									})
								)
							}
						}
					}
					projectilesStore.delete(projectile)
					break
				}
			}
		}
	}

	// Take `amount` damage + i-frames; 0 HP ends the run. Shared by contact, shots
	// and bomb blasts (each passes its own scaled damage).
	private damagePlayer(amount = 1) {
		const hp = get(playerHp) - amount
		playerHp.set(hp)
		this.invuln = this.invulnSteps
		effectsStore.add(new Effect({ x: this.player.pos.x, y: this.player.pos.y + 28 }, 'smoke_12'))
		if (hp <= 0) gameOver()
	}

	// Enemy contact → player takes a hit (unless in i-frames).
	private resolvePlayerDamage() {
		if (this.invuln > 0) return
		const playerRect = {
			width: this.player.width,
			height: this.player.height,
			top: this.player.pos.y,
			left: this.player.pos.x
		}
		for (const enemy of enemiesStore.list) {
			const enemyRect = {
				width: enemy.width,
				height: enemy.height,
				top: enemy.pos.y,
				left: enemy.pos.x
			}
			if (collision(playerRect, enemyRect)) {
				this.damagePlayer(enemy.damage)
				break
			}
		}
	}

	// Hostile bolt hits the player → a hit, and the bolt is spent.
	private resolveEnemyShots() {
		if (this.invuln > 0) return
		const playerRect = {
			width: this.player.width,
			height: this.player.height,
			top: this.player.pos.y,
			left: this.player.pos.x
		}
		for (const projectile of projectilesStore.list) {
			if (!projectile.hostile) continue
			const projRect = {
				width: projectile.width,
				height: projectile.height,
				top: projectile.pos.y - projectile.height / 2,
				left: projectile.pos.x - projectile.width / 2
			}
			if (collision(playerRect, projRect)) {
				this.damagePlayer(projectile.damage)
				projectilesStore.delete(projectile)
				break
			}
		}
	}

	// A detonating bomb hits the player once (a single AoE check on the first step
	// of its explosion). Mark it resolved even during i-frames so an old blast can
	// never carry over and hit after the i-frames lapse.
	private resolveBombs() {
		for (const bomb of bombsStore.list) {
			if (bomb.state !== 'exploding' || bomb.damageApplied) continue
			bomb.damageApplied = true
			if (this.invuln > 0) continue
			const dx = this.player.pos.x + this.player.width / 2 - bomb.centerX
			const dy = this.player.pos.y + this.player.height / 2 - bomb.centerY
			if (Math.hypot(dx, dy) <= bomb.blastRadius) this.damagePlayer(bomb.damage)
		}
	}

	// Walk over a dropped gem (the pickup magnet eases the last few pixels) to bank
	// its XP. Uncollected gems expire on the floor, so a pure camper forfeits them.
	private resolveGemPickups() {
		const gems = xpGemsStore.list.slice()
		if (!gems.length) return
		const playerRect = {
			width: this.player.width,
			height: this.player.height,
			top: this.player.pos.y,
			left: this.player.pos.x
		}
		for (const gem of gems) {
			const gemRect = { width: gem.width, height: gem.height, top: gem.pos.y, left: gem.pos.x }
			if (collision(playerRect, gemRect)) {
				const ups = addXp(gem.value * this.xpMul)
				if (ups > 0) this.queueLevelUps(ups)
				xpGemsStore.delete(gem)
			}
		}
	}

	// Walk over a med-kit to heal — only while hurt, so a full-HP player leaves it on
	// the ground to grab later. Uncollected kits expire.
	private resolveHealthPickups() {
		const packs = healthPacksStore.list.slice()
		if (!packs.length || get(playerHp) >= get(maxHp)) return
		const playerRect = {
			width: this.player.width,
			height: this.player.height,
			top: this.player.pos.y,
			left: this.player.pos.x
		}
		for (const pack of packs) {
			const packRect = { width: pack.width, height: pack.height, top: pack.pos.y, left: pack.pos.x }
			if (collision(playerRect, packRect)) {
				playerHp.update((h) => Math.min(get(maxHp), h + pack.heal))
				effectsStore.add(new Effect({ x: pack.pos.x, y: pack.pos.y }, 'smoke_12'))
				healthPacksStore.delete(pack)
			}
		}
	}

	// --- The loop -------------------------------------------------------------
	private animate = (timestamp: number) => {
		if (this.lastTime === 0) this.lastTime = timestamp
		const frameTime = Math.min(timestamp - this.lastTime, MAX_FRAME_TIME)
		this.lastTime = timestamp

		if (this.canvasDirty) this.resizeCanvas()
		if (this.platformsDirty) this.collectPlatforms()

		const playing = get(gameStatus) === 'playing'

		// On the rising edge of a run, clear the field and reset upgrades. The player
		// keeps its current position — no teleport onto the pedestal.
		if (playing && !this.wasPlaying) {
			enemiesStore.clear()
			projectilesStore.clear()
			xpGemsStore.clear()
			bombsStore.clear()
			healthPacksStore.clear()
			this.resetUpgrades()
			this.rerolls = BASE_REROLLS
			this.levelUpOpen = false
			this.pendingLevelUps = 0
			this.spawnTimer = 0
			this.invuln = 0
			this.waveTimer = 0
			this.waveBanner = 0
		}
		this.wasPlaying = playing

		// A run that ended (Escape/quit) with a pick still open drops the pick.
		if (!playing && this.levelUpOpen) {
			this.levelUpOpen = false
			this.pendingLevelUps = 0
		}
		// Level-up pause: the sim freezes but the field is preserved (not cleared).
		const paused = this.levelUpOpen

		// Advance the wave on a timer, then spawn enemies at the current wave's rate/
		// cap. Frozen while a pick is open; the field is cleared once truly stopped.
		if (playing && !paused) {
			this.waveTimer += frameTime
			if (this.waveTimer >= WAVE_DURATION) {
				this.waveTimer -= WAVE_DURATION
				wave.update((w) => w + 1)
				this.waveBanner = WAVE_BANNER_MS
				// Elite kinds re-anchor each new wave from their `fromWave` (at most one
				// alive): slow bullet-sponges that drop a fat gem and reward focus fire.
				const cur = get(wave)
				for (const kind of ELITE_KINDS) {
					if (
						cur >= ENEMY_TYPES[kind].elite!.fromWave &&
						!enemiesStore.list.some((e) => e.kind === kind)
					)
						this.spawnEnemy(kind)
				}
			}
			this.spawnTimer += frameTime
			if (this.spawnTimer >= waveSpawnInterval(get(wave))) {
				this.spawnFromBudget()
				this.spawnTimer = 0
			}
		} else if (!playing) {
			if (enemiesStore.list.length) enemiesStore.clear()
			if (projectilesStore.list.length) projectilesStore.clear()
			if (xpGemsStore.list.length) xpGemsStore.clear()
			if (bombsStore.list.length) bombsStore.clear()
			if (healthPacksStore.list.length) healthPacksStore.clear()
			this.invuln = 0
			this.waveBanner = 0
		}

		// Advance physics in fixed steps, consuming the elapsed real time. A level-up
		// pause skips the updates entirely, freezing every entity in place.
		this.accumulator += frameTime
		while (this.accumulator >= FIXED_STEP) {
			if (!paused) {
				// Snapshot the self-culling pools (a projectile/gem/bomb/pack removes itself
				// from its live pool inside update()); iterate a copy so none is skipped.
				// Enemies don't self-remove in update() (death happens in resolveHits), so
				// they iterate live and pass the live list for neighbour separation.
				projectilesStore.list.slice().forEach((projectile) => projectile.update(STEP_DELTA, this.platforms))
				xpGemsStore.list
					.slice()
					.forEach((gem) => gem.update(this.canvas, this.player, this.platforms, STEP_DELTA, this.magnetRadius))
				if (playing)
					enemiesStore.list.forEach((enemy) =>
						enemy.update(this.canvas, this.player, this.platforms, STEP_DELTA, enemiesStore.list)
					)
				if (playing) bombsStore.list.slice().forEach((bomb) => bomb.update(this.canvas, this.platforms, STEP_DELTA))
				if (playing)
					healthPacksStore.list.slice().forEach((pack) => pack.update(this.canvas, this.platforms, STEP_DELTA))
				this.player.update(this.canvas, keys, this.platforms, STEP_DELTA)
				// Auto-attack: aim at the nearest enemy and fire on a cadence while playing.
				const target = playing ? nearestEnemy(this.player, this.platforms) : null
				this.player.aimAt(target)
				if (playing) {
					if (target) {
						if (this.playerFireCooldown > 0) this.playerFireCooldown--
						else {
							this.player.shoot()
							this.playerFireCooldown = this.fireSteps
						}
					}
					this.resolveHits()
					this.resolveGemPickups()
					this.resolveHealthPickups()
					if (this.invuln > 0) this.invuln--
					this.resolvePlayerDamage()
					this.resolveEnemyShots()
					this.resolveBombs()
				}
			}
			this.accumulator -= FIXED_STEP
		}
		// Freeze interpolation + sprite animation while paused so entities hold still.
		const alpha = paused ? 1 : this.accumulator / FIXED_STEP
		const animDelta = paused ? 0 : frameTime / 12

		// Render once per frame, interpolating entities between their last two steps.
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
		// Focus mode: ease a dark veil over the page behind the sprites while playing.
		this.dimAlpha += ((playing ? 0.5 : 0) - this.dimAlpha) * 0.12
		if (this.dimAlpha > 0.01) {
			this.ctx.fillStyle = `rgba(2, 6, 23, ${this.dimAlpha})`
			this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
			// Keep the interactive platforms (section titles, buttons) at full
			// brightness by punching the veil out over their rects — only the
			// surrounding CV dims.
			for (const p of this.platforms) this.ctx.clearRect(p.left, p.top, p.width, p.height)
		}
		for (const platform of this.platforms) platform.draw(this.ctx)
		xpGemsStore.list.forEach((gem) => gem.draw(this.ctx, alpha))
		healthPacksStore.list.forEach((pack) => pack.draw(this.ctx, alpha))
		enemiesStore.list.forEach((enemy) => enemy.draw(this.ctx, animDelta, alpha))
		bombsStore.list.forEach((bomb) => bomb.draw(this.ctx, alpha))
		projectilesStore.list.forEach((projectile) => projectile.draw(this.ctx, alpha))
		// Blink the player while invulnerable after a hit (but always show it paused).
		if (paused || this.invuln <= 0 || Math.floor(this.invuln / 6) % 2 === 0) {
			this.player.draw(this.ctx, animDelta, alpha)
		}
		// Snapshot: Effect.draw() self-removes from the live pool when its animation ends.
		effectsStore.list.slice().forEach((effect: Effect) => effect.draw(this.ctx))

		if (playing) {
			drawHud(this.ctx, this.canvas)
			if (this.waveBanner > 0) drawWaveBanner(this.ctx, this.canvas, this.waveBanner)
		}
		if (this.waveBanner > 0) this.waveBanner -= frameTime

		this.rafId = requestAnimationFrame(this.animate)
	}
}
