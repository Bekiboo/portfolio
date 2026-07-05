import { projectilesStore, effectsStore } from '$lib/stores'
import { Projectile } from './Projectile'
import { Effect } from './Effect'
import { nearestEnemy } from './los'
import type { Platform } from './Platform'
import { getSprite, hasSprite } from './utils'

// A friendly deployable — the Cyborg engineer's kit. GameWorld drops it near the player
// (snapped to the ground) and it fights on its own: auto-aims at the nearest enemy in
// range and fires NON-hostile bolts, which resolveHits routes to enemies exactly like
// the player's own shots. It isn't destructible — enemies path to the player, not to
// turrets — it just expires after a lifespan, which keeps the summoner loop lean
// (deploy, dodge while they work, redeploy). Fire rate, damage and lifespan are frozen
// from GameWorld's run tunables at spawn, so upgrades affect newly-built turrets.

const TURRET_RANGE = 340 // px: stationary fire-support, not a map-wide sniper
const FIRE_ANIM_STEPS = 8 // steps the 'attack' frame shows after a shot
const WARMUP = 10 // steps before the first shot after deploy
const FRAME = 48 // gadget sheet frame size (square)
const SCALE = 2 // drawn at 2× like the enemy turret

export class Turret {
	pos: { x: number; y: number }
	width = 52
	height = 44
	life: number // steps remaining before it expires
	maxLife: number
	private fireSteps: number
	private damage: number
	private cooldown = WARMUP
	private firing = 0 // steps left showing the 'attack' animation
	private dir = 1 // cannon facing (+1 right, −1 left) → sprite flip

	// Sprite/animation state (gadget sheet: idle when watching, attack when it just fired).
	private image = getSprite('turret', 'idle').img
	private anim = 'idle'
	private frame = 1
	private maxFrame = getSprite('turret', 'idle').frames ?? 4
	private ticksPerFrame = getSprite('turret', 'idle').speed || 5
	private ticksCount = 0

	constructor(
		pos: { x: number; y: number },
		opts: { life: number; fireSteps: number; damage: number }
	) {
		this.pos = { x: pos.x, y: pos.y }
		this.life = opts.life
		this.maxLife = opts.life
		this.fireSteps = opts.fireSteps
		this.damage = opts.damage
		// Deploy puff at the base.
		effectsStore.add(new Effect({ x: pos.x + this.width / 2 - 24, y: pos.y }, 'smoke_12'))
	}

	// Advance one physics step. Returns false once expired so the loop can remove it.
	update(platforms: Platform[]): boolean {
		if (--this.life <= 0) {
			effectsStore.add(
				new Effect(
					{ x: this.pos.x + this.width / 2, y: this.pos.y + this.height / 2 },
					'smoke_14',
					{ centered: true }
				)
			)
			return false
		}
		const target = nearestEnemy(this, platforms, TURRET_RANGE)
		if (target) {
			this.dir = target.pos.x + target.width / 2 < this.pos.x + this.width / 2 ? -1 : 1
			if (this.cooldown > 0) this.cooldown--
			else {
				this.#fire(target)
				this.cooldown = this.fireSteps
				this.firing = FIRE_ANIM_STEPS
			}
		}
		if (this.firing > 0) this.firing--
		this.#setAnim(this.firing > 0 ? 'attack' : 'idle')
		return true
	}

	// Fire one non-hostile bolt at the target's centre (resolveHits damages enemies with it).
	#fire(target: { pos: { x: number; y: number }; width: number; height: number }) {
		const cx = this.pos.x + this.width / 2
		const cy = this.pos.y - 6 // roughly the cannon height above the base
		const a = Math.atan2(
			target.pos.y + target.height / 2 - cy,
			target.pos.x + target.width / 2 - cx
		)
		const m = 26 // muzzle offset along the aim
		projectilesStore.add(
			new Projectile({ x: cx + Math.cos(a) * m, y: cy + Math.sin(a) * m }, a, 'blue', {
				damage: this.damage
			})
		)
	}

	#setAnim(name: string) {
		if (name === this.anim || !hasSprite('turret', name)) return
		const s = getSprite('turret', name)
		this.anim = name
		this.image = s.img
		this.maxFrame = s.frames ?? 4
		this.ticksPerFrame = s.speed || 5
		this.frame = 1
	}

	#animate(deltaTime: number) {
		this.ticksCount += deltaTime
		if (this.ticksCount > this.ticksPerFrame) {
			this.ticksCount = 0
			this.frame = this.frame < this.maxFrame ? this.frame + 1 : 1
		}
	}

	draw(ctx: CanvasRenderingContext2D, deltaTime: number) {
		this.#animate(deltaTime)
		const { x, y } = this.pos
		// Cyan footprint ring — marks it as YOUR deployable vs the (identical sprite) enemy
		// turret, without the decorative glow. Reads like an RTS unit selection ring.
		ctx.save()
		ctx.fillStyle = 'rgba(34, 211, 238, 0.22)'
		ctx.beginPath()
		ctx.ellipse(x + this.width / 2, y + this.height - 3, this.width * 0.55, 5, 0, 0, Math.PI * 2)
		ctx.fill()
		ctx.restore()
		// Sprite (gadget sheet: aspect-correct, foot-anchored). Blink out near end of life.
		const dw = FRAME * SCALE
		const dh = FRAME * SCALE
		const drawX = x + this.width / 2 - dw / 2
		const topY = y + this.height - dh
		const srcX = (this.frame - 1) * FRAME
		ctx.save()
		if (this.life < 54 && Math.floor(this.life / 6) % 2 === 0) ctx.globalAlpha = 0.4
		if (this.dir >= 0) {
			ctx.drawImage(this.image, srcX, 0, FRAME, FRAME, drawX, topY, dw, dh)
		} else {
			ctx.translate(drawX + dw, topY)
			ctx.scale(-1, 1)
			ctx.drawImage(this.image, srcX, 0, FRAME, FRAME, 0, 0, dw, dh)
		}
		ctx.restore()
	}
}
