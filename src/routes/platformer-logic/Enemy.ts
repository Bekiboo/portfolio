import { collision, getSprite, hasSprite, GRAVITY, lerpPos, type Bounds } from './utils'
import { effectsStore, enemiesStore, projectilesStore, bombsStore } from '$lib/stores'
import { Effect } from './Effect'
import { Projectile } from './Projectile'
import { Bomb } from './Bomb'
import { ENEMY_TYPES, type EnemyKind, type Behavior } from './enemyTypes'
import type { Platform } from './Platform'
import type { Player } from './Player'

export type { EnemyKind } from './enemyTypes'

const DEADZONE = 8 // px around the target where the enemy stops nudging (kills the left/right vibration)
const SEPARATION_GAP = 34 // enemies closer than this get pushed apart so they don't stack into one blob
const SEPARATION_PUSH = 0.6 // how hard overlapping neighbours shove each other per step
const SHOOT_MIN = 180 // a shooter backs off if the player gets closer than this
const SHOOT_MAX = 340 // ...and closes in if the player is farther than this
// Rolling turret: trundles a short step, stops, telegraphs, then fires a directional fan.
const TURRET_ROLL_SPEED = 0.7 // px/step it trundles at (slow)
const TURRET_STEP = 64 // px advanced per jerky step
const TURRET_MARGIN = 44 // keep this far from the canvas edges when stopping
const TURRET_AIM_STEPS = 40 // stop-and-telegraph duration before a burst
const TURRET_AIM_FAST = 3 // idle ticksPerFrame during the 2nd half of the telegraph (sped-up = the tell)
const TURRET_FIRE_STEPS = 24 // hold on the recoil/attack frames after firing
const TURRET_FLIP_CHANCE = 0.28 // chance to turn around after a burst
const TURRET_BOLTS: number = 4 // bolts per directional fan
const TURRET_SPREAD = 0.55 // half-arc of the fan (rad)
const TURRET_BOLT_SPEED = 3.5
const DRONE_ATTACK_STEPS = 22 // how long the drone holds its bomb-drop frames after a release
const CHARGE_COOLDOWN = 150 // charger: steps between dashes
const CHARGE_WIND = 16 // charger: telegraph wind-up before a dash
const CHARGE_DASH = 16 // charger: dash duration
const CHARGE_DASH_MULT = 3.4 // charger: speed multiplier during a dash
const FRAME_W = 48 // sprite-sheet frame size — every character sheet shares this
const FRAME_H = 80
// Elite modifier (spawned at wave milestones, see GameWorld): a scaled-up, tankier, harder-hitting
// version of any kind, marked with a pulsing aura and worth a lot more XP + a guaranteed credit drop.
export const ELITE_SIZE_MUL = 1.45 // hitbox + sprite scale-up (GameWorld reuses this to place feet on the floor)
const ELITE_HEALTH_MUL = 6 // HP multiplier — a genuine bullet-sponge beat
const ELITE_DAMAGE_BONUS = 1 // flat extra contact/shot damage
const ELITE_XP_MUL = 5 // fat gem reward

