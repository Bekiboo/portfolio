import { get } from 'svelte/store'
import { level, maxHp, playerHp } from '$lib/game'
import type { GameWorld } from './GameWorld.svelte'

// Run-scoped tunables. Each starts at its base every run (GameWorld.resetUpgrades)
// and is bumped by the level-up upgrades below. The caps keep the snowball from
// trivialising the game (an old build let a player stack 20 pinpoint projectiles
// and vacuum the whole map).
export const BASE_FIRE_STEPS = 28 // physics steps between shots (~2/s — deliberately slow at lvl 1)
export const BASE_INVULN = 72 // ~1.2s of i-frames after a hit
export const BASE_MAGNET = 48 // XP-gem pickup radius (px) — small, so the player must sweep the floor
export const BASE_SPEED = 5 // player move speed
export const BASE_SPREAD = 0.07 // base weapon inaccuracy (radians of random deviation per bolt)
export const BASE_PROJECTILE_SPEED = 8 // bolt travel speed at lvl 1 (slow; Velocity raises it)
export const BASE_JUMP = 8 // jump velocity at lvl 1 (Spring raises it)
export const BASE_ATTACK_RANGE = 400 // px: enemies must be this close before the player opens fire (bolts still fly full distance; Optique raises it)
export const BASE_SHIELD_MAX = 1 // shield charges when full (each absorbs one hit)
export const BASE_SHIELD_REGEN = 480 // steps to regen one shield charge (~8s at 60Hz)
export const MAX_SHIELD_MAX = 4 // hard cap on shield charges
export const MIN_SHIELD_REGEN = 180 // fastest shield regen (~3s)
export const MAX_MAGNET = 200 // hard cap on pickup radius
export const MAX_PROJECTILES = 6 // hard cap on Multi-Shot
export const MAX_PROJECTILE_SPEED = 16 // hard cap on bolt speed
export const MAX_JUMP = 13 // hard cap on jump velocity
export const MAX_ATTACK_RANGE = 820 // hard cap on the engagement range
export const RANGE_STEP = 90 // px added per Optique pick
export const MIN_FIRE_STEPS = 6 // hard floor on the fire cadence
export const MIN_SPREAD = 0.01 // hard floor on inaccuracy (Focus can't go below this)
export const REGEN_PER_STACK = 1 / 300 // one Regen stack = +1 HP / 5s (300 physics steps at 60Hz)
export const BASE_REROLLS = 3 // rerolls granted per run (DRG-style agency without a shop)

// On each level-up the game freezes and offers 3 of these at random. Most stack
// indefinitely (VS-style); Bandage-style heals are handled by ground med-kits, not
// here. `apply`/`available` take the GameWorld so an upgrade can mutate run state.
export type UpgradeKind = 'atk' | 'def' | 'util'
export interface Upgrade {
	id: string
	name: string
	desc: string
	kind: UpgradeKind
	apply: (w: GameWorld) => void
	available?: (w: GameWorld) => boolean // hard gate: hides the pick (cap reached / situational)
	weight?: (lvl: number) => number // rarity: higher = commoner. Power spikes thin out with level.
}

