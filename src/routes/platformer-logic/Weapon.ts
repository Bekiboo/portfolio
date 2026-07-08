import { projectilesStore } from '$lib/stores'
import { Projectile } from './Projectile'
import { getSprite, hasSprite } from './utils'
import { WEAPON_TYPES, type WeaponKind, type WeaponType } from './weaponTypes'
import type { Player } from './Player'
import type { Enemy } from './Enemy'

// Where a weapon rides on the character: a single weapon sits centred; a pair splits to
// the left/right sides so both are visible and each covers its own flank.
export type WeaponSide = 'center' | 'left' | 'right'

const SIDE_OFFSET = 16 // px a side weapon's muzzle sits out from the character centre
const BARREL_LENGTH = 60 // px from the muzzle origin to where the bolt is born

// One equipped weapon. Owns its own upgradeable combat stats (copied from its WeaponType),
// its own fire cooldown and its own aim angle — so two weapons fire, upgrade and point
// independently. GameWorld drives it each step: it finds this weapon's target (nearest enemy
// to the muzzle), calls aimAt(), ticks the cooldown and calls shoot() on the beat.
export class Weapon {
	readonly type: WeaponType
	side: WeaponSide
	angle = 0 // current aim (radians); set by aimAt each step
	cooldown = 0 // physics steps until this weapon can fire again

	// Mutable copies of the type baselines — the upgrades bump these, per weapon.
	fireSteps: number
	projectileCount: number
	damage: number
	spread: number
	projectileSpeed: number
	attackRange: number
	coneStep: number

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
	}

	// Restore the baseline stats (called on a fresh run, mirrors GameWorld.resetUpgrades).
	reset() {
		this.fireSteps = this.type.fireSteps
		this.projectileCount = this.type.projectileCount
		this.damage = this.type.damage
		this.spread = this.type.spread
		this.projectileSpeed = this.type.projectileSpeed
		this.attackRange = this.type.attackRange
		this.coneStep = this.type.coneStep
		this.cooldown = 0
	}

	// Muzzle origin in world space: the character centre, shifted to this weapon's side.
	muzzle(player: Player): { x: number; y: number } {
		const off = this.side === 'left' ? -SIDE_OFFSET : this.side === 'right' ? SIDE_OFFSET : 0
		return { x: player.pos.x + player.width / 2 + off, y: player.pos.y + player.height / 2 }
	}

	// Point at a target's centre from this weapon's muzzle, or straight ahead (facing) when
	// there's none. Aiming from the muzzle (not the character centre) is what lets a left and
	// a right weapon lock onto two different enemies.
	aimAt(target: Enemy | null, muzzle: { x: number; y: number }, facing: string) {
		if (!target) {
			this.angle = facing === 'left' ? Math.PI : 0
			return
		}
		this.angle = Math.atan2(
			target.pos.y + target.height / 2 - muzzle.y,
			target.pos.x + target.width / 2 - muzzle.x
		)
	}

	// Fire a fan of bolts from the muzzle along the current aim. Bolts spread on a cone and
	// each also jitters randomly, so accuracy is a real cost and Multi-Shot widens the spray.
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

	// Draw the gun (and the holding hand, if the character has one) at the interpolated
	// character position, rotated to the aim. Mirrors the old Player.#drawWeapon/#drawHand,
	// now per-weapon and translated to this weapon's muzzle side.
	draw(ctx: CanvasRenderingContext2D, x: number, y: number, player: Player) {
		const off = this.side === 'left' ? -SIDE_OFFSET : this.side === 'right' ? SIDE_OFFSET : 0
		const cx = x + player.width / 2 + off
		const cy = y + player.height / 2
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
}
