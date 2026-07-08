import { collision } from './utils'
import type { Platform } from './Platform'

const GRAVITY = 0.33 // matches the world gravity used by Player/Enemy/XpGem/HealthPack

// A dropped credit crate — the shop currency. Bursts (rarely) from a slain enemy, tumbles to
// the floor under gravity and rests there until walked over. Unlike XP it isn't magnetised, so
// banking it is a deliberate detour; and unlike a med-kit it never expires (currency is too
// precious to lose before the intermission shop). Worth `value` credits on pickup.
export class CreditCrate {
	pos: { x: number; y: number }
	prevPos: { x: number; y: number } // position before the last physics step (render interpolation)
	velocity: { x: number; y: number }
	width = 20
	height = 16
	value: number
	grounded = false
	bob = 0 // gentle idle bob once grounded (drives the draw float)

	constructor(pos: { x: number; y: number }, opts: { value?: number } = {}) {
		this.value = opts.value ?? 5
		this.pos = { x: pos.x, y: pos.y }
		this.prevPos = { x: pos.x, y: pos.y }
		this.velocity = { x: (Math.random() - 0.5) * 4, y: -Math.random() * 3 - 2 }
	}

	update(canvas: HTMLCanvasElement, platforms: Platform[], deltaTime: number) {
		this.prevPos.x = this.pos.x
		this.prevPos.y = this.pos.y
		this.velocity.y += GRAVITY
		this.pos.x += this.velocity.x * deltaTime
		this.pos.y += this.velocity.y * deltaTime
		this.#land(canvas, platforms)
		if (this.grounded) {
			this.velocity.x *= 0.86
			this.bob += deltaTime
		}
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
		const x = this.prevPos.x + (this.pos.x - this.prevPos.x) * alpha
		let y = this.prevPos.y + (this.pos.y - this.prevPos.y) * alpha
		if (this.grounded) y += Math.sin(this.bob * 0.08) * 1.5 // gentle idle float
		const w = this.width
		const h = this.height
		ctx.save()
		ctx.shadowColor = '#f59e0b' // amber-500 glow
		ctx.shadowBlur = 10
		// Amber crate body.
		ctx.fillStyle = '#b45309' // amber-700
		ctx.beginPath()
		ctx.roundRect(x, y, w, h, 3)
		ctx.fill()
		ctx.shadowBlur = 0
		// Lid + banding for a little crate/chest read.
		ctx.fillStyle = '#f59e0b' // amber-500
		ctx.fillRect(x, y, w, h * 0.32)
		ctx.strokeStyle = '#fcd34d' // amber-300 trim
		ctx.lineWidth = 1
		ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
		// Coin glint centre.
		ctx.fillStyle = '#fde68a' // amber-200
		ctx.beginPath()
		ctx.arc(x + w / 2, y + h * 0.62, h * 0.2, 0, Math.PI * 2)
		ctx.fill()
		ctx.restore()
	}
}
