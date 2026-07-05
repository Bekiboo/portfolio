import type { Enemy } from './Enemy'
import type { Platform } from './Platform'
import { enemiesStore } from '$lib/stores'

// Anything that aims: the player or a friendly turret. Only its centre matters.
type AimSource = { pos: { x: number; y: number }; width: number; height: number }

// Line-of-sight / auto-aim geometry. A shot travels in a straight line, so a
// perched player must not keep dumping bolts into the platform they stand on —
// these helpers pick a target the player can actually hit.

// Does the segment (x1,y1)->(x2,y2) cross this platform rect? Liang-Barsky line
// clip — used to tell whether a shot at an enemy would slam into a platform first.
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
			if (q[i] < 0) return false // parallel to this edge and fully outside it
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
	return t0 < t1 // overlapping interval (strict: a mere graze doesn't block)
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

// Nearest enemy with a clear line of fire (no platform in the way), within `maxDist`
// (default unlimited). Used by the player's auto-aim and by friendly turrets. A perched
// player thus stops dumping shots into the platform they stand on and engages reachable
// threats (e.g. flyers overhead) instead. null if none can be hit.
export const nearestEnemy = (
	source: AimSource,
	platforms: Platform[],
	maxDist = Infinity
): Enemy | null => {
	const foes = enemiesStore.list
	let best: Enemy | null = null
	let bestD = maxDist * maxDist // squared, so anything past the range is skipped outright
	const px = source.pos.x + source.width / 2
	const py = source.pos.y + source.height / 2
	for (const e of foes) {
		const ex = e.pos.x + e.width / 2
		const ey = e.pos.y + e.height / 2
		const dx = ex - px
		const dy = ey - py
		const d = dx * dx + dy * dy
		if (d >= bestD) continue // farther than the current pick — skip the LoS test
		if (firingBlocked(platforms, px, py, ex, ey)) continue
		bestD = d
		best = e
	}
	return best
}