export const UPGRADES: Upgrade[] = [
	{ id: 'rapid', name: 'Rapid Fire', desc: "Cadence d'attaque +18%", kind: 'atk',
		apply: (w) => (w.fireSteps = Math.max(MIN_FIRE_STEPS, Math.round(w.fireSteps * 0.82))),
		available: (w) => w.fireSteps > MIN_FIRE_STEPS, weight: () => 3 }, // common: fire rate
	{ id: 'velocity', name: 'Velocity', desc: 'Projectiles plus rapides (+2)', kind: 'atk',
		apply: (w) => (w.player.projectileSpeed = Math.min(MAX_PROJECTILE_SPEED, w.player.projectileSpeed + 2)),
		available: (w) => w.player.projectileSpeed < MAX_PROJECTILE_SPEED, weight: () => 3 },
	// Engagement range: the player opens fire on enemies farther out (bolts already fly full distance).
	{ id: 'scope', name: 'Optique', desc: "Ouvre le feu de plus loin (+90)", kind: 'atk',
		apply: (w) => (w.attackRange = Math.min(MAX_ATTACK_RANGE, w.attackRange + RANGE_STEP)),
		available: (w) => w.attackRange < MAX_ATTACK_RANGE, weight: () => 2 },
	{ id: 'multi', name: 'Multi-Shot', desc: '+1 projectile (mais disperse plus)', kind: 'atk',
		apply: (w) => w.player.projectileCount++,
		available: (w) => w.player.projectileCount < MAX_PROJECTILES,
		weight: (lvl) => Math.max(1, 3 - Math.floor(lvl / 3)) }, // rarer the higher you climb
	{ id: 'power', name: 'Power Shot', desc: '+1 dégât par attaque', kind: 'atk',
		apply: (w) => w.player.damage++, weight: () => 2 },
	// Rare but strong: each pick halves the spread — a couple of these make the weapon pinpoint.
	{ id: 'focus', name: 'Focus', desc: 'Précision nettement accrue (dispersion ÷2)', kind: 'atk',
		apply: (w) => (w.player.spread = Math.max(MIN_SPREAD, w.player.spread * 0.5)),
		available: (w) => w.player.spread > MIN_SPREAD + 0.001, weight: () => 1 },
	{ id: 'vitality', name: 'Vitality', desc: '+2 PV max (et soigne)', kind: 'def',
		apply: () => { maxHp.update((m) => m + 2); playerHp.update((h) => h + 2) },
		weight: (lvl) => Math.max(1, 2 - Math.floor(lvl / 4)) },
	// Passive heal, cumulable: each stack adds +1 HP / 5s (GameWorld.applyRegen banks it).
	{ id: 'regen', name: 'Regen', desc: 'Régénération : +1 PV / 5 s (cumulable)', kind: 'def',
		apply: (w) => (w.regenPerStep += REGEN_PER_STACK), weight: () => 2 },
	// Shield capacity: one more hit absorbed before it breaks (and refills immediately).
	{ id: 'bulwark', name: 'Bulwark', desc: 'Bouclier : +1 charge (absorbe un coup de plus)', kind: 'def',
		apply: (w) => { w.shieldMax = Math.min(MAX_SHIELD_MAX, w.shieldMax + 1); w.shieldCharges++ },
		available: (w) => w.shieldMax < MAX_SHIELD_MAX, weight: () => 2 },
	// Shield recharge speed: the broken shield comes back sooner.
	{ id: 'recharge', name: 'Recharge', desc: 'Bouclier : recharge +20% plus vite', kind: 'def',
		apply: (w) => (w.shieldRegenSteps = Math.max(MIN_SHIELD_REGEN, Math.round(w.shieldRegenSteps * 0.8))),
		available: (w) => w.shieldRegenSteps > MIN_SHIELD_REGEN, weight: () => 2 },
	// Bigger pull, rarer roll: a real commitment pick rather than chip value.
	{ id: 'magnet', name: 'Magnet', desc: 'Rayon de ramassage +50', kind: 'util',
		apply: (w) => (w.magnetRadius = Math.min(MAX_MAGNET, w.magnetRadius + 50)),
		available: (w) => w.magnetRadius < MAX_MAGNET, weight: () => 1 },
	{ id: 'swift', name: 'Swift', desc: 'Vitesse de déplacement +', kind: 'util',
		apply: (w) => (w.player.speed += 0.7), weight: () => 3 },
	{ id: 'spring', name: 'Spring', desc: 'Saut plus haut', kind: 'util',
		apply: (w) => (w.player.jumpStrength = Math.min(MAX_JUMP, w.player.jumpStrength + 1.2)),
		available: (w) => w.player.jumpStrength < MAX_JUMP, weight: () => 2 },
	{ id: 'greed', name: 'Greed', desc: '+1 XP par gemme', kind: 'util',
		apply: (w) => (w.xpMul += 1), weight: (lvl) => Math.max(1, 2 - Math.floor(lvl / 5)) }
]

// Draw 3 distinct available upgrades, weighted by rarity so power spikes show up
// less often (and thin out further as the level climbs). Weighted sampling without
// replacement.
export const rollChoices = (w: GameWorld): Upgrade[] => {
	const lvl = get(level)
	const bag = UPGRADES.filter((u) => !u.available || u.available(w)).map((u) => ({
		u,
		wt: Math.max(0.0001, u.weight ? u.weight(lvl) : 3)
	}))
	const picks: Upgrade[] = []
	const n = Math.min(3, bag.length)
	for (let k = 0; k < n; k++) {
		let total = 0
		for (const b of bag) total += b.wt
		let r = Math.random() * total
		let idx = 0
		for (; idx < bag.length - 1; idx++) {
			r -= bag[idx].wt
			if (r <= 0) break
		}
		picks.push(bag[idx].u)
		bag.splice(idx, 1)
	}
	return picks
}
