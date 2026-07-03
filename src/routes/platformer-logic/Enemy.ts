import { collision, getSprite } from './utils'
import { effectsStore, enemiesStore, projectilesStore, bombsStore } from '$lib/stores'
import { Effect } from './Effect'
import { Projectile } from './Projectile'
import { Bomb } from './Bomb'
import type { Platform } from './Platform'
import type { Player } from './Player'

const GRAVITY = 0.33
const DEADZONE = 8 // px around the target where the enemy stops nudging (kills the left/right vibration)
const SEPARATION_GAP = 34 // enemies closer than this get pushed apart so they don't stack into one blob
const SEPARATION_PUSH = 0.6 // how hard overlapping neighbours shove each other per step
const SHOOT_MIN = 180 // a shooter backs off if the player gets closer than this
const SHOOT_MAX = 340 // ...and closes in if the player is farther than this
const FIRE_INTERVAL = 110 // shooter: physics steps between aimed bolts (~1.8s)
const TURRET_INTERVAL = 150 // turret: steps between radial bursts (~2.5s)
const TURRET_BOLTS = 8 // bolts per turret radial burst
const BOMB_INTERVAL = 150 // bomber: steps between bomb drops (~2.5s)
const CHARGE_COOLDOWN = 150 // charger: steps between dashes
const CHARGE_WIND = 16 // charger: telegraph wind-up before a dash
const CHARGE_DASH = 16 // charger: dash duration
const CHARGE_DASH_MULT = 3.4 // charger: speed multiplier during a dash
const FRAME_W = 48 // sprite-sheet frame size — every character sheet shares this
const FRAME_H = 80

export type EnemyKind = 'biker' | 'flyer' | 'shooter' | 'bomber' | 'turret' | 'charger' | 'brute'

// Per-kind base stats + look. `health`/`speed`/`damage` are baselines the spawn
// director scales up by wave; `xp` (gem value) and the visuals are fixed. `glow`
// paints an accent-coloured aura around the sprite so the kinds — most of which
// share the cyborg body — read apart at a glance.
interface KindConfig {
	health: number
	speed: number
	damage: number
	xp: number
	width: number
	height: number
	spriteScale: number
	accent: string
	glow: boolean
}
const KIND: Record<EnemyKind, KindConfig> = {
	// Numerous close-range fodder — the plain baseline (no aura).
	biker: { health: 3, speed: 2.4, damage: 1, xp: 1, width: 48, height: 80, spriteScale: 2, accent: '#f87171', glow: false },
	// Homing air unit — no perch is safe.
	flyer: { health: 2, speed: 2.0, damage: 1, xp: 1, width: 48, height: 80, spriteScale: 2, accent: '#c084fc', glow: true },
	// Standoff gunner — peppers perches out of melee reach.
	shooter: { health: 2, speed: 1.6, damage: 1, xp: 1, width: 48, height: 80, spriteScale: 2, accent: '#38bdf8', glow: true },
	// Nimble rusher — closes then dashes; punishes standing still.
	charger: { health: 2, speed: 2.2, damage: 1, xp: 1, width: 44, height: 76, spriteScale: 1.9, accent: '#fb7185', glow: true },
	// Anchored turret — never chases, sprays bolts in all directions.
	turret: { health: 6, speed: 0, damage: 1, xp: 2, width: 52, height: 80, spriteScale: 2, accent: '#a78bfa', glow: true },
	// Hovering bomber — patrols overhead, rains area bombs, tanky.
	bomber: { health: 7, speed: 1.3, damage: 2, xp: 2, width: 52, height: 82, spriteScale: 2.1, accent: '#fb923c', glow: true },
	// Elite brute — big, slow, heavy contact hit, drops a fat gem.
	brute: { health: 12, speed: 1.3, damage: 2, xp: 3, width: 64, height: 104, spriteScale: 2.3, accent: '#ef4444', glow: true }
}

// Seven enemy flavours sharing one body. Movement differs per kind; drawing,
// hits and animation are shared. (Non-biker kinds share the cyborg sprite for
// now — a temporary placeholder distinguished by size + accent aura.)
export class Enemy {
	kind: EnemyKind
	character: string
	pos: { x: number; y: number }
	prevPos: { x: number; y: number } // position before the last physics step (for render interpolation)
	velocity: { x: number; y: number }
	height: number
	width: number
	spriteScale: number
	accent: string
	glow: boolean
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

