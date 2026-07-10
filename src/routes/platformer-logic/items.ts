import { get } from 'svelte/store'
import { enemiesStore, projectilesStore } from '$lib/stores'
import { maxHp, playerHp } from '$lib/game'
import { Projectile } from './Projectile'
import { MAX_SHIELD_MAX, MIN_SHIELD_REGEN, MAX_JUMP, MAX_ARMOR } from './upgrades'
import type { GameWorld } from './GameWorld.svelte'
import type { Enemy } from './Enemy'

// HP_FLOOR: a "−PV" relic can never zero the player out. MIN_ARMOR: negative floor so a
// "+dégâts subis" relic bites without becoming absurd.
const HP_FLOOR = 3
const MIN_ARMOR = -0.5

// --- Passive items (run-scoped RELICS) -------------------------------------------------------
// Third acquisition channel (alongside XP stats and the weapon/power shop). Adding content is
// DATA: an item is a registry entry subscribing to combat/lifecycle HOOKS that GameWorld fans out
// to at fixed seams. Items may hold per-instance mutable `state` and stack up to `maxStacks`.
// Reach the world only through GameWorld's public surface + the global entity stores — no engine
// internals.

// Per-instance scratch state, string-keyed so a stackable item can namespace per-copy slots
// (x0/y0/cd0, x1/y1/cd1, …).
export class ItemInstance {
	readonly type: ItemType
	stacks = 1
	state: Record<string, number> = {}
	constructor(type: ItemType) {
		this.type = type
	}
}

// The hook surface — every field optional; an item wires only the seams it needs. Called only
// while a run is playing (onDraw once per rendered frame; the rest per fixed physics step / event).
export interface ItemHooks {
	onAcquire?: (w: GameWorld, item: ItemInstance) => void // gained or stacked: apply per-stack effect
	onKill?: (w: GameWorld, enemy: Enemy, item: ItemInstance) => void // an enemy died (any source)
	onHit?: (w: GameWorld, enemy: Enemy, dmg: number, item: ItemInstance) => void // a bolt connected
	onDamaged?: (w: GameWorld, amount: number, item: ItemInstance) => void // the player lost HP
	onWaveStart?: (w: GameWorld, item: ItemInstance) => void // a new wave just launched
	onTick?: (w: GameWorld, dt: number, item: ItemInstance) => void // per fixed physics step
	onDraw?: (w: GameWorld, ctx: CanvasRenderingContext2D, alpha: number, item: ItemInstance) => void
}

export interface ItemType extends ItemHooks {
	id: string
	name: string
	blurb: string
	glyph: string // shown on the shop card + drawn by drone-like items
	color: string
	cost: number // base credit price (the shop ramps it per owned stack)
	maxStacks?: number // default 1
	tradeoff?: boolean // a risk relic (strong upside + a real malus) — flagged red on the shop card
}

// --- Drone tuning ---
const DRONE_ORBIT = 46 // px the drone hovers out from the player
const DRONE_RANGE = 340 // px a drone will engage within
const DRONE_FIRE = 34 // steps between a drone's shots (~0.57s)
const DRONE_DMG = 1 // base bolt damage (global +Damage / crit still layer on in resolveHits)
const DRONE_SPEED = 9 // drone bolt travel speed
// --- Thorns tuning ---
const THORNS_RADIUS = 92 // px blast radius when the player is struck
const THORNS_KNOCKBACK = 30
// --- Explosive tuning ---
const BLAST_RADIUS = 62 // px chain-blast radius on a kill (small: only chains tight, low-HP packs)

// Nearest live enemy to a point within `maxDist` (drones aim independently of the player's guns).
const nearestFoe = (x: number, y: number, maxDist: number): Enemy | null => {
	let best: Enemy | null = null
	let bestD = maxDist
	for (const e of enemiesStore.list) {
		if (e.health <= 0) continue
		const d = Math.hypot(e.pos.x + e.width / 2 - x, e.pos.y + e.height / 2 - y)
		if (d < bestD) {
			bestD = d
			best = e
		}
	}
	return best
}

