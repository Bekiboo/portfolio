import { collision, getSprite } from './utils'
import { effectsStore, enemiesStore, projectilesStore } from '$lib/stores'
import { Effect } from './Effect'
import { Projectile } from './Projectile'
import type { Platform } from './Platform'
import type { Player } from './Player'

const GRAVITY = 0.33
const DEADZONE = 8 // px around the target where the enemy stops nudging (kills the left/right vibration)
const SEPARATION_GAP = 34 // enemies closer than this get pushed apart so they don't stack into one blob
const SEPARATION_PUSH = 0.6 // how hard overlapping neighbours shove each other per step
const SHOOT_MIN = 180 // a shooter backs off if the player gets closer than this
const SHOOT_MAX = 340 // ...and closes in if the player is farther than this
const FIRE_INTERVAL = 110 // physics steps between a shooter's shots (~1.8s)

export type EnemyKind = 'biker' | 'flyer' | 'shooter'

// Three enemy flavours sharing one body:
//  • biker — ground chaser: walks along the floor/platforms toward the player.
//    Can't climb, so it can't reach a perched player (that's the flyer's job) —
//    which keeps it free of janky platform-hopping.
//  • flyer — homing air unit: ignores gravity and drifts straight at the player,
//    so no perch is ever safe.
//  • shooter — ground gunner: holds its distance and fires hostile bolts at the
//    player, so even a perch out of melee reach gets peppered.
// Drawing, hits and animation are shared; only movement differs per kind.
// (Flyer and shooter share the cyborg sprite for now — a temporary placeholder.)
export class Enemy {
	kind: EnemyKind
	character: string
	pos: { x: number; y: number }
	prevPos: { x: number; y: number } // position before the last physics step (for render interpolation)
	velocity: { x: number; y: number }
	height = 80
	width = 48
	speed: number
	image!: HTMLImageElement
	maxFrame: number
	ticksPerFrame: number
	frame = 1
	ticksCount = 0
	direction = 'left'
	health = 1
	maxHealth = 1
	hitFlash = 0 // frames left on the white "took a hit" flash
	bob = 0 // flyer hover phase
	fireCooldown = 0 // shooter: physics steps until the next shot

	constructor(
		pos: { x: number; y: number },
		opts: { speed?: number; kind?: EnemyKind; health?: number } = {}
	) {
		this.kind = opts.kind ?? 'biker'
		this.character = this.kind === 'biker' ? 'biker' : 'cyborg'
		const sprite = getSprite(this.character, 'run')
		this.image = sprite.img
		this.ticksPerFrame = sprite.speed || 5
		this.maxFrame = sprite.frames ?? 0
		this.pos = pos
		this.prevPos = { x: pos.x, y: pos.y }
		this.velocity = { x: 0, y: this.kind === 'flyer' ? 0 : 1 }
		this.speed = opts.speed ?? (this.kind === 'flyer' ? 2 : this.kind === 'shooter' ? 1.6 : 2.4)
		// Bikers are the numerous close-range fodder, so they soak more hits; the
		// scarcer flyers/shooters die a touch faster to reward focusing them.
		this.health = opts.health ?? (this.kind === 'biker' ? 3 : 2)
		this.maxHealth = this.health
		// Stagger shooters' first shot so a wave doesn't fire in unison.
		if (this.kind === 'shooter') this.fireCooldown = Math.floor(Math.random() * FIRE_INTERVAL)
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
		else this.#updateGround(canvas, target, platforms, deltaTime)

		this.#separate(others, deltaTime)
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

	// Fire a hostile bolt at the player's centre, with a muzzle puff.
	#fire(target: Player) {
		const originX = this.pos.x + this.width / 2
		const originY = this.pos.y + this.height / 2
		const angle = Math.atan2(
			target.pos.y + target.height / 2 - originY,
			target.pos.x + target.width / 2 - originX
		)
		projectilesStore.add(
			new Projectile({ x: originX, y: originY }, angle, 'blue', { hostile: true, speed: 6 })
		)
		effectsStore.add(new Effect({ x: this.pos.x, y: this.pos.y + 28 }, 'smoke_12'))
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

		ctx.save()
		// Flash bright for a few frames after a hit so multi-HP enemies visibly react.
		if (this.hitFlash > 0) ctx.filter = 'brightness(2.6)'
		if (this.direction === 'right') {
			ctx.drawImage(
				this.image,
				(this.frame - 1) * this.width,
				8,
				this.width,
				this.height,
				x,
				y,
				this.width * 2,
				this.height * 2
			)
		} else {
			ctx.save()
			ctx.translate(x + this.width, y)
			ctx.scale(-1, 1)
			ctx.drawImage(
				this.image,
				(this.frame - 1) * this.width,
				8,
				this.width,
				this.height,
				0,
				0,
				this.width * 2,
				this.height * 2
			)
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

	/** Apply one hit. Returns true if it killed the enemy. */
	hit(): boolean {
		this.health--
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
