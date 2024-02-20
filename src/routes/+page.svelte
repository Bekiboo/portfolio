<script lang="ts">
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
		IconBrandAngular,
		IconBrandLinkedin,
		IconBrandThreejs,
		IconMail,
		IconSql,
		IconBrandGithub,
		IconExternalLink,
		IconBrandVite
	} from '@tabler/icons-svelte'
	import Project from './Project.svelte'
	import Technos from './Technos.svelte'

	const skills = [
		{
			level: 'Advanced',
			baseColor: 'rgb(226 232 240)',
			technos: [
				{ name: 'Svelte', comp: IconBrandSvelte, color: '#ff3e00' },
				{ name: 'Javascript', comp: IconBrandJavascript, color: '#f7df1e' },
				{ name: 'HTML5', comp: IconBrandHtml5, color: '#e34f26' },
				{ name: 'CSS3', comp: IconBrandCss3, color: '#264de4' }
			]
		},
		{
			level: 'Proficient',
			baseColor: 'rgb(203 213 225)',
			technos: [
				{ name: 'Typescript', comp: IconBrandTypescript, color: '#007acc' },
				{ name: 'Javascript', comp: IconBrandJavascript, color: '#f7df1e' },
				{ name: 'Supabase', comp: IconBrandSupabase, color: '#3ecf8e' },
				{ name: 'Tailwind', comp: IconBrandTailwind, color: '#06b6d4' }
			]
		},
		{
			level: 'Experienced',
			baseColor: 'rgb(162 175 204)',
			technos: [
				{ name: 'Git', comp: IconBrandGit, color: '#f05032' },
				{ name: 'SASS', comp: IconBrandSass, color: '#cc6699' },
				{ name: 'SQL', comp: IconSql, color: '#f29111' },
				{ name: 'Angular', comp: IconBrandAngular, color: '#dd0031' },
				{ name: 'Vite', comp: IconBrandVite, color: '#646cff' }
			]
		},
		{
			level: 'Familiar',
			baseColor: 'rgb(128 138 157)',
			technos: [
				{ name: 'Python', comp: IconBrandPython, color: '#3776ab' },
				{ name: 'Mongodb', comp: IconBrandMongodb, color: '#4db33d' },
				{ name: 'Firebase', comp: IconBrandFirebase, color: '#ffca28' },
				{ name: 'Three.js', comp: IconBrandThreejs, color: '#000000' }
			]
		}
	]

	const projects = [
		{
			title: 'Elevatus Foundation',
			href: 'https://www.elevatus-foundation.org/',
			src: 'image/logo-elevatus.svg',
			desc: 'Website for the Elevatus Foundation, a non-profit organization that provides education for trafficked children in Madagascar.',
			gitUrl: 'https://github.com/Bekiboo/Elevatus-2.0',
			tags: ['Svelte', 'Tailwind', 'Supabase']
		},
		{
			title: 'Mulligan',
			href: 'https://mulligan.vercel.app/',
			src: 'image/logo-mulligan.svg',
			desc: 'A prototype Virtual Table Top app. In its current state it allows players to share a board and move tokens around in realtime.',
			gitUrl: 'https://github.com/Bekiboo/mulligan',
			tags: ['Svelte', 'Tailwind', 'Supabase']
		},
		{
			title: 'Sandbox',
			href: 'https://bekiboo-sandbox.vercel.app/',
			src: 'image/logo-sandbox.svg',
			desc: 'A collection of small projects and experiments. This website is always evolving and might be prone to bugs.',
			gitUrl: 'https://github.com/Bekiboo/sandbox',
			tags: ['Svelte', 'Tailwind', 'Daisy UI', 'Threlte', 'Konva']
		}
	]

	const copyEmail = () => {
		const email = 'julien.connault@gmail.com'
		navigator.clipboard.writeText(email)
		alert(`Copied ${email} to clipboard`)
	}
</script>

<div class="grid max-w-screen-xl min-h-screen px-4 pt-10 mx-auto lg:grid-cols-2 md:px-24">
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

		<button class="w-48 h-12 px-4 py-2 font-medium uppercase colliding" on:click={copyEmail}
			>Copy Email</button
		>

		<ul class="flex items-center mt-8 ml-1" aria-label="Social media">
			<li class="mr-5">
				<a
					class="block hover:text-blue-400"
					href="https://github.com/Bekiboo"
					target="_blank"
					rel="noreferrer"
					><span class="sr-only">GitHub</span>
					<IconBrandGithub size={36} stroke={1} color={'currentColor'} />
				</a>
			</li>
			<li class="mr-5">
				<a
					class="block hover:text-blue-400"
					href="https://www.linkedin.com/in/julien-connault/"
					target="_blank"
					rel="noreferrer"
					><span class="sr-only">LinkedIn</span>
					<IconBrandLinkedin size={36} stroke={1} color={'currentColor'} />
				</a>
			</li>
			<li class="mr-5">
				<a
					class="block hover:text-blue-400"
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
			<a
				target="_blank"
				href="https://www.byui.edu/"
				class="flex gap-1 text-blue-400 hover:underline hover:text-blue-300"
				>Brigham Young University Idaho
				<IconExternalLink size={20} /></a
			>

			<ul class="mt-2">
				<li>Certificate of Web Front-End – <span class="text-slate-400">2020</span></li>
				<li>Certificate of Web Development – <span class="text-slate-400">2021</span></li>
				<li>Certificate of Computer Programming – <span class="text-slate-400">2022</span></li>
				<li>Certificate of Business Analysis – <span class="text-slate-400">In Progress</span></li>
			</ul>
		</section>

		<!---------- TECHNOLOGIES ---------->
		<section class="mb-12">
			<h2 class="flex mb-2 text-2xl title"><span>Technologies</span></h2>

			<Technos {skills} />
		</section>

		<!---------- PROJECTS ---------->
		<section class="mb-12">
			<h2 class="flex mb-2 text-2xl title">
				<span class="whitespace-nowrap">Featured Projects</span>
			</h2>

			<div class="flex flex-col gap-8">
				{#each projects as project}
					<Project {project} />
				{/each}
			</div>
		</section>
	</main>
</div>

<style>
	/* Lines through titles */
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
		box-shadow: 0.3em 0.3em 0 0 rgb(30 58 138), inset 6em 3.5em 0 0 rgb(37 99 235);

		transition: box-shadow 0.2s ease-in-out;
	}

	button:hover,
	button:focus {
		outline: none;
		box-shadow: 0.3em 0.3em 0 0 rgb(37 99 235), inset 0.3em 0.3em 0 0 rgb(37 99 235);
	}
</style>
