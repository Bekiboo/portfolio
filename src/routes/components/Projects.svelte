<script lang="ts">
	import { IconExternalLink, IconBrandGithub } from '@tabler/icons-svelte'
	import { slide } from 'svelte/transition'

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
			title: 'Mulligan',
			href: 'https://mulligan.vercel.app/',
			src: 'image/logo-mulligan.svg',
			desc: 'A prototype Virtual Table Top app. In its current state it allows players to share a board and move tokens around in realtime.',
			gitUrl: 'https://github.com/Bekiboo/mulligan',
			tags: ['Svelte', 'Tailwind', 'Supabase']
		}
	]

	let logoHovered = $state(false)
	let gitHovered = $state(false)
</script>

<div class="flex flex-col gap-8">
	{#each projects as project}
		{@const { title, desc, src, href, gitUrl, tags } = project}
		<div class="grid grid-cols-12 gap-4 duration-100">
			<a class="col-span-2" target="_blank" {href}
				><img
					class="w-full text-blue-500"
					{src}
					alt="{title} Logo"
					onmouseenter={() => (logoHovered = true)}
					onmouseleave={() => (logoHovered = false)}
				/></a
			>
			<div class="col-span-10">
				<div class="flex justify-between">
					<a
						target="_blank"
						{href}
						class="flex gap-2 text-xl text-blue-400 duration-100 hover:text-blue-300 hover:underline"
						class:underline={logoHovered}
						class:text-blue-300={logoHovered}
					>
						{title}
						<IconExternalLink />
					</a>
					<a
						target="_blank"
						href={gitUrl}
						aria-label="GitHub Repository"
						onmouseenter={() => (gitHovered = true)}
						onmouseleave={() => (gitHovered = false)}
						class="flex items-center justify-center h-8 gap-1 px-1 overflow-hidden duration-100 group hover:bg-blue-700 text-slate-300"
					>
						{#if gitHovered}
							<span
								data-colliding
								class="hidden ml-1 group-hover:sm:block"
								transition:slide={{ axis: 'x', duration: 100 }}>GitHub</span
							>
						{/if}
						<IconBrandGithub color={'currentColor'} size={24} />
					</a>
				</div>
				<p class="text-slate-400">
					{desc}
				</p>
				<div class="flex flex-wrap gap-2 mt-2">
					{#each tags as tag}
						<span class="px-2 rounded-full text-slate-300 bg-slate-700">{tag}</span>
					{/each}
				</div>
			</div>
		</div>
	{/each}
</div>