	constructor(
		pos: { x: number; y: number },
		opts: { speed?: number; kind?: EnemyKind; health?: number; damage?: number } = {}
	) {
		this.kind = opts.kind ?? 'biker'
		const cfg = KIND[this.kind]
		this.character = this.kind === 'biker' ? 'biker' : 'cyborg'
		const sprite = getSprite(this.character, 'run')
		this.image = sprite.img
		this.ticksPerFrame = sprite.speed || 5
		this.maxFrame = sprite.frames ?? 0
		this.width = cfg.width
		this.height = cfg.height
		this.spriteScale = cfg.spriteScale
		this.accent = cfg.accent
		this.glow = cfg.glow
		this.pos = pos
		this.prevPos = { x: pos.x, y: pos.y }
		this.speed = opts.speed ?? cfg.speed
		// Fliers/bombers ignore gravity; bombers patrol horizontally from the start.
		this.velocity = {
			x: this.kind === 'bomber' ? this.speed : 0,
			y: this.kind === 'flyer' || this.kind === 'bomber' ? 0 : 1
		}
		this.health = opts.health ?? cfg.health
		this.maxHealth = this.health
		this.damage = opts.damage ?? cfg.damage
		this.xpValue = cfg.xp
		// Stagger gunners/bombers so a wave doesn't fire in unison; randomise the
		// charger's first dash timer.
		if (this.kind === 'shooter') this.fireCooldown = Math.floor(Math.random() * FIRE_INTERVAL)
		else if (this.kind === 'turret') this.fireCooldown = Math.floor(Math.random() * TURRET_INTERVAL)
		else if (this.kind === 'bomber') this.fireCooldown = Math.floor(Math.random() * BOMB_INTERVAL)
		else if (this.kind === 'charger') this.dashCd = Math.floor(Math.random() * CHARGE_COOLDOWN)
	}

	update(
		canvas: HTMLCanvasElement,
		target: Player,
		platforms: Platform[],
		deltaTime: number,
		others: Enemy[] = []
	) {
		this.prevPos.x = this.pos.x
		this.prevPos.y = this.pos.y

		if (this.kind === 'flyer') this.#updateFlyer(canvas, target, deltaTime)
		else if (this.kind === 'shooter') this.#updateShooter(canvas, target, platforms, deltaTime)
		else if (this.kind === 'bomber') this.#updateBomber(canvas, deltaTime)
		else if (this.kind === 'turret') this.#updateTurret(canvas, target, platforms, deltaTime)
		else if (this.kind === 'charger') this.#updateCharger(canvas, target, platforms, deltaTime)
		else this.#updateGround(canvas, target, platforms, deltaTime) // biker + brute

		// Anchored/flying kinds fly their own pattern and shouldn't be shoved around.
		if (this.kind !== 'turret' && this.kind !== 'bomber') this.#separate(others, deltaTime)
	}

