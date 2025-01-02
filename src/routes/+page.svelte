<script lang="ts">
	import Projects from './components/Projects.svelte'
	import Technos from './components/Technos.svelte'
	import Academics from './components/Academics.svelte'
	import Header from './components/Header.svelte'
	import Title from './components/Title.svelte'
</script>

<div class="z-10 grid max-w-screen-xl min-h-screen px-4 pt-10 mx-auto lg:grid-cols-2 md:px-24">
	<!---------- HEADER ---------->
	<header
		class="mb-16 lg:col-start-1 lg:fixed lg:top-0 lg:max-h-screen lg:justify-between lg:py-24"
	>
		<Header />
	</header>

	<main class="lg:col-start-2">
		<!---------- ACADEMICS ---------->
		<section class="mb-12">
			<Title title="Academics" />
			<h3 class="text-xl">
				Bachelor of Science in Applied Technology – <span class="text-slate-400">2024</span>
			</h3>
			<Academics />
		</section>

		<!---------- TECHNOLOGIES ---------->
		<section class="mb-12">
			<Title title="Technologies" />
			<Technos />
		</section>

		<!---------- PROJECTS ---------->
		<section class="mb-12">
			<Title title="Featured Projects" />
			<Projects />
		</section>
	</main>
</div>

<style>
	/* Lines through titles */
	/* .title::before {
		content: '';
		margin: 1rem 0.5rem 0 0;
		width: 100%;
		height: 0.1rem;
		background: var(--delft-blue);
		width: 4rem;
	}
	.title::after {
		content: '';
		margin: 1rem 0 0 0.5rem;
		width: 100%;
		height: 0.1rem;
		background: var(--delft-blue);
	} */
</style>
