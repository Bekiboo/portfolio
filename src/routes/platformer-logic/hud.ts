import { get } from 'svelte/store'
import { playerHp, maxHp, wave, level, score, levelXp, levelXpNeeded } from '$lib/game'

// Canvas HUD + wave banner. Drawn on top of the focus-mode veil so run state stays
// legible while the page behind it dims. Reads the reactive HUD stores directly —
// they're global run state, so no plumbing is needed.

// How long the "WAVE N" flash shows on advance.
export const WAVE_BANNER_MS = 1400

// HP gauge + wave/score line + XP bar.
export const drawHud = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
	const cx = canvas.width / 2
	ctx.save()
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	const hp = Math.max(0, get(playerHp))
	const cap = get(maxHp)

	// HP gauge (red): a single bar with 1-HP segment ticks — replaces the hearts.
	const gW = 200
	const gH = 13
	const gx = cx - gW / 2
	const gy = 16
	const pctHp = cap > 0 ? Math.max(0, Math.min(1, hp / cap)) : 0
	ctx.fillStyle = 'rgba(15, 23, 42, 0.8)' // slate-900 track
	ctx.fillRect(gx, gy, gW, gH)
	ctx.fillStyle = '#ef4444' // red-500 fill
	ctx.fillRect(gx, gy, gW * pctHp, gH)
	if (cap <= 24) {
		ctx.strokeStyle = 'rgba(2, 6, 23, 0.55)'
		ctx.lineWidth = 1
		ctx.beginPath()
		for (let i = 1; i < cap; i++) {
			const tx = Math.round(gx + (gW * i) / cap) + 0.5
			ctx.moveTo(tx, gy)
			ctx.lineTo(tx, gy + gH)
		}
		ctx.stroke()
	}
	ctx.fillStyle = '#ffffff'
	ctx.font = '700 10px ui-monospace, monospace'
	ctx.fillText(`${hp} / ${cap}`, cx, gy + gH / 2 + 0.5)

	ctx.font = '600 15px ui-monospace, monospace'
	ctx.fillStyle = '#cbd5e1'
	ctx.fillText(`WAVE ${get(wave)}   ·   LVL ${get(level)}   ·   SCORE ${get(score)}`, cx, gy + gH + 18)

	// XP-to-next-level progress bar (emerald) — fills as gems are banked.
	const barW = 160
	const barH = 5
	const bx = cx - barW / 2
	const by = gy + gH + 32
	const pct = Math.max(0, Math.min(1, get(levelXp) / get(levelXpNeeded)))
	ctx.fillStyle = 'rgba(15, 23, 42, 0.7)'
	ctx.fillRect(bx, by, barW, barH)
	ctx.fillStyle = '#34d399'
	ctx.fillRect(bx, by, barW * pct, barH)
	ctx.restore()
}

// Brief "WAVE N" flash when the difficulty steps up. `waveBanner` is the ms
// remaining on the current banner (WAVE_BANNER_MS → 0).
export const drawWaveBanner = (
	ctx: CanvasRenderingContext2D,
	canvas: HTMLCanvasElement,
	waveBanner: number
) => {
	const t = waveBanner / WAVE_BANNER_MS // 1 → 0 over the banner's life
	ctx.save()
	ctx.globalAlpha = Math.min(1, t * 2) // hold, then fade out over the last half
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	ctx.fillStyle = '#f87171' // red-400
	ctx.font = '700 34px ui-monospace, monospace'
	ctx.fillText(`WAVE ${get(wave)}`, canvas.width / 2, canvas.height * 0.26)
	ctx.restore()
}
