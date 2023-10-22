<script lang="ts">
	import { IconExternalLink, IconBrandGithub } from '@tabler/icons-svelte'

	export let project
	const { title, desc, src, href, gitUrl, tags } = project

	let logoHovered = false

	const enterLogo = (e: MouseEvent) => {
		logoHovered = true
	}
	const leaveLogo = (e: MouseEvent) => {
		logoHovered = false
	}
</script>

<div class="grid grid-cols-12 gap-8 duration-100">
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
				class="flex items-center justify-center gap-2 px-2 duration-100 bg-blue-900 rounded-full hover:bg-blue-600 text-slate-300"
			>
				<span>GitHub</span>
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
