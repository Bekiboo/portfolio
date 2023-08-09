import type { Platform } from './Platform'
import { collision, loadImage } from './utils'

const GRAVITY = 0.5

export class Player {
	pos: { x: number; y: number }
	velocity: { x: number; y: number }
	height = 80
	width = 48
	speed = 4
	image = loadImage('/Biker/Biker_idle.png')
	maxFrame = 3
	frame = 0
	ticksPerFrame = 10
	ticksCount = 0
	direction = 'right'

	constructor(pos: { x: number; y: number }) {
		this.pos = pos
		this.velocity = {
			x: 0,
			y: 1
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		this.#animate()
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
	}

	update(canvas: HTMLCanvasElement, keys: { [key: string]: boolean }, platforms: Platform[]) {
		this.pos.x += this.velocity.x // move left/right

		this.#checkForHorizontalCollisions(platforms)
		this.#applyGravity()
		this.#keepWithinCanvas(canvas)
		this.#checkForVerticalCollisions(platforms)

		this.velocity.x = 0 // reset velocity

		if (keys['left']) {
			this.velocity.x -= this.speed
		}
		if (keys['right']) this.velocity.x += this.speed
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

	#applyGravity() {
		this.pos.y += this.velocity.y
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
				if (this.velocity.y > 0) {
					// hit bottom
					this.velocity.y = 0 // stop falling
					this.pos.y = platform.top - this.height - 0.01
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
