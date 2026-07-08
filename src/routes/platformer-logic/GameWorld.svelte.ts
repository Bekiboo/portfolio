import { get } from 'svelte/store'
import { Platform } from './Platform'
import { Player } from './Player'
import { Enemy } from './Enemy'
import { XpGem } from './XpGem'
import { HealthPack } from './HealthPack'
import { Effect } from './Effect'
import { ENEMY_TYPES, type EnemyKind } from './enemyTypes'
import { CHARACTERS } from './characters'
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
import {
	gameStatus,
	score,
	playerHp,
	maxHp,
	wave,
	addXp,
	gameOver,
	stopRun,
	paused as pausedStore,
	pauseGame,
	resumeGame
} from '$lib/game'
import {
	waveDuration,
	waveDef,
	waveSpawnInterval,
	waveEnemyCap,
	waveEnemySpeed,
	waveEnemyHealth,
	waveContactDamage
} from './waves'
import { drawHud, drawWaveBanner, drawIntermissionPrompt, WAVE_BANNER_MS } from './hud'
import { nearestEnemy } from './los'
import {
	rollChoices,
	BASE_FIRE_STEPS,
	BASE_INVULN,
	BASE_MAGNET,
	BASE_JUMP,
	BASE_ATTACK_RANGE,
	BASE_SHIELD_MAX,
	BASE_SHIELD_REGEN,
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
const SHIELD_FLASH_STEPS = 12 // steps the shield break/absorb ring is drawn
const SPAWN_DWELL_MS = 1500 // how long the player must hold the spawn pedestal to launch the next wave
const SPAWN_FLASH_MS = 260 // spawn burst when the hold completes and the wave triggers
const INTERMISSION_MAGNET_MUL = 10 // pickup-radius boost during the rest so leftover gems get swept in

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
	// collectPlatforms() merges these DOM platforms with the procedural arena ledges below.
	private platforms: Platform[] = []
	private platformsDirty = true
	private canvasDirty = true
	// Procedural arena ledges: a fresh random layout is generated each wave (a new set at
	// run start and at every intermission), giving the player extra terrain that changes
	// every wave. Merged into `platforms` by collectPlatforms(); rendered (visible=true).
	private proceduralPlatforms: Platform[] = []
	// The next wave's ledges, pre-built at intermission and faded in (render-only, not yet
	// collidable) as the old set fades out over the spawn dwell; promoted on hold-complete.
	private pendingPlatforms: Platform[] = []

	// Auto-attack: the player fires at the nearest enemy on this cadence while a run
	// is active. No mouse — the pointer stays free to read/scroll the CV.
	private playerFireCooldown = 0

	// Run tunables, bumped by the level-up upgrades (upgrades.ts mutates these) and
	// restored to their baseline by resetUpgrades() on a fresh run.
	fireSteps = BASE_FIRE_STEPS
	invulnSteps = BASE_INVULN
	magnetRadius = BASE_MAGNET
	attackRange = BASE_ATTACK_RANGE // how close an enemy must be before the player opens fire (Optique raises it)
	xpMul = 1 // XP banked per gem
	regenPerStep = 0 // HP healed per physics step (Regen upgrade adds 1 HP / 5s per stack)
	private regenAccum = 0 // fractional-HP carry so sub-1-HP-per-step regen still heals
	// Base shield: a bubble that soaks incoming hits. Each hit spends a charge (no HP
	// lost) and breaks the bubble briefly; a charge regenerates every shieldRegenSteps,
	// and any incoming damage resets that timer (no regen while under fire).
	shieldMax = BASE_SHIELD_MAX // charges when full (Bulwark raises it)
	shieldCharges = BASE_SHIELD_MAX // current charges (each absorbs one hit)
	shieldRegenSteps = BASE_SHIELD_REGEN // steps to regen one charge (Recharge lowers it)
	private shieldRegenTimer = 0 // steps since the last hit / last regen tick
	private shieldFlash = 0 // steps left on the break/absorb ring VFX
	private shieldFlashBig = false // was the last flash a full break (bigger ring)?

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
	private waveTimer = 0 // ms elapsed in the current wave's combat phase
	private waveBanner = 0 // ms remaining on the current banner
	private waveBannerLabel = '' // theme name shown on the current banner
	// Rest phase between waves: the field is cleared and the player must walk back to the
	// spawn pedestal and hold to trigger the next wave. No combat/spawns while this is true.
	private intermission = false
	private promptTick = 0 // drives the pulsing "return to spawn" prompt
	private spawnDwell = 0 // ms held on the spawn pedestal this intermission (0 → SPAWN_DWELL_MS)
	private spawnFlash = 0 // ms remaining on the spawn burst when a wave launches

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
		// Pause menu open: Escape resumes; movement keys are swallowed so they don't leak
		// into the frozen sim (the Continue/Quit buttons handle the rest).
		if (get(pausedStore)) {
			if (e.code === 'Escape') resumeGame()
			return
		}
		// Escape pauses an active run (Continue/Quit modal) and dismisses game-over;
		// everything else is movement.
		if (e.code === 'Escape') {
			const st = get(gameStatus)
			if (st === 'playing') pauseGame()
			else if (st === 'over') stopRun()
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
			this.platforms.push(new Platform(el.width, el.height, el.y, el.x)) // DOM: invisible
		}
		for (const p of this.proceduralPlatforms) this.platforms.push(p) // arena: visible ledges
		this.platformsDirty = false
	}

	// Roll a fresh set of arena ledges for the next wave — a new layout every wave, but with
	// deliberate structure rather than scattered noise: two wall-flush perch ledges (enemy
	// spawn points, e.g. a perched turret firing inward) plus interior ledges laid out on a
	// regular column grid so spacing reads as designed. All marked visible so Platform.draw()
	// renders them. Returns the set; the caller decides if it's the live or pending layout.
	private buildLayout(): Platform[] {
		const W = this.canvas.width
		const H = this.canvas.height
		const thick = 20
		const ledges: Platform[] = []

		// Wall-flush perches: one on each side, at a jittered mid height. Flush to the edge
		// so an enemy can ride in on the wall and hold it (the spawn director perches turrets
		// here).
		const perchW = Math.min(140, W * 0.14)
		const perchY = () => H * (0.4 + Math.random() * 0.26)
		const left = new Platform(perchW, thick, perchY(), 0)
		left.visible = true
		left.edge = 'left'
		const right = new Platform(perchW, thick, perchY(), W - perchW)
		right.visible = true
		right.edge = 'right'
		ledges.push(left, right)

		// Interior ledges on a regular column grid: one per column, each centred in its
		// column with a little horizontal jitter and a varied height, so the field is evenly
		// spaced without looking mechanical.
		const cols = 3 + Math.floor(Math.random() * 2) // 3–4 interior ledges
		const usableL = W * 0.18
		const usableR = W * 0.82
		const colW = (usableR - usableL) / cols
		const bandTop = H * 0.36
		const bandBot = H * 0.74
		for (let i = 0; i < cols; i++) {
			const w = 100 + Math.random() * 80
			const slack = Math.max(0, colW - w - 24)
			const colLeft = usableL + i * colW + 12 + Math.random() * slack
			const top = bandTop + Math.random() * (bandBot - bandTop)
			const ledge = new Platform(w, thick, top, colLeft)
			ledge.visible = true
			ledges.push(ledge)
		}
		return ledges
	}

	// Combat timer expired: enter the rest phase. Clear the threat (enemies + their bombs
	// and bolts) for a true breather — but keep gems/health packs so the player can mop up
	// on the walk back. Pre-build the next arena; it stays render-only at alpha 0 until the
	// player holds the pedestal, then fades in as the old set fades out.
	private enterIntermission() {
		this.intermission = true
		this.spawnDwell = 0
		for (const e of enemiesStore.list)
			effectsStore.add(new Effect({ x: e.pos.x, y: e.pos.y }, 'smoke_12'))
		enemiesStore.clear()
		projectilesStore.clear()
		bombsStore.clear()
		this.pendingPlatforms = this.buildLayout()
		for (const p of this.pendingPlatforms) p.renderAlpha = 0
	}

	// The hold completed: promote the pre-built arena to the live (collidable) layout, fire
	// the spawn burst, and start the next wave.
	private startNextWave() {
		this.intermission = false
		this.spawnDwell = 0
		this.spawnFlash = SPAWN_FLASH_MS
		for (const p of this.pendingPlatforms) p.renderAlpha = 1
		this.proceduralPlatforms = this.pendingPlatforms
		this.pendingPlatforms = []
		this.platformsDirty = true // fold the new ledges into `platforms` next frame
		this.waveTimer = 0
		this.spawnTimer = 0
		wave.update((w) => w + 1)
		const def = waveDef(get(wave))
		this.waveBanner = WAVE_BANNER_MS
		this.waveBannerLabel = def.label
		// A themed wave can open with an elite (slow bullet-sponge) spawned as it begins.
		if (def.eliteAtStart) this.spawnEnemy(def.eliteAtStart)
	}

	// Advance the rest phase: accumulate/reset the pedestal hold, crossfade the old arena
	// out and the new one in by the hold progress, and launch the wave once the hold fills.
	private updateIntermission(frameTime: number) {
		this.promptTick++
		if (this.atSpawn()) this.spawnDwell = Math.min(SPAWN_DWELL_MS, this.spawnDwell + frameTime)
		else this.spawnDwell = 0
		const p = this.spawnDwell / SPAWN_DWELL_MS // 0 → 1 hold progress
		for (const pf of this.proceduralPlatforms) pf.renderAlpha = 1 - p
		for (const pf of this.pendingPlatforms) pf.renderAlpha = p
		if (this.spawnDwell >= SPAWN_DWELL_MS) this.startNextWave()
	}

	// Is the player standing on the spawn pedestal ([data-spawn], the Start/Stop button)?
	// Requires both horizontal overlap and feet near the button top, so the player can't
	// charge the hold from an arena ledge floating above it.
	private atSpawn() {
		const spawnEl = document.querySelector('[data-spawn]')
		if (!spawnEl) return true // no pedestal in the DOM → don't soft-lock the run
		const r = spawnEl.getBoundingClientRect()
		const px = this.player.pos.x + this.player.width / 2
		const feet = this.player.pos.y + this.player.height
		const nearX = px > r.x - 40 && px < r.x + r.width + 40
		const nearY = feet > r.top - 90 && feet < r.top + 30
		return nearX && nearY
	}

	// Pulsing "come here" glow over the spawn pedestal during the rest, tightening and
	// brightening as the hold charges. Drawn on the canvas so it sits on the focus veil.
	private drawSpawnGlow() {
		const spawnEl = document.querySelector('[data-spawn]')
		if (!spawnEl) return
		const r = spawnEl.getBoundingClientRect()
		const cx = r.x + r.width / 2
		const cy = r.y + r.height / 2
		const p = this.spawnDwell / SPAWN_DWELL_MS
		const pulse = 0.5 + 0.5 * Math.sin(this.promptTick * 0.12)
		const intensity = 0.35 + 0.65 * p // dim call-to-action → full charge
		const base = Math.max(r.width, r.height)
		const radius = base * (1.5 + 0.7 * pulse * (1 - p) + 1.3 * p)
		this.ctx.save()
		const g = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
		g.addColorStop(0, `rgba(103, 232, 249, ${0.55 * intensity})`) // cyan-300 core
		g.addColorStop(0.5, `rgba(56, 189, 248, ${0.28 * intensity})`) // sky-400
		g.addColorStop(1, 'rgba(56, 189, 248, 0)')
		this.ctx.fillStyle = g
		this.ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
		this.ctx.restore()
	}

	// Bright expanding burst over the pedestal at the instant the hold completes.
	private drawSpawnFlash() {
		const spawnEl = document.querySelector('[data-spawn]')
		if (!spawnEl) return
		const r = spawnEl.getBoundingClientRect()
		const cx = r.x + r.width / 2
		const cy = r.y + r.height / 2
		const t = this.spawnFlash / SPAWN_FLASH_MS // 1 → 0
		const base = Math.max(r.width, r.height)
		const radius = base * (0.6 + (1 - t) * 2.6)
		this.ctx.save()
		this.ctx.globalAlpha = t
		const g = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
		g.addColorStop(0, `rgba(224, 242, 254, ${0.5 * t})`) // sky-100 core
		g.addColorStop(1, 'rgba(224, 242, 254, 0)')
		this.ctx.fillStyle = g
		this.ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
		this.ctx.strokeStyle = '#e0f2fe' // sky-100 ring
		this.ctx.lineWidth = 3
		this.ctx.beginPath()
		this.ctx.arc(cx, cy, radius, 0, Math.PI * 2)
		this.ctx.stroke()
		this.ctx.restore()
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
		// Base stats come from the active class (Player.cfg); the level-up upgrades bump
		// them from here. Invuln, magnet, regen and jump aren't class-specific in v1, so
		// they keep their global baselines.
		const c = this.player.cfg
		this.fireSteps = c.fireSteps
		this.invulnSteps = BASE_INVULN
		this.magnetRadius = BASE_MAGNET
		this.attackRange = BASE_ATTACK_RANGE
		this.xpMul = 1
		this.regenPerStep = 0
		this.regenAccum = 0
		this.shieldMax = BASE_SHIELD_MAX
		this.shieldCharges = BASE_SHIELD_MAX
		this.shieldRegenSteps = BASE_SHIELD_REGEN
		this.shieldRegenTimer = 0
		this.shieldFlash = 0
		this.player.speed = c.speed
		this.player.projectileCount = c.projectileCount
		this.player.damage = c.damage
		this.player.spread = c.spread
		this.player.projectileSpeed = c.projectileSpeed
		this.player.jumpStrength = BASE_JUMP
	}

	// Passive regeneration (Regen upgrade): heal fractional HP each step, carrying the
	// remainder so a sub-1-HP-per-step rate still lands whole hearts. Caps at max HP.
	private applyRegen() {
		const cap = get(maxHp)
		if (get(playerHp) >= cap) {
			this.regenAccum = 0
			return
		}
		this.regenAccum += this.regenPerStep
		if (this.regenAccum >= 1) {
			const heal = Math.floor(this.regenAccum)
			this.regenAccum -= heal
			playerHp.update((h) => Math.min(cap, h + heal))
		}
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
	// A wall-flush perch ledge with no turret currently riding it (so two turrets don't
	// stack on the same edge). null if every perch is taken or the layout has none.
	private freeEdgePerch(): Platform | null {
		const perches = this.proceduralPlatforms.filter((p) => p.edge)
		const free = perches.filter(
			(p) =>
				!enemiesStore.list.some(
					(e) => e.perched && e.pos.x + e.width / 2 >= p.left && e.pos.x + e.width / 2 <= p.left + p.width
				)
		)
		return free.length ? free[Math.floor(Math.random() * free.length)] : null
	}

	private spawnEnemy(kind: EnemyKind) {
		const w = get(wave)
		const t = ENEMY_TYPES[kind]
		// Turrets ride a wall-flush perch when one is free: dropped onto the edge ledge, they
		// can't fall and just fire inward (perched behaviour in Enemy.#updateTurret). With no
		// free perch they fall back to the rolling floor turret below.
		if (kind === 'turret') {
			const perch = this.freeEdgePerch()
			if (perch) {
				const px = perch.edge === 'left' ? perch.left : perch.left + perch.width - t.width
				const enemy = new Enemy(
					{ x: px, y: perch.top - t.height },
					{ kind, speed: 0, health: waveEnemyHealth(kind, w), damage: waveContactDamage(kind, w) }
				)
				enemy.perched = true
				enemiesStore.add(enemy)
				return
			}
		}
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
		const def = waveDef(get(wave))
		const list = enemiesStore.list
		const count = (k: EnemyKind) => list.filter((e) => e.kind === k).length
		// Among this wave's pressure floors below their target, pick one weighted by how
		// far below it sits. Weighting by the deficit — rather than always taking the
		// first unmet floor — stops a low-priority vector (the bomber) from starving
		// forever: while the player keeps culling the flyers and shooters ahead of it, a
		// strict-order version never climbs to the bomber rung. A totally-absent bomber
		// (deficit 2) now outweighs a flyer that's just one short (deficit 1), so every
		// vector the theme calls for eventually shows up.
		const deficits = Object.entries(def.floors ?? {})
			.map(([kind, target]) => ({
				kind: kind as EnemyKind,
				need: target - count(kind as EnemyKind)
			}))
			.filter((p) => p.need > 0)
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
		// Fodder to fill the rest of the cap: drawn from the theme's ground pool (repeats
		// weight the odds — e.g. ['biker','biker','charger'] is 2:1 bikers).
		const groundKind: EnemyKind | null = def.ground.length
			? def.ground[Math.floor(Math.random() * def.ground.length)]
			: null

		if (list.length < def.cap) {
			const pick = missing ?? groundKind
			if (pick) this.spawnEnemy(pick)
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
	// Dispatch the player's attack on the active class's style, on the fire cadence while
	// a target is in range. Only 'ranged' (the Punk) is wired today; the 'melee'/'deploy'
	// cases re-slot here when their classes come back (see characters.ts / ROADMAP.md).
	private playerAttack() {
		switch (this.player.cfg.attackStyle) {
			case 'ranged':
				this.player.shoot()
				break
		}
	}

	// Enemy took a lethal hit: bank score, drop its XP gem (falls under gravity) and,
	// while the player is hurt, maybe a med-kit.
	private onEnemyKilled(enemy: Enemy) {
		score.update((s) => s + 1)
		xpGemsStore.add(
			new XpGem(
				{ x: enemy.pos.x + enemy.width / 2 - 7, y: enemy.pos.y + enemy.height / 2 },
				{ value: enemy.xpValue }
			)
		)
		if (get(playerHp) < get(maxHp) && Math.random() < ENEMY_TYPES[enemy.kind].medkitDrop) {
			healthPacksStore.add(
				new HealthPack({ x: enemy.pos.x + enemy.width / 2 - 9, y: enemy.pos.y + enemy.height / 2 })
			)
		}
	}

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
					// A killing bolt drops XP (tumbles to the floor under gravity, so the
					// player must leave a safe perch to bank it) and, while hurt, maybe a
					// med-kit — the shared drop logic melee kills use too.
					if (enemy.hit(projectile.damage)) this.onEnemyKilled(enemy)
					projectilesStore.delete(projectile)
					break
				}
			}
		}
	}

	// Take `amount` damage + i-frames; 0 HP ends the run. Shared by contact, shots
	// and bomb blasts (each passes its own scaled damage). The base shield soaks the hit
	// first: a charge is spent (no HP lost) and the bubble breaks briefly instead.
	private damagePlayer(amount = 1) {
		this.shieldRegenTimer = 0 // any incoming damage stalls shield regen
		if (this.shieldCharges > 0) {
			this.shieldCharges--
			this.invuln = this.invulnSteps
			this.shieldFlash = SHIELD_FLASH_STEPS
			this.shieldFlashBig = this.shieldCharges === 0 // full break reads bigger
			return
		}
		const hp = get(playerHp) - amount
		playerHp.set(hp)
		this.invuln = this.invulnSteps
		effectsStore.add(new Effect({ x: this.player.pos.x, y: this.player.pos.y + 28 }, 'smoke_12'))
		if (hp <= 0) gameOver()
	}

	// Regenerate the shield: one charge every shieldRegenSteps while below max and not
	// recently hit (damagePlayer resets the timer). The flash VFX ticks down each step.
	private updateShield() {
		if (this.shieldFlash > 0) this.shieldFlash--
		if (this.shieldCharges >= this.shieldMax) return
		this.shieldRegenTimer++
		if (this.shieldRegenTimer >= this.shieldRegenSteps) {
			this.shieldCharges++
			this.shieldRegenTimer = 0
		}
	}

	// Draw the shield bubble around the player (interpolated position): a steady faint
	// ring while it has charges, plus an expanding burst on a break/absorb.
	private drawShield(alpha: number) {
		const px = this.player.prevPos.x + (this.player.pos.x - this.player.prevPos.x) * alpha
		const py = this.player.prevPos.y + (this.player.pos.y - this.player.prevPos.y) * alpha
		const cx = px + this.player.width / 2
		const cy = py + this.player.height / 2
		const baseR = this.player.width * 0.72
		const ctx = this.ctx
		if (this.shieldFlash > 0) {
			const t = 1 - this.shieldFlash / SHIELD_FLASH_STEPS // 0 → 1 over the burst
			ctx.save()
			ctx.globalAlpha = Math.max(0, 1 - t)
			ctx.strokeStyle = '#67e8f9' // cyan-300
			ctx.lineWidth = this.shieldFlashBig ? 4 : 2
			ctx.beginPath()
			ctx.arc(cx, cy, baseR + (this.shieldFlashBig ? 42 : 22) * t, 0, Math.PI * 2)
			ctx.stroke()
			ctx.restore()
		}
		if (this.shieldCharges > 0) {
			const strength = this.shieldCharges / Math.max(1, this.shieldMax)
			ctx.save()
			ctx.strokeStyle = '#38bdf8' // sky-400
			ctx.shadowColor = '#38bdf8'
			ctx.shadowBlur = 8
			ctx.lineWidth = 2
			ctx.globalAlpha = 0.14 + 0.16 * strength
			ctx.beginPath()
			ctx.arc(cx, cy, baseR, 0, Math.PI * 2)
			ctx.stroke()
			ctx.globalAlpha = 0.05 + 0.05 * strength // faint fill so it reads as a bubble
			ctx.fillStyle = '#38bdf8'
			ctx.fill()
			ctx.restore()
		}
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
			// Some kinds (the turret) are harmless to touch — only their bolts bite.
			if (ENEMY_TYPES[enemy.kind].contactDamage === false) continue
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
			// (Re)configure the Player from the character registry, then reset its base stats.
			// One class ships today (Punk); the registry stays the seam for re-adding classes.
			this.player.applyCharacter(CHARACTERS.punk)
			this.resetUpgrades()
			this.rerolls = BASE_REROLLS
			this.levelUpOpen = false
			this.pendingLevelUps = 0
			this.spawnTimer = 0
			this.invuln = 0
			this.waveTimer = 0
			this.intermission = false
			this.spawnDwell = 0
			this.spawnFlash = 0
			this.pendingPlatforms = []
			this.proceduralPlatforms = this.buildLayout() // fresh arena for wave 1
			this.platformsDirty = true
			// Open on the wave-1 theme banner so the first encounter is announced too.
			this.waveBanner = WAVE_BANNER_MS
			this.waveBannerLabel = waveDef(get(wave)).label
		}
		this.wasPlaying = playing

		// A run that ended (Escape/quit) with a pick still open drops the pick.
		if (!playing && this.levelUpOpen) {
			this.levelUpOpen = false
			this.pendingLevelUps = 0
		}
		// Sim freeze (field preserved, not cleared): either a level-up pick or the pause menu.
		const paused = this.levelUpOpen || get(pausedStore)

		// Advance the wave on a timer, then spawn enemies at the current wave's rate/
		// cap. Frozen while a pick is open; the field is cleared once truly stopped.
		if (playing && !paused) {
			if (this.intermission) {
				// Rest phase: no spawns, no timer. The next wave starts once the player has
				// walked back to the pedestal and held it for SPAWN_DWELL_MS (crossfading the
				// arena layout meanwhile).
				this.updateIntermission(frameTime)
			} else {
				this.waveTimer += frameTime
				if (this.waveTimer >= waveDuration(get(wave))) {
					// Combat over: clear the field, spawn a new arena, and wait for the
					// player to return to spawn (startNextWave advances the wave counter).
					this.enterIntermission()
				} else {
					this.spawnTimer += frameTime
					if (this.spawnTimer >= waveSpawnInterval(get(wave))) {
						this.spawnFromBudget()
						this.spawnTimer = 0
					}
				}
			}
		} else if (!playing) {
			if (enemiesStore.list.length) enemiesStore.clear()
			if (projectilesStore.list.length) projectilesStore.clear()
			if (xpGemsStore.list.length) xpGemsStore.clear()
			if (bombsStore.list.length) bombsStore.clear()
			if (healthPacksStore.list.length) healthPacksStore.clear()
			this.invuln = 0
			this.waveBanner = 0
			// Drop the arena ledges so the idle/home screen shows none (they're re-rolled
			// on the next run start).
			if (this.proceduralPlatforms.length || this.pendingPlatforms.length) {
				this.proceduralPlatforms = []
				this.pendingPlatforms = []
				this.platformsDirty = true
			}
			this.intermission = false
			this.spawnDwell = 0
			this.spawnFlash = 0
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
				projectilesStore.list
					.slice()
					.forEach((projectile) => projectile.update(STEP_DELTA, this.platforms))
				// During the between-wave rest, boost the pickup radius so leftover gems sweep
				// in on the walk back to spawn; it reverts the moment the next wave starts.
				const magnet = this.intermission
					? this.magnetRadius * INTERMISSION_MAGNET_MUL
					: this.magnetRadius
				xpGemsStore.list
					.slice()
					.forEach((gem) => gem.update(this.canvas, this.player, this.platforms, STEP_DELTA, magnet))
				if (playing)
					enemiesStore.list.forEach((enemy) =>
						enemy.update(this.canvas, this.player, this.platforms, STEP_DELTA, enemiesStore.list)
					)
				if (playing)
					bombsStore.list
						.slice()
						.forEach((bomb) => bomb.update(this.canvas, this.platforms, STEP_DELTA))
				if (playing)
					healthPacksStore.list
						.slice()
						.forEach((pack) => pack.update(this.canvas, this.platforms, STEP_DELTA))
				this.player.update(this.canvas, keys, this.platforms, STEP_DELTA)
				// Auto-attack: aim at the nearest enemy and fire on a cadence while playing.
				const target = playing ? nearestEnemy(this.player, this.platforms, this.attackRange) : null
				this.player.aimAt(target)
				if (playing) {
					if (target) {
						if (this.playerFireCooldown > 0) this.playerFireCooldown--
						else {
							this.playerAttack()
							this.playerFireCooldown = this.fireSteps
						}
					}
					this.resolveHits()
					this.resolveGemPickups()
					this.resolveHealthPickups()
					if (this.regenPerStep > 0) this.applyRegen()
					this.updateShield()
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
			// surrounding CV dims. Skip the procedural ledges: there's no CV under them,
			// so clearing would show a bright hole instead — they draw over the veil.
			for (const p of this.platforms)
				if (!p.visible) this.ctx.clearRect(p.left, p.top, p.width, p.height)
		}
		for (const platform of this.platforms) platform.draw(this.ctx)
		// The next wave's ledges fade in over the hold (render-only until promoted).
		if (playing && this.intermission)
			for (const pf of this.pendingPlatforms) pf.draw(this.ctx)
		// Spawn pedestal call-to-action glow during the rest, and the launch burst after.
		if (playing && this.intermission) this.drawSpawnGlow()
		if (playing && this.spawnFlash > 0) this.drawSpawnFlash()
		xpGemsStore.list.forEach((gem) => gem.draw(this.ctx, alpha))
		healthPacksStore.list.forEach((pack) => pack.draw(this.ctx, alpha))
		enemiesStore.list.forEach((enemy) => enemy.draw(this.ctx, animDelta, alpha))
		bombsStore.list.forEach((bomb) => bomb.draw(this.ctx, alpha))
		projectilesStore.list.forEach((projectile) => projectile.draw(this.ctx, alpha))
		// Blink the player while invulnerable after a hit (but always show it paused).
		if (paused || this.invuln <= 0 || Math.floor(this.invuln / 6) % 2 === 0) {
			this.player.draw(this.ctx, animDelta, alpha)
		}
		// Shield bubble over the player (only in an active run, so idle shows none).
		if (playing) this.drawShield(alpha)
		// Snapshot: Effect.draw() self-removes from the live pool when its animation ends.
		effectsStore.list.slice().forEach((effect: Effect) => effect.draw(this.ctx))

		if (playing) {
			drawHud(this.ctx, this.canvas)
			if (this.waveBanner > 0)
				drawWaveBanner(this.ctx, this.canvas, this.waveBanner, this.waveBannerLabel)
			// During the rest phase, prompt the player to walk back to spawn (pulsing), and
			// show the hold-charge bar once they're on the pedestal.
			if (this.intermission)
				drawIntermissionPrompt(
					this.ctx,
					this.canvas,
					0.5 + 0.5 * Math.sin(this.promptTick * 0.08),
					this.spawnDwell / SPAWN_DWELL_MS
				)
		}
		if (this.waveBanner > 0) this.waveBanner -= frameTime
		if (this.spawnFlash > 0) this.spawnFlash -= frameTime

		this.rafId = requestAnimationFrame(this.animate)
	}
}
