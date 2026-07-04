import { collision } from './utils'
import { healthPacksStore } from '$lib/stores'
import type { Platform } from './Platform'

const GRAVITY = 0.33 // matches the world gravity used by Player/Enemy/XpGem
const LIFETIME = 800 // physics steps a pack lives (~13s) — a touch longer than a gem
const BLINK_STEPS = 180 // blinks over its final ~3s to warn it's about to vanish

// A dropped med-kit. Bursts from a slain enemy (mostly when the player is hurt),
// tumbles to the floor under gravity, and rests there until walked over. Unlike
// XP there's no magnet — the player has to path to it, so healing is a deliberate
// choice of ground rather than a passive trickle. Restores `heal` HP on pickup.
export class HealthPack {
	pos: { x: number; y: number }
	prevPos: { x: number; y: number } // position before the last physics step (for render interpolation)
	velocity: { x: number; y: number }
	width = 18
	height = 18
	heal: number
	age = 0
	grounded = false

	constructor(pos: { x: number; y: number }, opts: { heal?: number } = {}) {
		this.heal = opts.heal ?? 2
		this.pos = { x: pos.x, y: pos.y }
		this.prevPos = { x: pos.x, y: pos.y }
		this.velocity = { x: (Math.random() - 0.5) * 4, y: -Math.random() * 3 - 2 }
	}

	update(canvas: HTMLCanvasElement, platforms: Platform[], deltaTime: number) {
		this.prevPos.x = this.pos.x
		this.prevPos.y = this.pos.y
		this.age++
		if (this.age > LIFETIME) {
			healthPacksStore.delete(this)
			return
		}
		this.velocity.y += GRAVITY
		this.pos.x += this.velocity.x * deltaTime
		this.pos.y += this.velocity.y * deltaTime
		this.#land(canvas, platforms)
		if (this.grounded) this.velocity.x *= 0.86
	}

	// Rest on the canvas floor or the top of any platform it lands on.
	#land(canvas: HTMLCanvasElement, platforms: Platform[]) {
		this.grounded = false
		if (this.pos.y + this.height >= canvas.height) {
			this.pos.y = canvas.height - this.height
			this.velocity.y = 0
			this.grounded = true
		}
		if (this.velocity.y >= 0) {
			for (const platform of platforms) {
				if (
					collision(
						{ left: this.pos.x, top: this.pos.y, width: this.width, height: this.height },
						platform
					)
				) {
					if (this.prevPos.y + this.height <= platform.top + 8) {
						this.pos.y = platform.top - this.height
						this.velocity.y = 0
						this.grounded = true
					}
					break
				}
			}
		}
		if (this.pos.x < 0) {
			this.pos.x = 0
			this.velocity.x *= -0.4
		} else if (this.pos.x + this.width > canvas.width) {
			this.pos.x = canvas.width - this.width
			this.velocity.x *= -0.4
		}
	}

	draw(ctx: CanvasRenderingContext2D, alpha = 1) {
		// Blink out over the final stretch so its disappearance isn't a surprise.
		if (this.age > LIFETIME - BLINK_STEPS && Math.floor(this.age / 8) % 2 === 0) return
		const x = this.prevPos.x + (this.pos.x - this.prevPos.x) * alpha
		const y = this.prevPos.y + (this.pos.y - this.prevPos.y) * alpha
		const s = this.width
		ctx.save()
		ctx.shadowColor = '#f87171' // red-400 glow
		ctx.shadowBlur = 10
		// Rounded red kit...
		ctx.fillStyle = '#ef4444' // red-500
		ctx.beginPath()
		ctx.roundRect(x, y, s, s, 4)
		ctx.fill()
		// ...with a white cross.
		ctx.shadowBlur = 0
		ctx.fillStyle = '#ffffff'
		const t = s * 0.22 // cross arm thickness
		ctx.fillRect(x + s / 2 - t / 2, y + s * 0.24, t, s * 0.52)
		ctx.fillRect(x + s * 0.24, y + s / 2 - t / 2, s * 0.52, t)
		ctx.restore()
	}
}
