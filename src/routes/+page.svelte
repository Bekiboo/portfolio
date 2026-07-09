<script lang="ts">
	import Projects from './components/Projects.svelte'
	import Technos from './components/Technos.svelte'
	import Academics from './components/Academics.svelte'
	import Experience from './components/Experience.svelte'
	import Header from './components/Header.svelte'
	import Title from './components/Title.svelte'
	import GameHub from './components/GameHub.svelte'
	import { translations } from '$lib/i18n/store'
</script>

<div class="z-10 grid max-w-7xl min-h-screen px-4 pt-10 mx-auto lg:grid-cols-2 md:px-24">
	<!---------- HEADER ---------->
	<header
		class="mb-16 lg:col-start-1 lg:fixed lg:top-0 lg:flex lg:h-screen lg:flex-col lg:gap-30 lg:py-24"
	>
		<div>
			<Header />
		</div>
		<GameHub />
	</header>

	<main class="lg:col-start-2 lg:mt-16">
		<!---------- EXPERIENCE ---------->
		<section class="mb-12">
			<Title title={$translations.navigation?.experience || 'Experience'} />
			<Experience />
		</section>

		<!---------- TECHNOLOGIES ---------->
		<section class="mb-12">
			<Title title={$translations.navigation?.technologies || 'Technologies'} />
			<Technos />
		</section>

		<!---------- PROJECTS ---------->
		<section class="mb-12">
			<Title title={$translations.navigation?.projects || 'Featured Projects'} />
			<Projects />
		</section>

		<!---------- ACADEMICS ---------->
		<section class="mb-12">
			<Title title={$translations.navigation?.academics || 'Academics'} />

			<Academics />
		</section>
	</main>
</div>
