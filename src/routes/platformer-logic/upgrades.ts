import { get } from 'svelte/store'
import { level, maxHp, playerHp } from '$lib/game'
import type { GameWorld } from './GameWorld.svelte'
import { WEAPON_TYPES, type WeaponKind } from './weaponTypes'
import { POWER_TYPES, type PowerKind } from './powerTypes'
import type { Weapon } from './Weapon'
import type { Power } from './Power'

// Run-scoped tunables. Each starts at its base every run (GameWorld.resetUpgrades)
// and is bumped by the level-up upgrades below. The caps keep the snowball from
// trivialising the game (an old build let a player stack 20 pinpoint projectiles
// and vacuum the whole map).
export const BASE_INVULN = 72 // ~1.2s of i-frames after a hit
export const BASE_MAGNET = 48 // XP-gem pickup radius (px) — small, so the player must sweep the floor
export const BASE_JUMP = 8 // jump velocity at lvl 1 (Spring raises it)
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
export const MIN_POWER_COOLDOWN = 24 // hard floor on a power's recharge (~0.4s) — shop Recharge can't go below

// --- Brotato global-stat tuning (the XP pool) ---
export const CRIT_MULT = 2 // a critical bolt deals this × its (already +Damage) damage
export const MAX_CRIT = 0.75 // crit-chance cap
export const MAX_DODGE = 0.6 // dodge-chance cap (never fully untouchable)
export const MAX_ARMOR = 0.75 // damage-reduction cap
export const MAX_LIFESTEAL = 0.5 // life-steal proc-chance cap
export const MAX_RANGE_BONUS = 360 // cap on the global engagement-range bonus
export const MIN_FIRE_MUL = 0.4 // floor on the global cadence multiplier (Attack Speed)

// On each level-up the game freezes and offers 3 of these at random. Most stack
// indefinitely (VS-style); Bandage-style heals are handled by ground med-kits, not
// here. `apply`/`available` take the GameWorld so an upgrade can mutate run state.
export type UpgradeKind = 'atk' | 'def' | 'util' | 'weapon' | 'power'
// Economy split (roadmap chantier 2): 'generic' upgrades are the forced VS-style
// XP rewards (HP, speed, jump, magnet, regen, shield, global cadence); 'weapon'/'power'
// upgrades are the *chosen* ones that will move to the paid credits shop (chantier 5).
// Every upgrade is tagged now so the migration is a one-line flip of WEAPON_UPGRADES_IN_XP.
export type UpgradeScope = 'generic' | 'weapon' | 'power'
export interface Upgrade {
	id: string
	name: string
	desc: string
	kind: UpgradeKind
	scope: UpgradeScope
	apply: (w: GameWorld) => void
	available?: (w: GameWorld) => boolean // hard gate: hides the pick (cap reached / situational)
	weight?: (lvl: number) => number // rarity: higher = commoner. Power spikes thin out with level.
}

// The XP pool is now purely Brotato-style GLOBAL CHARACTER STATS (roadmap: XP = forced generic
// progression). Per-weapon tuning (cadence/spread/bolt count…) and per-power tuning live in the
// paid intermission shop instead (WEAPON_SHOP / POWER_SHOP below), so nothing here touches a
// single weapon — every pick modifies the character. GameWorld's combat resolution reads these
// stat fields (bonusDamage, critChance, dodgeChance, armorReduction, lifeStealChance, rangeBonus,
// fireRateMul, luck); Max HP / Speed / Regen bump the HP store / player.speed / regenPerStep.
export const UPGRADES: Upgrade[] = [
	// --- Offense ---
	{ id: 'damage', name: 'Dégâts', desc: '+1 dégât à chaque tir', kind: 'atk', scope: 'generic',
		apply: (w) => (w.bonusDamage += 1), weight: () => 3 },
	{ id: 'attackspeed', name: 'Cadence', desc: "Vitesse d'attaque +10%", kind: 'atk', scope: 'generic',
		apply: (w) => (w.fireRateMul = Math.max(MIN_FIRE_MUL, w.fireRateMul * 0.9)),
		available: (w) => w.fireRateMul > MIN_FIRE_MUL, weight: () => 3 },
	{ id: 'crit', name: 'Chance de critique', desc: '+6% de coup critique (×2 dégâts)', kind: 'atk', scope: 'generic',
		apply: (w) => (w.critChance = Math.min(MAX_CRIT, w.critChance + 0.06)),
		available: (w) => w.critChance < MAX_CRIT, weight: () => 2 },
	{ id: 'range', name: 'Portée', desc: 'Ouvre le feu de plus loin (+60)', kind: 'atk', scope: 'generic',
		apply: (w) => (w.rangeBonus = Math.min(MAX_RANGE_BONUS, w.rangeBonus + 60)),
		available: (w) => w.rangeBonus < MAX_RANGE_BONUS, weight: () => 2 },
	{ id: 'lifesteal', name: 'Vol de vie', desc: '+8% de chance de soigner sur tir touché', kind: 'atk', scope: 'generic',
		apply: (w) => (w.lifeStealChance = Math.min(MAX_LIFESTEAL, w.lifeStealChance + 0.08)),
		available: (w) => w.lifeStealChance < MAX_LIFESTEAL, weight: () => 1 },
	// --- Defense ---
	{ id: 'maxhp', name: 'PV Max', desc: '+3 PV max (et soigne)', kind: 'def', scope: 'generic',
		apply: () => { maxHp.update((m) => m + 3); playerHp.update((h) => h + 3) },
		weight: (lvl) => Math.max(1, 3 - Math.floor(lvl / 5)) },
	{ id: 'armor', name: 'Armure', desc: 'Dégâts subis -8%', kind: 'def', scope: 'generic',
		apply: (w) => (w.armorReduction = Math.min(MAX_ARMOR, w.armorReduction + 0.08)),
		available: (w) => w.armorReduction < MAX_ARMOR, weight: () => 2 },
	{ id: 'dodge', name: 'Esquive', desc: "+5% de chance d'esquiver un coup", kind: 'def', scope: 'generic',
		apply: (w) => (w.dodgeChance = Math.min(MAX_DODGE, w.dodgeChance + 0.05)),
		available: (w) => w.dodgeChance < MAX_DODGE, weight: () => 2 },
	// Passive heal, cumulable: each stack adds +1 HP / 5s (GameWorld.applyRegen banks it).
	{ id: 'regen', name: 'Régénération', desc: '+1 PV / 5 s (cumulable)', kind: 'def', scope: 'generic',
		apply: (w) => (w.regenPerStep += REGEN_PER_STACK), weight: () => 2 },
	// --- Utility ---
	{ id: 'speed', name: 'Vitesse', desc: 'Déplacement plus rapide', kind: 'util', scope: 'generic',
		apply: (w) => (w.player.speed += 0.6), weight: () => 3 },
	{ id: 'luck', name: 'Chance', desc: '+15% de drops (soins, crédits)', kind: 'util', scope: 'generic',
		apply: (w) => (w.luck += 0.15), weight: () => 2 }
]

