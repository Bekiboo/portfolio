import type { EnemyKind } from './enemyTypes'
import type { Platform } from './Platform'

// Enemy rift: telegraphs for OPEN_MS (warning beat, no enemies yet), disgorges its queued horde
// one unit every EMIT_MS from a single legible spot, then collapses over CLOSE_MS. GameWorld owns
// the stats + pool; the Portal only holds the queue and reports kinds to materialise each tick.
export const PORTAL_OPEN_MS = 2000 // telegraph before the first enemy (~2s warning, per design)
export const PORTAL_EMIT_MS = 200 // gap between disgorged units — a quick stream so it reads as a horde
export const PORTAL_CLOSE_MS = 520 // collapse animation once the queue is empty
const CUBE = 7 // pixel size of each cube in the rift's blocky vortex

export type PortalPlacement = 'air' | 'ground'
type PortalState = 'opening' | 'emitting' | 'closing'

export class Portal {
	pos: { x: number; y: number } // rift centre = emit origin (feet-level for ground, band height for air)
	placement: PortalPlacement
	queue: EnemyKind[] // kinds still to emit (drained by update())
	anchor: Platform | null // ground rift riding a ledge; null = floor-level at a screen edge
	baseY: number | null // surface the rift rises out of (floor/ledge top); null = air rift, floats centred
	state: PortalState = 'opening'
	timer = 0 // ms elapsed in the current state
	done = false // set when the collapse finishes; GameWorld retires it from the pool
	readonly radius: number
	private emitTimer = 0
	private phase = 0 // ever-accumulating, drives swirl/pulse (kept off Math.random for stable draw)

	constructor(
		pos: { x: number; y: number },
		placement: PortalPlacement,
		queue: EnemyKind[],
		anchor: Platform | null = null,
		baseY: number | null = null
	) {
		this.pos = pos
		this.placement = placement
		this.queue = queue
		this.anchor = anchor
		this.baseY = baseY
		this.radius = placement === 'air' ? 46 : 52
	}

	// Advance the lifecycle by `dt` ms and return the kinds emitted this tick. Usually 0 or 1, but
	// a long frame can flush several so the stream never stalls after a tab-hide.
	update(dt: number): EnemyKind[] {
		this.phase += dt
		this.timer += dt
		const out: EnemyKind[] = []
		if (this.state === 'opening') {
			if (this.timer >= PORTAL_OPEN_MS) {
				this.state = 'emitting'
				this.timer = 0
				this.emitTimer = PORTAL_EMIT_MS // pop the first unit the instant it opens
			}
		} else if (this.state === 'emitting') {
			this.emitTimer += dt
			while (this.emitTimer >= PORTAL_EMIT_MS && this.queue.length) {
				this.emitTimer -= PORTAL_EMIT_MS
				out.push(this.queue.shift()!)
			}
			if (!this.queue.length) {
				this.state = 'closing'
				this.timer = 0
			}
		} else if (this.timer >= PORTAL_CLOSE_MS) {
			this.done = true
		}
		return out
	}

	// 0→1 scale of the rift: grows while opening, holds while emitting, shrinks while closing.
	private scale(): number {
		if (this.state === 'opening') {
			const t = Math.min(1, this.timer / PORTAL_OPEN_MS)
			return 1 - (1 - t) * (1 - t) // easeOut
		}
		if (this.state === 'closing') {
			const t = Math.min(1, this.timer / PORTAL_CLOSE_MS)
			return 1 - t * t // easeIn collapse
		}
		return 1
	}

	// Hostile fuchsia/violet rift — deliberately NOT the pedestal's friendly cyan. Filled cube-by-cube
	// on a centre-anchored grid; cube colour banded by box distance (dark core → purple → fuchsia rim)
	// and modulated by rotating spokes for a swirling look. Outer ring erodes and spits ember cubes;
	// telegraph pulses loudest while opening.
	draw(ctx: CanvasRenderingContext2D) {
		const s = this.scale()
		if (s <= 0.001) return
		const rx = this.radius * s
		// Ground rifts are shorter (door height); air rifts stay tall.
		const ry = this.radius * (this.baseY != null ? 1 : 1.35) * s
		// Ground rifts sit ON their surface and grow UPWARD out of it (never sink under the ground);
		// air rifts float, centred on pos.
		const cx = this.pos.x
		const cy = this.baseY != null ? this.baseY - ry : this.pos.y
		const pulse = 0.5 + 0.5 * Math.sin(this.phase * 0.012)
		const warn = this.state === 'opening' ? 0.55 + 0.45 * pulse : 0.75 + 0.25 * pulse
		const t = this.phase * 0.006 // swirl rotation
		const slice = Math.floor(this.phase / 80) // coarse time slice for stable-ish flicker
		const cols = Math.ceil((rx * 1.3) / CUBE) // reach past the rim for embers
		const rows = Math.ceil((ry * 1.3) / CUBE)
		ctx.save()
		ctx.globalAlpha = warn
		for (let iy = -rows; iy <= rows; iy++) {
			for (let ix = -cols; ix <= cols; ix++) {
				const dx = ix * CUBE
				const dy = iy * CUBE
				// Chebyshev (box) distance → concentric-rectangle bands (Math.hypot for circular).
				// Ground rift's bottom is OPEN: only upward extent counts (max(0, -dy)), so the core
				// reaches the baseline with no bottom rim — a doorway cut into the floor.
				const ay = this.baseY != null ? Math.max(0, -dy) : Math.abs(dy)
				const d = Math.max(Math.abs(dx) / rx, ay / ry) // 0 centre → 1 rim
				const sx = Math.round(cx + dx - CUBE / 2)
				const sy = Math.round(cy + dy - CUBE / 2)
				// Ground rift emerges from its surface: nothing painted fully below the baseline.
				if (this.baseY != null && sy >= this.baseY) continue
				if (d <= 1) {
					const swirl = 0.5 + 0.5 * Math.sin(Math.atan2(dy, dx) * 3 - t * 6 + d * 5)
					// Ragged pixel edge: eat away outer cubes on a hashed flicker.
					if (d > 0.82 && cubeNoise(ix, iy, slice) > 0.45 + (1 - d) * 2) continue
					let color: string
					if (d < 0.3) color = '#110421' // near-black core
					else if (d < 0.6) color = swirl > 0.6 ? '#7e22ce' : '#4a1d80' // purple band
					else if (d < 0.85) color = swirl > 0.5 ? '#d946ef' : '#a021d6' // fuchsia band
					else color = swirl > 0.7 ? '#fae8ff' : '#e879f9' // hot rim pixels
					ctx.fillStyle = color
					ctx.fillRect(sx, sy, CUBE, CUBE)
				} else if (d <= 1.3) {
					// Sparse flickering embers just outside the rim (energy spitting off).
					if (cubeNoise(ix, iy, slice) > 1.24 - (1.3 - d)) {
						ctx.fillStyle = '#f0abfc' // fuchsia-300
						ctx.fillRect(sx + 1, sy + 1, CUBE - 2, CUBE - 2)
					}
				}
			}
		}
		ctx.restore()
	}
}

// Deterministic 0..1 hash so the flicker is stable within a time slice and survives resume.
// Classic fract(sin·large-constant) pixel-noise.
function cubeNoise(a: number, b: number, c: number): number {
	const n = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453
	return n - Math.floor(n)
}
