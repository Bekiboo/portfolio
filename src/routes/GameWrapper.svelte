<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { Platform } from './platformer-logic/Platform'
	import { Player } from './platformer-logic/Player'
	import { Enemy } from './platformer-logic/Enemy'
	import { XpGem } from './platformer-logic/XpGem'
	import { Bomb } from './platformer-logic/Bomb'
	import { HealthPack } from './platformer-logic/HealthPack'
	import type { EnemyKind } from './platformer-logic/Enemy'
	import { effects, projectiles, effectsStore, enemies, enemiesStore, projectilesStore, xpGems, xpGemsStore, bombs, bombsStore, healthPacks, healthPacksStore } from '$lib/stores'
	import { Effect } from './platformer-logic/Effect'
	import { collision } from './platformer-logic/utils'
	import { keys } from './platformer-logic/controller'
	import { gameStatus, score, playerHp, maxHp, wave, xp, level, levelXp, levelXpNeeded, addXp, startRun, stopRun, gameOver } from '$lib/game'
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
	let playerFireCooldown = 0

	// Run-scoped tunables. Each starts at its base every run and is bumped by the
	// level-up upgrades below; resetUpgrades() restores the baseline on a fresh run.
	const BASE_FIRE_STEPS = 20 // physics steps between shots (~3/s)
	const BASE_INVULN = 72 // ~1.2s of i-frames after a hit
	const BASE_MAGNET = 48 // XP-gem pickup radius (px) — small, so the player must sweep the floor
	const BASE_SPEED = 5 // player move speed
	const BASE_SPREAD = 0.07 // base weapon inaccuracy (radians of random deviation per bolt)
	// Caps so the snowball upgrades can't trivialise the game (the old build let a
	// player stack 20 pinpoint projectiles and vacuum the whole map).
	const MAX_MAGNET = 150 // hard cap on pickup radius
	const MAX_PROJECTILES = 6 // hard cap on Multi-Shot
	const MIN_FIRE_STEPS = 6 // hard floor on the fire cadence
	let fireSteps = BASE_FIRE_STEPS
	let invulnSteps = BASE_INVULN
	let magnetRadius = BASE_MAGNET
	let xpMul = 1 // XP banked per gem

	const resetUpgrades = () => {
		fireSteps = BASE_FIRE_STEPS
		invulnSteps = BASE_INVULN
		magnetRadius = BASE_MAGNET
		xpMul = 1
		player.speed = BASE_SPEED
		player.projectileCount = 1
		player.damage = 1
		player.spread = BASE_SPREAD
	}

	// --- Level-up upgrades ----------------------------------------------------
	// On each level-up the game freezes and offers 3 of these at random. Most stack
	// indefinitely (VS-style); Bandage only appears when the player is hurt.
	type UpgradeKind = 'atk' | 'def' | 'util'
	interface Upgrade {
		id: string
		name: string
		desc: string
		kind: UpgradeKind
		apply: () => void
		available?: () => boolean // hard gate: hides the pick (cap reached / situational)
		weight?: (lvl: number) => number // rarity: higher = commoner. Power spikes thin out with level.
	}
	const UPGRADES: Upgrade[] = [
		{ id: 'rapid', name: 'Rapid Fire', desc: 'Cadence de tir +18%', kind: 'atk',
			apply: () => (fireSteps = Math.max(MIN_FIRE_STEPS, Math.round(fireSteps * 0.82))),
			available: () => fireSteps > MIN_FIRE_STEPS, weight: () => 3 },
		{ id: 'multi', name: 'Multi-Shot', desc: '+1 projectile (mais disperse plus)', kind: 'atk',
			apply: () => player.projectileCount++,
			available: () => player.projectileCount < MAX_PROJECTILES,
			weight: (lvl) => Math.max(1, 3 - Math.floor(lvl / 3)) }, // rarer the higher you climb
		{ id: 'power', name: 'Power Shot', desc: '+1 dégât par tir', kind: 'atk',
			apply: () => player.damage++, weight: () => 2 },
		{ id: 'focus', name: 'Focus', desc: 'Précision accrue (tir plus serré)', kind: 'atk',
			apply: () => (player.spread = Math.max(0.015, player.spread - 0.02)),
			available: () => player.spread > 0.02, weight: () => 3 },
		{ id: 'vitality', name: 'Vitality', desc: '+2 PV max (et soigne)', kind: 'def',
			apply: () => { maxHp.update((m) => m + 2); playerHp.update((h) => h + 2) },
			weight: (lvl) => Math.max(1, 2 - Math.floor(lvl / 4)) },
		// (Healing is no longer an upgrade — enemies drop med-kits on the ground instead.)
		{ id: 'iron', name: 'Iron Skin', desc: 'Invincibilité +30%', kind: 'def',
			apply: () => (invulnSteps = Math.round(invulnSteps * 1.3)), weight: () => 3 },
		{ id: 'magnet', name: 'Magnet', desc: 'Rayon de ramassage +34', kind: 'util',
			apply: () => (magnetRadius = Math.min(MAX_MAGNET, magnetRadius + 34)),
			available: () => magnetRadius < MAX_MAGNET, weight: () => 2 },
		{ id: 'swift', name: 'Swift', desc: 'Vitesse de déplacement +', kind: 'util',
			apply: () => (player.speed += 0.7), weight: () => 3 },
		{ id: 'greed', name: 'Greed', desc: '+1 XP par gemme', kind: 'util',
			apply: () => (xpMul += 1), weight: (lvl) => Math.max(1, 2 - Math.floor(lvl / 5)) }
	]

	// The level-up pause. gameStatus stays 'playing' (so the field isn't cleared);
	// this flag freezes the sim and shows the pick modal until a choice is made.
	let levelUpOpen = $state(false)
	let choices = $state<Upgrade[]>([])
	let pendingLevelUps = 0
	const BASE_REROLLS = 3 // rerolls granted per run (DRG-style agency without a shop)
	let rerolls = $state(0)

	// Draw 3 distinct available upgrades, weighted by rarity so power spikes show up
	// less often (and thin out further as the level climbs). Weighted sampling
	// without replacement.
	const rollChoices = (): Upgrade[] => {
		const lvl = get(level)
		const bag = UPGRADES.filter((u) => !u.available || u.available()).map((u) => ({
			u,
			w: Math.max(0.0001, u.weight ? u.weight(lvl) : 3)
		}))
		const picks: Upgrade[] = []
		const n = Math.min(3, bag.length)
		for (let k = 0; k < n; k++) {
			let total = 0
			for (const b of bag) total += b.w
			let r = Math.random() * total
			let idx = 0
			for (; idx < bag.length - 1; idx++) {
				r -= bag[idx].w
				if (r <= 0) break
			}
			picks.push(bag[idx].u)
			bag.splice(idx, 1)
		}
		return picks
	}

	// Spend a reroll to redraw the current choices (no-op when none are left).
	const reroll = () => {
		if (!levelUpOpen || rerolls <= 0) return
		rerolls--
		choices = rollChoices()
	}

	// Queue the level-ups earned this step; open the modal on the first one.
	const queueLevelUps = (n: number) => {
		pendingLevelUps += n
		if (!levelUpOpen) {
			choices = rollChoices()
			levelUpOpen = true
		}
	}

	// Apply the pick, then present the next queued level-up (if any) or resume play.
	const chooseUpgrade = (u: Upgrade) => {
		if (!levelUpOpen || !u) return
		u.apply()
		pendingLevelUps--
		if (pendingLevelUps > 0) choices = rollChoices()
		else levelUpOpen = false
	}

	const onKeyDown = (e: KeyboardEvent) => {
		// During a level-up pause, 1/2/3 pick an upgrade, R rerolls, Escape quits;
		// swallow the rest so movement keys don't leak into the frozen sim.
		if (levelUpOpen) {
			if (e.code === 'Escape') stopRun()
			else if (e.code === 'Digit1' || e.code === 'Numpad1') chooseUpgrade(choices[0])
			else if (e.code === 'Digit2' || e.code === 'Numpad2') chooseUpgrade(choices[1])
			else if (e.code === 'Digit3' || e.code === 'Numpad3') chooseUpgrade(choices[2])
			else if (e.code === 'KeyR') reroll()
			return
		}
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
	// (chase speed stays below the player's so they can always be outrun).
	const WAVE_DURATION = 14000 // ms of play per wave
	const waveSpawnInterval = (w: number) => Math.max(480, 1400 - (w - 1) * 130)
	const waveEnemyCap = (w: number) => Math.min(14, 6 + (w - 1))
	const waveEnemySpeed = (w: number) => Math.min(4.2, 2.4 + (w - 1) * 0.22)
	// Pressure floors: guaranteed counts of each threat vector so no play style
	// stays safe — flyers hunt perches, shooters pepper, turrets spray, bombers
	// deny the ground. Each type joins a few waves apart so variety ramps in.
	const waveFlyerFloor = (w: number) => Math.min(4, 1 + Math.floor((w - 1) / 2))
	const waveShooterFloor = (w: number) => (w < 2 ? 0 : Math.min(3, 1 + Math.floor((w - 2) / 2)))
	const waveTurretFloor = (w: number) => (w < 3 ? 0 : Math.min(2, 1 + Math.floor((w - 3) / 3)))
	const waveBomberFloor = (w: number) => (w < 4 ? 0 : Math.min(2, 1 + Math.floor((w - 4) / 3)))
	// Odds a ground slot is a dashing charger rather than a plain biker (grows with wave).
	const chargerChance = (w: number) => (w < 2 ? 0 : Math.min(0.5, (w - 1) * 0.08))
	// Toughness: per-kind base HP + 1 for every 3 waves cleared.
	const kindBaseHealth: Record<EnemyKind, number> = {
		biker: 3, flyer: 2, shooter: 2, charger: 2, turret: 6, bomber: 7, brute: 12
	}
	const waveEnemyHealth = (kind: EnemyKind, w: number) =>
		kindBaseHealth[kind] + Math.floor((w - 1) / 3)
	// Contact/shot/blast damage: a gentle ramp — most hits stay 1 until later waves,
	// brutes/bombers start at 2. Keeps it "nervous but survivable".
	const waveContactDamage = (kind: EnemyKind, w: number) =>
		(kind === 'brute' || kind === 'bomber' ? 2 : 1) + Math.floor((w - 1) / 5)
	let spawnTimer = 0
	let spawnSide = 0
	let invuln = 0
	let wasPlaying = false
	let dimAlpha = 0 // eased screen-dim while playing (focus mode)
	let waveTimer = 0 // ms elapsed in the current wave
	const WAVE_BANNER_MS = 1400 // how long the "WAVE N" flash shows on advance
	let waveBanner = 0 // ms remaining on the current banner

	const spawnEnemy = (kind: EnemyKind) => {
		const w = get(wave)
		// Alternate the side each enemy walks/flies in from.
		const fromLeft = spawnSide++ % 2 === 0
		// The turret is anchored (no walk-in), so it deploys directly on-screen;
		// everyone else enters from off the nearest side.
		const x =
			kind === 'turret'
				? canvas.width * (0.15 + Math.random() * 0.7)
				: fromLeft
					? -60
					: canvas.width + 60
		// Flyers and bombers enter high; ground units walk in at floor level.
		const y = kind === 'flyer' || kind === 'bomber' ? canvas.height * 0.32 : canvas.height - 80
		// Chase kinds scale their speed with the wave; the anchored/patrol kinds are fixed.
		const speed =
			kind === 'flyer' ? waveEnemySpeed(w) * 0.8
			: kind === 'shooter' ? 1.6
			: kind === 'turret' ? 0
			: kind === 'bomber' ? 1.4
			: kind === 'charger' ? waveEnemySpeed(w) * 1.05
			: kind === 'brute' ? 1.3
			: waveEnemySpeed(w)
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
	const spawnFromBudget = () => {
		const w = get(wave)
		const list = get(enemies)
		const count = (k: EnemyKind) => list.filter((e) => e.kind === k).length
		const pressures: { kind: EnemyKind; floor: number }[] = [
			{ kind: 'flyer', floor: waveFlyerFloor(w) },
			{ kind: 'shooter', floor: waveShooterFloor(w) },
			{ kind: 'turret', floor: waveTurretFloor(w) },
			{ kind: 'bomber', floor: waveBomberFloor(w) }
		]
		// Among the pressure types below their floor, pick one weighted by how far
		// below it sits. Weighting by the deficit — rather than always taking the
		// first unmet floor — stops a low-priority type (the bomber, last in the
		// list) from starving forever: while the player keeps culling the flyers and
		// shooters ahead of it, the strict-order version never climbed to the bomber
		// rung. A totally-absent bomber (deficit 2) now outweighs a flyer that's just
		// one short (deficit 1), so every vector eventually shows up.
		const deficits = pressures
			.map((p) => ({ kind: p.kind, need: p.floor - count(p.kind) }))
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
		const groundKind: EnemyKind = Math.random() < chargerChance(w) ? 'charger' : 'biker'

		if (list.length < waveEnemyCap(w)) {
			spawnEnemy(missing ?? groundKind)
		} else if (missing) {
			let stuck: Enemy | null = null
			let worst = -Infinity
			for (const e of list) {
				if (e.kind !== 'biker' && e.kind !== 'charger') continue
				const below = e.pos.y - player.pos.y
				if (below > worst) {
					worst = below
					stuck = e
				}
			}
			if (stuck) {
				enemiesStore.delete(stuck)
				spawnEnemy(missing)
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

	// Canvas HUD (HP gauge + wave/score + XP bar), drawn on top so the focus-mode
	// veil doesn't dim it.
	const drawHud = () => {
		const cx = canvas.width / 2
		ctx.save()
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		const hp = Math.max(0, get(playerHp))
		const cap = get(maxHp)

		// HP gauge (red): a single bar with 1-HP segment ticks — replaces the hearts.
		const gW = 200
		const gH = 13
		const gx = cx - gW / 2
		const gy = 16
		const pctHp = cap > 0 ? Math.max(0, Math.min(1, hp / cap)) : 0
		ctx.fillStyle = 'rgba(15, 23, 42, 0.8)' // slate-900 track
		ctx.fillRect(gx, gy, gW, gH)
		ctx.fillStyle = '#ef4444' // red-500 fill
		ctx.fillRect(gx, gy, gW * pctHp, gH)
		if (cap <= 24) {
			ctx.strokeStyle = 'rgba(2, 6, 23, 0.55)'
			ctx.lineWidth = 1
			ctx.beginPath()
			for (let i = 1; i < cap; i++) {
				const tx = Math.round(gx + (gW * i) / cap) + 0.5
				ctx.moveTo(tx, gy)
				ctx.lineTo(tx, gy + gH)
			}
			ctx.stroke()
		}
		ctx.fillStyle = '#ffffff'
		ctx.font = '700 10px ui-monospace, monospace'
		ctx.fillText(`${hp} / ${cap}`, cx, gy + gH / 2 + 0.5)

		ctx.font = '600 15px ui-monospace, monospace'
		ctx.fillStyle = '#cbd5e1'
		ctx.fillText(`WAVE ${get(wave)}   ·   LVL ${get(level)}   ·   SCORE ${get(score)}`, cx, gy + gH + 18)

		// XP-to-next-level progress bar (emerald) — fills as gems are banked.
		const barW = 160
		const barH = 5
		const bx = cx - barW / 2
		const by = gy + gH + 32
		const pct = Math.max(0, Math.min(1, get(levelXp) / get(levelXpNeeded)))
		ctx.fillStyle = 'rgba(15, 23, 42, 0.7)'
		ctx.fillRect(bx, by, barW, barH)
		ctx.fillStyle = '#34d399'
		ctx.fillRect(bx, by, barW * pct, barH)
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

	// Does the segment (x1,y1)->(x2,y2) cross this platform rect? Liang-Barsky line
	// clip — used to tell whether a shot at an enemy would slam into a platform first.
	const segmentIntersectsRect = (
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		r: { left: number; top: number; width: number; height: number }
	): boolean => {
		const dx = x2 - x1
		const dy = y2 - y1
		const p = [-dx, dx, -dy, dy]
		const q = [x1 - r.left, r.left + r.width - x1, y1 - r.top, r.top + r.height - y1]
		let t0 = 0
		let t1 = 1
		for (let i = 0; i < 4; i++) {
			if (p[i] === 0) {
				if (q[i] < 0) return false // parallel to this edge and fully outside it
			} else {
				const t = q[i] / p[i]
				if (p[i] < 0) {
					if (t > t1) return false
					if (t > t0) t0 = t
				} else {
					if (t < t0) return false
					if (t < t1) t1 = t
				}
			}
		}
		return t0 < t1 // overlapping interval (strict: a mere graze doesn't block)
	}

	// True if any platform sits between the two points — the shot would be walled off.
	const firingBlocked = (x1: number, y1: number, x2: number, y2: number): boolean => {
		for (const p of platforms) if (segmentIntersectsRect(x1, y1, x2, y2, p)) return true
		return false
	}

	// Nearest enemy with a clear line of fire (no platform in the way), for auto-aim.
	// A perched player thus stops dumping shots into the platform they stand on and
	// engages reachable threats (e.g. flyers overhead) instead. null if none can be hit.
	const nearestEnemy = (): Enemy | null => {
		const foes = $enemies ?? []
		let best: Enemy | null = null
		let bestD = Infinity
		const px = player.pos.x + player.width / 2
		const py = player.pos.y + player.height / 2
		for (const e of foes) {
			const ex = e.pos.x + e.width / 2
			const ey = e.pos.y + e.height / 2
			const dx = ex - px
			const dy = ey - py
			const d = dx * dx + dy * dy
			if (d >= bestD) continue // farther than the current pick — skip the LoS test
			if (firingBlocked(px, py, ex, ey)) continue
			bestD = d
			best = e
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
							const dropChance =
								enemy.kind === 'brute' ? 0.5
								: enemy.kind === 'bomber' || enemy.kind === 'turret' ? 0.12
								: 0.05
							if (Math.random() < dropChance) {
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
	const damagePlayer = (amount = 1) => {
		const hp = get(playerHp) - amount
		playerHp.set(hp)
		invuln = invulnSteps
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
				damagePlayer(enemy.damage)
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
				damagePlayer(projectile.damage)
				projectilesStore.delete(projectile)
				break
			}
		}
	}

	// A detonating bomb hits the player once (a single AoE check on the first step
	// of its explosion). Mark it resolved even during i-frames so an old blast can
	// never carry over and hit after the i-frames lapse.
	const resolveBombs = () => {
		for (const bomb of $bombs ?? []) {
			if (bomb.state !== 'exploding' || bomb.damageApplied) continue
			bomb.damageApplied = true
			if (invuln > 0) continue
			const dx = player.pos.x + player.width / 2 - bomb.centerX
			const dy = player.pos.y + player.height / 2 - bomb.centerY
			if (Math.hypot(dx, dy) <= bomb.blastRadius) damagePlayer(bomb.damage)
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
				const ups = addXp(gem.value * xpMul)
				if (ups > 0) queueLevelUps(ups)
				xpGemsStore.delete(gem)
			}
		}
	}

	// Walk over a med-kit to heal — only while hurt, so a full-HP player leaves it on
	// the ground to grab later. Uncollected kits expire.
	const resolveHealthPickups = () => {
		const packs = $healthPacks ?? []
		if (!packs.length || get(playerHp) >= get(maxHp)) return
		const playerRect = {
			width: player.width,
			height: player.height,
			top: player.pos.y,
			left: player.pos.x
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

	const animate = (timestamp: number) => {
		if (lastTime === 0) lastTime = timestamp
		const frameTime = Math.min(timestamp - lastTime, MAX_FRAME_TIME)
		lastTime = timestamp

		if (canvasDirty) resizeCanvas()
		if (platformsDirty) collectPlatforms()

		const playing = get(gameStatus) === 'playing'

		// On the rising edge of a run, clear the field and reset upgrades. The player
		// keeps its current position — no teleport onto the pedestal.
		if (playing && !wasPlaying) {
			enemiesStore.set([])
			projectilesStore.set([])
			xpGemsStore.set([])
			bombsStore.set([])
			healthPacksStore.set([])
			resetUpgrades()
			rerolls = BASE_REROLLS
			levelUpOpen = false
			pendingLevelUps = 0
			spawnTimer = 0
			invuln = 0
			waveTimer = 0
			waveBanner = 0
		}
		wasPlaying = playing

		// A run that ended (Escape/quit) with a pick still open drops the pick.
		if (!playing && levelUpOpen) {
			levelUpOpen = false
			pendingLevelUps = 0
		}
		// Level-up pause: the sim freezes but the field is preserved (not cleared).
		const paused = levelUpOpen

		// Advance the wave on a timer, then spawn enemies at the current wave's rate/
		// cap. Frozen while a pick is open; the field is cleared once truly stopped.
		if (playing && !paused) {
			waveTimer += frameTime
			if (waveTimer >= WAVE_DURATION) {
				waveTimer -= WAVE_DURATION
				wave.update((w) => w + 1)
				waveBanner = WAVE_BANNER_MS
				// An elite brute anchors each new wave from wave 3 (at most one alive):
				// a slow bullet-sponge that drops a fat gem and rewards focus fire.
				if (get(wave) >= 3 && !get(enemies).some((e) => e.kind === 'brute')) spawnEnemy('brute')
			}
			spawnTimer += frameTime
			if (spawnTimer >= waveSpawnInterval(get(wave))) {
				spawnFromBudget()
				spawnTimer = 0
			}
		} else if (!playing) {
			if ($enemies?.length) enemiesStore.set([])
			if ($projectiles?.length) projectilesStore.set([])
			if ($xpGems?.length) xpGemsStore.set([])
			if ($bombs?.length) bombsStore.set([])
			if ($healthPacks?.length) healthPacksStore.set([])
			invuln = 0
			waveBanner = 0
		}

		// Advance physics in fixed steps, consuming the elapsed real time. A level-up
		// pause skips the updates entirely, freezing every entity in place.
		accumulator += frameTime
		while (accumulator >= FIXED_STEP) {
			if (!paused) {
				$projectiles?.forEach((projectile) => projectile.update(STEP_DELTA, platforms))
				$xpGems?.forEach((gem) => gem.update(canvas, player, platforms, STEP_DELTA, magnetRadius))
				if (playing) $enemies?.forEach((enemy) => enemy.update(canvas, player, platforms, STEP_DELTA, $enemies ?? []))
				if (playing) $bombs?.forEach((bomb) => bomb.update(canvas, platforms, STEP_DELTA))
				if (playing) $healthPacks?.forEach((pack) => pack.update(canvas, platforms, STEP_DELTA))
				player.update(canvas, keys, platforms, STEP_DELTA)
				// Auto-attack: aim at the nearest enemy and fire on a cadence while playing.
				const target = playing ? nearestEnemy() : null
				player.aimAt(target)
				if (playing) {
					if (target) {
						if (playerFireCooldown > 0) playerFireCooldown--
						else {
							player.shoot()
							playerFireCooldown = fireSteps
						}
					}
					resolveHits()
					resolveGemPickups()
					resolveHealthPickups()
					if (invuln > 0) invuln--
					resolvePlayerDamage()
					resolveEnemyShots()
					resolveBombs()
				}
			}
			accumulator -= FIXED_STEP
		}
		// Freeze interpolation + sprite animation while paused so entities hold still.
		const alpha = paused ? 1 : accumulator / FIXED_STEP
		const animDelta = paused ? 0 : frameTime / 12

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
		$healthPacks?.forEach((pack) => pack.draw(ctx, alpha))
		$enemies?.forEach((enemy) => enemy.draw(ctx, animDelta, alpha))
		$bombs?.forEach((bomb) => bomb.draw(ctx, alpha))
		$projectiles?.forEach((projectile) => projectile.draw(ctx, alpha))
		// Blink the player while invulnerable after a hit (but always show it paused).
		if (paused || invuln <= 0 || Math.floor(invuln / 6) % 2 === 0) {
			player.draw(ctx, animDelta, alpha)
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
		bombsStore.set([])
		healthPacksStore.set([])
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

{#if levelUpOpen}
	<!-- Full-screen catcher (default pointer-events) so clicks land on the modal and
	     not the Start/Stop hub behind it. Forces a pick before play resumes. -->
	<div class="fixed inset-0 z-50 flex items-center justify-center select-none">
		<div class="level-up text-center">
			<div class="font-bauhaus text-2xl font-bold tracking-widest text-emerald-400">LEVEL UP</div>
			<div class="mt-1 font-mono text-xs tracking-widest text-slate-400">NIVEAU {$level}</div>
			<div class="mt-4 flex flex-col gap-2">
				{#each choices as choice, i (choice.id)}
					<button class="upgrade" data-kind={choice.kind} onclick={() => chooseUpgrade(choice)}>
						<span class="key">{i + 1}</span>
						<span class="flex flex-col items-start">
							<span class="name">{choice.name}</span>
							<span class="desc">{choice.desc}</span>
						</span>
					</button>
				{/each}
			</div>
			<button class="reroll" onclick={reroll} disabled={rerolls <= 0} aria-label="Relancer les choix">
				↻ Relancer <span class="reroll-count">{rerolls}</span>
			</button>
			<div class="mt-3 font-mono text-[10px] tracking-widest text-slate-500 uppercase">
				Clic ou touches 1 · 2 · 3 · R relance
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

	.level-up {
		width: min(90vw, 340px);
		padding: 1.5rem 1.75rem;
		background: rgb(15 23 42 / 0.94); /* slate-900 */
		border: 1px solid rgb(51 65 85); /* slate-700 */
		border-radius: 0.6rem;
		box-shadow: 0 10px 40px rgb(0 0 0 / 0.55);
	}
	.upgrade {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.6rem 0.8rem;
		text-align: left;
		border: 1px solid rgb(51 65 85); /* slate-700 */
		border-radius: 0.45rem;
		background: rgb(30 41 59 / 0.6); /* slate-800 */
		transition:
			border-color 0.15s,
			background 0.15s,
			transform 0.1s;
	}
	.upgrade:hover {
		background: rgb(51 65 85 / 0.7);
		transform: translateY(-1px);
	}
	.upgrade .key {
		display: flex;
		flex: none;
		align-items: center;
		justify-content: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 0.35rem;
		background: rgb(15 23 42 / 0.8); /* slate-900 */
		font-family: ui-monospace, monospace;
		font-size: 0.85rem;
		font-weight: 700;
		color: rgb(226 232 240); /* slate-200 */
	}
	.upgrade .name {
		font-family: Jura, sans-serif;
		font-size: 0.9rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: rgb(226 232 240); /* slate-200 */
	}
	.upgrade .desc {
		font-size: 0.72rem;
		color: rgb(148 163 184); /* slate-400 */
	}
	/* Accent the badge + border by upgrade family. */
	.upgrade[data-kind='atk'] {
		border-color: rgb(248 113 113 / 0.5); /* red-400 */
	}
	.upgrade[data-kind='atk'] .key {
		color: rgb(248 113 113);
	}
	.upgrade[data-kind='def'] {
		border-color: rgb(96 165 250 / 0.5); /* blue-400 */
	}
	.upgrade[data-kind='def'] .key {
		color: rgb(96 165 250);
	}
	.upgrade[data-kind='util'] {
		border-color: rgb(52 211 153 / 0.5); /* emerald-400 */
	}
	.upgrade[data-kind='util'] .key {
		color: rgb(52 211 153);
	}
	.reroll {
		margin-top: 0.75rem;
		width: 100%;
		padding: 0.4rem 0.8rem;
		border: 1px dashed rgb(71 85 105); /* slate-600 */
		border-radius: 0.45rem;
		background: rgb(30 41 59 / 0.4); /* slate-800 */
		font-family: ui-monospace, monospace;
		font-size: 0.75rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgb(148 163 184); /* slate-400 */
		transition:
			border-color 0.15s,
			background 0.15s,
			color 0.15s;
	}
	.reroll:hover:not(:disabled) {
		border-color: rgb(148 163 184); /* slate-400 */
		background: rgb(51 65 85 / 0.6);
		color: rgb(226 232 240); /* slate-200 */
	}
	.reroll:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.reroll-count {
		color: rgb(226 232 240); /* slate-200 */
		font-weight: 700;
	}
</style>
