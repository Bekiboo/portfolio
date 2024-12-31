import { collision, getSprite } from './utils'
import { projectilesStore } from '$lib/stores'
import type { Platform } from './Platform'

export class Projectile {
	pos: { x: number; y: number }
	angle: number
	height: number
	width: number
	speed: number
	image!: HTMLImageElement
	maxFrame!: number
	frame = 0
	ticksPerFrame!: number
	ticksCount = 0
	sprite!: string

	constructor(pos: { x: number; y: number }, angle: number, sprite: string) {
		this.pos = pos
		this.image = getSprite('projectile', sprite).img
		this.ticksPerFrame = getSprite('projectile', sprite).speed || 5
		this.maxFrame = getSprite('projectile', sprite).frames || 0
		this.height = getSprite('projectile', sprite).height || 80
		this.width = getSprite('projectile', sprite).width || 48
		this.speed = 12
		this.angle = angle
		if (this.frame > this.maxFrame) {
			this.frame = 0
		}
	}

	update(deltaTime: number, platforms: Platform[]) {
		this.pos.x += Math.cos(this.angle) * this.speed * deltaTime
		this.pos.y += Math.sin(this.angle) * this.speed * deltaTime
		this.ticksCount++

		this.#checkCollision(platforms)

		if (this.ticksCount > 240) {
			projectilesStore.delete(this)
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.save()
		ctx.translate(this.pos.x, this.pos.y)
		ctx.rotate(this.angle)
		if (Math.cos(this.angle) < 0) {
			ctx.scale(1, -1)
		}

		ctx.drawImage(
			this.image,
			0,
			0,
			this.width,
			this.height,
			-this.width,
			-this.height,
			this.width * 2,
			this.height * 2
		)
		ctx.restore()

		// ctx.strokeStyle = 'white'
		// ctx.strokeRect(this.pos.x, this.pos.y, this.width, this.height)
	}

	#checkCollision(platforms: Platform[]) {
		for (const platform of platforms) {
			if (
				collision(
					{
						width: 1,
						height: 1,
						top: this.pos.y,
						left: this.pos.x
					},
					platform
				)
			) {
				projectilesStore.delete(this)
			}
		}
	}
}
