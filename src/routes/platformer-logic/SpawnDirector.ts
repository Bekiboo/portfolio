import { get } from 'svelte/store'
import { Enemy, ELITE_SIZE_MUL } from './Enemy'
import { Portal, type PortalPlacement } from './Portal'
import { Effect } from './Effect'
import type { Platform } from './Platform'
import { ENEMY_TYPES, type EnemyKind } from './enemyTypes'
import { enemiesStore, portalsStore, effectsStore } from '$lib/stores'
import { wave } from '$lib/game'
import {
	waveDef,
	waveEnemySpeed,
	waveEnemyHealth,
	waveContactDamage,
	type WaveDef
} from './waves'
import type { GameWorld } from './GameWorld.svelte'

const MAX_ACTIVE_PORTALS = 2 // concurrent rifts on the field — keeps spawns clustered and legible
const MAX_HORDE = 6 // most enemies a single rift disgorges before it collapses

// The wave spawn director, split out of GameWorld: it decides WHAT to spawn (deficit/floors/ground
// brain), WHERE (perches, air/ground rifts) and drives the open portals. It reads the arena it
// spawns into (world bounds, procedural ledges, the player's position) and the elite burst ring off
// its host GameWorld; everything else (enemy pools, wave tuning) it owns via the module registries.
export class SpawnDirector {
	private spawnSide = 0 // alternates the side each enemy / rift enters from

	constructor(private gw: GameWorld) {}

	// A wall-flush perch ledge with no turret currently riding it (so two turrets don't
	// stack on the same edge). null if every perch is taken or the layout has none.
	private freeEdgePerch(): Platform | null {
		const perches = this.gw.proceduralPlatforms.filter((p) => p.edge)
		const free = perches.filter(
			(p) =>
				!enemiesStore.list.some(
					(e) => e.perched && e.pos.x + e.width / 2 >= p.left && e.pos.x + e.width / 2 <= p.left + p.width
				)
		)
		return free.length ? free[Math.floor(Math.random() * free.length)] : null
	}

	private spawnEnemy(kind: EnemyKind) {
		const w = get(wave)
		const t = ENEMY_TYPES[kind]
		// Turrets ride a wall-flush perch when one is free: dropped onto the edge ledge, they
		// can't fall and just fire inward (perched behaviour in Enemy.#updateTurret). With no
		// free perch they fall back to the rolling floor turret below.
		if (kind === 'turret') {
			const perch = this.freeEdgePerch()
			if (perch) {
				const px = perch.edge === 'left' ? perch.left : perch.left + perch.width - t.width
				const enemy = new Enemy(
					{ x: px, y: perch.top - t.height },
					{ kind, speed: 0, health: waveEnemyHealth(kind, w), damage: waveContactDamage(kind, w) }
				)
				enemy.perched = true
				enemiesStore.add(enemy)
				return
			}
		}
		// Alternate the side each enemy walks/flies in from.
		const fromLeft = this.spawnSide++ % 2 === 0
		// 'onscreen' kinds (the anchored turret) deploy in view; the rest enter from
		// off the nearest side.
		const x =
			t.spawnX === 'onscreen'
				? this.gw.world.width * (0.15 + Math.random() * 0.7)
				: fromLeft
					? -60
					: this.gw.world.width + 60
		// 'air' kinds enter high in an altitude band; ground kinds at floor level —
		// offset by their own height so a tall brute doesn't spawn sunk into the floor.
		const y =
			t.spawnY === 'air' ? this.gw.world.height * (t.altitude ?? 0.32) : this.gw.world.height - t.height
		// Chase kinds scale speed with the wave (waveSpeedMul); fixed kinds use their base.
		const speed = t.waveSpeedMul != null ? waveEnemySpeed(w) * t.waveSpeedMul : t.speed
		enemiesStore.add(
			new Enemy(
				{ x, y },
				{ kind, speed, health: waveEnemyHealth(kind, w), damage: waveContactDamage(kind, w) }
			)
		)
	}

	// --- Portal-based spawning ------------------------------------------------
	// Enemies no longer trickle in one-by-one from the edges. On each spawn tick the director
	// assembles a small BATCH (up to MAX_HORDE) using the same floors/deficit/ground brain as
	// before, then tears open a rift to carry it: air kinds get an air rift, ground kinds a
	// ground rift, turrets keep perching directly. The rift telegraphs, then pours the pack
	// out — clustered and readable instead of scattered.
	private countKind(k: EnemyKind) {
		return enemiesStore.list.filter((e) => e.kind === k).length
	}

