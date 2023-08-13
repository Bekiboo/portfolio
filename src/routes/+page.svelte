<script lang="ts">
</script>

<div class="flex px-20 md:px-40 pt-10">
	<header class="lg:top-0 lg:flex lg:max-h-screen lg:w-1/2 lg:flex-col lg:justify-between lg:py-24">
		<a href="/">
			<h1 class="font-bauhaus text-4xl tracking-wider font-bold text-slate-200 sm:text-5xl">
				Julien Connault S s
			</h1>
		</a>
		<h2 class="colliding mt-3 text-lg font-medium tracking-tight text-slate-200 sm:text-xl">
			Junior Front-End Engineer
		</h2>
		<p class="mt-4 max-w-xs leading-normal">
			I'm a design-minded, detail oriented Front-End Engineer passionate about combining clean code
			with interactive design.
		</p>
		<button class="colliding h-12 bg-persian-red relative">Contact Me</button>
	</header>

	<main />
</div>

<style>
	button::after {
		content: '';
		z-index: -1;
		position: absolute;
		top: 0.5rem;
		left: 0.5rem;
		width: 100%;
		height: 100%;
		background-color: #880505;
	}
</style>