// Seven enemy flavours sharing one body, all defined by data in enemyTypes.ts.
// Movement differs per `behavior`; drawing, hits and animation are shared. (Non-biker
// kinds share the cyborg sprite for now — a placeholder distinguished by size.)
export class Enemy {
	kind: EnemyKind
	behavior: Behavior
	character: string
	pos: { x: number; y: number }
	prevPos: { x: number; y: number } // position before the last physics step (for render interpolation)
	velocity: { x: number; y: number }
	height: number
	width: number
	spriteScale: number
	separates: boolean // pushed apart from crowding neighbours?
	separatesVertically: boolean // spread on the Y axis too (flyers)?
	fireInterval: number // steps between shots/drops (0 for non-firing kinds)
	speed: number
	damage: number // contact/shot damage dealt to the player (scaled by wave at spawn)
	xpValue: number // value of the gem dropped on death
	image!: HTMLImageElement
	maxFrame: number
	ticksPerFrame: number
	frame = 1
	ticksCount = 0
	direction = 'left'
	health: number
	maxHealth: number
	hitFlash = 0 // frames left on the white "took a hit" flash
	bob = 0 // flyer/bomber hover phase
	fireCooldown = 0 // shooter/turret/bomber: physics steps until the next shot/drop
	dashState: 'approach' | 'wind' | 'dash' = 'approach' // charger state machine
	dashTimer = 0
	dashCd = 0
	dashDir = 1
	// Sprite framing/anchoring (see enemyTypes: character sheets vs 48×48 gadget sheets).
	anchor: 'topLeft' | 'foot' | 'center' = 'topLeft'
	frameW = FRAME_W // source-frame size of the *current* animation
	frameH = FRAME_H
	currentAnim = '' // active animation key (gadget kinds switch between idle/walk/attack)
	// Rolling-turret state machine
	turretState: 'roll' | 'aim' | 'fire' = 'roll'
	turretTimer = 0
	turretDir = 0 // cannon facing / roll direction (+1 right, −1 left; 0 = uninitialised)
	turretTargetX = 0
	perched = false // a wall-flush turret: never rolls (so it can't fall off its perch), just aims/fires inward
	attackAnim = 0 // frames left showing a gadget's 'attack' animation (drone bomb-drop)
	elite = false // a milestone miniboss: scaled up, tankier, drawn with an aura (see ELITE_* consts)
	auraPhase = 0 // pulsing-aura clock for elites (advanced in draw)

	constructor(
		pos: { x: number; y: number },
		opts: { speed?: number; kind?: EnemyKind; health?: number; damage?: number; elite?: boolean } = {}
	) {
		this.kind = opts.kind ?? 'biker'
		const t = ENEMY_TYPES[this.kind]
		this.behavior = t.behavior
		this.character = t.sprite
		this.anchor = t.spriteAnchor ?? 'topLeft'
		// Character sheets animate on 'run'; gadget sheets (turret/drone) have no 'run'
		// and start idle, switching animations from their behaviour.
		this.currentAnim = hasSprite(this.character, 'run') ? 'run' : 'idle'
		const sprite = getSprite(this.character, this.currentAnim)
		this.image = sprite.img
		this.ticksPerFrame = sprite.speed || 5
		this.maxFrame = sprite.frames ?? 0
		this.frameW = sprite.width
		this.frameH = sprite.height
		this.width = t.width
		this.height = t.height
		this.spriteScale = t.spriteScale
		this.separates = t.separates
		this.separatesVertically = t.separatesVertically
		this.fireInterval = t.fireInterval ?? 0
		this.pos = pos
		this.prevPos = { x: pos.x, y: pos.y }
		this.speed = opts.speed ?? t.speed
		// Patrol kinds start with horizontal velocity; non-gravity kinds hover (vy 0).
		this.velocity = {
			x: t.patrol ? this.speed : 0,
			y: t.gravity ? 1 : 0
		}
		this.health = opts.health ?? t.health
		this.maxHealth = this.health
		this.damage = opts.damage ?? t.damage
		this.xpValue = t.xp
		// Elite: fold the miniboss modifiers over the (already wave-scaled) baselines. Size grows
		// last so the hitbox/sprite scale together; GameWorld places the feet using ELITE_SIZE_MUL.
		if (opts.elite) {
			this.elite = true
			this.health = Math.round(this.health * ELITE_HEALTH_MUL)
			this.maxHealth = this.health
			this.damage += ELITE_DAMAGE_BONUS
			this.xpValue = Math.round(this.xpValue * ELITE_XP_MUL)
			this.width = Math.round(this.width * ELITE_SIZE_MUL)
			this.height = Math.round(this.height * ELITE_SIZE_MUL)
			this.spriteScale *= ELITE_SIZE_MUL
		}
		// Stagger firing kinds so a wave doesn't shoot in unison; randomise the
		// charger's first dash so a pack doesn't dash as one.
		if (this.behavior === 'charger') this.dashCd = Math.floor(Math.random() * CHARGE_COOLDOWN)
		else if (this.fireInterval) this.fireCooldown = Math.floor(Math.random() * this.fireInterval)
	}

