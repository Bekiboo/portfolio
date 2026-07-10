import { POWER_TYPES, type PowerKind, type PowerType } from './powerTypes'

// One equipped special power (at most one). Owns its cooldown timer and mutable stat copies —
// mirrors Weapon, so a future shop upgrades it the same way. GameWorld ticks the cooldown each
// step and, on 'S', calls activatePower() which reads these fields and dispatches on the kind.
export class Power {
	readonly type: PowerType
	cooldown = 0 // physics steps until ready again (0 = ready)

	// Mutable copies of the type baselines — upgrades bump these (shop-side later).
	cooldownSteps: number
	damage: number
	radius: number
	knockback: number

	constructor(kind: PowerKind) {
		this.type = POWER_TYPES[kind]
		this.cooldownSteps = this.type.cooldownSteps
		this.damage = this.type.damage
		this.radius = this.type.radius
		this.knockback = this.type.knockback
	}

	// Restore baseline stats on a fresh run (mirrors Weapon.reset / GameWorld.resetUpgrades).
	reset() {
		this.cooldownSteps = this.type.cooldownSteps
		this.damage = this.type.damage
		this.radius = this.type.radius
		this.knockback = this.type.knockback
		this.cooldown = 0
	}

	get ready(): boolean {
		return this.cooldown <= 0
	}

	// Advance the cooldown one physics step (called every step by GameWorld.updatePower).
	tick() {
		if (this.cooldown > 0) this.cooldown--
	}

	// Put the power on cooldown after a use.
	trigger() {
		this.cooldown = this.cooldownSteps
	}
}
