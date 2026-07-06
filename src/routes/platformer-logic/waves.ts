import { ENEMY_TYPES, type EnemyKind } from './enemyTypes'

// The difficulty curve — pure policy, "what does wave N look like". Difficulty here is
// AUTHORED, not a smooth ramp: each wave is a themed encounter (a composition of enemy
// kinds, a concurrent cap, a spawn cadence and an advance-speed multiplier). The spawn
// director in GameWorld reads the current wave's WaveDef to top the field up; nothing
// here holds state. Toughness (HP/damage) still ramps smoothly with the wave number on
// top of the theme (waveEnemyHealth / waveContactDamage below).
//
// Design intent: gentle, legible openings (a few slow bikers) that introduce ONE new
// threat vector at a time — flyers, then a brute, then gunfire, then chargers, turrets,
// bombers — instead of piling every kind on at once. Ranged pressure arrives late.
// How long each wave lasts before it steps up. The first two are short on-ramps; from
// wave 3 they open up (30s) so each themed encounter has room to breathe.
export const waveDuration = (w: number) => (w < 3 ? 14000 : 30000)

// Reference advance speed at speedMul 1.0. A wave's `speedMul` scales it, and each chase
// kind scales again by its own `waveSpeedMul` (flyer 0.8, charger 1.05…). Stays well under
// the player's speed (5) so enemies are always outrunnable — pressure is volume, not
// footspeed.
const BASE_ADVANCE = 2.6

export interface WaveDef {
	label: string // banner theme name
	cap: number // max concurrent enemies on the field
	interval: number // ms between spawn ticks
	speedMul: number // multiplies BASE_ADVANCE for this wave's chase kinds
	ground: EnemyKind[] // fodder pool the director draws from to fill the cap (weighted by repetition)
	floors?: Partial<Record<EnemyKind, number>> // guaranteed concurrent count per pressure kind
	eliteAtStart?: EnemyKind // spawn one of these when the wave begins (miniboss beat)
}

// Authored waves 1..N (compact, one row per wave). Past the table, waveDef() scales a
// procedural tail. Each new theme adds a single vector so the player reads the change.
// prettier-ignore — kept as a legible one-line-per-wave table (over printWidth on purpose).
const WAVES: WaveDef[] = [
	// A handful of slow bikers shambling in. Learn to move and shoot.
	{ label: 'Éclaireurs', cap: 5, interval: 1300, speedMul: 0.75, ground: ['biker'] },
	// First air threat: flyers home in from above.
	{ label: 'Nuée', cap: 6, interval: 1200, speedMul: 0.8, ground: ['biker'], floors: { flyer: 2 } },
	// First heavy: a lone brute anchors the wave. Focus-fire practice.
	{ label: 'Colosse', cap: 6, interval: 1150, speedMul: 0.85, ground: ['biker'], floors: { flyer: 1 }, eliteAtStart: 'brute' },
	// First gunfire: a single standoff shooter. Cover starts to matter.
	{ label: 'Ligne de tir', cap: 8, interval: 1050, speedMul: 0.9, ground: ['biker'], floors: { shooter: 1, flyer: 1 } },
	// Chargers join the ground pool; the melee rush gets nervous.
	{ label: 'Meute', cap: 9, interval: 1000, speedMul: 0.95, ground: ['biker', 'biker', 'charger'], floors: { flyer: 2 } },
	// Entrenchment: rolling turrets add a second gun line.
	{ label: 'Enfilade', cap: 10, interval: 950, speedMul: 0.95, ground: ['biker', 'charger'], floors: { shooter: 2, turret: 1 } },
	// Air raid: bombers cruise overhead dropping area blasts.
	{ label: 'Bombardement', cap: 11, interval: 900, speedMul: 1.0, ground: ['biker', 'charger'], floors: { flyer: 2, bomber: 1 } },
	// A second brute inside a full mixed field.
	{ label: 'Cohorte', cap: 12, interval: 850, speedMul: 1.0, ground: ['biker', 'biker', 'charger'], floors: { shooter: 1, turret: 1 }, eliteAtStart: 'brute' },
	// Everything at once, thinning your footing.
	{ label: 'Déferlante', cap: 13, interval: 800, speedMul: 1.05, ground: ['biker', 'charger'], floors: { flyer: 2, shooter: 1, bomber: 1 } },
	// The full storm: every vector, plus a brute.
	{ label: 'Chaos', cap: 14, interval: 750, speedMul: 1.05, ground: ['biker', 'charger'], floors: { flyer: 1, shooter: 1, turret: 1, bomber: 1 }, eliteAtStart: 'brute' }
]

// The current wave's definition. Past the authored table the endless tail scales from the
// last wave: cap and speed creep up to a ceiling, interval down to a floor, ranged pressure
// holds, and a brute anchors every third wave. Bounded so it stays hard-but-fair.
export function waveDef(w: number): WaveDef {
	if (w <= WAVES.length) return WAVES[w - 1]
	const over = w - WAVES.length
	return {
		label: 'Survie',
		cap: Math.min(16, 14 + Math.floor(over / 2)),
		interval: Math.max(620, 750 - over * 15),
		speedMul: Math.min(1.25, 1.05 + over * 0.02),
		ground: ['biker', 'charger'],
		floors: { flyer: 2, shooter: 1, turret: 1, bomber: 1 },
		eliteAtStart: over % 3 === 0 ? 'brute' : undefined
	}
}

// Thin per-wave accessors the director reads (kept as functions so GameWorld's call sites
// are unchanged from the old continuous curve).
export const waveSpawnInterval = (w: number) => waveDef(w).interval
export const waveEnemyCap = (w: number) => waveDef(w).cap
export const waveEnemySpeed = (w: number) => BASE_ADVANCE * waveDef(w).speedMul

// Toughness: per-kind base HP + 1 for every 3 waves cleared.
export const waveEnemyHealth = (kind: EnemyKind, w: number) =>
	ENEMY_TYPES[kind].health + Math.floor((w - 1) / 3)

// Contact/shot/blast damage: a gentle ramp — most hits stay 1 until later waves,
// brutes/bombers start at 2 (their `contactBase`). Keeps it "nervous but survivable".
export const waveContactDamage = (kind: EnemyKind, w: number) =>
	ENEMY_TYPES[kind].contactBase + Math.floor((w - 1) / 5)
