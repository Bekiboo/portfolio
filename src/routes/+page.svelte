<script lang="ts">
	import { onMount } from 'svelte';
	import { Platform } from './Platform';

	let content: HTMLDivElement;

	onMount(() => {
		const canvas = document.querySelector('canvas') as HTMLCanvasElement;
		const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

		const animate = () => {
			canvas.width = content.clientWidth;
			canvas.height = content.clientHeight;

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			let collidingElements = document.getElementsByClassName('colliding');
			let platforms: Platform[] = [];

			for (let i = 0; i < collidingElements.length; i++) {
				let element = collidingElements[i];
				let rect = element.getBoundingClientRect();
				let platform = new Platform(rect);
				platforms.push(platform);

				console.log(rect);
				console.log(platform);
				console.log('-----------------------');

				// draw platforms
				platform.draw(ctx);
			}

			requestAnimationFrame(animate);
		};

		animate();
	});

	const test = () => {
		console.log('test');
	};
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

<svelte:window on:resize={test} />

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
