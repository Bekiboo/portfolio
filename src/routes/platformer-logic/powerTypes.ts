// Data-driven special-power registry (sibling of enemyTypes.ts / weaponTypes.ts) — the seam
// turning 'S' into a chosen active ability. The player carries at most ONE power (granted at a
// milestone), fires it on S, then it cools down.
// Adding a power = one entry here + a case in GameWorld.activatePower (dispatch lives in the
// world since a power touches enemies/i-frames/player motion). Unused stat fields are left 0.

export type PowerKind = 'dash' | 'slam' | 'nova'

export interface PowerType {
	kind: PowerKind
	name: string // display name (milestone card / HUD)
	blurb: string // one-line archetype pitch (milestone card)
	glyph: string // 1-char HUD badge (no sprite needed)
	color: string // HUD accent + shockwave ring colour
	// Baselines — a Power copies the tunable ones into mutable fields (shop bumps the copies).
	cooldownSteps: number // physics steps between uses (60 = 1s)
	invulnSteps: number // i-frames granted on activation (dash: the dash · slam: the plunge)
	duration: number // dash: steps of dash motion (0 for the others)
	speed: number // dash: horizontal px/step · slam: downward px/step · nova: 0
	radius: number // slam/nova: AoE radius px (0 for dash)
	damage: number // slam/nova: AoE damage (0 for dash)
	knockback: number // slam/nova: px the blast shoves each caught enemy
}

export const POWER_TYPES: Record<PowerKind, PowerType> = {
	// Directional dodge: fast horizontal burst in the held/facing direction, invulnerable for
	// its duration. No damage — pure repositioning on a short cooldown.
	dash: {
		kind: 'dash', name: 'Dash', blurb: 'Esquive : ruée invulnérable, recharge courte',
		glyph: '»', color: '#38bdf8', // sky-400
		cooldownSteps: 48, invulnSteps: 12, duration: 10, speed: 22,
		radius: 0, damage: 0, knockback: 0
	},
	// Aerial ground-pound: plunge straight down (i-framed), landing detonates a shockwave that
	// damages + knocks back everything around impact. On the ground it stomps immediately.
	slam: {
		kind: 'slam', name: 'Onde de choc', blurb: "En l'air : plaque au sol, souffle de zone",
		glyph: '↓', color: '#f59e0b', // amber-500
		cooldownSteps: 150, invulnSteps: 30, duration: 0, speed: 26,
		radius: 150, damage: 3, knockback: 60
	},
	// Instant panic nova: burst around the player that damages + shoves every nearby enemy at
	// once. Usable any time, long cooldown — the get-off-me button.
	nova: {
		kind: 'nova', name: 'Nova', blurb: 'Explosion instantanée tout autour de soi',
		glyph: '✷', color: '#e879f9', // fuchsia-400
		cooldownSteps: 210, invulnSteps: 18, duration: 0, speed: 0,
		radius: 130, damage: 2, knockback: 44
	}
}
