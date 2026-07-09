import { get } from 'svelte/store'
import type { Bounds } from './utils'
import { playerHp, maxHp, wave, level, score, levelXp, levelXpNeeded, credits } from '$lib/game'

// Canvas HUD + wave banner. Drawn on top of the focus-mode veil so run state stays
// legible while the page behind it dims. Reads the reactive HUD stores directly —
// they're global run state, so no plumbing is needed.

// How long the "WAVE N" flash shows on advance.
export const WAVE_BANNER_MS = 1400

// HP gauge + wave/score line + XP bar.
export const drawHud = (ctx: CanvasRenderingContext2D, canvas: Bounds) => {
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
	ctx.fillText(
		`WAVE ${get(wave)}   ·   LVL ${get(level)}   ·   SCORE ${get(score)}`,
		cx,
		gy + gH + 18
	)

	// Credits readout (amber, shop currency) pinned top-right, clear of the centred stack.
	ctx.textAlign = 'right'
	ctx.font = '700 14px ui-monospace, monospace'
	ctx.fillStyle = '#fbbf24' // amber-400
	ctx.fillText(`◈ ${get(credits)}`, canvas.width - 16, gy + gH / 2 + 0.5)
	ctx.textAlign = 'center'

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

// Special-power badge: a small glyph tile under the XP bar that dims and fills bottom-up as
// the power recharges, and brightens its border when ready. `charge` is 0→1 (1 = ready).
// null when no power is equipped yet, so the badge only appears once one is earned.
export const drawPowerHud = (
	ctx: CanvasRenderingContext2D,
	canvas: Bounds,
	power: { glyph: string; color: string; charge: number } | null
) => {
	if (!power) return
	const cx = canvas.width / 2
	const size = 26
	const x = cx - size / 2
	const y = 84 // just under the XP bar
	const ready = power.charge >= 1
	ctx.save()
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	// Track + bottom-up recharge fill.
	ctx.fillStyle = 'rgba(15, 23, 42, 0.8)' // slate-900
	ctx.fillRect(x, y, size, size)
	const ch = Math.max(0, Math.min(1, power.charge))
	ctx.globalAlpha = ready ? 0.35 : 0.22
	ctx.fillStyle = power.color
	ctx.fillRect(x, y + size * (1 - ch), size, size * ch)
	ctx.globalAlpha = 1
	// Border brightens on ready.
	ctx.strokeStyle = ready ? power.color : 'rgba(100, 116, 139, 0.7)' // slate-500
	ctx.lineWidth = ready ? 2 : 1
	ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1)
	// Glyph + key hint.
	ctx.fillStyle = ready ? '#e2e8f0' : '#94a3b8' // slate-200 / slate-400
	ctx.font = '700 15px ui-monospace, monospace'
	ctx.fillText(power.glyph, cx, y + size / 2 + 1)
	ctx.fillStyle = ready ? power.color : 'rgba(100, 116, 139, 0.9)'
	ctx.font = '700 9px ui-monospace, monospace'
	ctx.fillText('S', cx, y + size + 7)
	ctx.restore()
}

// Brief "WAVE N" flash (with the wave's theme name below) when the difficulty steps up.
// `waveBanner` is the ms remaining on the current banner (WAVE_BANNER_MS → 0).
export const drawWaveBanner = (
	ctx: CanvasRenderingContext2D,
	canvas: Bounds,
	waveBanner: number,
	label = ''
) => {
	const t = waveBanner / WAVE_BANNER_MS // 1 → 0 over the banner's life
	ctx.save()
	ctx.globalAlpha = Math.min(1, t * 2) // hold, then fade out over the last half
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	const cx = canvas.width / 2
	const cy = canvas.height * 0.26
	ctx.fillStyle = '#f87171' // red-400
	ctx.font = '700 34px ui-monospace, monospace'
	ctx.fillText(`WAVE ${get(wave)}`, cx, cy)
	if (label) {
		ctx.fillStyle = '#fca5a5' // red-300
		ctx.font = '600 15px ui-monospace, monospace'
		ctx.fillText(label.toUpperCase(), cx, cy + 30)
	}
	ctx.restore()
}

// Persistent rest-phase prompt: shown while a wave is cleared and the player must walk
// back to the spawn pedestal and hold position. `pulse` (0→1) breathes the call to action;
// `progress` (0→1) is the dwell charge — once it's non-zero we swap the copy to "hold" and
// draw a charging bar so the 1.5s hold reads clearly.
export const drawIntermissionPrompt = (
	ctx: CanvasRenderingContext2D,
	canvas: Bounds,
	pulse: number,
	progress: number
) => {
	ctx.save()
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	const cx = canvas.width / 2
	const cy = canvas.height * 0.26
	ctx.fillStyle = '#7dd3fc' // sky-300
	ctx.font = '700 26px ui-monospace, monospace'
	ctx.fillText('VAGUE TERMINÉE', cx, cy)
	if (progress > 0) {
		ctx.fillStyle = '#e2e8f0' // slate-200
		ctx.font = '600 14px ui-monospace, monospace'
		ctx.fillText('MAINTENEZ LA POSITION…', cx, cy + 28)
		// Charging bar for the dwell.
		const barW = 180
		const barH = 6
		const bx = cx - barW / 2
		const by = cy + 44
		ctx.fillStyle = 'rgba(15, 23, 42, 0.7)'
		ctx.fillRect(bx, by, barW, barH)
		ctx.fillStyle = '#67e8f9' // cyan-300
		ctx.fillRect(bx, by, barW * Math.min(1, progress), barH)
	} else {
		ctx.globalAlpha = 0.55 + 0.45 * pulse
		ctx.fillStyle = '#e2e8f0' // slate-200
		ctx.font = '600 14px ui-monospace, monospace'
		ctx.fillText('↩ RETOURNEZ AU DÉPART — BOUTIQUE', cx, cy + 28)
	}
	ctx.restore()
}
