// Data-driven player-character registry — the player-side twin of enemyTypes.ts.
// Everything that distinguishes the three playable classes (base stats, look, and which
// *combat system* they use) lives here in one entry per kind. Selecting a class
// reconfigures the single Player instance from its entry (Player.applyCharacter); the
// game loop dispatches its attack on `attackStyle` (GameWorld.playerAttack) — the same
// registry-plus-dispatch shape the enemies use (ENEMY_TYPES + switch(behavior)).
//
// Each class is a genuinely different playstyle (Slay-the-Spire / StarCraft-style), not
// a melee-vs-ranged stat swap:
//   punk   — duelliste : fragile & rapide, mitraille à distance (ranged).
//   biker  — bagarreur : costaud & lent, arc de mêlée auto + soin-au-kill (melee).
//   cyborg — ingénieur : déploie des tourelles alliées qui se battent seules (deploy).

export type PlayerKind = 'punk' | 'biker' | 'cyborg'

// How a class deals damage. The loop maps each to an attack routine; several could share
// one later, exactly like enemy `Behavior`.
export type AttackStyle = 'ranged' | 'melee' | 'deploy'

export interface CharacterType {
	kind: PlayerKind
	name: string // display name (selection card)
	tagline: string // one-line playstyle hook, FR (selection card)
	accent: string // CSS colour for the card accent + selected ring
	sprite: string // sprite-sheet key in spritesData (punk/biker/cyborg)
	attackStyle: AttackStyle // which combat system the loop dispatches
	// Base run stats — GameWorld.resetUpgrades restores these each run (the level-up
	// upgrades bump from here); maxHp seeds the HP store in startRun().
	maxHp: number
	speed: number // horizontal move speed
	fireSteps: number // steps between attacks (fire / swing / DEPLOY cadence)
	projectileCount: number // bolts per shot (ranged) before Multi-Shot
	damage: number // damage per hit (ranged bolt / melee swing; turrets carry their own)
	spread: number // ranged inaccuracy (radians of random deviation per bolt)
}

// Numbers are starting points, tuned in playtest — the game is balanced around ~10 HP,
// so Punk reads fragile, Biker tanky, Cyborg middle. Order defines the 1/2/3 mapping.
export const CHARACTERS: Record<PlayerKind, CharacterType> = {
	// Glass cannon: squishiest, fastest, tightest aim, quickest cadence.
	punk: {
		kind: 'punk', name: 'Punk', tagline: 'Fragile & rapide — mitraille à distance', accent: '#f87171',
		sprite: 'punk', attackStyle: 'ranged',
		maxHp: 7, speed: 5.5, fireSteps: 18, projectileCount: 1, damage: 1, spread: 0.06
	},
	// Juggernaut: tankiest, slowest, hits hardest. Auto melee arc + heal-on-kill.
	biker: {
		kind: 'biker', name: 'Biker', tagline: 'Costaud & lent — encaisse et fracasse', accent: '#fbbf24',
		sprite: 'biker', attackStyle: 'melee',
		maxHp: 13, speed: 4.2, fireSteps: 22, projectileCount: 1, damage: 2, spread: 0.09
	},
	// Engineer: never attacks directly — `fireSteps` is the DEPLOY interval (steps between
	// dropping a friendly turret); turret fire/damage/lifespan are GameWorld run tunables.
	// Rapid Fire shortens the deploy interval.
	cyborg: {
		kind: 'cyborg', name: 'Cyborg', tagline: 'Ingénieur — déploie des tourelles alliées', accent: '#22d3ee',
		sprite: 'cyborg', attackStyle: 'deploy',
		maxHp: 9, speed: 4.8, fireSteps: 80, projectileCount: 1, damage: 1, spread: 0.07
	}
}

// Ordered list for the selection UI + keyboard mapping (index 0 → key "1", etc.).
export const CHARACTER_LIST: CharacterType[] = [CHARACTERS.punk, CHARACTERS.biker, CHARACTERS.cyborg]
