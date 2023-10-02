<script lang="ts">
	import { tooltip } from '$lib/tooltip/tooltip'
	import Button from './components/Button.svelte'
	import {
		IconBrandSvelte,
		IconBrandJavascript,
		IconBrandTypescript,
		IconBrandHtml5,
		IconBrandCss3,
		IconBrandSass,
		IconBrandTailwind,
		IconBrandGit,
		IconBrandPython,
		IconBrandMongodb,
		IconBrandSupabase,
		IconBrandFirebase,
		IconBrandAngular
	} from '@tabler/icons-svelte'
</script>

<div class="relative grid max-w-screen-xl min-h-screen px-8 pt-10 mx-auto lg:grid-cols-2 md:px-24">
	<header
		class="mb-16 lg:col-start-1 lg:fixed lg:top-0 lg:max-h-screen lg:justify-between lg:py-24"
	>
		<a href="/">
			<h1 class="text-4xl font-bold tracking-wider font-bauhaus text-slate-200 sm:text-5xl">
				Julien Connault
			</h1>
		</a>
		<h2 class="mt-3 text-lg font-medium tracking-tight colliding text-slate-200 sm:text-xl">
			Junior Front-End Engineer
		</h2>
		<p class="max-w-xs mt-4 mb-12 leading-normal text-slate-400">
			I'm a design-minded, detail oriented Front-End Engineer passionate about combining clean code
			with interactive design.
		</p>

		<Button>Contact Me</Button>
	</header>

	<main class="lg:col-start-2">
		<!---------- TECHNOLOGIES ---------->
		<section class="mb-12">
			<h2 class="flex mb-2 text-2xl title"><span>Technologies</span></h2>

			<div class="mb-2">
				<h3 class="text-slate-200">Proficient</h3>
				<ul class="flex flex-wrap">
					<li data-tooltip="Svelte/Sveltekit" class="hover:text-persian-red" use:tooltip>
						<div class="pointer-events-none">
							<IconBrandSvelte size={64} stroke={1} color={'currentColor'} />
						</div>
					</li>
					<li data-tooltip="Typescript" class="hover:text-persian-red" use:tooltip>
						<div class="pointer-events-none">
							<IconBrandTypescript size={64} stroke={1} color={'currentColor'} />
						</div>
					</li>
					<li data-tooltip="Javascript" class="hover:text-persian-red" use:tooltip>
						<div class="pointer-events-none">
							<IconBrandJavascript size={64} stroke={1} color={'currentColor'} />
						</div>
					</li>
					<li data-tooltip="HTML5" class="hover:text-persian-red" use:tooltip>
						<div class="pointer-events-none">
							<IconBrandHtml5 size={64} stroke={1} color={'currentColor'} />
						</div>
					</li>
					<li data-tooltip="CSS3" class="hover:text-persian-red" use:tooltip>
						<div class="pointer-events-none">
							<IconBrandCss3 size={64} stroke={1} color={'currentColor'} />
						</div>
					</li>
					<li data-tooltip="Tailwind" class="hover:text-persian-red" use:tooltip>
						<div class="pointer-events-none">
							<IconBrandTailwind size={64} stroke={1} color={'currentColor'} />
						</div>
					</li>
				</ul>
			</div>
			<div class="mb-2 text-slate-400">
				<h3 class="text-slate-200">Experienced</h3>
				<ul class="flex">
					<li data-tooltip="Git" class="hover:text-persian-red" use:tooltip>
						<div class="pointer-events-none">
							<IconBrandGit size={64} stroke={1} color={'currentColor'} />
						</div>
					</li>
					<li data-tooltip="Supabase" class="hover:text-persian-red" use:tooltip>
						<div class="pointer-events-none">
							<IconBrandSupabase size={64} stroke={1} color={'currentColor'} />
						</div>
					</li>
					<li data-tooltip="SASS" class="hover:text-persian-red" use:tooltip>
						<div class="pointer-events-none">
							<IconBrandSass size={64} stroke={1} color={'currentColor'} />
						</div>
					</li>
				</ul>
			</div>
			<div class="mb-2 text-slate-600">
				<h3 class="text-slate-200">Familiar</h3>
				<ul class="flex">
					<li data-tooltip="Python" class="hover:text-persian-red" use:tooltip>
						<div class="pointer-events-none">
							<IconBrandPython size={64} stroke={1} color={'currentColor'} />
						</div>
					</li>
					<li data-tooltip="MongoDB" class="hover:text-persian-red" use:tooltip>
						<div class="pointer-events-none">
							<IconBrandMongodb size={64} stroke={1} color={'currentColor'} />
						</div>
					</li>
					<li data-tooltip="Firebase" class="hover:text-persian-red" use:tooltip>
						<div class="pointer-events-none">
							<IconBrandFirebase size={64} stroke={1} color={'currentColor'} />
						</div>
					</li>
					<li data-tooltip="Angular" class="hover:text-persian-red" use:tooltip>
						<div class="pointer-events-none">
							<IconBrandAngular size={64} stroke={1} color={'currentColor'} />
						</div>
					</li>
				</ul>
			</div>
		</section>

		<!---------- ACADEMICS ---------->
		<section class="mb-12">
			<h2 class="flex mb-2 text-2xl title"><span>Academics</span></h2>
			<h3 class="text-xl">Bachelor of Science in Applied Technology</h3>
			<span class="text-slate-400">Brigham Young University Idaho</span>

			<ul class="mt-2">
				<li>Certificate of Web Front-End – <span class="text-persian-red">2020</span></li>
				<li>Certificate of Web Development – <span class="text-persian-red">2021</span></li>
				<li>Certificate of Computer Programming – <span class="text-persian-red">2022</span></li>
				<li>
					Certificate of Business Analysis – <span class="text-persian-red">In Progress</span>
				</li>
			</ul>
		</section>

		<!---------- PROJECTS ---------->
		<section class="mb-12">
			<h2 class="flex mb-2 text-2xl title">
				<span class="whitespace-nowrap">Featured Projects</span>
			</h2>

			<ul>
				<li>
					<a target="_blank" href="https://www.elevatus-foundation.org/">Elevatus Foundation</a>
				</li>
				<li>
					<a target="_blank" href="https://mulligan.vercel.app/">Mulligan</a>
				</li>
				<li>
					<a target="_blank" href="https://bekiboo-sandbox.vercel.app/">Sandbox</a>
				</li>
			</ul>
		</section>
	</main>
</div>

<style>
	.title::before {
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
	}
</style>
