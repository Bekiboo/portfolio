import { effectsStore } from '$lib/stores'
import { Effect } from './Effect'
import type { Platform } from './Platform'
import type { KeyState } from './controller'
import { CHARACTERS, type CharacterType } from './characters'
import { Weapon } from './Weapon'
import type { WeaponKind } from './weaponTypes'
import { Power } from './Power'
import type { PowerKind } from './powerTypes'
import { collision, getSprite, hasSprite, GRAVITY, lerpPos, type Bounds } from './utils'

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
	// Equipped weapons (up to two). Each owns its own aim, cadence and upgradeable stats and
	// fires at the nearest enemy to its own muzzle — GameWorld drives them each step. Built
	// from the character's `weapons` list in applyCharacter().
	weapons: Weapon[] = []
	// Special power (touche S), at most one. Null until granted at a level milestone; GameWorld
	// ticks its cooldown and dispatches its effect (Power / powerTypes). Reset by applyCharacter.
	power: Power | null = null
	// Dash motion state (the 'dash' power): while dashSteps > 0 the horizontal velocity is
	// forced to dashVX and movement keys are ignored, so the burst can't be steered or cancelled.
	dashSteps = 0
	dashVX = 0
	// True while a 'slam' plunge is in progress — GameWorld watches for the landing to fire the
	// ground shockwave (resolveSlamLanding).
	slamming = false
	jumpStrength = 8 // upward jump velocity (Spring upgrade raises it); reset each run
	isFalling = false
	jumpAvailable = 2

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
		this.equip(cfg.weapons)
		this.power = null // a chassis has no innate power in v1; it's earned at a level milestone
		this.dashSteps = 0
		this.slamming = false
	}

	// (Re)build the equipped weapons from a kind list (fresh instances at base stats). One
	// weapon rides centred; a pair splits left/right. Called on run start.
	equip(kinds: readonly WeaponKind[]) {
		this.weapons = kinds.map(
			(k, i) => new Weapon(k, kinds.length < 2 ? 'center' : i === 0 ? 'left' : 'right')
		)
	}

	// Add a second weapon mid-run (the level milestone reward) WITHOUT touching the first —
	// its earned upgrades are preserved. The lone centred weapon shifts left; the newcomer
	// takes the right. No-op once two are held.
	addWeapon(kind: WeaponKind) {
		if (this.weapons.length >= 2) return
		if (this.weapons.length === 1) this.weapons[0].side = 'left'
		this.weapons.push(new Weapon(kind, this.weapons.length === 0 ? 'center' : 'right'))
	}

	// Grant the special power (the level-milestone reward). Replaces any current one.
	equipPower(kind: PowerKind) {
		this.power = new Power(kind)
	}

	// Begin a dash: `vx` px/step for `steps` steps, ignoring movement keys meanwhile so the
	// burst flies straight (GameWorld grants the i-frames). Faces the dash direction.
	startDash(vx: number, steps: number) {
		this.dashVX = vx
		this.dashSteps = steps
		this.direction = vx < 0 ? 'left' : 'right'
		effectsStore.add(new Effect({ x: this.pos.x, y: this.pos.y + 48 }, 'smoke_12'))
	}

	// Begin a slam: plunge straight down at `speed`; GameWorld fires the shockwave on landing.
	startSlam(speed: number) {
		this.velocity.y = speed
		this.slamming = true
		this.isFalling = true
	}

	update(canvas: Bounds, keys: KeyState, platforms: Platform[], deltaTime: number) {
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

	draw(ctx: CanvasRenderingContext2D, deltaTime: number, alpha = 1) {
		// Render at the interpolated position between the last two physics steps
		// so motion stays smooth at the display's refresh rate.
		const { x, y } = lerpPos(this, alpha)
		// Each weapon draws its gun + hand behind the body (so the character sits in front).
		// Only a ranged class holds guns (the attackStyle seam — kept for when melee classes
		// return; the Punk is always ranged today).
		if (this.cfg.attackStyle === 'ranged') {
			for (const weapon of this.weapons) weapon.draw(ctx, x, y, this)
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
		// Mid-dash: force the burst velocity and ignore movement keys so it can't be steered or
		// cancelled. Ticks the dash down here (once per step, alongside the position update).
		if (this.dashSteps > 0) {
			this.dashSteps--
			this.velocity.x = this.dashVX
			return
		}

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

	#keepWithinCanvas(canvas: Bounds) {
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