	// Enemies still queued inside open rifts (not yet materialised). Counted toward the field
	// so the director doesn't overfill while a telegraph is still winding up.
	private queuedCount(k?: EnemyKind) {
		let n = 0
		for (const p of portalsStore.list) n += k ? p.queue.filter((q) => q === k).length : p.queue.length
		return n
	}

	// Pick the single best kind to add given the live field, the rifts' pending queues, and a
	// `projected` tally of what's already in the batch being assembled. Unmet pressure floors
	// win first (weighted by how far below target they sit, so a totally-absent bomber isn't
	// starved by a flyer that's only one short); otherwise draw fodder from the theme's ground
	// pool (repeats weight the odds — ['biker','biker','charger'] is 2:1 bikers).
	private pickSpawnKind(def: WaveDef, projected: Map<EnemyKind, number>): EnemyKind | null {
		const total = (k: EnemyKind) => this.countKind(k) + this.queuedCount(k) + (projected.get(k) ?? 0)
		const deficits = Object.entries(def.floors ?? {})
			.map(([kind, target]) => ({ kind: kind as EnemyKind, need: target - total(kind as EnemyKind) }))
			.filter((p) => p.need > 0)
		if (deficits.length) {
			let r = Math.random() * deficits.reduce((s, p) => s + p.need, 0)
			let chosen = deficits[deficits.length - 1].kind // guard against FP undershoot
			for (const p of deficits) {
				r -= p.need
				if (r < 0) {
					chosen = p.kind
					break
				}
			}
			return chosen
		}
		return def.ground.length ? def.ground[Math.floor(Math.random() * def.ground.length)] : null
	}

	// Keep the field topped up to the wave cap. While a rift can still be opened and the field
	// (live + queued) is under cap, assemble a batch and open rift(s) for it. If the field is
	// capped but a pressure floor is unmet, retire the ground unit stuck furthest below a
	// camping player and open a small rift for the missing vector — no spot stays safe.
	spawnFromBudget() {
		const def = waveDef(get(wave))
		if (portalsStore.list.length >= MAX_ACTIVE_PORTALS) return // let the open rifts finish first
		const effective = enemiesStore.list.length + this.queuedCount()
		if (effective >= def.cap) {
			this.cullForMissingFloor(def)
			return
		}
		const room = Math.min(def.cap - effective, MAX_HORDE)
		const projected = new Map<EnemyKind, number>()
		const batch: EnemyKind[] = []
		for (let i = 0; i < room; i++) {
			const kind = this.pickSpawnKind(def, projected)
			if (!kind) break
			batch.push(kind)
			projected.set(kind, (projected.get(kind) ?? 0) + 1)
		}
		if (batch.length) this.openPortalsForBatch(batch)
	}

	// Field is capped and a pressure floor is still unmet: cull the stuck camper and rift in
	// the missing vector.
	private cullForMissingFloor(def: WaveDef) {
		const total = (k: EnemyKind) => this.countKind(k) + this.queuedCount(k)
		const missing = Object.entries(def.floors ?? {})
			.map(([kind, target]) => ({ kind: kind as EnemyKind, need: target - total(kind as EnemyKind) }))
			.filter((p) => p.need > 0)
		if (!missing.length) return
		let stuck: Enemy | null = null
		let worst = -Infinity
		for (const e of enemiesStore.list) {
			if (!ENEMY_TYPES[e.kind].cullable) continue
			const below = e.pos.y - this.gw.player.pos.y
			if (below > worst) {
				worst = below
				stuck = e
			}
		}
		if (stuck) {
			enemiesStore.delete(stuck)
			this.openPortalsForBatch([missing[0].kind])
		}
	}

	// Split a batch by placement and open the rift(s) to carry it. Turrets don't ride portals —
	// they perch directly (a single, readable unit, not part of the dispersal problem).
	openPortalsForBatch(batch: EnemyKind[]) {
		const air: EnemyKind[] = []
		const ground: EnemyKind[] = []
		for (const k of batch) {
			if (k === 'turret') this.spawnEnemy('turret')
			else if (ENEMY_TYPES[k].spawnY === 'air') air.push(k)
			else ground.push(k)
		}
		if (air.length) this.openPortal('air', air)
		if (ground.length) this.openPortal('ground', ground)
	}

