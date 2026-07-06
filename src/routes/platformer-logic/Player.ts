import { effectsStore, projectilesStore } from '$lib/stores'
import { Effect } from './Effect'
import { Projectile } from './Projectile'
import type { Platform } from './Platform'
import type { KeyState } from './controller'
import { CHARACTERS, type CharacterType } from './characters'
import { collision, getSprite, hasSprite } from './utils'

const GRAVITY = 0.33

export class Player {
	character = 'punk' // sprite-sheet key (set from the active character's `sprite`)
	cfg: CharacterType = CHARACTERS.punk // active character config (base stats + attack style)
	pos: { x: number; y: number }
	prevPos: { x: number; y: number } // position before the last physics step (for render interpolation)
	velocity: { x: number; y: number }
	height = 80
	width = 48
	speed = 5
	image!: HTMLImageElement
	maxFrame!: number // set by applyCharacter()/#playerSprite() from the active sheet
	ticksPerFrame!: number // set by applyCharacter()/#playerSprite() from the active sheet
	frame = 1
	ticksCount = 0
	direction = 'right'
	angle = 0
	projectileCount = 1 // bolts per shot (Multi-Shot upgrade)
	damage = 1 // damage per bolt (Power Shot upgrade)
	spread = 0.07 // base weapon inaccuracy: ± radians of random deviation per bolt (Focus lowers it)
	projectileSpeed = 8 // bolt travel speed (Velocity upgrade raises it); reset from cfg each run
	jumpStrength = 8 // upward jump velocity (Spring upgrade raises it); reset each run
	isFalling = false
	jumpAvailable = 2
	status = 'idle'

	constructor(pos: { x: number; y: number }) {
		this.pos = pos
		this.prevPos = { x: pos.x, y: pos.y }
		this.velocity = {
			x: 0,
			y: 1
		}
		this.applyCharacter(this.cfg) // load the default (punk) sprite + config
	}

	// Reconfigure this single Player instance to a chosen class: swap the sprite sheet
	// and record the config. Base stats aren't set here — GameWorld.resetUpgrades reads
	// `cfg` to restore them at run start, and the loop dispatches the attack on
	// `cfg.attackStyle`. Called from the rising edge of every run with the selected
	// character, so switching class between runs needs no new Player instance.
	applyCharacter(cfg: CharacterType) {
		this.cfg = cfg
		this.character = cfg.sprite
		const sprite = getSprite(this.character, 'idle')
		this.image = sprite.img
		this.ticksPerFrame = sprite.speed || 5
		this.maxFrame = sprite.frames ?? 0
		this.frame = 1
	}

	update(canvas: HTMLCanvasElement, keys: KeyState, platforms: Platform[], deltaTime: number) {
		// Snapshot the pre-step position so draw() can interpolate between steps.
		this.prevPos.x = this.pos.x
		this.prevPos.y = this.pos.y

		this.pos.x += this.velocity.x * deltaTime // move left/right

		// Order of these methods is VERY important
		this.#checkForHorizontalCollisions(platforms) // first
		this.#applyGravity(deltaTime) // second
		this.#checkForVerticalCollisions(platforms) // third
		this.#keepWithinCanvas(canvas) // last

		if (this.velocity.x != 0) this.velocity.x = 0 // reset velocity

		this.#handleKeys(keys)
	}

	// Auto-aim: point the weapon at a target's centre, or straight ahead in the
	// facing direction when there's none. Replaces mouse aiming.
	aimAt(target: { pos: { x: number; y: number }; width: number; height: number } | null) {
		if (!target) {
			this.angle = this.direction === 'left' ? Math.PI : 0
			return
		}
		this.angle = Math.atan2(
			target.pos.y + target.height / 2 - (this.pos.y + this.height / 2),
			target.pos.x + target.width / 2 - (this.pos.x + this.width / 2)
		)
	}

