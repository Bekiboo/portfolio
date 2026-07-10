import { projectilesStore, grenadesStore } from '$lib/stores'
import { Projectile } from './Projectile'
import { Grenade } from './Grenade'
import { getSprite, hasSprite, GRAVITY, STEP_DELTA } from './utils'
import { WEAPON_TYPES, type WeaponKind, type WeaponType } from './weaponTypes'
import type { Player } from './Player'
import type { Enemy } from './Enemy'

// Where a weapon rides: single = centred; a pair splits left/right so both are visible.
export type WeaponSide = 'center' | 'left' | 'right'

const SIDE_OFFSET = 16 // px a side weapon's muzzle sits out from the character centre
const BARREL_LENGTH = 60 // px from the muzzle origin to where the bolt is born
// Half-angle of the flamethrower cone (radians): the hit test (CombatResolver.fireFlame) and the
// drawn cone share this so the visible fire == the damage zone. ~24° each side → a ~48° spray.
export const FLAME_HALF_ANGLE = 0.4
// Half-thickness of the laser beam (px): the hit test (CombatResolver.fireBeam) adds this to each
// enemy's radius, and the drawn beam's glow is sized to match, so the visible ray == the hit line.
export const BEAM_HALF_WIDTH = 10

// Flamethrower render: a pixel-art ember stream (not a gradient wedge), advanced per drawn frame.
// Purely cosmetic — damage is still the cone hit test in CombatResolver.fireFlame.
const FLAME_MAX = 150 // hard cap on live embers
const FLAME_DRAG = 0.99 // per-frame velocity decay: thrown hard, then bleed speed as they linger
const FLAME_PX = 3 // pixel grid embers snap to for the blocky look
const FLAME_MUZZLE = 48 // px along the aim to the barrel tip where the flame springs out
const FLAME_PALETTE = ['#fff1c9', '#ffd24a', '#ff9e2c', '#f2600c', '#c81e1e', '#7a1616'] // hot → cool
type Ember = { x: number; y: number; vx: number; vy: number; life: number; max: number; cells: number }

// One equipped weapon: owns its own upgradeable stats, cooldown and aim angle, so a pair fires,
// upgrades and points independently. GameWorld drives it each step (target → aimAt → shoot).
export class Weapon {
	readonly type: WeaponType
	side: WeaponSide
	angle = 0 // current aim (radians); set by aimAt each step
	cooldown = 0 // physics steps until this weapon can fire again
	firing = false // continuous weapons (flame): engaged this step → draw the cone (set by playerCombat)
	#embers: Ember[] = [] // live flamethrower embers (world space); emitted while firing, linger after

	// Mutable copies of the type baselines — upgrades bump these, per weapon.
	fireSteps: number
	projectileCount: number
	damage: number
	spread: number
	projectileSpeed: number
	attackRange: number
	coneStep: number
	blastRadius: number // 'lob' only: grenade blast reach (0 for bolt weapons)

	constructor(kind: WeaponKind, side: WeaponSide = 'center') {
		this.type = WEAPON_TYPES[kind]
		this.side = side
		this.fireSteps = this.type.fireSteps
		this.projectileCount = this.type.projectileCount
		this.damage = this.type.damage
		this.spread = this.type.spread
		this.projectileSpeed = this.type.projectileSpeed
		this.attackRange = this.type.attackRange
		this.coneStep = this.type.coneStep
		this.blastRadius = this.type.blastRadius ?? 0
	}

	// Restore baseline stats on a fresh run (mirrors GameWorld.resetUpgrades).
	reset() {
		this.fireSteps = this.type.fireSteps
		this.projectileCount = this.type.projectileCount
		this.damage = this.type.damage
		this.spread = this.type.spread
		this.projectileSpeed = this.type.projectileSpeed
		this.attackRange = this.type.attackRange
		this.coneStep = this.type.coneStep
		this.blastRadius = this.type.blastRadius ?? 0
		this.cooldown = 0
		this.#embers.length = 0
	}

	// Muzzle origin in world space: the character centre, shifted to this weapon's side.
	muzzle(player: Player): { x: number; y: number } {
		const off = this.side === 'left' ? -SIDE_OFFSET : this.side === 'right' ? SIDE_OFFSET : 0
		return { x: player.pos.x + player.width / 2 + off, y: player.pos.y + player.height / 2 }
	}