	// Choose where a rift tears open. Air rifts hover in the altitude band on an alternating
	// side; ground rifts sit at floor level at a screen edge (preferred), or sometimes ride a
	// visible ledge (edge perches first) so a pack can drop in from a platform.
	private pickPortalSite(placement: PortalPlacement): { pos: { x: number; y: number }; anchor: Platform | null } {
		const W = this.gw.world.width
		const H = this.gw.world.height
		const fromLeft = this.spawnSide++ % 2 === 0
		if (placement === 'air') {
			return { pos: { x: fromLeft ? W * 0.14 : W * 0.86, y: H * 0.3 }, anchor: null }
		}
		const ledges = this.gw.proceduralPlatforms.filter((p) => p.visible)
		if (ledges.length && Math.random() < 0.35) {
			const perches = ledges.filter((p) => p.edge)
			const pool = perches.length ? perches : ledges
			const ledge = pool[Math.floor(Math.random() * pool.length)]
			return { pos: { x: ledge.left + ledge.width / 2, y: ledge.top - 4 }, anchor: ledge }
		}
		return { pos: { x: fromLeft ? 44 : W - 44, y: H - 30 }, anchor: null }
	}

	private openPortal(placement: PortalPlacement, kinds: EnemyKind[]) {
		const { pos, anchor } = this.pickPortalSite(placement)
		// Ground rifts rise out of their surface (a ledge top, else the canvas floor); air rifts
		// float free (null). Keeps the rift from sinking under the ground or a passerelle.
		const baseY = placement === 'air' ? null : anchor ? anchor.top : this.gw.world.height
		portalsStore.add(new Portal(pos, placement, kinds, anchor, baseY))
	}

	// Build a wave-scaled Enemy of `kind` at (x, y). Shared by the rift emitter and the direct
	// turret spawn so toughness/speed ramps stay in one place.
	private makeEnemy(kind: EnemyKind, x: number, y: number, elite = false): Enemy {
		const w = get(wave)
		const t = ENEMY_TYPES[kind]
		const speed = t.waveSpeedMul != null ? waveEnemySpeed(w) * t.waveSpeedMul : t.speed
		return new Enemy(
			{ x, y },
			{ kind, speed, health: waveEnemyHealth(kind, w), damage: waveContactDamage(kind, w), elite }
		)
	}

	// Spawn a single ELITE of `kind` at wave milestones (see startNextWave): a scaled-up miniboss
	// dropped centre-stage with a burst + shock ring, rather than trickled in through a rift. Ground
	// kinds get their feet on the floor (using the elite size-up); air kinds hang in the band.
	spawnElite(kind: EnemyKind) {
		const t = ENEMY_TYPES[kind]
		const eh = t.height * ELITE_SIZE_MUL
		const ew = t.width * ELITE_SIZE_MUL
		const x = this.gw.world.width / 2 - ew / 2
		const y =
			t.spawnY === 'air' ? this.gw.world.height * (t.altitude ?? 0.32) : this.gw.world.height - eh - 2
		enemiesStore.add(this.makeEnemy(kind, x, y, true))
		const cx = x + ew / 2
		const cy = y + eh / 2
		this.gw.shockRings.push({ x: cx, y: cy, max: Math.max(ew, eh) * 1.6, t: 1, color: '#f59e0b' })
		effectsStore.add(new Effect({ x: cx, y: cy }, 'smoke_14', { centered: true }))
	}

	// A rift released a unit: drop it into the world at the rift's mouth (centred for air,
	// on the ledge for a platform rift, at floor level otherwise) and let it behave normally.
	private materializeFromPortal(portal: Portal, kind: EnemyKind) {
		const t = ENEMY_TYPES[kind]
		let x: number
		let y: number
		if (portal.placement === 'air') {
			x = portal.pos.x - t.width / 2
			y = portal.pos.y - t.height / 2
		} else if (portal.anchor) {
			const a = portal.anchor
			x = Math.min(Math.max(a.left, portal.pos.x - t.width / 2), a.left + a.width - t.width)
			y = a.top - t.height
		} else {
			x = portal.pos.x - t.width / 2
			y = this.gw.world.height - t.height
		}
		enemiesStore.add(this.makeEnemy(kind, x, y))
	}

	// Advance every open rift, materialise whatever it emits this frame, and retire the ones
	// that have finished collapsing.
	updatePortals(frameTime: number) {
		for (const portal of portalsStore.list.slice()) {
			for (const kind of portal.update(frameTime)) this.materializeFromPortal(portal, kind)
			if (portal.done) portalsStore.delete(portal)
		}
	}
}
