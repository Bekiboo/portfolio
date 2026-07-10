import { Platform } from './Platform'

// Hand-authored arenas — the arena layouts are DESIGNED, not procedurally rolled. Coordinates are
// NORMALISED to the world box: x/y/w are fractions of WORLD_W / WORLD_H, so a layout is
// resolution-independent and can be tweaked by eye. y is the ledge TOP (0 = world ceiling, 1 =
// floor). `edge` marks a wall-flush perch the spawn director rides turrets onto — keep one per side
// if you want turret waves to perch. To add an arena: append an entry to ARENAS; the shuffle-bag
// picks it up automatically. Reachability is checked in dev (validateArena) so a mis-placed ledge
// logs a warning instead of silently stranding the player.
export type LedgeSpec = {
	x: number // left edge, fraction of world width (0..1)
	y: number // top, fraction of world height (0 = ceiling, 1 = floor)
	w: number // width, fraction of world width
	edge?: 'left' | 'right' // wall-flush turret perch; omit for a regular interior ledge
}
export type Arena = { name: string; ledges: LedgeSpec[] }

// Jump reach in world px (BASE_JUMP=8, GRAVITY=0.33, STEP_DELTA≈1.389): a single jump clears ~135px,
// the always-available double jump ~250px. Steps are authored ≤ single-jump apart for comfort; the
// dev guard uses the generous double-jump envelope so it only flags genuinely stranded ledges.
const REACH_V = 250 // vertical rise a double jump can clear
const REACH_H = 300 // horizontal gap coverable with a running jump

// --- The starter set. Index 0 is the gentle intro, forced for wave 1. ---

// Shallow & symmetric: two low side ledges and a centre step, plus mid wall perches. Teaches the
// climb without demanding it — the fight can still be won entirely on the floor.
const INTRO: Arena = {
	name: 'intro',
	ledges: [
		{ x: 0, y: 0.56, w: 0.058, edge: 'left' },
		{ x: 0.942, y: 0.56, w: 0.058, edge: 'right' },
		{ x: 0.24, y: 0.84, w: 0.12 },
		{ x: 0.64, y: 0.84, w: 0.12 },
		{ x: 0.44, y: 0.68, w: 0.12 }
	]
}

// A climbable tower hugging the left wall (serpentine steps up to ~0.35H) with the right half left
// open for kiting. Rewards going high; the open side keeps a ground game.
const TOUR: Arena = {
	name: 'tour',
	ledges: [
		{ x: 0.942, y: 0.5, w: 0.058, edge: 'right' },
		{ x: 0, y: 0.68, w: 0.058, edge: 'left' },
		{ x: 0.14, y: 0.83, w: 0.1 },
		{ x: 0.26, y: 0.71, w: 0.09 },
		{ x: 0.14, y: 0.59, w: 0.09 },
		{ x: 0.27, y: 0.47, w: 0.08 },
		{ x: 0.15, y: 0.35, w: 0.08 }
	]
}

// Scattered islands at varied heights (not a staircase): a real 2D field with a high central refuge
// and asymmetric wall perches. Movement reads in both axes.
const ILOTS: Arena = {
	name: 'ilots',
	ledges: [
		{ x: 0, y: 0.62, w: 0.058, edge: 'left' },
		{ x: 0.942, y: 0.42, w: 0.058, edge: 'right' },
		{ x: 0.18, y: 0.82, w: 0.11 },
		{ x: 0.36, y: 0.7, w: 0.09 },
		{ x: 0.62, y: 0.81, w: 0.1 },
		{ x: 0.51, y: 0.55, w: 0.1 },
		{ x: 0.75, y: 0.63, w: 0.09 }
	]
}

// A high bridge split by a centre gap (a hop across, or a choke to hold), with approach steps on
// both sides. The gap is the interesting bit: a place to funnel or to leap.
const PONT: Arena = {
	name: 'pont',
	ledges: [
		{ x: 0, y: 0.5, w: 0.058, edge: 'left' },
		{ x: 0.942, y: 0.5, w: 0.058, edge: 'right' },
		{ x: 0.12, y: 0.83, w: 0.1 },
		{ x: 0.26, y: 0.67, w: 0.1 },
		{ x: 0.28, y: 0.52, w: 0.18 },
		{ x: 0.54, y: 0.52, w: 0.18 },
		{ x: 0.64, y: 0.67, w: 0.1 },
		{ x: 0.78, y: 0.83, w: 0.1 }
	]
}

export const ARENAS: Arena[] = [INTRO, TOUR, ILOTS, PONT]

// Instantiate an arena into live world-space Platforms. `mirror` flips it horizontally (edges swap
// sides too) so one authored layout yields two presentations. renderAlpha stays 1; the caller drops
// it to 0 for the between-wave fade-in.
export function instantiateArena(
	arena: Arena,
	W: number,
	H: number,
	thick: number,
	mirror = false
): Platform[] {
	return arena.ledges.map((l) => {
		const left = mirror ? (1 - l.x - l.w) * W : l.x * W
		const p = new Platform(l.w * W, thick, l.y * H, left)
		p.visible = true
		if (l.edge) p.edge = mirror ? (l.edge === 'left' ? 'right' : 'left') : l.edge
		return p
	})
}

// Shuffle-bag arena picker: draws every arena once (in random order) before any repeats, so the
// same layout never appears two waves running while the whole set still rotates. Each draw also
// rolls a random horizontal mirror. next() refills when the bag empties.
export function makeArenaBag() {
	let bag: number[] = []
	const refill = () => {
		bag = ARENAS.map((_, i) => i)
		for (let i = bag.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1))
			;[bag[i], bag[j]] = [bag[j], bag[i]]
		}
	}
	return {
		next(): { arena: Arena; mirror: boolean } {
			if (!bag.length) refill()
			const idx = bag.pop() as number
			return { arena: ARENAS[idx], mirror: Math.random() < 0.5 }
		}
	}
}

// Dev-only reachability guard: warn if any interior ledge floats beyond jump reach of every support
// below it (another ledge or the floor). Catches authoring slips before they strand the player.
// Wall-flush edge perches are enemy spawn points, not required to be player-reachable, so skipped.
export function validateArena(platforms: Platform[], W: number, H: number) {
	const supports = [...platforms, { left: 0, width: W, top: H }] // floor as a full-width support
	for (const p of platforms) {
		if (p.edge) continue
		const reachable = supports.some((s) => {
			if (s === p) return false
			const rise = s.top - p.top // support must sit below the ledge…
			if (rise <= 0 || rise > REACH_V) return false // …within a jump's rise
			const gap = Math.max(0, p.left - (s.left + s.width), s.left - (p.left + p.width))
			return gap <= REACH_H
		})
		if (!reachable)
			console.warn(
				`[arena] ledge at x=${Math.round(p.left)} y=${Math.round(p.top)} may be unreachable ` +
					`(no support within ${REACH_V}px up / ${REACH_H}px across)`
			)
	}
}