	// Ground chaser: nudge horizontally toward the player (with a deadzone so it
	// stops jittering once it's underneath), then fall and land on platforms.
	#updateGround(canvas: HTMLCanvasElement, target: Player, platforms: Platform[], deltaTime: number) {
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
	#updateFlyer(canvas: HTMLCanvasElement, target: Player, deltaTime: number) {
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
	#updateShooter(canvas: HTMLCanvasElement, target: Player, platforms: Platform[], deltaTime: number) {
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
			this.fireCooldown = FIRE_INTERVAL
		}
	}

	// Hovering bomber: patrols overhead (bouncing off the screen edges, steering
	// back in if it drifts off) and rains gravity bombs — it does NOT aim at the
	// player, so its job is area denial that forces the camper to keep moving.
	#updateBomber(canvas: HTMLCanvasElement, deltaTime: number) {
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
			this.fireCooldown = BOMB_INTERVAL
		}
	}

	// Anchored turret: no chase. Settle on the ground, face the player, and fire a
	// full radial burst on a cooldown — a dodge-the-ring hazard.
	#updateTurret(canvas: HTMLCanvasElement, target: Player, platforms: Platform[], deltaTime: number) {
		this.direction = target.pos.x < this.pos.x ? 'left' : 'right'
		this.#applyGravity(deltaTime)
		this.#checkForVerticalCollisions(platforms)
		this.#keepWithinCanvas(canvas)

		if (this.fireCooldown > 0) {
			this.fireCooldown--
		} else if (this.pos.x > 0 && this.pos.x < canvas.width - this.width) {
			this.#fireRadial()
			this.fireCooldown = TURRET_INTERVAL
		}
	}

	// Charger: approach like a biker, then periodically wind up (telegraphed) and
	// dash horizontally at high speed toward the player before recovering.
	#updateCharger(canvas: HTMLCanvasElement, target: Player, platforms: Platform[], deltaTime: number) {
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
				speed: 6,
				damage: this.damage
			})
		)
		effectsStore.add(new Effect({ x: this.pos.x, y: this.pos.y + 28 }, 'smoke_12'))
	}

	// Fire a full ring of hostile bolts, rotated by a random offset so the pattern
	// varies from burst to burst. Slower than aimed shots so the ring is dodgeable.
	#fireRadial() {
		const originX = this.pos.x + this.width / 2
		const originY = this.pos.y + this.height / 2
		const offset = Math.random() * Math.PI * 2
		for (let i = 0; i < TURRET_BOLTS; i++) {
			const angle = offset + (i / TURRET_BOLTS) * Math.PI * 2
			projectilesStore.add(
				new Projectile({ x: originX, y: originY }, angle, 'blue', {
					hostile: true,
					speed: 4.5,
					damage: this.damage
				})
			)
		}
		effectsStore.add(new Effect({ x: this.pos.x, y: this.pos.y + 28 }, 'smoke_12'))
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
				if (this.kind === 'flyer') {
					pushY -= Math.sign(oy || 1) * (1 - Math.abs(oy) / (this.height * 0.8))
				}
			}
		}
		this.pos.x += pushX * SEPARATION_PUSH * deltaTime
		if (this.kind === 'flyer') this.pos.y += pushY * SEPARATION_PUSH * deltaTime
	}

	draw(ctx: CanvasRenderingContext2D, deltaTime: number, alpha = 1) {
		const x = this.prevPos.x + (this.pos.x - this.prevPos.x) * alpha
		const y = this.prevPos.y + (this.pos.y - this.prevPos.y) * alpha
		this.#animate(deltaTime)
		if (this.hitFlash > 0) this.hitFlash--

		const dw = this.width * this.spriteScale
		const dh = this.height * this.spriteScale
		const winding = this.kind === 'charger' && this.dashState === 'wind'

		ctx.save()
		// Flash bright for a few frames after a hit; a charger flashes brighter
		// while winding up so its dash is telegraphed.
		if (this.hitFlash > 0) ctx.filter = 'brightness(2.6)'
		else if (winding) ctx.filter = 'brightness(1.9)'
		// Accent aura so same-sprite kinds read apart (bomber orange, turret violet…).
		if (this.glow) {
			ctx.shadowColor = this.accent
			ctx.shadowBlur = winding ? 22 : 12
		}
		if (this.direction === 'right') {
			ctx.drawImage(this.image, (this.frame - 1) * FRAME_W, 8, FRAME_W, FRAME_H, x, y, dw, dh)
		} else {
			ctx.save()
			ctx.translate(x + this.width, y)
			ctx.scale(-1, 1)
			ctx.drawImage(this.image, (this.frame - 1) * FRAME_W, 8, FRAME_W, FRAME_H, 0, 0, dw, dh)
			ctx.restore()
		}
		ctx.restore()

		// A slim chip bar appears once an enemy has taken damage.
		if (this.maxHealth > 1 && this.health < this.maxHealth) this.#drawHealthBar(ctx, x, y)
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
			effectsStore.add(new Effect({ x: this.pos.x, y: this.pos.y + 28 }, 'smoke_12'))
			enemiesStore.delete(this)
			return true
		}
		return false
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

	#keepWithinCanvas(canvas: HTMLCanvasElement) {
		if (this.pos.y + this.height > canvas.height) {
			this.velocity.y = 0
			this.pos.y = canvas.height - this.height
		}
	}
}