	// Aim at the target's centre from the muzzle (per-muzzle aim lets a pair lock onto two enemies),
	// or straight ahead when there's none. A 'beam' doesn't snap: it rotates toward the desired aim
	// at a capped speed (turnRate) so the laser sweeps and rakes everything between old and new target.
	aimAt(target: Enemy | null, muzzle: { x: number; y: number }, facing: string) {
		const desired = target
			? Math.atan2(
					target.pos.y + target.height / 2 - muzzle.y,
					target.pos.x + target.width / 2 - muzzle.x
				)
			: facing === 'left'
				? Math.PI
				: 0
		if (this.type.fireMode === 'beam') {
			let d = desired - this.angle
			d = Math.atan2(Math.sin(d), Math.cos(d)) // shortest signed delta, wrapped to [-π, π]
			const cap = this.type.turnRate ?? 0.05
			this.angle += Math.max(-cap, Math.min(cap, d))
			this.angle = Math.atan2(Math.sin(this.angle), Math.cos(this.angle)) // keep it wrapped
			return
		}
		this.angle = desired
	}

	// Fire a fan of bolts along the aim: spread on a cone plus per-bolt random jitter, so accuracy
	// is a real cost and Multi-Shot widens the spray.
	shoot(muzzle: { x: number; y: number }) {
		const n = this.projectileCount
		const jitter = this.spread + 0.02 * (n - 1)
		const base = this.angle - (this.coneStep * (n - 1)) / 2
		for (let i = 0; i < n; i++) {
			const a = base + this.coneStep * i + (Math.random() - 0.5) * 2 * jitter
			projectilesStore.add(
				new Projectile(
					{ x: muzzle.x + Math.cos(a) * BARREL_LENGTH, y: muzzle.y + Math.sin(a) * BARREL_LENGTH },
					a,
					this.type.projectile,
					{ damage: this.damage, speed: this.projectileSpeed }
				)
			)
		}
	}

	// Lob grenades on a ballistic arc that lands on the target ('lob' weapons use this instead of
	// shoot()). Launch velocity is solved so the grenade reaches the target's centre in N sim steps;
	// it detonates into an AoE on impact. Multi-Shot adds launch scatter to carpet the area.
	lob(muzzle: { x: number; y: number }, target: Enemy) {
		const tx = target.pos.x + target.width / 2
		const ty = target.pos.y + target.height / 2
		const dx = tx - muzzle.x
		const dy = ty - muzzle.y
		// Flight time in steps: farther → longer (taller arc). Clamped so point-blank still lobs
		// and long shots don't hang forever.
		const n = Math.min(96, Math.max(34, 34 + Math.abs(dx) * 0.05))
		// Closed-form for the sim's integration (velocity.y += GRAVITY each step; pos += v * dt):
		//   dx = vx · dt · n            → vx = dx / (dt · n)
		//   dy = dt · (n·vy0 + g·n(n+1)/2) → vy0 = (dy/dt − g·n(n+1)/2) / n
		const vx = dx / (STEP_DELTA * n)
		const vy = (dy / STEP_DELTA - (GRAVITY * n * (n + 1)) / 2) / n
		for (let i = 0; i < this.projectileCount; i++) {
			const scatter = 1 + (Math.random() - 0.5) * this.spread * 4
			grenadesStore.add(
				new Grenade(
					muzzle,
					{ x: vx * scatter, y: vy },
					{ damage: this.damage, blastRadius: this.blastRadius }
				)
			)
		}
	}

	// Draw the gun (and holding hand, if any) at the interpolated position, rotated to the aim,
	// translated to this weapon's muzzle side.
	draw(ctx: CanvasRenderingContext2D, x: number, y: number, player: Player, blinkHidden = false) {
		const off = this.side === 'left' ? -SIDE_OFFSET : this.side === 'right' ? SIDE_OFFSET : 0
		const cx = x + player.width / 2 + off
		const cy = y + player.height / 2
		// Continuous-weapon FX: drawn behind the gun every frame (so flame lingers past the trigger)
		// and ignoring the i-frame blink so a hit doesn't strobe them.
		if (this.type.fireMode === 'flame') this.#drawFlame(ctx, cx, cy, this.firing)
		else if (this.firing && this.type.fireMode === 'beam') this.#drawBeam(ctx, cx, cy)
		if (blinkHidden) return // skip the solid gun + hand sprite on the blink-off frame
		const flip = Math.cos(this.angle) < 0
		const handKey = `${player.character}_3`
		if (hasSprite('hand', handKey)) {
			ctx.save()
			ctx.translate(cx, cy)
			ctx.scale(1, flip ? -1 : 1)
			ctx.rotate(flip ? -this.angle : this.angle)
			ctx.drawImage(getSprite('hand', handKey).img, 0, 0, player.width, player.height, -28, -28, player.width * 2, player.height * 2)
			ctx.restore()
		}
		ctx.save()
		ctx.translate(cx, cy)
		ctx.scale(1, flip ? -1 : 1)
		ctx.rotate(flip ? -this.angle : this.angle)
		ctx.drawImage(getSprite('weapon', this.type.sprite).img, 0, 0, player.width, player.height, 14, -4, player.width * 2, player.height * 2)
		ctx.restore()
	}

