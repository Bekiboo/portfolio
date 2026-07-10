import { collision, GRAVITY, lerpPos } from './utils'
import { grenadesStore } from '$lib/stores'
import type { Platform } from './Platform'

const MAX_AIRTIME = 200 // safety: detonate even if it never lands (~3s)

// Player's Lance-grenade projectile. Arcs under gravity (Weapon.lob solves the launch onto the
// aimed enemy) and blasts on the first thing it touches (platform/floor, or an enemy mid-arc via
// CombatResolver). The blast + removal are applied by CombatResolver.resolveGrenades; this entity
// owns only flight + a detonation flag. Friendly mirror of enemy Bomb: its AoE damages ENEMIES.
export class Grenade {
	pos: { x: number; y: number }
	prevPos: { x: number; y: number } // pre-step position (render interpolation)
	velocity: { x: number; y: number }
	width = 14
	height = 14
	damage: number // blast damage (global +Damage layered on in the resolver)
	blastRadius: number
	state: 'falling' | 'spent' = 'falling'
	damageApplied = false // set once CombatResolver has resolved this blast
	age = 0

	constructor(
		pos: { x: number; y: number },
		velocity: { x: number; y: number },
		opts: { damage?: number; blastRadius?: number } = {}
	) {
		this.pos = { x: pos.x, y: pos.y }
		this.prevPos = { x: pos.x, y: pos.y }
		this.velocity = { x: velocity.x, y: velocity.y }
		this.damage = opts.damage ?? 3
		this.blastRadius = opts.blastRadius ?? 80
	}

	update(canvas: { width: number; height: number }, platforms: Platform[], deltaTime: number) {
		if (this.state === 'spent') return // detonated; resolveGrenades removes it
		this.prevPos.x = this.pos.x
		this.prevPos.y = this.pos.y
		this.age++
		this.velocity.y += GRAVITY
		this.pos.x += this.velocity.x * deltaTime
		this.pos.y += this.velocity.y * deltaTime

		// Detonate on floor, platform top, or max airtime. (Enemy hits mid-arc are handled in resolveGrenades.)
		if (this.pos.y + this.height >= canvas.height) {
			this.pos.y = canvas.height - this.height
			this.detonate()
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
						this.detonate()
						return
					}
					break
				}
			}
		}
		if (this.age > MAX_AIRTIME) this.detonate()
	}

	// Arm the blast; the AoE + removal are applied by CombatResolver.resolveGrenades.
	detonate() {
		this.state = 'spent'
	}

	get centerX() {
		return this.pos.x + this.width / 2
	}
	get centerY() {
		return this.pos.y + this.height / 2
	}

	draw(ctx: CanvasRenderingContext2D, alpha = 1) {
		if (this.state === 'spent') return // blast ring drawn by shockwave (shockRings)
		const p = lerpPos(this, alpha)
		const x = p.x + this.width / 2
		const y = p.y + this.height / 2
		ctx.save()
		// Dark casing + blinking warm fuse so an incoming grenade reads over the busy CV.
		const pulse = Math.floor(this.age / 5) % 2 === 0
		const r = this.width / 2
		ctx.shadowColor = '#f97316' // orange-500 glow
		ctx.shadowBlur = pulse ? 12 : 7
		ctx.fillStyle = '#4b5563' // gray-600 casing
		ctx.beginPath()
		ctx.arc(x, y, r, 0, Math.PI * 2)
		ctx.fill()
		ctx.shadowBlur = 0
		// Blinking fuse spark on top.
		ctx.fillStyle = pulse ? '#fde68a' : '#f59e0b' // amber-200 / amber-500
		ctx.beginPath()
		ctx.arc(x, y - r, r * 0.4, 0, Math.PI * 2)
		ctx.fill()
		ctx.restore()
	}
}
