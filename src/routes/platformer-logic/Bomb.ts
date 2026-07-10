import { collision, GRAVITY, lerpPos, type Bounds } from './utils'
import { bombsStore, effectsStore } from '$lib/stores'
import { Effect } from './Effect'
import type { Platform } from './Platform'

const MAX_AIRTIME = 240 // safety: detonate even if it never lands (~4s)
const BLAST_STEPS = 14 // steps the explosion ring is drawn before cleanup

// Gravity bomb lobbed by a bomber. Arcs down to the floor/platform top then blasts.
// AoE resolved by the loop on the first exploding step (fair: player has fall time to clear).
export class Bomb {
	pos: { x: number; y: number }
	prevPos: { x: number; y: number } // pre-step position (render interpolation)
	velocity: { x: number; y: number }
	width = 16
	height = 16
	damage: number
	blastRadius: number
	state: 'falling' | 'exploding' = 'falling'
	damageApplied = false // set once the loop resolves this blast's AoE hit
	age = 0
	blastTimer = 0

	constructor(
		pos: { x: number; y: number },
		vx: number,
		opts: { damage?: number; blastRadius?: number } = {}
	) {
		this.pos = { x: pos.x, y: pos.y }
		this.prevPos = { x: pos.x, y: pos.y }
		this.velocity = { x: vx, y: -1 } // small upward lob before arcing down
		this.damage = opts.damage ?? 2
		this.blastRadius = opts.blastRadius ?? 74
	}

	update(canvas: Bounds, platforms: Platform[], deltaTime: number) {
		if (this.state === 'exploding') {
			this.blastTimer--
			if (this.blastTimer <= 0) bombsStore.delete(this)
			return
		}
		this.prevPos.x = this.pos.x
		this.prevPos.y = this.pos.y
		this.age++
		this.velocity.y += GRAVITY
		this.pos.x += this.velocity.x * deltaTime
		this.pos.y += this.velocity.y * deltaTime

		// Detonate on the canvas floor, on a platform top, or after a max airtime.
		if (this.pos.y + this.height >= canvas.height) {
			this.pos.y = canvas.height - this.height
			this.#detonate()
			return
		}
		if (this.velocity.y >= 0) {
			for (const platform of platforms) {
				if (
					collision(
						{ left: this.pos.x, top: this.pos.y, width: this.width, height: this.height },
						platform
					)
				) {
					// Only detonate when landing on the top edge (not clipping a side).
					if (this.prevPos.y + this.height <= platform.top + 10) {
						this.pos.y = platform.top - this.height
						this.#detonate()
						return
					}
					break
				}
			}
		}
		if (this.age > MAX_AIRTIME) this.#detonate()
	}

	#detonate() {
		this.state = 'exploding'
		this.blastTimer = BLAST_STEPS
		effectsStore.add(new Effect({ x: this.pos.x, y: this.pos.y }, 'smoke_12'))
	}

	get centerX() {
		return this.pos.x + this.width / 2
	}
	get centerY() {
		return this.pos.y + this.height / 2
	}

	draw(ctx: CanvasRenderingContext2D, alpha = 1) {
		if (this.state === 'exploding') {
			// Expanding shockwave ring that fades over its short life.
			const t = 1 - this.blastTimer / BLAST_STEPS // 0 → 1 over the blast
			const r = this.blastRadius * (0.35 + 0.65 * t)
			ctx.save()
			ctx.globalAlpha = Math.max(0, 1 - t)
			ctx.strokeStyle = '#fb923c' // orange-400
			ctx.lineWidth = 4
			ctx.beginPath()
			ctx.arc(this.centerX, this.centerY, r, 0, Math.PI * 2)
			ctx.stroke()
			ctx.fillStyle = 'rgba(249, 115, 22, 0.25)' // orange-500 core
			ctx.beginPath()
			ctx.arc(this.centerX, this.centerY, r * 0.6, 0, Math.PI * 2)
			ctx.fill()
			ctx.restore()
			return
		}
		const p = lerpPos(this, alpha)
		const x = p.x + this.width / 2
		const y = p.y + this.height / 2
		ctx.save()
		// High-contrast warning: pulsing ring + warm body track easily over the busy CV.
		const pulse = Math.floor(this.age / 5) % 2 === 0
		const r = this.width / 2
		ctx.beginPath() // pulsing warning ring
		ctx.strokeStyle = pulse ? 'rgba(248, 113, 113, 0.9)' : 'rgba(248, 113, 113, 0.35)' // red-400
		ctx.lineWidth = 2
		ctx.arc(x, y, r + (pulse ? 7 : 4), 0, Math.PI * 2)
		ctx.stroke()
		ctx.shadowColor = '#f97316' // orange-500 glow, always on
		ctx.shadowBlur = pulse ? 14 : 9
		ctx.fillStyle = '#f87171' // red-400 body
		ctx.beginPath()
		ctx.arc(x, y, r, 0, Math.PI * 2)
		ctx.fill()
		ctx.shadowBlur = 0
		ctx.fillStyle = '#fde68a' // amber-200 hot core
		ctx.beginPath()
		ctx.arc(x, y, r * 0.45, 0, Math.PI * 2)
		ctx.fill()
		ctx.restore()
	}
}
