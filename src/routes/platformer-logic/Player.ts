import { effectsStore, projectilesStore } from '$lib/stores'
import { Effect } from './Effect'
import { Projectile } from './Projectile'
import type { Platform } from './Platform'
import { collision, getSprite } from './utils'

const GRAVITY = 0.5

export class Player {
	character = 'punk'
	pos: { x: number; y: number }
	velocity: { x: number; y: number }
	height = 80
	width = 48
	speed = 6
	image!: HTMLImageElement
	maxFrame: number
	ticksPerFrame: number
	frame = 1
	ticksCount = 0
	direction = 'right'
	angle = 0
	isFalling = false
	jumpAvailable = 2

	constructor(pos: { x: number; y: number }) {
		const sprite = getSprite(this.character, 'idle')
		this.image = sprite.img
		this.ticksPerFrame = sprite.speed || 5
		this.maxFrame = sprite.frames ?? 0
		this.pos = pos
		this.velocity = {
			x: 0,
			y: 1
		}
	}

	update(
		canvas: HTMLCanvasElement,
		keys: { [key: string]: boolean },
		mouse: { x: number; y: number },
		platforms: Platform[]
	) {
		this.pos.x += this.velocity.x // move left/right

		// Order of these methods is important
		this.#checkForHorizontalCollisions(platforms)
		this.#applyGravity()
		this.#keepWithinCanvas(canvas)
		this.#checkForVerticalCollisions(platforms)

		if (this.velocity.x != 0) this.velocity.x = 0 // reset velocity

		// if (this.velocity.x != 0) {
		// 	this.velocity.x > 0 ? this.velocity.x-- : this.velocity.x++ // add slide
		// }

		this.#handleKeys(keys)

		// function to get angle between two points
		const baseAngle = Math.atan2(
			mouse.y - this.pos.y - this.height / 2,
			mouse.x - this.pos.x - this.width / 2
		)

		if (
			(Math.cos(baseAngle) > 0 && this.direction === 'right') ||
			(Math.cos(baseAngle) < 0 && this.direction === 'left')
		) {
			this.angle = baseAngle
		} else if (
			(Math.cos(baseAngle) > 0 && this.direction === 'left') ||
			(Math.cos(baseAngle) < 0 && this.direction === 'right')
		) {
			this.angle = Math.PI - baseAngle
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		this.#drawHand(ctx)
		this.#drawWeapon(ctx)
		this.#drawCharacter(ctx)
	}

	getAngle() {
		return this.angle
	}

	#drawCharacter(ctx: CanvasRenderingContext2D) {
		this.#animate()
		if (this.direction === 'right') {
			ctx.drawImage(
				this.image,
				(this.frame - 1) * this.width,
				8,
				this.width,
				this.height,
				this.pos.x,
				this.pos.y,
				this.width * 2,
				this.height * 2
			)
		} else {
			ctx.save()
			ctx.translate(this.pos.x + this.width, this.pos.y)
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

	#drawWeapon(ctx: CanvasRenderingContext2D) {
		ctx.save()
		ctx.translate(this.pos.x + this.width / 2, this.pos.y + this.height / 2)
		if (Math.cos(this.angle) < 0) {
			ctx.scale(1, -1)

			ctx.rotate(-this.angle)
		} else {
			ctx.rotate(this.angle)
		}
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

	#drawHand(ctx: CanvasRenderingContext2D) {
		ctx.save()
		ctx.translate(this.pos.x + this.width / 2, this.pos.y + this.height / 2)
		if (Math.cos(this.angle) < 0) {
			ctx.scale(1, -1)
			ctx.rotate(-this.angle)
		} else {
			ctx.rotate(this.angle)
		}
		ctx.drawImage(
			getSprite('hand', `${this.character}_3`).img,
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
		projectilesStore.add(
			new Projectile({ x: this.pos.x + this.width / 2, y: this.pos.y + 40 }, this.angle, 'blue')
		)
	}

	#animate() {
		this.ticksCount++
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
		const sprite = getSprite(this.character, animation)
		this.image = sprite.img
		this.ticksPerFrame = sprite.speed || 5
		this.maxFrame = sprite.frames ?? 0
		if (this.frame > this.maxFrame) this.frame = 1
	}

	#handleKeys(keys: { [key: string]: boolean }) {
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
		this.velocity.y = -15
		this.isFalling = true
		this.jumpAvailable--
	}

	punch(keys: { [key: string]: boolean }) {
		if (keys['right'] || keys['left']) {
			this.#playerSprite('run_attack')
		} else {
			Math.random() > 0.5 ? this.#playerSprite('punch') : this.#playerSprite('punch_2')
		}
	}

	#applyGravity() {
		this.pos.y += this.velocity.y
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
				if (this.velocity.x > 0) {
					// hit right
					this.velocity.x = 0
					this.pos.x = platform.left - this.width - 0.01
					break
				}

				if (this.velocity.x < 0) {
					// hit left
					this.velocity.x = 0
					this.pos.x = platform.left + platform.width + 0.01
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
					this.pos.y = platform.top - this.height - 0.01
					this.isFalling = false
					// this.jumpAvailable = 2
					break
				}

				if (this.velocity.y < 0) {
					// hit head
					this.velocity.y *= -0.6 // bounce
					this.pos.y = platform.top + platform.height + 0.01
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
