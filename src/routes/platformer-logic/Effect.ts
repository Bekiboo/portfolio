import { getSprite } from './utils'
import { effectsStore } from '$lib/stores'

export class Effect {
	pos: { x: number; y: number }
	height: number
	width: number
	image!: HTMLImageElement
	maxFrame!: number
	frame = 0
	ticksPerFrame!: number
	ticksCount = 0
	centered: boolean

	constructor(
		pos: { x: number; y: number },
		animation: string,
		opts: { centered?: boolean } = {}
	) {
		this.centered = opts.centered ?? false
		this.pos = pos
		const s = getSprite('effect', animation)
		this.image = s.img
		this.ticksPerFrame = s.speed || 5
		this.maxFrame = s.frames || 0
		this.height = s.height || 96
		this.width = s.width || 48
		if (this.frame > this.maxFrame) {
			this.frame = 0
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		this.#animate()
		// The sprite is drawn at 2× its source frame. By default it's anchored at
		// pos − halfFrame, which (because the draw is 2×) actually places the sprite's
		// centre at pos + halfFrame — a low/offset anchor the footfall & pickup puffs
		// are tuned around, so leave it. `centered` instead anchors at pos − fullFrame
		// so a 2×-scaled sprite is *truly* centred on pos (on-body bursts like deaths).
		const ax = this.centered ? this.width : this.width / 2
		const ay = this.centered ? this.height : this.height / 2
		ctx.drawImage(
			this.image,
			this.frame * this.width,
			0,
			this.width,
			this.height,
			this.pos.x - ax,
			this.pos.y - ay,
			this.width * 2,
			this.height * 2
		)
	}

	#animate() {
		this.ticksCount++
		if (this.ticksCount > this.ticksPerFrame) {
			this.ticksCount = 0
			if (this.frame < this.maxFrame) {
				this.frame++
			} else {
				effectsStore.delete(this)
			}
		}
	}
}