// Draw 3 distinct available upgrades, weighted by rarity so power spikes show up
// less often (and thin out further as the level climbs). Weighted sampling without
// replacement.
export const rollChoices = (w: GameWorld): Upgrade[] => {
	const lvl = get(level)
	// XP pool = the global character stats above, minus any that have hit their cap (their own
	// `available` gate). Weighted so power spikes (crit, life steal) show up less often.
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

// The weapon-milestone offer: one card per archetype the player DOESN'T already hold, each
// adding it as the second weapon (Player.addWeapon — the first weapon's upgrades survive).
// Presented in place of the normal upgrade roll on the milestone level-up (see GameWorld);
// not part of the XP pool, so it never rolls by chance.
export const weaponChoices = (w: GameWorld): Upgrade[] => {
	const held = new Set(w.player.weapons.map((wp) => wp.type.kind))
	return (Object.keys(WEAPON_TYPES) as WeaponKind[])
		.filter((k) => !held.has(k))
		.map((k) => ({
			id: `weapon:${k}`,
			name: WEAPON_TYPES[k].name,
			desc: WEAPON_TYPES[k].blurb,
			kind: 'weapon' as const,
			scope: 'weapon' as const,
			apply: (world: GameWorld) => world.player.addWeapon(k)
		}))
}

// The power-milestone offer: one card per special power the player doesn't already hold, each
// equipping it as the S-key ability (Player.equipPower). Presented in place of the normal roll
// on the power milestone (see GameWorld.openPick); never part of the XP pool. In v1 the player
// holds no power until this card, so it always offers the full set.
export const powerChoices = (w: GameWorld): Upgrade[] => {
	return (Object.keys(POWER_TYPES) as PowerKind[])
		.filter((k) => w.player.power?.type.kind !== k)
		.map((k) => ({
			id: `power:${k}`,
			name: POWER_TYPES[k].name,
			desc: POWER_TYPES[k].blurb,
			kind: 'power' as const,
			scope: 'power' as const,
			apply: (world: GameWorld) => world.player.equipPower(k)
		}))
}

// --- Intermission shop (roadmap chantier 5) --------------------------------------------------
// The paid, *chosen* half of the economy: unlike the forced XP roll, shop offers are specific
// to a single held weapon/power INSTANCE (so a dual-wielder tunes each gun separately — the
// per-weapon purchases chantier 3 deferred). A template below is paired with a concrete Weapon
// or Power at roll time (buildShopCandidates), captured in the offer's closures.

interface WeaponShopTpl {
	id: string
	name: string // shown after the weapon name: "Pistolet · <name>"
	desc: string
	cost: number
	apply: (wp: Weapon) => void
	available: (wp: Weapon) => boolean
}

// Per-weapon purchases — the shop twin of the weapon UPGRADES, but each bumps ONE weapon.
const WEAPON_SHOP: WeaponShopTpl[] = [
	{ id: 'rapid', name: 'Cadence +18%', desc: 'Tire plus vite', cost: 10,
		apply: (wp) => (wp.fireSteps = Math.max(MIN_FIRE_STEPS, Math.round(wp.fireSteps * 0.82))),
		available: (wp) => wp.fireSteps > MIN_FIRE_STEPS },
	{ id: 'velocity', name: 'Vélocité +2', desc: 'Projectiles plus rapides', cost: 8,
		apply: (wp) => (wp.projectileSpeed = Math.min(MAX_PROJECTILE_SPEED, wp.projectileSpeed + 2)),
		available: (wp) => wp.projectileSpeed < MAX_PROJECTILE_SPEED },
	{ id: 'scope', name: 'Optique +90', desc: 'Ouvre le feu de plus loin', cost: 8,
		apply: (wp) => (wp.attackRange = Math.min(MAX_ATTACK_RANGE, wp.attackRange + RANGE_STEP)),
		available: (wp) => wp.attackRange < MAX_ATTACK_RANGE },
	{ id: 'multi', name: 'Multi-Shot +1', desc: '+1 projectile (disperse plus)', cost: 18,
		apply: (wp) => wp.projectileCount < MAX_PROJECTILES && wp.projectileCount++,
		available: (wp) => wp.projectileCount < MAX_PROJECTILES },
	{ id: 'power', name: 'Power Shot +1', desc: '+1 dégât par tir', cost: 12,
		apply: (wp) => wp.damage++, available: () => true },
	{ id: 'focus', name: 'Focus', desc: 'Dispersion ÷2', cost: 14,
		apply: (wp) => (wp.spread = Math.max(MIN_SPREAD, wp.spread * 0.5)),
		available: (wp) => wp.spread > MIN_SPREAD + 0.001 }
]

interface PowerShopTpl {
	id: string
	name: string
	desc: string
	cost: number
	apply: (pw: Power) => void
	available: (pw: Power) => boolean
}

// Per-power purchases. Damage/radius offers gate themselves out for the dash (it has neither),
// so a dash only ever sees Recharge.
const POWER_SHOP: PowerShopTpl[] = [
	{ id: 'cd', name: 'Recharge -15%', desc: 'Cooldown réduit', cost: 14,
		apply: (pw) => (pw.cooldownSteps = Math.max(MIN_POWER_COOLDOWN, Math.round(pw.cooldownSteps * 0.85))),
		available: (pw) => pw.cooldownSteps > MIN_POWER_COOLDOWN },
	{ id: 'dmg', name: 'Dégâts +2', desc: 'Souffle plus puissant', cost: 12,
		apply: (pw) => (pw.damage += 2), available: (pw) => pw.damage > 0 },
	{ id: 'radius', name: 'Rayon +30', desc: "Zone d'effet élargie", cost: 12,
		apply: (pw) => (pw.radius += 30), available: (pw) => pw.radius > 0 }
]

// A single purchasable offer, already bound to a concrete weapon/power (apply/available close
// over the instance). `kind` drives the card accent in the shop overlay.
export interface ShopOffer {
	id: string
	name: string
	desc: string
	cost: number
	kind: 'weapon' | 'power'
	apply: () => void
	available: () => boolean
}

// Every offer currently applicable to the player's held weapons + power (capped/maxed ones drop
// out via each template's `available`). Sampled by rollShopOffers.
const buildShopCandidates = (w: GameWorld): ShopOffer[] => {
	const out: ShopOffer[] = []
	w.player.weapons.forEach((wp, i) => {
		for (const t of WEAPON_SHOP) {
			if (!t.available(wp)) continue
			out.push({
				id: `w${i}:${t.id}`,
				name: `${wp.type.name} · ${t.name}`,
				desc: t.desc, cost: t.cost, kind: 'weapon',
				apply: () => t.apply(wp),
				available: () => t.available(wp)
			})
		}
	})
	const pw = w.player.power
	if (pw) {
		for (const t of POWER_SHOP) {
			if (!t.available(pw)) continue
			out.push({
				id: `p:${t.id}`,
				name: `${pw.type.name} · ${t.name}`,
				desc: t.desc, cost: t.cost, kind: 'power',
				apply: () => t.apply(pw),
				available: () => t.available(pw)
			})
		}
	}
	return out
}

// Draw `count` distinct shop offers (uniform random), skipping any id in `exclude` — used both
// to stock the shop and to refill a single slot after a purchase (excluding the other visible
// slots so no duplicate offer is shown at once).
export const rollShopOffers = (
	w: GameWorld,
	count: number,
	exclude: Set<string> = new Set()
): ShopOffer[] => {
	const pool = buildShopCandidates(w).filter((o) => !exclude.has(o.id))
	const picks: ShopOffer[] = []
	const n = Math.min(count, pool.length)
	for (let k = 0; k < n; k++) {
		const idx = Math.floor(Math.random() * pool.length)
		picks.push(pool[idx])
		pool.splice(idx, 1)
	}
	return picks
}
