export class Platform {
	width: number;
	height: number;
	top: number;
	left: number;

	constructor(width: number, height: number, top: number, left: number) {
		this.width = width;
		this.height = height;
		this.top = top;
		this.left = left;
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.strokeStyle = 'white';
		ctx.strokeRect(this.left, this.top, this.width, this.height);
	}
}
