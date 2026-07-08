import { POWER_TYPES, type PowerKind, type PowerType } from './powerTypes'

// One equipped special power (the player holds at most one). Owns its cooldown timer and
// mutable copies of its tunable stats — mirrors Weapon, so a future shop can upgrade a power
// the same way it upgrades a weapon. GameWorld drives it each step: ticks the cooldown and,
// on an 'S' press, calls activatePower() which reads these fields and dispatches on the kind.
export class Power {
	readonly type: PowerType
	cooldown = 0 // physics steps until ready again (0 = ready)

	// Mutable copies of the type baselines — upgrades bump these (per power, shop-side later).
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

	// Restore the baseline stats (fresh run — mirrors Weapon.reset / GameWorld.resetUpgrades).
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

	// Advance the cooldown one physics step (GameWorld.updatePower calls this every step).
	tick() {
		if (this.cooldown > 0) this.cooldown--
	}

	// Put the power on cooldown after a use.
	trigger() {
		this.cooldown = this.cooldownSteps
	}
}
