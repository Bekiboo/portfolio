import { ENEMY_TYPES, type EnemyKind } from './enemyTypes'

// The difficulty curve — pure policy, "how hard is wave N". The spawn director in
// GameWorld reads these to decide rate, cap, speed and per-kind toughness; nothing
// here holds state. Difficulty escalates continuously: every WAVE_DURATION of play
// the wave steps up, shrinking the spawn interval and raising the count/speed (chase
// speed stays below the player's so they can always be outrun).
export const WAVE_DURATION = 14000 // ms of play per wave

export const waveSpawnInterval = (w: number) => Math.max(480, 1400 - (w - 1) * 130)
export const waveEnemyCap = (w: number) => Math.min(14, 6 + (w - 1))
export const waveEnemySpeed = (w: number) => Math.min(4.2, 2.4 + (w - 1) * 0.22)

// Odds a ground slot is a dashing charger rather than a plain biker (grows with
// wave) — a director policy over the two ground-pool kinds.
export const chargerChance = (w: number) => (w < 2 ? 0 : Math.min(0.5, (w - 1) * 0.08))

// Toughness: per-kind base HP + 1 for every 3 waves cleared.
export const waveEnemyHealth = (kind: EnemyKind, w: number) =>
	ENEMY_TYPES[kind].health + Math.floor((w - 1) / 3)

// Contact/shot/blast damage: a gentle ramp — most hits stay 1 until later waves,
// brutes/bombers start at 2 (their `contactBase`). Keeps it "nervous but survivable".
export const waveContactDamage = (kind: EnemyKind, w: number) =>
	ENEMY_TYPES[kind].contactBase + Math.floor((w - 1) / 5)

// Registry-derived kind groups (computed once): pressure types drive the spawn
// floors; elite types re-anchor each new wave. Declaration order in ENEMY_TYPES is
// preserved (flyer, shooter, turret, bomber) so the director's tie-break is stable.
export const PRESSURE_KINDS = (Object.keys(ENEMY_TYPES) as EnemyKind[]).filter(
	(k) => ENEMY_TYPES[k].floor
)
export const ELITE_KINDS = (Object.keys(ENEMY_TYPES) as EnemyKind[]).filter(
	(k) => ENEMY_TYPES[k].elite
)
