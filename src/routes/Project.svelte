<script lang="ts">
	import { IconExternalLink, IconBrandGithub } from '@tabler/icons-svelte'
	import { fly, slide } from 'svelte/transition'

	export let project
	const { title, desc, src, href, gitUrl, tags } = project

	let logoHovered = false
	let gitHovered = false

	const enterLogo = () => (logoHovered = true)
	const leaveLogo = () => (logoHovered = false)
	const enterGit = () => (gitHovered = true)
	const leaveGit = () => (gitHovered = false)
</script>

<div class="grid grid-cols-12 gap-4 duration-100">
	<a class="col-span-2" target="_blank" {href}
		><img
			class="w-full text-blue-500"
			{src}
			alt="{title} Logo"
			on:mouseenter={enterLogo}
			on:mouseleave={leaveLogo}
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
				on:mouseenter={enterGit}
				on:mouseleave={leaveGit}
				class="flex items-center justify-center h-8 gap-1 px-1 overflow-hidden duration-100 bg-blue-900 rounded-full hover:bg-blue-700 text-slate-300"
			>
				<!-- <span class="translate-x-20">GitHub</span> -->
				{#if gitHovered}
					<span class="hidden sm:block" transition:slide={{ axis: 'x', duration: 100 }}>GitHub</span
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