	update(
		canvas: Bounds,
		target: Player,
		platforms: Platform[],
		deltaTime: number,
		others: Enemy[] = []
	) {
		this.prevPos.x = this.pos.x
		this.prevPos.y = this.pos.y

		switch (this.behavior) {
			case 'flyer': this.#updateFlyer(canvas, target, deltaTime); break
			case 'shooter': this.#updateShooter(canvas, target, platforms, deltaTime); break
			case 'bomber': this.#updateBomber(canvas, deltaTime); break
			case 'turret': this.#updateTurret(canvas, platforms, deltaTime); break
			case 'charger': this.#updateCharger(canvas, target, platforms, deltaTime); break
			default: this.#updateGround(canvas, target, platforms, deltaTime) // 'ground': biker + brute
		}

		if (this.separates) this.#separate(others, deltaTime)
	}

	// Ground chaser: nudge horizontally toward the player (with a deadzone so it
	// stops jittering once it's underneath), then fall and land on platforms.
	#updateGround(canvas: Bounds, target: Player, platforms: Platform[], deltaTime: number) {
		const dx = target.pos.x + target.width / 2 - (this.pos.x + this.width / 2)
		if (Math.abs(dx) > DEADZONE) {
			this.direction = dx < 0 ? 'left' : 'right'
			this.pos.x += Math.sign(dx) * this.speed * deltaTime
		}
		this.#applyGravity(deltaTime)
		this.#checkForVerticalCollisions(platforms)
		this.#keepWithinCanvas(canvas)
	}

	// Homing flyer: drift straight at the player's centre (with a gentle hover
	// weave), ignoring gravity and platforms. Clamped to stay on screen.
	#updateFlyer(canvas: Bounds, target: Player, deltaTime: number) {
		this.bob += deltaTime
		const cx = target.pos.x + target.width / 2
		const cy = target.pos.y + target.height / 2 + Math.sin(this.bob * 0.06) * 18
		const dx = cx - (this.pos.x + this.width / 2)
		const dy = cy - (this.pos.y + this.height / 2)
		const dist = Math.hypot(dx, dy) || 1
		if (dist > DEADZONE) {
			this.direction = dx < 0 ? 'left' : 'right'
			this.pos.x += (dx / dist) * this.speed * deltaTime
			this.pos.y += (dy / dist) * this.speed * deltaTime
		}
		this.pos.x = Math.max(0, Math.min(this.pos.x, canvas.width - this.width))
		this.pos.y = Math.max(0, Math.min(this.pos.y, canvas.height - this.height))
	}

	// Ground gunner: hold a standoff band from the player (back off if too close,
	// close in if too far), face them, and fire hostile bolts on a cooldown while
	// fully on-screen. Reuses gravity + platform landing like the biker.
	#updateShooter(canvas: Bounds, target: Player, platforms: Platform[], deltaTime: number) {
		const dx = target.pos.x + target.width / 2 - (this.pos.x + this.width / 2)
		this.direction = dx < 0 ? 'left' : 'right'
		const adx = Math.abs(dx)
		if (adx < SHOOT_MIN) this.pos.x -= Math.sign(dx) * this.speed * deltaTime
		else if (adx > SHOOT_MAX) this.pos.x += Math.sign(dx) * this.speed * deltaTime

		this.#applyGravity(deltaTime)
		this.#checkForVerticalCollisions(platforms)
		this.#keepWithinCanvas(canvas)

		if (this.fireCooldown > 0) {
			this.fireCooldown--
		} else if (this.pos.x > 0 && this.pos.x < canvas.width - this.width) {
			this.#fire(target)
			this.fireCooldown = this.fireInterval
		}
	}

	// Hovering bomber: patrols overhead (bouncing off the screen edges, steering
	// back in if it drifts off) and rains gravity bombs — it does NOT aim at the
	// player, so its job is area denial that forces the camper to keep moving.
	#updateBomber(canvas: Bounds, deltaTime: number) {
		this.bob += deltaTime
		// Steer back toward centre near an edge; otherwise cruise.
		if (this.pos.x < 40) this.velocity.x = Math.abs(this.velocity.x)
		else if (this.pos.x > canvas.width - this.width - 40) this.velocity.x = -Math.abs(this.velocity.x)
		this.pos.x += this.velocity.x * deltaTime
		this.direction = this.velocity.x < 0 ? 'left' : 'right'
		// Ease toward a high altitude band with a slow vertical bob.
		const targetY = canvas.height * 0.26 + Math.sin(this.bob * 0.03) * 22
		this.pos.y += (targetY - this.pos.y) * 0.02 * deltaTime
		this.pos.x = Math.max(0, Math.min(this.pos.x, canvas.width - this.width))

		if (this.fireCooldown > 0) this.fireCooldown--
		else {
			this.#dropBomb()
			this.fireCooldown = this.fireInterval
			this.attackAnim = DRONE_ATTACK_STEPS
		}
		// Show the bomb-drop frames for a beat after a release, otherwise hover (idle).
		if (this.attackAnim > 0) {
			this.attackAnim--
			this.#setAnim('attack')
		} else {
			this.#setAnim('idle')
		}
	}

	// Rolling turret: trundles in from a side, stops fully before doing anything hostile,
	// speeds up its idle as a tell, then fires a fan of bolts toward its cannon side.
	// Advances toward the interior in jerky steps and sometimes turns around. It never
	// fires while moving — hostile output only ever happens from a dead stop.
	#updateTurret(canvas: Bounds, platforms: Platform[], deltaTime: number) {
		// Lazy init: face into the map from whichever side it spawned on. A perched turret
		// (wall-flush, on an edge ledge) never rolls — it holds its spot and only aims/fires,
		// so it can't trundle off and fall.
		if (this.turretDir === 0) {
			this.turretDir = this.pos.x < canvas.width / 2 ? 1 : -1
			this.direction = this.turretDir < 0 ? 'left' : 'right'
			if (this.perched) {
				this.turretState = 'aim'
				this.turretTimer = TURRET_AIM_STEPS
			} else {
				this.turretState = 'roll'
				this.#setTurretRollTarget(canvas)
			}
		}

		if (!this.perched && this.turretState === 'roll') {
			this.#setAnim('walk')
			const dx = this.turretTargetX - this.pos.x
			const step = Math.sign(dx) * TURRET_ROLL_SPEED * deltaTime
			if (Math.abs(step) >= Math.abs(dx)) {
				// Reached the stop. Pick the burst direction now (turn around at a wall, or
				// at random) so a wall-hugging turret always fires into the map.
				this.pos.x = this.turretTargetX
				const minX = TURRET_MARGIN
				const maxX = canvas.width - this.width - TURRET_MARGIN
				const atWall =
					(this.turretTargetX <= minX + 0.5 && this.turretDir < 0) ||
					(this.turretTargetX >= maxX - 0.5 && this.turretDir > 0)
				if (atWall || Math.random() < TURRET_FLIP_CHANCE) this.turretDir *= -1
				this.direction = this.turretDir < 0 ? 'left' : 'right'
				this.turretState = 'aim'
				this.turretTimer = TURRET_AIM_STEPS
			} else {
				this.pos.x += step
			}
		} else if (this.turretState === 'aim') {
			// Stopped: idle normally, then sped-up for the second half — the firing tell.
			if (this.turretTimer > TURRET_AIM_STEPS / 2) this.#setAnim('idle')
			else this.#setAnim('idle', TURRET_AIM_FAST)
			if (--this.turretTimer <= 0) {
				this.#fireTurretBurst()
				this.#setAnim('attack')
				this.turretState = 'fire'
				this.turretTimer = TURRET_FIRE_STEPS
			}
		} else {
			// Hold on the recoil frames, then trundle the next jerky step — or, if perched,
			// just re-arm in place for the next burst.
			this.#setAnim('attack')
			if (--this.turretTimer <= 0) {
				if (this.perched) {
					this.turretState = 'aim'
					this.turretTimer = TURRET_AIM_STEPS
				} else {
					this.turretState = 'roll'
					this.#setTurretRollTarget(canvas)
				}
			}
		}

		this.#applyGravity(deltaTime)
		this.#checkForVerticalCollisions(platforms)
		this.#keepWithinCanvas(canvas)
	}

	// Aim the next jerky step one TURRET_STEP toward the cannon, clamped to a margin so
	// the turret always comes to rest fully on-screen.
	#setTurretRollTarget(canvas: Bounds) {
		const minX = TURRET_MARGIN
		const maxX = canvas.width - this.width - TURRET_MARGIN
		const target = this.pos.x + this.turretDir * TURRET_STEP
		this.turretTargetX = Math.max(minX, Math.min(maxX, target))
	}

	// Charger: approach like a biker, then periodically wind up (telegraphed) and
	// dash horizontally at high speed toward the player before recovering.
	#updateCharger(canvas: Bounds, target: Player, platforms: Platform[], deltaTime: number) {
		const dx = target.pos.x + target.width / 2 - (this.pos.x + this.width / 2)
		const dy = target.pos.y - this.pos.y

		if (this.dashState === 'dash') {
			this.pos.x += this.dashDir * this.speed * CHARGE_DASH_MULT * deltaTime
			if (--this.dashTimer <= 0) {
				this.dashState = 'approach'
				this.dashCd = CHARGE_COOLDOWN
			}
		} else if (this.dashState === 'wind') {
			// Hold still for the telegraph, then launch.
			if (--this.dashTimer <= 0) {
				this.dashState = 'dash'
				this.dashTimer = CHARGE_DASH
			}
		} else {
			if (Math.abs(dx) > DEADZONE) {
				this.direction = dx < 0 ? 'left' : 'right'
				this.pos.x += Math.sign(dx) * this.speed * deltaTime
			}
			// Line up a dash when off cooldown and roughly level with the player.
			if (--this.dashCd <= 0 && Math.abs(dx) < 460 && Math.abs(dy) < 120) {
				this.dashState = 'wind'
				this.dashTimer = CHARGE_WIND
				this.dashDir = Math.sign(dx) || 1
				this.direction = this.dashDir < 0 ? 'left' : 'right'
			}
		}

		this.#applyGravity(deltaTime)
		this.#checkForVerticalCollisions(platforms)
		this.#keepWithinCanvas(canvas)
	}

	// Fire a single hostile bolt at the player's centre, with a muzzle puff.
	#fire(target: Player) {
		const originX = this.pos.x + this.width / 2
		const originY = this.pos.y + this.height / 2
		const angle = Math.atan2(
			target.pos.y + target.height / 2 - originY,
			target.pos.x + target.width / 2 - originX
		)
		projectilesStore.add(
			new Projectile({ x: originX, y: originY }, angle, 'blue', {
				hostile: true,
				speed: 4.2,
				damage: this.damage
			})
		)
		effectsStore.add(new Effect({ x: this.pos.x, y: this.pos.y + 28 }, 'smoke_12'))
	}

	// Fire a fan of hostile bolts toward the cannon side only (not a full ring). A
	// vertical spread around the horizontal, so it threatens perches above and the floor
	// below on that side; you dodge by crossing behind it or slipping between the bolts.
	#fireTurretBurst() {
		// Muzzle at the cannon: the sprite is foot-anchored, so its vertical centre (≈ the
		// barrel) sits at pos.y + height − dh/2; nudge horizontally toward the cannon tip.
		const dh = this.frameH * this.spriteScale
		const muzzleX = this.pos.x + this.width / 2 + this.turretDir * this.width * 0.35
		const muzzleY = this.pos.y + this.height - dh / 2
		const base = this.turretDir > 0 ? 0 : Math.PI // fire right (0) or left (π)
		for (let i = 0; i < TURRET_BOLTS; i++) {
			const f = TURRET_BOLTS === 1 ? 0.5 : i / (TURRET_BOLTS - 1) // 0..1 across the fan
			const angle = base + (f * 2 - 1) * TURRET_SPREAD // base ± spread
			projectilesStore.add(
				new Projectile({ x: muzzleX, y: muzzleY }, angle, 'blue', {
					hostile: true,
					speed: TURRET_BOLT_SPEED,
					damage: this.damage
				})
			)
		}
		effectsStore.add(new Effect({ x: muzzleX, y: muzzleY }, 'smoke_12'))
	}

	// Release a gravity bomb below the bomber with a little lateral scatter.
	#dropBomb() {
		const vx = (Math.random() - 0.5) * 3
		bombsStore.add(
			new Bomb({ x: this.pos.x + this.width / 2 - 8, y: this.pos.y + this.height / 2 }, vx, {
				damage: this.damage
			})
		)
	}

	// Soft mutual repulsion so enemies chasing the same point fan out instead of
	// stacking. Ground units only spread horizontally; flyers spread in both axes.
	#separate(others: Enemy[], deltaTime: number) {
		let pushX = 0
		let pushY = 0
		for (const o of others) {
			if (o === this) continue
			const ox = o.pos.x - this.pos.x
			const oy = o.pos.y - this.pos.y
			if (Math.abs(ox) < SEPARATION_GAP && Math.abs(oy) < this.height * 0.8) {
				pushX -= Math.sign(ox || 1) * (1 - Math.abs(ox) / SEPARATION_GAP)
				if (this.separatesVertically) {
					pushY -= Math.sign(oy || 1) * (1 - Math.abs(oy) / (this.height * 0.8))
				}
			}
		}
		this.pos.x += pushX * SEPARATION_PUSH * deltaTime
		if (this.separatesVertically) this.pos.y += pushY * SEPARATION_PUSH * deltaTime
	}

	draw(ctx: CanvasRenderingContext2D, deltaTime: number, alpha = 1) {
		const { x, y } = lerpPos(this, alpha)
		this.#animate(deltaTime)
		if (this.hitFlash > 0) this.hitFlash--

		// Elite aura: a pulsing amber halo under the sprite so a miniboss reads at a glance.
		if (this.elite) {
			this.auraPhase += deltaTime
			const cx = x + this.width / 2
			const cy = y + this.height / 2
			const r = Math.max(this.width, this.height) * (0.62 + 0.05 * Math.sin(this.auraPhase * 0.08))
			ctx.save()
			const g = ctx.createRadialGradient(cx, cy, r * 0.35, cx, cy, r)
			g.addColorStop(0, 'rgba(245, 158, 11, 0.28)') // amber-500 core
			g.addColorStop(1, 'rgba(245, 158, 11, 0)')
			ctx.fillStyle = g
			ctx.beginPath()
			ctx.arc(cx, cy, r, 0, Math.PI * 2)
			ctx.fill()
			ctx.restore()
		}

		const scale = this.spriteScale
		const winding = this.behavior === 'charger' && this.dashState === 'wind'
		// Whether to mirror the source (all art faces right, so flip when facing left).
		const flip = this.direction === 'left'

		ctx.save()
		// Flash bright for a few frames after a hit; a charger flashes brighter
		// while winding up so its dash is telegraphed.
		if (this.hitFlash > 0) ctx.filter = 'brightness(2.6)'
		else if (winding) ctx.filter = 'brightness(1.9)'

		let topY: number
		if (this.anchor === 'topLeft') {
			// Character sheet: art fills a hitbox-sized box from the top-left; the flip
			// mirrors around the hitbox's right edge (unchanged legacy path).
			topY = y
			const dw = this.width * scale
			const dh = this.height * scale
			if (this.direction === 'right') {
				ctx.drawImage(this.image, (this.frame - 1) * FRAME_W, 8, FRAME_W, FRAME_H, x, y, dw, dh)
			} else {
				ctx.save()
				ctx.translate(x + this.width, y)
				ctx.scale(-1, 1)
				ctx.drawImage(this.image, (this.frame - 1) * FRAME_W, 8, FRAME_W, FRAME_H, 0, 0, dw, dh)
				ctx.restore()
			}
		} else {
			// Gadget sheet (48×48): draw the square frame aspect-correct, centred on the
			// hitbox, either footed on the floor (turret) or centred (hovering drone).
			const dw = this.frameW * scale
			const dh = this.frameH * scale
			const drawX = x + this.width / 2 - dw / 2
			topY = this.anchor === 'foot' ? y + this.height - dh : y + this.height / 2 - dh / 2
			const srcX = (this.frame - 1) * this.frameW
			if (!flip) {
				ctx.drawImage(this.image, srcX, 0, this.frameW, this.frameH, drawX, topY, dw, dh)
			} else {
				ctx.save()
				ctx.translate(drawX + dw, topY)
				ctx.scale(-1, 1)
				ctx.drawImage(this.image, srcX, 0, this.frameW, this.frameH, 0, 0, dw, dh)
				ctx.restore()
			}
		}
		ctx.restore()

		// A slim chip bar appears once an enemy has taken damage.
		if (this.maxHealth > 1 && this.health < this.maxHealth) this.#drawHealthBar(ctx, x, topY)
	}

	#drawHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number) {
		const barW = this.width * 1.4 // ~70% of the 2× sprite width
		const barH = 3
		const bx = x + this.width - barW / 2 // centred over the sprite
		const by = y - 2
		const pct = Math.max(0, this.health / this.maxHealth)
		ctx.save()
		ctx.fillStyle = 'rgba(15, 23, 42, 0.75)' // slate-900 track
		ctx.fillRect(bx, by, barW, barH)
		ctx.fillStyle = '#f87171' // red-400 fill
		ctx.fillRect(bx, by, barW * pct, barH)
		ctx.restore()
	}

	/** Apply `damage` (default 1). Returns true if it killed the enemy. */
	hit(damage = 1): boolean {
		this.health -= damage
		this.hitFlash = 6
		if (this.health <= 0) {
			// Symmetric burst (smoke_14) truly centred on the enemy's body — `centered`
			// fixes the draw anchor so it sits on the middle, not the low footfall
			// anchor (smoke_12) used for pickups/footfalls elsewhere.
			effectsStore.add(
				new Effect(
					{ x: this.pos.x + this.width / 2, y: this.pos.y + this.height / 2 },
					'smoke_14',
					{ centered: true }
				)
			)
			enemiesStore.delete(this)
			return true
		}
		return false
	}

	// Switch the active animation (gadget kinds only — characters stay on 'run'). Resets
	// the frame cursor on a real change; an optional `speed` overrides the sheet's cadence
	// (used to accelerate the turret's idle into a firing tell). No-ops if the sheet lacks
	// the animation, so a kind never crashes on a missing entry.
	#setAnim(name: string, speed?: number) {
		if (!hasSprite(this.character, name)) return
		if (name !== this.currentAnim) {
			const s = getSprite(this.character, name)
			this.image = s.img
			this.maxFrame = s.frames ?? 0
			this.frameW = s.width
			this.frameH = s.height
			this.ticksPerFrame = speed ?? s.speed
			this.frame = 1
			this.ticksCount = 0
			this.currentAnim = name
		} else if (speed !== undefined) {
			this.ticksPerFrame = speed
		}
	}

	#animate(deltaTime: number) {
		this.ticksCount += deltaTime
		if (this.ticksCount > this.ticksPerFrame) {
			this.ticksCount = 0
			this.frame = this.frame < this.maxFrame ? this.frame + 1 : 1
		}
	}

	#applyGravity(deltaTime: number) {
		this.pos.y += this.velocity.y * deltaTime
		this.velocity.y += GRAVITY
	}

	#checkForVerticalCollisions(platforms: Platform[]) {
		for (const platform of platforms) {
			if (
				collision(
					{ left: this.pos.x, top: this.pos.y, width: this.width, height: this.height },
					platform
				)
			) {
				// Only resolve landing on top; ground units never move up, so ignore
				// head bumps and let them pass platforms horizontally.
				if (this.velocity.y > 0) {
					this.velocity.y = 0
					this.pos.y = platform.top - this.height
					break
				}
			}
		}
	}

	#keepWithinCanvas(canvas: Bounds) {
		if (this.pos.y + this.height > canvas.height) {
			this.velocity.y = 0
			this.pos.y = canvas.height - this.height
		}
	}
}