// The registry — one entry per relic; the shop's item board samples from these.
export const ITEM_TYPES: Record<string, ItemType> = {
	// Bouclier renforcé: +1 shield charge (to cap) + faster regen. Refills on pickup so the new
	// charge is immediately useful.
	bulwark: {
		id: 'bulwark',
		name: 'Bouclier renforcé',
		blurb: '+1 charge de bouclier, régénère plus vite',
		glyph: '⬡',
		color: '#38bdf8', // sky-400
		cost: 22,
		maxStacks: MAX_SHIELD_MAX - 1, // base shield is 1; this stacks up to the cap
		onAcquire: (w) => {
			w.shieldMax = Math.min(MAX_SHIELD_MAX, w.shieldMax + 1)
			w.shieldCharges = w.shieldMax
			w.shieldRegenSteps = Math.max(MIN_SHIELD_REGEN, w.shieldRegenSteps - 90)
		}
	},

	// Bottes à ressort: higher jump + a little speed, so vertical builds can kite over the field.
	springboots: {
		id: 'springboots',
		name: 'Bottes à ressort',
		blurb: 'Saute plus haut, déplacement +',
		glyph: '⤒',
		color: '#34d399', // emerald-400
		cost: 16,
		maxStacks: 3,
		onAcquire: (w) => {
			w.player.jumpStrength = Math.min(MAX_JUMP, w.player.jumpStrength + 1.5)
			w.player.speed += 0.4
		}
	},

	// Drone de combat: orbits the player, auto-fires at the nearest enemy on its own cadence. Shots
	// go through the normal projectile pool, so global +Damage / crit apply for free. Stacks add
	// more drones, evenly spaced around the orbit.
	drone: {
		id: 'drone',
		name: 'Drone de combat',
		blurb: 'Un drone vous suit et tire tout seul',
		glyph: '◈',
		color: '#2dd4bf', // teal-400
		cost: 30,
		maxStacks: 3,
		onTick: (w, dt, item) => {
			const p = w.player
			const cx = p.pos.x + p.width / 2
			const cy = p.pos.y + p.height / 2
			const s = item.state
			s.t = (s.t ?? 0) + dt
			const sprite = p.weapons[0]?.type.projectile
			for (let i = 0; i < item.stacks; i++) {
				const ang = s.t * 0.03 + (Math.PI * 2 * i) / item.stacks
				const tx = cx + Math.cos(ang) * DRONE_ORBIT
				const ty = cy - 40 + Math.sin(ang) * DRONE_ORBIT * 0.5
				const kx = `x${i}`
				const ky = `y${i}`
				const kc = `cd${i}`
				s[kx] = (s[kx] ?? tx) + (tx - (s[kx] ?? tx)) * 0.12
				s[ky] = (s[ky] ?? ty) + (ty - (s[ky] ?? ty)) * 0.12
				s[kc] = (s[kc] ?? 0) - 1
				if (s[kc] <= 0 && sprite) {
					const target = nearestFoe(s[kx], s[ky], DRONE_RANGE)
					if (target) {
						const a = Math.atan2(
							target.pos.y + target.height / 2 - s[ky],
							target.pos.x + target.width / 2 - s[kx]
						)
						projectilesStore.add(
							new Projectile({ x: s[kx], y: s[ky] }, a, sprite, { damage: DRONE_DMG, speed: DRONE_SPEED })
						)
						s[kc] = DRONE_FIRE
					}
				}
			}
		},
		onDraw: (w, ctx, alpha, item) => {
			const s = item.state
			for (let i = 0; i < item.stacks; i++) {
				const x = s[`x${i}`]
				const y = s[`y${i}`]
				if (x === undefined || y === undefined) continue
				ctx.save()
				ctx.fillStyle = '#2dd4bf' // teal-400
				ctx.shadowColor = '#2dd4bf'
				ctx.shadowBlur = 8
				ctx.beginPath()
				ctx.arc(x, y, 6, 0, Math.PI * 2)
				ctx.fill()
				ctx.shadowBlur = 0
				ctx.fillStyle = '#0f172a' // slate-900 core dot
				ctx.beginPath()
				ctx.arc(x, y, 2.4, 0, Math.PI * 2)
				ctx.fill()
				ctx.restore()
			}
			void w
			void alpha
		}
	},

	// Épines: being struck detonates a blast around the player (damage scales with stacks),
	// punishing melee swarms. Reuses GameWorld.shockwave so kills bank score/gems/drops normally.
	thorns: {
		id: 'thorns',
		name: 'Épines',
		blurb: 'Riposte : explose autour de vous quand vous êtes touché',
		glyph: '✸',
		color: '#fb7185', // rose-400
		cost: 20,
		maxStacks: 4,
		onDamaged: (w, _amount, item) => {
			const p = w.player
			w.shockwave(
				p.pos.x + p.width / 2,
				p.pos.y + p.height / 2,
				THORNS_RADIUS,
				item.stacks, // +1 blast damage per stack
				THORNS_KNOCKBACK,
				'#fb7185'
			)
		}
	},

	// Charge explosive: a slain enemy pops a small blast. Deliberately low-damage so it only chains
	// through tight, low-HP packs (bruisers shrug it off) — self-balancing crowd clear.
	explosive: {
		id: 'explosive',
		name: 'Charge explosive',
		blurb: 'Les ennemis abattus explosent',
		glyph: '✷',
		color: '#f59e0b', // amber-500
		cost: 24,
		maxStacks: 3,
		onKill: (w, enemy, item) => {
			w.shockwave(
				enemy.pos.x + enemy.width / 2,
				enemy.pos.y + enemy.height / 2,
				BLAST_RADIUS + item.stacks * 8,
				item.stacks, // 1 dmg/stack
				24,
				'#f59e0b'
			)
		}
	},

	// --- Trade-offs: strong upside + a real malus (the tension picks) --------------------------
	// Glass cannon: hits much harder, but you're fragile.
	glasscannon: {
		id: 'glasscannon',
		name: 'Canon de verre',
		blurb: '+3 dégâts, mais −4 PV max',
		glyph: '⚔',
		color: '#f87171', // red-400
		cost: 26,
		maxStacks: 2,
		tradeoff: true,
		onAcquire: (w) => {
			w.bonusDamage += 3
			maxHp.update((m) => Math.max(HP_FLOOR, m - 4))
			playerHp.update((h) => Math.min(get(maxHp), h))
		}
	},
	// Berserk: fires faster, but every hit hurts more.
	berserk: {
		id: 'berserk',
		name: 'Fureur',
		blurb: 'Cadence +15%, mais dégâts subis +12%',
		glyph: '⚡',
		color: '#fb923c', // orange-400
		cost: 24,
		maxStacks: 2,
		tradeoff: true,
		onAcquire: (w) => {
			w.fireRateMul *= 0.85
			w.armorReduction = Math.max(MIN_ARMOR, w.armorReduction - 0.12)
		}
	},
	// Heavy plating: soaks damage, but slows you down.
	heavyplating: {
		id: 'heavyplating',
		name: 'Plaques lourdes',
		blurb: 'Dégâts subis −12%, mais déplacement −',
		glyph: '▧',
		color: '#60a5fa', // blue-400
		cost: 24,
		maxStacks: 2,
		tradeoff: true,
		onAcquire: (w) => {
			w.armorReduction = Math.min(MAX_ARMOR, w.armorReduction + 0.12)
			w.player.speed = Math.max(2, w.player.speed - 0.6)
		}
	}
}

