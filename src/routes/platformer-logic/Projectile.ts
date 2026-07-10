import { collision, getSprite, lerpPos } from './utils'
import { projectilesStore } from '$lib/stores'
import type { Platform } from './Platform'

export class Projectile {
	pos: { x: number; y: number }
	prevPos: { x: number; y: number } // pre-step position (render interpolation)
	angle: number
	height: number
	width: number
	speed: number
	image!: HTMLImageElement
	ticksCount = 0 // steps alive, for the lifetime cap
	hostile = false // enemy shot (hurts player) vs player bolt (hurts enemies)
	damage = 1 // HP removed on hit (player bolts; raised by Power Shot)

	constructor(
		pos: { x: number; y: number },
		angle: number,
		sprite: string,
		opts: { hostile?: boolean; speed?: number; damage?: number } = {}
	) {
		this.pos = pos
		this.prevPos = { x: pos.x, y: pos.y }
		const s = getSprite('projectile', sprite)
		this.image = s.img
		this.height = s.height || 80
		this.width = s.width || 48
		this.speed = opts.speed ?? 12
		this.angle = angle
		this.hostile = opts.hostile ?? false
		this.damage = opts.damage ?? 1
		// Enemy shots draw as a small orb, so give them a compact square hitbox.
		if (this.hostile) {
			this.width = 12
			this.height = 12
		}
	}

	update(deltaTime: number, platforms: Platform[]) {
		this.prevPos.x = this.pos.x
		this.prevPos.y = this.pos.y
		this.pos.x += Math.cos(this.angle) * this.speed * deltaTime
		this.pos.y += Math.sin(this.angle) * this.speed * deltaTime
		this.ticksCount++

		this.#checkCollision(platforms)

		if (this.ticksCount > 240) {
			projectilesStore.delete(this)
		}
	}

	draw(ctx: CanvasRenderingContext2D, alpha = 1) {
		const { x, y } = lerpPos(this, alpha)

		// Enemy shots: a small glowing orb, distinct from the player's bolts.
		if (this.hostile) {
			ctx.save()
			ctx.fillStyle = '#fb923c' // orange-400
			ctx.shadowColor = '#f97316' // orange-500 glow
			ctx.shadowBlur = 8
			ctx.beginPath()
			ctx.arc(x, y, 5, 0, Math.PI * 2)
			ctx.fill()
			ctx.restore()
			return
		}

		ctx.save()
		ctx.translate(x, y)
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
	}

	#checkCollision(platforms: Platform[]) {
		for (const platform of platforms) {
			if (
				collision(
					{
						width: this.width,
						height: this.height,
						top: this.pos.y - this.height / 2,
						left: this.pos.x - this.width / 2
					},
					platform
				)
			) {
				projectilesStore.delete(this)
				break
			}
		}
	}
}
