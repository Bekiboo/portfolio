import { collision } from './utils'
import { xpGemsStore } from '$lib/stores'
import type { Platform } from './Platform'
import type { Player } from './Player'

const GRAVITY = 0.33 // matches the world gravity used by Player/Enemy
const MAGNET_RADIUS = 78 // gems within this distance of the player drift toward them
const MAGNET_PULL = 0.9 // per-step acceleration toward the player inside the magnet
const FRICTION = 0.86 // horizontal damping once a gem is resting on the ground
const LIFETIME = 600 // physics steps a gem lives (~10s) before it fades out
const BLINK_STEPS = 150 // it blinks over its final ~2.5s to warn it's about to vanish

// A dropped experience shard. Bursts out of a dead enemy, tumbles to the floor
// under gravity, then rests there until the player walks over it (a short-range
// magnet eases the final pickup). Because it falls, the player can't farm purely
// from a safe perch — they have to drop down and sweep the ground to bank XP.
export class XpGem {
	pos: { x: number; y: number }
	prevPos: { x: number; y: number } // position before the last physics step (for render interpolation)
	velocity: { x: number; y: number }
	width = 14
	height = 14
	value: number
	age = 0 // physics steps lived; drives lifetime + blink
	grounded = false

	constructor(pos: { x: number; y: number }, opts: { value?: number } = {}) {
		this.value = opts.value ?? 1
		this.pos = { x: pos.x, y: pos.y }
		this.prevPos = { x: pos.x, y: pos.y }
		// Pop out with a little upward scatter so a burst of kills fans out.
		this.velocity = { x: (Math.random() - 0.5) * 6, y: -Math.random() * 4 - 3 }
	}

	update(
		canvas: HTMLCanvasElement,
		player: Player,
		platforms: Platform[],
		deltaTime: number,
		magnetRadius = MAGNET_RADIUS
	) {
		this.prevPos.x = this.pos.x
		this.prevPos.y = this.pos.y
		this.age++
		if (this.age > LIFETIME) {
			xpGemsStore.delete(this)
			return
		}

		// Short-range magnet: once the player is near, slurp the gem in (overriding
		// gravity) so the final pickup feels crisp. Out of range it just falls.
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

		this.#land(canvas, platforms)
		if (this.grounded) this.velocity.x *= FRICTION
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
					// Only settle when it dropped onto the top edge (not clipping a side).
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
		const x = this.prevPos.x + (this.pos.x - this.prevPos.x) * alpha + this.width / 2
		const y = this.prevPos.y + (this.pos.y - this.prevPos.y) * alpha + this.height / 2
		const r = this.width / 2
		ctx.save()
		ctx.translate(x, y)
		ctx.rotate(this.age * 0.04) // slow shimmer
		ctx.fillStyle = '#34d399' // emerald-400
		ctx.shadowColor = '#10b981' // emerald-500 glow
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