	// Emit a tight, near-axial ember stream from the barrel tip, then advance every live ember: thrown
	// forward, dragged, and curled upward by heat so the fire rises as it lingers. Emit only while
	// `emitting`, but always advance/draw (that trailing burn is the linger). Additive → dense core.
	#drawFlame(ctx: CanvasRenderingContext2D, cx: number, cy: number, emitting: boolean) {
		const embers = this.#embers
		if (emitting && embers.length < FLAME_MAX) {
			const ox = cx + Math.cos(this.angle) * FLAME_MUZZLE
			const oy = cy + Math.sin(this.angle) * FLAME_MUZZLE
			const count = 4 + Math.floor(Math.random() * 3)
			for (let i = 0; i < count && embers.length < FLAME_MAX; i++) {
				const a = this.angle + (Math.random() * 2 - 1) * FLAME_HALF_ANGLE * 0.3 // near-axial: a stream, not a fan
				const dist = this.attackRange * (0.4 + Math.random() * 0.6) // reach: 40%..100% of the cone
				const max = Math.round(10 + Math.random() * 14) // 10..24 frames of life
				// Launch speed solved so that, with FLAME_DRAG each frame, the ember still covers `dist`
				// over its life (geometric sum) — the jet decelerates but its reach stays == attackRange.
				const d = FLAME_DRAG
				const s = (dist * (1 - d)) / (d * (1 - d ** max))
				embers.push({
					x: ox + Math.cos(a) * 3 * Math.random(),
					y: oy + Math.sin(a) * 3 * Math.random(),
					vx: Math.cos(a) * s,
					vy: Math.sin(a) * s,
					life: max,
					max,
					cells: 1 + Math.floor(Math.random() * 3)
				})
			}
		}
		if (!embers.length) return
		const px = FLAME_PX
		ctx.save()
		ctx.globalCompositeOperation = 'lighter'
		for (let i = embers.length - 1; i >= 0; i--) {
			const e = embers[i]
			e.x += e.vx
			e.y += e.vy
			e.vx *= FLAME_DRAG
			e.vy = e.vy * FLAME_DRAG - 0.18 // drag + rising heat (curls up as it slows)
			e.vx += (Math.random() - 0.5) * 0.25 // waver so the stream ripples
			e.vy += (Math.random() - 0.5) * 0.25
			e.life--
			if (e.life <= 0) {
				embers.splice(i, 1)
				continue
			}
			const t = e.life / e.max // 1 = fresh & hot, 0 = spent
			const color = FLAME_PALETTE[Math.min(FLAME_PALETTE.length - 1, Math.floor((1 - t) * FLAME_PALETTE.length))]
			const sz = Math.max(px, Math.round(e.cells * (0.35 + t * 0.65)) * px) // shrinks as it cools
			ctx.globalAlpha = (t < 0.35 ? t / 0.35 : 1) * 0.85 // fade out over the last third of life
			ctx.fillStyle = color
			const left = Math.round((e.x - sz / 2) / px) * px // snap to the pixel grid
			const top = Math.round((e.y - sz / 2) / px) * px
			ctx.fillRect(left, top, sz, sz)
		}
		ctx.restore()
	}

	// Fuchsia beam along the aim: soft glow + mid band + white-hot core, additive with per-frame
	// width jitter so it shimmers. Length is attackRange — the reach CombatResolver.fireBeam rakes.
	#drawBeam(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
		const len = this.attackRange
		ctx.save()
		ctx.translate(cx, cy)
		ctx.rotate(this.angle)
		ctx.globalCompositeOperation = 'lighter' // beams add up, so overlaps read as hotter
		ctx.lineCap = 'round'
		// Outer glow.
		ctx.strokeStyle = 'rgba(217, 70, 239, 0.22)' // fuchsia-500
		ctx.lineWidth = 14 + Math.random() * 4
		ctx.beginPath()
		ctx.moveTo(0, 0)
		ctx.lineTo(len, 0)
		ctx.stroke()
		// Mid band.
		ctx.strokeStyle = 'rgba(232, 121, 249, 0.55)' // fuchsia-400
		ctx.lineWidth = 6
		ctx.beginPath()
		ctx.moveTo(0, 0)
		ctx.lineTo(len, 0)
		ctx.stroke()
		// White-hot core.
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
		ctx.lineWidth = 2
		ctx.beginPath()
		ctx.moveTo(0, 0)
		ctx.lineTo(len, 0)
		ctx.stroke()
		ctx.restore()
	}
}
