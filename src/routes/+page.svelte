<script lang="ts">
	import { onMount } from 'svelte';
	import type { Platform } from './Platform';

	let content: HTMLDivElement;

	onMount(() => {
		const canvas = document.querySelector('canvas') as HTMLCanvasElement;
		const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		const mouse = {
			x: 0,
			y: 0,
			radius: 100
		};

		window.addEventListener('mousemove', (event) => {
			mouse.x = event.clientX;
			mouse.y = event.clientY;
		});

		class Circle {
			x: number;
			y: number;
			radius: number;
			color: string;
			dx: number;
			dy: number;

			constructor(x: number, y: number, radius: number, color: string) {
				this.x = x;
				this.y = y;
				this.radius = radius;
				this.color = color;
				this.dx = Math.random() * 2 - 1;
				this.dy = Math.random() * 2 - 1;
			}

			draw() {
				ctx.beginPath();
				ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
				ctx.fillStyle = this.color;
				ctx.fill();
			}

			update() {
				this.x += this.dx;
				this.y += this.dy;

				if (this.x + this.radius > canvas.width || this.x - this.radius < 0) {
					this.dx = -this.dx;
				}

				if (this.y + this.radius > canvas.height || this.y - this.radius < 0) {
					this.dy = -this.dy;
				}

				if (
					mouse.x - this.x < mouse.radius &&
					mouse.x - this.x > -mouse.radius &&
					mouse.y - this.y < mouse.radius &&
					mouse.y - this.y > -mouse.radius
				) {
					if (this.radius < 40) {
						this.radius += 1;
					}
				} else if (this.radius > 2) {
					this.radius -= 1;
				}

				this.draw();
			}
		}

		let circles: Circle[] = [];

		const init = () => {
			circles = [];

			for (let i = 0; i < 80; i++) {
				const radius = Math.random() * 3 + 1;
				const x = Math.random() * (canvas.width - radius * 2) + radius;
				const y = Math.random() * (canvas.height - radius * 2) + radius;
				const color = '#fff';

				circles.push(new Circle(x, y, radius, color));
			}
		};

		const animate = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			circles.forEach((circle) => {
				circle.update();
			});

			let collidingElements = document.getElementsByClassName('colliding');
			let platforms: Platform[] = [];

			for (let i = 0; i < collidingElements.length; i++) {
				let element = collidingElements[i];
				let rect = element.getBoundingClientRect();

				platforms.push({
					x: rect.left,
					y: rect.top,
					width: rect.width,
					height: rect.height
				});
			}

			requestAnimationFrame(animate);
		};

		init();
		animate();
	});
</script>

<div class="wrapper">
	<canvas />

	<div class="content" bind:this={content}>
		<h1 class="colliding">JULIEN <br /> CONNAULT</h1>
		<h2 class="colliding">Web Developer</h2>
		<p class="colliding">
			Hi, I'm Julien Connault, a web developer based in Rennes, France. I enjoy creating things that
			live on the internet, whether that be websites, applications, or anything in between. My goal
			is to always build products that provide pixel-perfect, performant experiences.
		</p>
		<p>Here are a few technologies I've been working with recently:</p>
		<ul>
			<li>JavaScript (ES6+)</li>
			<li>TypeScript</li>
			<li>Svelte</li>
			<li>Sveltekit</li>
			<li>Node.js</li>
			<li>HTML & (S)CSS</li>
			<li>Tailwind</li>
		</ul>
	</div>
</div>

<style>
	.wrapper {
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: 1fr;
		min-height: 100vh;
	}
	canvas {
		grid-column: 1;
		grid-row: 1;
		width: 100%;
		height: 100%;
	}

	.content {
		grid-column: 1;
		grid-row: 1;
		z-index: 1;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 0 2rem;
		text-align: center;
		color: #fff;
	}
</style>
