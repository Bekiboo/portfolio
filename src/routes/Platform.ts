export class Platform {
	width: number;
	height: number;
	top: number;
	left: number;

	constructor(el: DOMRect) {
		this.width = el.width;
		this.height = el.height;
		this.top = el.top;
		this.left = el.left;
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.strokeStyle = 'white';
		ctx.strokeRect(this.left, this.top, this.width, this.height);
	}
}