	draw(ctx: CanvasRenderingContext2D, deltaTime: number, alpha = 1) {
		// Render at the interpolated position between the last two physics steps
		// so motion stays smooth at the display's refresh rate.
		const x = this.prevPos.x + (this.pos.x - this.prevPos.x) * alpha
		const y = this.prevPos.y + (this.pos.y - this.prevPos.y) * alpha
		// Only a ranged class holds the gun (the attackStyle seam — kept for when melee
		// classes return; the Punk is always ranged today).
		if (this.cfg.attackStyle === 'ranged') {
			this.#drawHand(ctx, x, y)
			this.#drawWeapon(ctx, x, y)
		}
		this.#drawCharacter(ctx, deltaTime, x, y)
	}

	#drawCharacter(ctx: CanvasRenderingContext2D, deltaTime: number, x: number, y: number) {
		this.#animate(deltaTime)
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
	}

	#drawWeapon(ctx: CanvasRenderingContext2D, x: number, y: number) {
		ctx.save()
		ctx.translate(x + this.width / 2, y + this.height / 2)
		// if the player is facing left, flip the weapon
		Math.cos(this.angle) < 0 ? ctx.scale(1, -1) : ctx.scale(1, 1)
		Math.cos(this.angle) < 0 ? ctx.rotate(-this.angle) : ctx.rotate(this.angle)

		ctx.drawImage(
			getSprite('weapon', 'gun_1').img,
			0,
			0,
			this.width,
			this.height,
			14,
			-4,
			this.width * 2,
			this.height * 2
		)
		ctx.restore()
	}

	#drawHand(ctx: CanvasRenderingContext2D, x: number, y: number) {
		const handKey = `${this.character}_3`
		if (!hasSprite('hand', handKey)) return // class without a hand sprite draws none
		ctx.save()
		ctx.translate(x + this.width / 2, y + this.height / 2)
		// if the player is facing left, flip the hand
		Math.cos(this.angle) < 0 ? ctx.scale(1, -1) : ctx.scale(1, 1)
		Math.cos(this.angle) < 0 ? ctx.rotate(-this.angle) : ctx.rotate(this.angle)

		ctx.drawImage(
			getSprite('hand', handKey).img,
			0,
			0,
			this.width,
			this.height,
			-28,
			-28,
			this.width * 2,
			this.height * 2
		)
		ctx.restore()
	}

	shoot() {
		const weaponLength = 60 // distance from the character's centre to the muzzle
		const cx = this.pos.x + this.width / 2
		const cy = this.pos.y + this.height / 2
		const n = this.projectileCount
		// Bolts fan out in a cone around the aim, and each one also deviates
		// randomly — so accuracy is a real cost. Stacking Multi-Shot widens the
		// random jitter, turning the weapon into a short-range spray instead of a
		// wall of pinpoint lasers (which is what made the old version trivial).
		const coneStep = 0.15 // radians between adjacent bolts in the fan
		const jitter = this.spread + 0.02 * (n - 1) // ± random deviation, grows with bolt count
		const base = this.angle - (coneStep * (n - 1)) / 2
		for (let i = 0; i < n; i++) {
			const a = base + coneStep * i + (Math.random() - 0.5) * 2 * jitter
			projectilesStore.add(
				new Projectile(
					{ x: cx + Math.cos(a) * weaponLength, y: cy + Math.sin(a) * weaponLength },
					a,
					'blue',
					{ damage: this.damage, speed: this.projectileSpeed }
				)
			)
		}
	}

	#animate(deltaTime: number) {
		this.ticksCount += deltaTime
		if (this.ticksCount > this.ticksPerFrame) {
			this.ticksCount = 0
			if (this.frame < this.maxFrame) {
				this.frame++
			} else {
				this.frame = 1
			}
		}
	}

	#playerSprite(animation: string) {
		// A class missing this animation keeps its current sprite instead of crashing —
		// the same guard the enemies use for their optional animations.
		if (!hasSprite(this.character, animation)) return
		const sprite = getSprite(this.character, animation)
		this.image = sprite.img
		this.ticksPerFrame = sprite.speed || 5
		this.maxFrame = sprite.frames ?? 0
		if (this.frame > this.maxFrame) this.frame = 1
	}

	#handleKeys(keys: KeyState) {
		if ((keys['right'] || keys['left']) && !this.velocity.y && !keys['punch']) {
			this.#playerSprite('run')
		}

		if (keys['left']) {
			this.direction = 'left'
			this.velocity.x = -this.speed
		}
		if (keys['right']) {
			this.direction = 'right'
			this.velocity.x = this.speed
		}

		if (!keys['up'] && !keys['down'] && !keys['left'] && !keys['right'] && !keys['punch']) {
			this.#playerSprite('idle')
		}
	}

	jump() {
		if (this.isFalling && !this.jumpAvailable) return
		if (!this.isFalling) {
			this.jumpAvailable = 2
		} else {
			this.jumpAvailable = 1
			effectsStore.add(new Effect({ x: this.pos.x, y: this.pos.y + 48 }, 'smoke_12'))
		}

		if (this.velocity.y > 1) {
			effectsStore.add(new Effect({ x: this.pos.x, y: this.pos.y + 48 }, 'smoke_12'))
		}
		this.#playerSprite('jump')
		this.velocity.y = -this.jumpStrength
		this.isFalling = true
		this.jumpAvailable--
	}

	punch(keys: KeyState) {
		if (keys['right'] || keys['left']) {
			this.#playerSprite('run_attack')
		} else {
			Math.random() > 0.5 ? this.#playerSprite('punch') : this.#playerSprite('punch_2')
		}
	}

	#applyGravity(deltaTime: number) {
		this.pos.y += this.velocity.y * deltaTime
		this.velocity.y += GRAVITY
	}

	#checkForHorizontalCollisions(platforms: Platform[]) {
		for (const platform of platforms) {
			if (
				collision(
					{ width: this.width, height: this.height, left: this.pos.x, top: this.pos.y },
					platform
				)
			) {
				const playerBottom = this.pos.y + this.height
				const platformTop = platform.top
				const overlapThreshold = 20 // Allowable overlap to consider a bottom collision

				// Check if the collision happens near the bottom of the player's hitbox
				if (playerBottom > platformTop && playerBottom - platformTop <= overlapThreshold) {
					// Bump the player up
					this.velocity.y = 0
					this.pos.y = platformTop - this.height
					this.isFalling = false // Optional: Set falling state if applicable
					break
				}

				// Handle horizontal collision
				if (this.velocity.x > 0) {
					// Hit right
					this.velocity.x = 0
					this.pos.x = platform.left - this.width
					break
				}

				if (this.velocity.x < 0) {
					// Hit left
					this.velocity.x = 0
					this.pos.x = platform.left + platform.width
					break
				}
			}
		}
	}

	#checkForVerticalCollisions(platforms: Platform[]) {
		for (const platform of platforms) {
			if (
				collision(
					{ left: this.pos.x, top: this.pos.y, width: this.width, height: this.height },
					platform
				)
			) {
				if (this.velocity.y > 0) {
					// hit floor
					this.velocity.y = 0 // stop falling
					this.pos.y = platform.top - this.height
					this.isFalling = false
					// this.jumpAvailable = 2
					break
				}

				if (this.velocity.y < 0) {
					// hit head
					this.velocity.y *= -0.6 // bounce
					this.pos.y = platform.top + platform.height
					break
				}
			}
		}
	}

	#keepWithinCanvas(canvas: HTMLCanvasElement) {
		// stop from going below canvas
		if (this.pos.y + this.height > canvas.height) {
			this.velocity.y = 0
			this.pos.y = canvas.height - this.height
			this.isFalling = false
			// this.jumpAvailable = 2
		}

		// stop from going off the sides
		if (this.pos.x < 0) {
			this.pos.x = 0
		} else if (this.pos.x + this.width > canvas.width) {
			this.pos.x = canvas.width - this.width
		}

		// stop from going above canvas
		if (this.pos.y < 0) {
			this.velocity.y *= -0.6
			this.pos.y = 0
		}
	}
}
