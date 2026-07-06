// Data-driven player-character registry — the player-side twin of enemyTypes.ts. A
// character's base stats, sprite sheet and *combat system* (attackStyle) live in one entry;
// the single Player instance is configured from it (Player.applyCharacter) and the loop
// dispatches its attack on `attackStyle` (GameWorld.playerAttack) — the same registry-plus-
// dispatch shape the enemies use (ENEMY_TYPES + switch(behavior)).
//
// Only the base Punk (ranged) ships today. The multi-class system (Biker melee, Cyborg
// turret-summoner, the selection UI + per-class abilities) is PARKED — restore it from git
// (commits 5d8eea8 "Turret + Drone" and ddb65da "cyborg + biker"); see ROADMAP.md. The
// registry + attackStyle dispatch is kept as the seam so re-adding a class is just another
// entry here plus wiring its attackStyle case.

export type PlayerKind = 'punk'

// How a class deals damage — mapped to an attack routine in GameWorld.playerAttack. Only
// 'ranged' is wired now; 'melee'/'deploy' re-slot there when their classes come back.
export type AttackStyle = 'ranged' | 'melee' | 'deploy'

export interface CharacterType {
	kind: PlayerKind
	name: string // display name
	sprite: string // sprite-sheet key in spritesData
	attackStyle: AttackStyle // which combat system the loop dispatches
	// Base run stats — GameWorld.resetUpgrades restores these each run (the level-up
	// upgrades bump from here); maxHp seeds the HP store in startRun().
	maxHp: number
	speed: number // horizontal move speed
	fireSteps: number // steps between shots
	projectileCount: number // bolts per shot before Multi-Shot
	damage: number // damage per bolt (Power Shot bumps it)
	spread: number // ranged inaccuracy (radians of random deviation per bolt)
	projectileSpeed: number // bolt travel speed (px/step before the Velocity upgrade)
}

export const CHARACTERS: Record<PlayerKind, CharacterType> = {
	// Deliberately weak at level 1 — a slow cadence and slow bolts. The level-up upgrades
	// (Rapid Fire, Velocity, Focus…) are what turn it into a real weapon; that ramp is the fun.
	punk: {
		kind: 'punk', name: 'Punk', sprite: 'punk', attackStyle: 'ranged',
		maxHp: 10, speed: 5, fireSteps: 28, projectileCount: 1, damage: 1, spread: 0.07, projectileSpeed: 8
	}
}
