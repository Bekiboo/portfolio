export class Sprite {
	position: { x: number; y: number }
	scale: number
	loaded = false
	image = new Image()
	width = 0
	frameRate: number
	height = 0
	currentFrame = 0
	frameBuffer: number
	elapsedFrames = 0

	constructor({
		position,
		imageSrc,
		frameRate = 1,
		frameBuffer = 3,
		scale = 1
	}: {
		position: { x: number; y: number }
		imageSrc: string
		frameRate: number
		frameBuffer: number
		scale: number
	}) {
		this.position = position
		this.scale = scale
		this.image.onload = () => {
			this.width = (this.image.width / this.frameRate) * this.scale
			this.height = this.image.height * this.scale
			this.loaded = true
		}
		this.image.src = imageSrc
		this.frameRate = frameRate
		this.frameBuffer = frameBuffer
	}

	draw(ctx: CanvasRenderingContext2D) {
		if (!this.image) return

		const cropbox = {
			position: {
				x: this.currentFrame * (this.image.width / this.frameRate),
				y: 0
			},
			width: this.image.width / this.frameRate,
			height: this.image.height
		}

		ctx.drawImage(
			this.image,
			cropbox.position.x,
			cropbox.position.y,
			cropbox.width,
			cropbox.height,
			this.position.x,
			this.position.y,
			this.width,
			this.height
		)
	}

	update(ctx: CanvasRenderingContext2D) {
		this.draw(ctx)
		this.updateFrames()
	}

	updateFrames() {
		this.elapsedFrames++

		if (this.elapsedFrames % this.frameBuffer === 0) {
			if (this.currentFrame < this.frameRate - 1) this.currentFrame++
			else this.currentFrame = 0
		}
	}
}
