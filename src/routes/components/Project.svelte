<script lang="ts">
	import { IconBrandGithub, IconExternalLink } from '@tabler/icons-svelte'
	import { slide } from 'svelte/transition'

	let { project } = $props()
	const { title, desc, src, href, gitUrl, tags } = project

	let logoHovered = $state(false)
	let gitHovered = $state(false)
</script>

<div class="space-y-2">
	<div class="flex items-start justify-between gap-4">
		<div class="flex items-start gap-3">
			<a class="flex-shrink-0 w-10 h-10" target="_blank" {href}
				><img
					class="w-full h-full object-contain"
					{src}
					alt="{title} Logo"
					onmouseenter={() => (logoHovered = true)}
					onmouseleave={() => (logoHovered = false)}
				/></a
			>
			<div class="flex-1">
				<a
					target="_blank"
					{href}
					class="inline-flex items-center gap-1.5 text-lg font-semibold text-blue-400 hover:text-blue-300 transition-colors"
					class:text-blue-300={logoHovered}
				>
					{title}
					<IconExternalLink size={18} />
				</a>
			</div>
		</div>
		<a
			target="_blank"
			href={gitUrl}
			aria-label="GitHub Repository"
			class="text-slate-400 hover:text-slate-300 transition-colors"
		>
			<IconBrandGithub size={20} />
		</a>
	</div>
	<p class="text-sm text-slate-400 pl-13">
		{desc}
	</p>
	<div class="flex flex-wrap gap-1.5 pl-13">
		{#each tags as tag}
			<span class="px-2.5 py-1 text-xs text-slate-400 bg-slate-800/50 rounded">{tag}</span>
		{/each}
	</div>
</div>
