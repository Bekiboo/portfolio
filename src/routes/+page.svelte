<script lang="ts">
	import { tooltip } from '$lib/tooltip/tooltip'
	import {
		IconBrandSvelte,
		IconBrandJavascript,
		IconBrandTypescript,
		IconBrandHtml5,
		IconBrandCss3,
		IconBrandSass,
		IconBrandTailwind,
		IconBrandGit,
		IconBrandGithub,
		IconBrandPython,
		IconBrandMongodb,
		IconBrandSupabase,
		IconBrandFirebase,
		IconBrandAngular,
		IconBrandLinkedin,
		IconMail
	} from '@tabler/icons-svelte'

	const copyEmail = () => {
		const email = 'julien.connault@gmail.com'
		navigator.clipboard.writeText(email)
		alert(`Copied ${email} to clipboard`)
	}
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

		<button
			class="relative w-48 h-12 px-4 py-2 font-medium uppercase colliding"
			on:click={copyEmail}>Copy Email</button
		>

		<ul class="flex items-center mt-8 ml-1" aria-label="Social media">
			<li class="mr-5">
				<a
					class="block hover:text-persian-red"
					href="https://github.com/Bekiboo"
					target="_blank"
					rel="noreferrer"
					><span class="sr-only">GitHub</span>
					<IconBrandGithub size={36} stroke={1} color={'currentColor'} />
				</a>
			</li>
			<li class="mr-5">
				<a
					class="block hover:text-persian-red"
					href="https://www.linkedin.com/in/bchiang7/"
					target="_blank"
					rel="noreferrer"
					><span class="sr-only">LinkedIn</span>
					<IconBrandLinkedin size={36} stroke={1} color={'currentColor'} />
				</a>
			</li>
			<li class="mr-5">
				<a
					class="block hover:text-persian-red"
					href="mailto:julien.connault@gmail.com"
					target="_blank"
					rel="noreferrer"
					><span class="sr-only">LinkedIn</span>
					<IconMail size={36} stroke={1} color={'currentColor'} />
				</a>
			</li>
		</ul>
		<span class="mt-2 font-thin">Email: julien.connault@gmail.com</span>
	</header>

	<main class="lg:col-start-2">
		<!---------- ACADEMICS ---------->
		<section class="mb-12">
			<h2 class="flex mb-2 text-2xl title"><span>Academics</span></h2>
			<h3 class="text-xl">Bachelor of Science in Applied Technology</h3>
			<a target="_blank" href="https://www.byui.edu/" class="text-slate-400 hover:underline"
				>Brigham Young University Idaho</a
			>

			<ul class="mt-2">
				<li>Certificate of Web Front-End – <span class="text-persian-red">2020</span></li>
				<li>Certificate of Web Development – <span class="text-persian-red">2021</span></li>
				<li>Certificate of Computer Programming – <span class="text-persian-red">2022</span></li>
				<li>
					Certificate of Business Analysis – <span class="text-persian-red">In Progress</span>
				</li>
			</ul>
		</section>

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

		<!---------- PROJECTS ---------->
		<section class="mb-12">
			<h2 class="flex mb-2 text-2xl title">
				<span class="whitespace-nowrap">Featured Projects</span>
			</h2>

			<ul class="flex flex-col gap-8">
				<li class="grid grid-cols-12 gap-4">
					<img
						class="w-full col-span-2"
						src="image/logo-elevatus.svg"
						alt="Elevatus Foundation Logo"
					/>
					<div class="col-span-10">
						<a
							class="text-xl duration-100 hover:text-persian-red"
							target="_blank"
							href="https://www.elevatus-foundation.org/">Elevatus Foundation</a
						>
						<p class="text-slate-400">
							Website for the Elevatus Foundation, a non-profit organization that provides education
							for trafficked children in Madagascar.
						</p>
						<div class="flex gap-2 mt-2">
							<span class="px-2 rounded-full text-slate-300 bg-slate-700">Svelte</span>
							<span class="px-2 rounded-full text-slate-300 bg-slate-700">Tailwind</span>
							<span class="px-2 rounded-full text-slate-300 bg-slate-700">Supabase</span>
						</div>
					</div>
				</li>

				<li class="grid grid-cols-12 gap-4">
					<img class="w-full col-span-2" src="image/logo-mulligan.svg" alt="Mulligan Logo" />
					<div class="col-span-10">
						<a
							class="text-xl duration-100 hover:text-persian-red"
							target="_blank"
							href="https://mulligan.vercel.app/">Mulligan</a
						>
						<p>
							A prototype Virtual Table Top app. In its current state it allows players to share a
							board and move tokens around in realtime.
						</p>
						<div class="flex gap-2 mt-2">
							<span class="px-2 rounded-full text-slate-300 bg-slate-700">Svelte</span>
							<span class="px-2 rounded-full text-slate-300 bg-slate-700">Tailwind</span>
							<span class="px-2 rounded-full text-slate-300 bg-slate-700">Supabase</span>
						</div>
					</div>
				</li>

				<li class="grid grid-cols-12 gap-4">
					<img class="w-full col-span-2" src="image/logo-sandbox.svg" alt="Sandbox Logo" />
					<div class="col-span-10">
						<a
							class="text-xl duration-100 hover:text-persian-red"
							target="_blank"
							href="https://bekiboo-sandbox.vercel.app/">Sandbox</a
						>
						<p>
							A collection of small projects and experiments. This website is always evolving and
							might be prone to bugs.
						</p>
						<div class="flex flex-wrap gap-2 mt-2">
							<span class="px-2 rounded-full text-slate-300 bg-slate-700">Svelte</span>
							<span class="px-2 rounded-full text-slate-300 bg-slate-700">Tailwind</span>
							<span class="px-2 rounded-full text-slate-300 bg-slate-700">Daisy UI</span>
							<span class="px-2 rounded-full text-slate-300 bg-slate-700">Threlte</span>
							<span class="px-2 rounded-full text-slate-300 bg-slate-700">Konva</span>
						</div>
					</div>
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

	button {
		box-shadow: 0.3em 0.3em 0 0 #880505, inset 6em 3.5em 0 0 var(--persian-red);

		transition: box-shadow 0.2s ease-in-out;
	}

	button:hover,
	button:focus {
		outline: none;
		box-shadow: 0.3em 0.3em 0 0 var(--persian-red), inset 0.3em 0.3em 0 0 var(--persian-red);
	}
</style>
