// Data-driven weapon registry — the twin of enemyTypes.ts / characters.ts, and the seam
// that splits a *weapon* from a *character*. A character is now just a chassis (HP, speed,
// jump, sprite); its firepower is one or two Weapon instances configured from an entry here.
// The player carries up to two weapons (one per side), each aiming at the nearest enemy to
// ITS OWN muzzle — so the two can cover different threats left and right. Archetypes differ
// mechanically (cadence, bolt count, spread, range, projectile speed), not just by skin.
//
// Adding a weapon = one entry below + its sprite in spritesData ('weapon' + optional muzzle
// frames). No dispatch code to touch: the fire routine is stat-driven (a spread of N bolts
// on a cadence). Genuinely new firing patterns (pierce, ricochet, beams) would add a field
// here + a branch in Weapon.shoot — deferred until an archetype needs one.

export type WeaponKind = 'pistol' | 'rifle' | 'shotgun' | 'smg'

export interface WeaponType {
	kind: WeaponKind
	name: string // display name (level-up / shop cards)
	blurb: string // one-line archetype pitch (shown on the weapon-choice milestone card)
	sprite: string // spritesData 'weapon' key (the gun/rifle skin)
	projectile: string // spritesData 'projectile' key (bolt sprite)
	// --- Combat baselines (a Weapon copies these into mutable fields at run start; the
	// level-up/shop upgrades bump the copies, so two weapons upgrade independently) ---
	fireSteps: number // physics steps between shots (lower = faster)
	projectileCount: number // bolts per shot (before Multi-Shot)
	damage: number // damage per bolt
	spread: number // inaccuracy: ± radians of random deviation per bolt
	projectileSpeed: number // bolt travel speed (px/step)
	attackRange: number // px: how close an enemy must be before this weapon opens fire
	coneStep: number // radians between adjacent bolts in a multi-bolt fan
}

export const WEAPON_TYPES: Record<WeaponKind, WeaponType> = {
	// The Punk's starter — the old baked-in Punk gun, unchanged. Balanced: a steady single
	// bolt at medium range. Deliberately weak at lvl 1; upgrades are what make it sing.
	pistol: {
		kind: 'pistol', name: 'Pistolet', blurb: 'Équilibré : tir régulier, portée moyenne',
		sprite: 'gun_1', projectile: 'blue',
		fireSteps: 28, projectileCount: 1, damage: 1, spread: 0.07, projectileSpeed: 8,
		attackRange: 400, coneStep: 0.15
	},
	// Slow, pinpoint, long reach and fast heavy bolts — the standoff pick. Rewards positioning
	// over spray.
	rifle: {
		kind: 'rifle', name: 'Fusil', blurb: 'Lent mais précis : longue portée, gros dégâts',
		sprite: 'rifle_1', projectile: 'blue',
		fireSteps: 46, projectileCount: 1, damage: 3, spread: 0.015, projectileSpeed: 13,
		attackRange: 640, coneStep: 0.12
	},
	// A short-range wall of pellets: many bolts, wide cone, slow reload. Devastating point-blank,
	// useless at distance.
	shotgun: {
		kind: 'shotgun', name: 'Fusil à pompe', blurb: 'Nuée de plombs : dévastateur au corps-à-corps',
		sprite: 'gun_2', projectile: 'blue',
		fireSteps: 52, projectileCount: 5, damage: 1, spread: 0.16, projectileSpeed: 9,
		attackRange: 300, coneStep: 0.19
	},
	// Bullet hose: very fast cadence, single bolt, sprays wide, short reach. Sheer volume.
	smg: {
		kind: 'smg', name: 'Mitraillette', blurb: 'Déluge de balles : cadence folle, dispersion large',
		sprite: 'gun_3', projectile: 'blue',
		fireSteps: 9, projectileCount: 1, damage: 1, spread: 0.13, projectileSpeed: 10,
		attackRange: 360, coneStep: 0.15
	}
}
