<script lang="ts">
	import Button from './components/Button.svelte'
</script>

<div class="flex px-8 md:px-40 pt-10">
	<header
		class="lg:top-0 lg:flex gap-10 lg:max-h-screen lg:w-1/2 lg:flex-col lg:justify-between lg:py-24"
	>
		<a href="/">
			<h1 class="font-bauhaus text-4xl tracking-wider font-bold text-slate-200 sm:text-5xl">
				Julien Connault
			</h1>
		</a>
		<h2 class="colliding mt-3 text-lg font-medium tracking-tight text-slate-200 sm:text-xl">
			Junior Front-End Engineer
		</h2>
		<p class="mt-4 max-w-xs leading-normal">
			I'm a design-minded, detail oriented Front-End Engineer passionate about combining clean code
			with interactive design.
		</p>

		<Button>Contact Me</Button>
		<Button>Ladou</Button>
		<Button>Contact Me</Button>
		<Button>Contact Me</Button>
	</header>
	<main />
</div>
