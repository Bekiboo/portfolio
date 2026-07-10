// Data-driven player-character registry — twin of enemyTypes.ts. Base stats, sprite sheet and
// combat system (attackStyle) live in one entry; Player.applyCharacter configures the single
// instance and GameWorld.playerAttack dispatches on `attackStyle` (same shape as enemies).
// Only base Punk (ranged) ships; the multi-class system is PARKED — restore from git (commits
// 5d8eea8, ddb65da), see ROADMAP.md. Registry + dispatch is kept as the re-add seam.

import type { WeaponKind } from './weaponTypes'

export type PlayerKind = 'punk'

// How a class deals damage — mapped to a routine in GameWorld.playerAttack. Only 'ranged' is
// wired; 'melee'/'deploy' re-slot there when their classes return.
export type AttackStyle = 'ranged' | 'melee' | 'deploy'

export interface CharacterType {
	kind: PlayerKind
	name: string // display name
	sprite: string // sprite-sheet key in spritesData
	attackStyle: AttackStyle // which combat system the loop dispatches
	// Body stats (firepower lives in the weapons). GameWorld.resetUpgrades restores these each
	// run; maxHp seeds the HP store in startRun().
	maxHp: number
	speed: number // horizontal move speed
	// Weapons at run start (WEAPON_TYPES keys). One rides centred; a milestone can grant a
	// second mid-run (Player.equip), splitting the pair left/right.
	weapons: WeaponKind[]
}

export const CHARACTERS: Record<PlayerKind, CharacterType> = {
	// Starts with a single Pistolet; a 2nd weapon is earned at a milestone
	// (WEAPON_MILESTONE_LEVEL in GameWorld).
	punk: {
		kind: 'punk', name: 'Punk', sprite: 'punk', attackStyle: 'ranged',
		maxHp: 10, speed: 5, weapons: ['pistol']
	}
}
