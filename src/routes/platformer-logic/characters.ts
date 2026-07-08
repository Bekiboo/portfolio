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

import type { WeaponKind } from './weaponTypes'

export type PlayerKind = 'punk'

// How a class deals damage — mapped to an attack routine in GameWorld.playerAttack. Only
// 'ranged' is wired now; 'melee'/'deploy' re-slot there when their classes come back.
export type AttackStyle = 'ranged' | 'melee' | 'deploy'

export interface CharacterType {
	kind: PlayerKind
	name: string // display name
	sprite: string // sprite-sheet key in spritesData
	attackStyle: AttackStyle // which combat system the loop dispatches
	// A character is a chassis: body stats live here, firepower lives in its weapon(s).
	// GameWorld.resetUpgrades restores these each run; maxHp seeds the HP store in startRun().
	maxHp: number
	speed: number // horizontal move speed
	// Weapons equipped at run start (WEAPON_TYPES keys). One rides centred; a milestone can
	// grant a second mid-run (Player.equip), which splits the pair left/right.
	weapons: WeaponKind[]
}

export const CHARACTERS: Record<PlayerKind, CharacterType> = {
	// Starts with a single Pistolet; the second weapon is earned at a level milestone
	// (WEAPON_MILESTONE_LEVEL in GameWorld — a special choose-your-weapon card).
	punk: {
		kind: 'punk', name: 'Punk', sprite: 'punk', attackStyle: 'ranged',
		maxHp: 10, speed: 5, weapons: ['pistol']
	}
}
