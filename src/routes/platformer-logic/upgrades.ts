import { get } from 'svelte/store'
import { level, maxHp, playerHp } from '$lib/game'
import type { GameWorld } from './GameWorld.svelte'

// Run-scoped tunables. Each starts at its base every run (GameWorld.resetUpgrades)
// and is bumped by the level-up upgrades below. The caps keep the snowball from
// trivialising the game (an old build let a player stack 20 pinpoint projectiles
// and vacuum the whole map).
export const BASE_FIRE_STEPS = 20 // physics steps between shots (~3/s)
export const BASE_INVULN = 72 // ~1.2s of i-frames after a hit
export const BASE_MAGNET = 48 // XP-gem pickup radius (px) — small, so the player must sweep the floor
export const BASE_SPEED = 5 // player move speed
export const BASE_SPREAD = 0.07 // base weapon inaccuracy (radians of random deviation per bolt)
export const MAX_MAGNET = 150 // hard cap on pickup radius
export const MAX_PROJECTILES = 6 // hard cap on Multi-Shot
export const MIN_FIRE_STEPS = 6 // hard floor on the fire cadence
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
	{ id: 'rapid', name: 'Rapid Fire', desc: 'Cadence de tir +18%', kind: 'atk',
		apply: (w) => (w.fireSteps = Math.max(MIN_FIRE_STEPS, Math.round(w.fireSteps * 0.82))),
		available: (w) => w.fireSteps > MIN_FIRE_STEPS, weight: () => 3 },
	{ id: 'multi', name: 'Multi-Shot', desc: '+1 projectile (mais disperse plus)', kind: 'atk',
		apply: (w) => w.player.projectileCount++,
		available: (w) => w.player.projectileCount < MAX_PROJECTILES,
		weight: (lvl) => Math.max(1, 3 - Math.floor(lvl / 3)) }, // rarer the higher you climb
	{ id: 'power', name: 'Power Shot', desc: '+1 dégât par tir', kind: 'atk',
		apply: (w) => w.player.damage++, weight: () => 2 },
	{ id: 'focus', name: 'Focus', desc: 'Précision accrue (tir plus serré)', kind: 'atk',
		apply: (w) => (w.player.spread = Math.max(0.015, w.player.spread - 0.02)),
		available: (w) => w.player.spread > 0.02, weight: () => 3 },
	{ id: 'vitality', name: 'Vitality', desc: '+2 PV max (et soigne)', kind: 'def',
		apply: () => { maxHp.update((m) => m + 2); playerHp.update((h) => h + 2) },
		weight: (lvl) => Math.max(1, 2 - Math.floor(lvl / 4)) },
	// (Healing is no longer an upgrade — enemies drop med-kits on the ground instead.)
	{ id: 'iron', name: 'Iron Skin', desc: 'Invincibilité +30%', kind: 'def',
		apply: (w) => (w.invulnSteps = Math.round(w.invulnSteps * 1.3)), weight: () => 3 },
	{ id: 'magnet', name: 'Magnet', desc: 'Rayon de ramassage +34', kind: 'util',
		apply: (w) => (w.magnetRadius = Math.min(MAX_MAGNET, w.magnetRadius + 34)),
		available: (w) => w.magnetRadius < MAX_MAGNET, weight: () => 2 },
	{ id: 'swift', name: 'Swift', desc: 'Vitesse de déplacement +', kind: 'util',
		apply: (w) => (w.player.speed += 0.7), weight: () => 3 },
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
