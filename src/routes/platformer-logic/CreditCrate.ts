import { GRAVITY, lerpPos, settleOnGround, type Bounds } from './utils'
import type { Platform } from './Platform'

// A dropped credit crate (shop currency). Rarely bursts from a slain enemy, falls, rests
// until walked over. No magnet (banking it is a deliberate detour) and never expires (too
// precious to lose before the shop). Worth `value` credits on pickup.
export class CreditCrate {
	pos: { x: number; y: number }
	prevPos: { x: number; y: number } // pre-step pos, for render interpolation
	velocity: { x: number; y: number }
	width = 20
	height = 16
	value: number
	grounded = false
	bob = 0 // idle bob once grounded (drives the draw float)

	constructor(pos: { x: number; y: number }, opts: { value?: number } = {}) {
		this.value = opts.value ?? 5
		this.pos = { x: pos.x, y: pos.y }
		this.prevPos = { x: pos.x, y: pos.y }
		this.velocity = { x: (Math.random() - 0.5) * 4, y: -Math.random() * 3 - 2 }
	}

	update(canvas: Bounds, platforms: Platform[], deltaTime: number) {
		this.prevPos.x = this.pos.x
		this.prevPos.y = this.pos.y
		this.velocity.y += GRAVITY
		this.pos.x += this.velocity.x * deltaTime
		this.pos.y += this.velocity.y * deltaTime
		settleOnGround(this, canvas, platforms)
		if (this.grounded) {
			this.velocity.x *= 0.86
			this.bob += deltaTime
		}
	}

	draw(ctx: CanvasRenderingContext2D, alpha = 1) {
		const p = lerpPos(this, alpha)
		const x = p.x
		let y = p.y
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
