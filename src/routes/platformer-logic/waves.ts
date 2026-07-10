import { ENEMY_TYPES, type EnemyKind } from './enemyTypes'

// The difficulty curve — pure policy, stateless. Each wave is an AUTHORED themed
// encounter (enemy kinds + concurrent cap + spawn cadence + advance-speed mul); the
// GameWorld spawn director reads the current WaveDef to top the field up. Toughness
// (HP/damage) ramps smoothly on top (waveEnemyHealth / waveContactDamage below).
// Intent: introduce ONE new threat vector at a time; ranged pressure arrives late.

// Combat-phase length before the intermission: 30s (wave 1) +10s/wave, capped 60s.
// After it the field clears and the player walks back to spawn (GameWorld intermission).
export const waveDuration = (w: number) => Math.min(60000, 30000 + (w - 1) * 10000)

// Reference advance speed at speedMul 1.0; a wave's `speedMul` and each chase kind's own
// `waveSpeedMul` scale it. Kept under the player's speed (5) so enemies are outrunnable —
// pressure is volume, not footspeed.
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

// Authored waves 1..N, one row each; past the table waveDef() scales a procedural tail.
// prettier-ignore — kept as a legible one-line-per-wave table (over printWidth on purpose).
const WAVES: WaveDef[] = [
	// A handful of slow bikers shambling in. Learn to move and shoot.
	{ label: 'Éclaireurs', cap: 8, interval: 1100, speedMul: 0.75, ground: ['biker'] },
	// First air threat: flyers home in from above.
	{ label: 'Nuée', cap: 10, interval: 1050, speedMul: 0.8, ground: ['biker'], floors: { flyer: 2 } },
	// First heavy: a lone brute anchors the wave. Focus-fire practice.
	{ label: 'Colosse', cap: 9, interval: 1050, speedMul: 0.85, ground: ['biker'], floors: { flyer: 1 }, eliteAtStart: 'brute' },
	// First gunfire: a single standoff shooter. Cover starts to matter.
	{ label: 'Ligne de tir', cap: 11, interval: 1000, speedMul: 0.9, ground: ['biker'], floors: { shooter: 1, flyer: 1 } },
	// Chargers join the ground pool; the melee rush gets nervous.
	{ label: 'Meute', cap: 13, interval: 950, speedMul: 0.95, ground: ['biker', 'biker', 'charger'], floors: { flyer: 2 } },
	// Entrenchment: rolling turrets add a second gun line.
	{ label: 'Enfilade', cap: 13, interval: 900, speedMul: 0.95, ground: ['biker', 'charger'], floors: { shooter: 2, turret: 1 } },
	// Air raid: bombers cruise overhead dropping area blasts.
	{ label: 'Bombardement', cap: 14, interval: 850, speedMul: 1.0, ground: ['biker', 'charger'], floors: { flyer: 2, bomber: 1 } },
	// A second brute inside a full mixed field.
	{ label: 'Cohorte', cap: 15, interval: 800, speedMul: 1.0, ground: ['biker', 'biker', 'charger'], floors: { shooter: 1, turret: 1 }, eliteAtStart: 'brute' },
	// Everything at once, thinning your footing.
	{ label: 'Déferlante', cap: 16, interval: 780, speedMul: 1.05, ground: ['biker', 'charger'], floors: { flyer: 2, shooter: 1, bomber: 1 } },
	// The full storm: every vector, plus a brute.
	{ label: 'Chaos', cap: 17, interval: 750, speedMul: 1.05, ground: ['biker', 'charger'], floors: { flyer: 1, shooter: 1, turret: 1, bomber: 1 }, eliteAtStart: 'brute' }
]

// Current wave's def. Past the table the endless tail scales from the last wave (bounded):
// cap/speed creep to a ceiling, interval to a floor, and a brute anchors every third wave.
export function waveDef(w: number): WaveDef {
	if (w <= WAVES.length) return WAVES[w - 1]
	const over = w - WAVES.length
	return {
		label: 'Survie',
		cap: Math.min(20, 17 + Math.floor(over / 2)),
		interval: Math.max(620, 750 - over * 15),
		speedMul: Math.min(1.25, 1.05 + over * 0.02),
		ground: ['biker', 'charger'],
		floors: { flyer: 2, shooter: 1, turret: 1, bomber: 1 },
		eliteAtStart: over % 3 === 0 ? 'brute' : undefined
	}
}

// Thin per-wave accessors the director reads (functions, so GameWorld call sites are
// unchanged from the old continuous curve).
export const waveSpawnInterval = (w: number) => waveDef(w).interval
export const waveEnemySpeed = (w: number) => BASE_ADVANCE * waveDef(w).speedMul

// Toughness: per-kind base HP + 1 for every 3 waves cleared.
export const waveEnemyHealth = (kind: EnemyKind, w: number) =>
	ENEMY_TYPES[kind].health + Math.floor((w - 1) / 3)

// Contact/shot/blast damage: gentle ramp from each kind's `contactBase` (+1 every 5 waves).
export const waveContactDamage = (kind: EnemyKind, w: number) =>
	ENEMY_TYPES[kind].contactBase + Math.floor((w - 1) / 5)
