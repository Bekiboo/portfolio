import type { Platform } from './Platform';
import { collision, collisionDirection, type Rect } from './utils';

const GRAVITY = 0.5;

export class Player {
	pos: { x: number; y: number };
	velocity: { x: number; y: number };
	height = 40;
	width = 40;
	speed = 4;
	constructor(pos: { x: number; y: number }) {
		this.pos = pos;
		this.velocity = {
			x: 0,
			y: 1
		};
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = 'red';
		ctx.fillRect(this.pos.x, this.pos.y, this.width, this.height);
	}

	update(canvas: HTMLCanvasElement, keys: { [key: string]: boolean }, platforms: Platform[]) {
		this.pos.x += this.velocity.x; // move left/right

		this.#applyGravity();
		this.#keepWithinCanvas(canvas);
		this.#checkForCollision(platforms);

		this.velocity.x = 0; // reset velocity

		if (keys['left']) this.velocity.x -= this.speed;
		if (keys['right']) this.velocity.x += this.speed;
	}

	#applyGravity() {
		this.pos.y += this.velocity.y;
		this.velocity.y += GRAVITY;
	}

	#keepWithinCanvas(canvas: HTMLCanvasElement) {
		// stop from going below canvas
		if (this.pos.y + this.height > canvas.height) {
			this.velocity.y = 0;
			this.pos.y = canvas.height - this.height;
		}

		// stop from going off the sides
		if (this.pos.x < 0) {
			this.pos.x = 0;
		} else if (this.pos.x + this.width > canvas.width) {
			this.pos.x = canvas.width - this.width;
		}

		// stop from going above canvas
		if (this.pos.y < 0) {
			this.velocity.y *= -0.6;
			this.pos.y = 0;
		}
	}

	#checkForCollision(platforms: Platform[]) {
		for (const platform of platforms) {
			if (
				collision(
					{ left: this.pos.x, top: this.pos.y, width: this.width, height: this.height },
					platform as Rect
				)
			) {
				const direction = collisionDirection(
					{ left: this.pos.x, top: this.pos.y, width: this.width, height: this.height },
					platform
				);
				if (direction === 'left') {
					this.pos.x = platform.left - this.width;
				} else if (direction === 'right') {
					this.pos.x = platform.left + platform.width;
				} else if (direction === 'top') {
					this.pos.y = platform.top - this.height;
					this.velocity.y = 0;
				} else if (direction === 'bottom') {
					this.pos.y = platform.top + platform.height;
					this.velocity.y *= -0.6;
				}
			}
		}
	}
}
