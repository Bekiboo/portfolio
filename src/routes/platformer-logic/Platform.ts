export class Platform {
	width: number
	height: number
	top: number
	left: number
	// DOM-derived platforms (CV titles/buttons) collide but draw nothing — the CV shows
	// through underneath. Procedurally-spawned arena ledges (GameWorld.buildLayout) set
	// this so they're actually rendered and the focus veil isn't punched out over them.
	visible = false
	// Fade for the between-wave arena swap: old ledges fade 1→0 and the new set fades 0→1
	// over the spawn dwell (GameWorld). 1 = fully drawn.
	renderAlpha = 1
	// Wall-flush perch ledges the spawn director uses as enemy spawn points (a perched
	// turret rides one and fires inward). null = a regular interior ledge.
	edge: 'left' | 'right' | null = null

	constructor(width: number, height: number, top: number, left: number) {
		this.width = width
		this.height = height
		this.top = top
		this.left = left
	}

	draw(ctx: CanvasRenderingContext2D) {
		if (!this.visible || this.renderAlpha <= 0) return
		// A solid stone ledge: slate body, lit top edge, shadowed underside — enough to
		// read as a platform over the dark focus veil.
		ctx.save()
		ctx.globalAlpha = this.renderAlpha
		ctx.fillStyle = '#1e293b' // slate-800 body
		ctx.fillRect(this.left, this.top, this.width, this.height)
		ctx.fillStyle = '#64748b' // slate-500 lit top
		ctx.fillRect(this.left, this.top, this.width, 4)
		ctx.fillStyle = 'rgba(2, 6, 23, 0.5)' // shadowed underside
		ctx.fillRect(this.left, this.top + this.height - 3, this.width, 3)
		ctx.restore()
	}
}
