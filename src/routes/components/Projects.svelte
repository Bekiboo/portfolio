<script lang="ts">
	import { IconExternalLink, IconBrandGithub } from '@tabler/icons-svelte'
	import { slide } from 'svelte/transition'
	import Project from './Project.svelte'

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
			title: 'Sandbox',
			href: 'https://bekiboo-sandbox.vercel.app/',
			src: 'image/logo-sandbox.svg',
			desc: 'A collection of small projects and experiments. This website is always evolving and might be prone to bugs.',
			gitUrl: 'https://github.com/Bekiboo/sandbox',
			tags: ['Svelte', 'Tailwind', 'Daisy UI', 'Threlte', 'Konva']
		},
		{
			title: 'Orobo',
			href: 'https://app.orobo.tech/',
			src: 'image/logo-orobo.png',
			desc: 'Public repository of published Digital Product Passports (DPPs)',
			gitUrl: 'https://github.com/Orobo-Pte-Ltd',
			tags: ['Svelte', 'Tailwind', 'NestJS', 'PostgreSQL']
		}
	]
</script>

<div class="flex flex-col gap-8">
	{#each projects as project}
		<Project {project} />
	{/each}
</div>
