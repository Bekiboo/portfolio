import { GRAVITY, lerpPos, settleOnGround, type Bounds } from './utils'
import type { Platform } from './Platform'
import type { Player } from './Player'

const MAGNET_RADIUS = 78 // pickup drift range toward the player
const MAGNET_PULL = 0.9 // per-step accel toward the player inside the magnet
const FRICTION = 0.86 // horizontal damping once grounded

// A dropped XP shard: bursts from a dead enemy, falls under gravity, rests until
// walked over (short-range magnet eases the final pickup). Never despawns — XP is
// always bankable, so tension is spatial (drop down and sweep), not a timer. Still
// falls, so the player can't farm from a safe perch.
export class XpGem {
	pos: { x: number; y: number }
	prevPos: { x: number; y: number } // pre-step pos, for render interpolation
	velocity: { x: number; y: number }
	width: number
	height: number
	value: number
	fill: string // colour tier so value reads at a glance
	glow: string
	age = 0 // physics steps lived; drives the shimmer
	grounded = false

	constructor(pos: { x: number; y: number }, opts: { value?: number } = {}) {
		this.value = opts.value ?? 1
		// Worth more → bigger, richer colour (emerald → sky → gold).
		const size = 14 + Math.min(2, this.value - 1) * 5 // 14 / 19 / 24
		this.width = size
		this.height = size
		if (this.value >= 3) {
			this.fill = '#fbbf24' // amber-400
			this.glow = '#f59e0b' // amber-500
		} else if (this.value === 2) {
			this.fill = '#38bdf8' // sky-400
			this.glow = '#0ea5e9' // sky-500
		} else {
			this.fill = '#34d399' // emerald-400
			this.glow = '#10b981' // emerald-500
		}
		this.pos = { x: pos.x, y: pos.y }
		this.prevPos = { x: pos.x, y: pos.y }
		// Upward scatter so a burst of kills fans out.
		this.velocity = { x: (Math.random() - 0.5) * 6, y: -Math.random() * 4 - 3 }
	}

	update(
		canvas: Bounds,
		player: Player,
		platforms: Platform[],
		deltaTime: number,
		magnetRadius = MAGNET_RADIUS
	) {
		this.prevPos.x = this.pos.x
		this.prevPos.y = this.pos.y
		this.age++ // drives the shimmer (no lifetime cap — gems persist)

		// Short-range magnet: near the player, override gravity for a crisp pickup.
		const px = player.pos.x + player.width / 2
		const py = player.pos.y + player.height / 2
		const dx = px - (this.pos.x + this.width / 2)
		const dy = py - (this.pos.y + this.height / 2)
		const dist = Math.hypot(dx, dy) || 1
		if (dist < magnetRadius) {
			this.velocity.x += (dx / dist) * MAGNET_PULL
			this.velocity.y += (dy / dist) * MAGNET_PULL
			this.grounded = false
		} else {
			this.velocity.y += GRAVITY
		}

		this.pos.x += this.velocity.x * deltaTime
		this.pos.y += this.velocity.y * deltaTime

		settleOnGround(this, canvas, platforms)
		if (this.grounded) this.velocity.x *= FRICTION
	}

	draw(ctx: CanvasRenderingContext2D, alpha = 1) {
		const p = lerpPos(this, alpha)
		const x = p.x + this.width / 2
		const y = p.y + this.height / 2
		const r = this.width / 2
		ctx.save()
		ctx.translate(x, y)
		ctx.rotate(this.age * 0.04) // slow shimmer
		ctx.fillStyle = this.fill
		ctx.shadowColor = this.glow
		ctx.shadowBlur = 10
		ctx.beginPath()
		ctx.moveTo(0, -r)
		ctx.lineTo(r, 0)
		ctx.lineTo(0, r)
		ctx.lineTo(-r, 0)
		ctx.closePath()
		ctx.fill()
		ctx.restore()
	}
}
