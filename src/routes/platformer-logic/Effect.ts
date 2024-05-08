import { getSprite } from './utils'
import { effectsStore } from '$lib/stores'

export class Effect {
	pos: { x: number; y: number }
	height: number
	width: number
	speed: number
	image!: HTMLImageElement
	maxFrame!: number
	frame = 0
	ticksPerFrame!: number
	ticksCount = 0
	animation!: string

	constructor(pos: { x: number; y: number }, animation: string) {
		this.pos = pos
		this.image = getSprite('effect', animation).img
		this.ticksPerFrame = getSprite('effect', animation).speed || 5
		this.maxFrame = getSprite('effect', animation).frames || 0
		this.height = getSprite('effect', animation).height || 96
		this.width = getSprite('effect', animation).width || 48
		this.speed = 6
		if (this.frame > this.maxFrame) {
			this.frame = 0
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		this.#animate()
		ctx.drawImage(
			this.image,
			this.frame * this.width,
			0,
			this.width,
			this.height,
			this.pos.x - this.width / 2,
			this.pos.y - this.height / 2,
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
