import type { Enemy } from './Enemy'
import type { Platform } from './Platform'
import { enemiesStore } from '$lib/stores'

// Anything that aims: the player or a friendly turret. Only its centre matters.
type AimSource = { pos: { x: number; y: number }; width: number; height: number }

// Line-of-sight / auto-aim geometry: pick a target the shooter can actually hit,
// so a perched player doesn't dump bolts into their own platform.

// Does segment (x1,y1)->(x2,y2) cross this platform rect? Liang-Barsky line clip.
const segmentIntersectsRect = (
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	r: { left: number; top: number; width: number; height: number }
): boolean => {
	const dx = x2 - x1
	const dy = y2 - y1
	const p = [-dx, dx, -dy, dy]
	const q = [x1 - r.left, r.left + r.width - x1, y1 - r.top, r.top + r.height - y1]
	let t0 = 0
	let t1 = 1
	for (let i = 0; i < 4; i++) {
		if (p[i] === 0) {
			if (q[i] < 0) return false // parallel to this edge, fully outside it
		} else {
			const t = q[i] / p[i]
			if (p[i] < 0) {
				if (t > t1) return false
				if (t > t0) t0 = t
			} else {
				if (t < t0) return false
				if (t < t1) t1 = t
			}
		}
	}
	return t0 < t1 // overlapping interval (strict: a graze doesn't block)
}

// True if any platform sits between the two points — the shot would be walled off.
const firingBlocked = (
	platforms: Platform[],
	x1: number,
	y1: number,
	x2: number,
	y2: number
): boolean => {
	for (const p of platforms) if (segmentIntersectsRect(x1, y1, x2, y2, p)) return true
	return false
}

// Nearest enemy with a clear line of fire within `maxDist` (default unlimited). Used by
// player auto-aim and friendly turrets. null if none can be hit.
export const nearestEnemy = (
	source: AimSource,
	platforms: Platform[],
	maxDist = Infinity
): Enemy | null => {
	const foes = enemiesStore.list
	let best: Enemy | null = null
	let bestD = maxDist * maxDist // squared, to compare without sqrt
	const px = source.pos.x + source.width / 2
	const py = source.pos.y + source.height / 2
	for (const e of foes) {
		const ex = e.pos.x + e.width / 2
		const ey = e.pos.y + e.height / 2
		const dx = ex - px
		const dy = ey - py
		const d = dx * dx + dy * dy
		if (d >= bestD) continue // farther than current pick — skip the LoS test
		if (firingBlocked(platforms, px, py, ex, ey)) continue
		bestD = d
		best = e
	}
	return best
}
