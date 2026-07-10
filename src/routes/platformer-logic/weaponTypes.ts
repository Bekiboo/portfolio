// Data-driven weapon registry: splits a *weapon* from a *character* (a chassis). The player
// carries up to two weapons (one per side), each aiming at the nearest enemy to ITS OWN muzzle.
// Archetypes differ mechanically (cadence, bolt count, spread, range, speed), not just by skin.
// Adding a weapon = one entry below + its sprite in spritesData. Most need no dispatch code (the
// default 'bolt' routine is stat-driven); new firing patterns are selected by `fireMode`.

export type WeaponKind =
	| 'pistol'
	| 'rifle'
	| 'shotgun'
	| 'smg'
	| 'grenade'
	| 'flamethrower'
	| 'laser'

// How a weapon delivers damage. 'bolt' = straight-line projectile fan; 'lob' = ballistic grenade
// into an area blast; 'beam'/'flame' = continuous weapons resolved in CombatResolver, not projectiles.
export type FireMode = 'bolt' | 'lob' | 'beam' | 'flame'

export interface WeaponType {
	kind: WeaponKind
	name: string // display name (level-up / shop cards)
	blurb: string // one-line archetype pitch (shown on the weapon-choice milestone card)
	fireMode: FireMode // delivery pattern; 'bolt' unless the archetype needs a new one
	sprite: string // spritesData 'weapon' key (gun/rifle skin)
	projectile: string // spritesData 'projectile' key (bolt sprite)
	// --- Combat baselines (Weapon copies these into mutable fields; upgrades bump the copies,
	// so two weapons upgrade independently) ---
	fireSteps: number // steps between shots (lower = faster)
	projectileCount: number // bolts per shot (before Multi-Shot)
	damage: number // per bolt (or, for 'lob', blast damage)
	spread: number // ± radians random deviation per bolt (launch variance for 'lob')
	projectileSpeed: number // bolt travel speed (px/step)
	attackRange: number // px: how close an enemy must be before firing
	coneStep: number // radians between adjacent bolts in a fan
	blastRadius?: number // 'lob' only: detonation AoE radius (px)
	turnRate?: number // 'beam' only: max aim rotation per step (rad) — the laser's slow sweep
}

export const WEAPON_TYPES: Record<WeaponKind, WeaponType> = {
	// Starter — balanced steady single bolt at medium range. Weak at lvl 1 by design; upgrades carry it.
	pistol: {
		kind: 'pistol', name: 'Pistolet', blurb: 'Équilibré : tir régulier, portée moyenne',
		fireMode: 'bolt', sprite: 'gun_1', projectile: 'blue',
		fireSteps: 28, projectileCount: 1, damage: 1, spread: 0.07, projectileSpeed: 8,
		attackRange: 400, coneStep: 0.15
	},
	// Slow, pinpoint, long reach, fast heavy bolts — the standoff pick; rewards positioning.
	rifle: {
		kind: 'rifle', name: 'Fusil', blurb: 'Lent mais précis : longue portée, gros dégâts',
		fireMode: 'bolt', sprite: 'rifle_1', projectile: 'blue',
		fireSteps: 46, projectileCount: 1, damage: 3, spread: 0.015, projectileSpeed: 13,
		attackRange: 640, coneStep: 0.12
	},
	// Short-range wall of pellets: many bolts, wide cone, slow reload. Point-blank only.
	shotgun: {
		kind: 'shotgun', name: 'Fusil à pompe', blurb: 'Nuée de plombs : dévastateur au corps-à-corps',
		fireMode: 'bolt', sprite: 'gun_2', projectile: 'blue',
		fireSteps: 52, projectileCount: 5, damage: 1, spread: 0.16, projectileSpeed: 9,
		attackRange: 300, coneStep: 0.19
	},
	// Bullet hose: very fast cadence, single bolt, wide spray, short reach. Sheer volume.
	smg: {
		kind: 'smg', name: 'Mitraillette', blurb: 'Déluge de balles : cadence folle, dispersion large',
		fireMode: 'bolt', sprite: 'gun_3', projectile: 'blue',
		fireSteps: 9, projectileCount: 1, damage: 1, spread: 0.13, projectileSpeed: 10,
		attackRange: 360, coneStep: 0.15
	},
	// Lobs a grenade on a ballistic arc that blasts on impact — clears clusters, reaches over cover,
	// but slow and telegraphed. `damage` = blast damage, `blastRadius` = reach; projectileSpeed unused
	// (arc solved to target). Multi-Shot lobs more.
	grenade: {
		kind: 'grenade', name: 'Lance-grenade', blurb: "Tir en cloche : explosion de zone à l'impact",
		fireMode: 'lob', sprite: 'gun_2', projectile: 'blue',
		fireSteps: 66, projectileCount: 1, damage: 4, spread: 0.05, projectileSpeed: 9,
		attackRange: 480, coneStep: 0.15, blastRadius: 92
	},
	// Short wide cone hitting EVERY enemy inside it on a fast tick — great on hordes, useless at range.
	// `damage` per tick, `fireSteps` tick interval, `attackRange` cone length (drawn cone == hit zone).
	// Ignores global Range by design; the per-weapon Optique still lengthens the cone.
	flamethrower: {
		kind: 'flamethrower', name: 'Lance-flammes', blurb: 'Cône de feu continu : ravage les hordes serrées',
		fireMode: 'flame', sprite: 'gun_3', projectile: 'blue',
		fireSteps: 9, projectileCount: 1, damage: 2, spread: 0, projectileSpeed: 0,
		attackRange: 178, coneStep: 0.15
	},
	// Continuous piercing beam raking its line. Aim rotates SLOWLY (turnRate) — that sweep is its
	// identity, not a bug. Damage falls off per enemy by distance order (front takes full). `damage`
	// per tick, `fireSteps` tick interval, `attackRange` beam length. Ignores global Range.
	laser: {
		kind: 'laser', name: 'Laser', blurb: 'Rayon perçant continu : balayage lent, dégâts dégressifs',
		fireMode: 'beam', sprite: 'rifle_1', projectile: 'blue',
		fireSteps: 6, projectileCount: 1, damage: 4, spread: 0, projectileSpeed: 0,
		attackRange: 720, coneStep: 0.15, turnRate: 0.02
	}
}