// --- Shop item board -------------------------------------------------------------------------
// A purchasable item bound to a concrete ItemType. Mirrors ShopOffer's shape so the overlay reuses
// the same card markup; `kind:'item'` drives the accent, `glyph` shows on the card.
export interface ItemOffer {
	id: string
	name: string
	desc: string
	cost: number
	glyph: string
	kind: 'item'
	tradeoff: boolean // drives the red risk-accent on the shop card
	apply: () => void
	available: () => boolean
}

// Draw `count` distinct item offers, skipping any id in `exclude` (refill a slot after a purchase).
// Maxed-out items drop out; price ramps with owned stacks so piling copies costs more each time.
export const rollItemOffers = (
	w: GameWorld,
	count: number,
	exclude: Set<string> = new Set()
): ItemOffer[] => {
	const pool: ItemOffer[] = []
	for (const type of Object.values(ITEM_TYPES)) {
		const owned = w.itemStacks(type.id)
		const max = type.maxStacks ?? 1
		if (owned >= max) continue
		const id = `item:${type.id}`
		if (exclude.has(id)) continue
		pool.push({
			id,
			name: type.name,
			desc: type.blurb,
			cost: Math.round(type.cost * (1 + owned * 0.6)), // pricier per extra stack
			glyph: type.glyph,
			kind: 'item',
			tradeoff: type.tradeoff ?? false,
			apply: () => w.acquireItem(type),
			available: () => w.itemStacks(type.id) < (type.maxStacks ?? 1)
		})
	}
	const picks: ItemOffer[] = []
	const n = Math.min(count, pool.length)
	for (let k = 0; k < n; k++) {
		const idx = Math.floor(Math.random() * pool.length)
		picks.push(pool[idx])
		pool.splice(idx, 1)
	}
	return picks
}
