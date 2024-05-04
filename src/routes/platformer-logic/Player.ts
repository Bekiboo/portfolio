import type { Platform } from './Platform'
import { collision, loadImage } from './utils'

const GRAVITY = 0.5

type Sprite = {
	frames: number
	speed?: number
	img: HTMLImageElement
}

const sprites: { [key: string]: Sprite } = {
	idle: {
		frames: 3,
		speed: 10,
		img: loadImage('/Biker/Biker_idle.png')
	},
	run: {
		frames: 5,
		img: loadImage('/Biker/Biker_run.png')
	},
	jump: {
		frames: 3,
		speed: 10,
		img: loadImage('/Biker/Biker_jump.png')
	},
	punch: {
		frames: 5,
		speed: 3,
		img: loadImage('/Biker/Biker_attack1.png')
	},
	run_attack: {
		frames: 5,
		img: loadImage('/Biker/Biker_run_attack.png')
	}
}

export class Player {
	pos: { x: number; y: number }
	velocity: { x: number; y: number }
	height = 80
	width = 48
	speed = 6
	image = sprites.idle.img
	maxFrame = sprites.idle.frames
	frame = 0
	ticksPerFrame = sprites.idle.speed || 5
	ticksCount = 0
	direction = 'right'
	isFalling = false
	jumpAvailable = 2

	constructor(pos: { x: number; y: number }) {
		this.pos = pos
		this.velocity = {
			x: 0,
			y: 1
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		this.#animate()

		if (this.direction === 'right') {
			ctx.drawImage(
				this.image,
				this.frame * this.width,
				8,
				this.width,
				this.height,
				this.pos.x,
				this.pos.y,
				this.width * 2,
				this.height * 2
			)
		} else {
			this.#drawFlipped(ctx)
		}
	}

	#drawFlipped(ctx: CanvasRenderingContext2D) {
		ctx.save()
		ctx.translate(this.pos.x + this.width, this.pos.y)
		ctx.scale(-1, 1)
		ctx.drawImage(
			this.image,
			this.frame * this.width,
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

	update(canvas: HTMLCanvasElement, keys: { [key: string]: boolean }, platforms: Platform[]) {
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
	}

	#animate() {
		this.ticksCount++
		if (this.ticksCount > this.ticksPerFrame) {
			this.ticksCount = 0
			if (this.frame < this.maxFrame) {
				this.frame++
			} else {
				this.frame = 0
			}
		}
	}

	#handleKeys(keys: { [key: string]: boolean }) {
		if ((keys['right'] || keys['left']) && !this.velocity.y && !keys['punch']) {
			this.#useSprite('run')
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
			this.#useSprite('idle')
		}
	}

	#useSprite(animation: string) {
		this.image = sprites[animation].img
		this.ticksPerFrame = sprites[animation].speed || 5
		this.maxFrame = sprites[animation].frames
		if (this.frame > sprites[animation].frames) this.frame = 0
	}

	jump() {
		if (this.isFalling && !this.jumpAvailable) return

		this.#useSprite('jump')
		this.velocity.y = -15
		this.isFalling = true
		this.jumpAvailable--
	}

	punch(keys: { [key: string]: boolean }) {
		if (keys['right'] || keys['left']) {
			this.#useSprite('run_attack')
		} else {
			this.#useSprite('punch')
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
					this.jumpAvailable = 2
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
			this.jumpAvailable = 2
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
