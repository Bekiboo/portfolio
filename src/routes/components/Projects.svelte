<script lang="ts">
	import { IconExternalLink, IconBrandGithub } from '@tabler/icons-svelte'
	import { translations } from '$lib/i18n/store'
</script>

<div class="flex flex-col gap-8">
	{#each $translations.projects || [] as project}
		{@render Project(project)}
	{/each}
</div>

{#snippet Project(project: { title: any; href: any; src: any; desc: any; gitUrl: any; tags: any })}
	<div class="space-y-2">
	<div class="flex items-start justify-between gap-4">
		<div class="flex items-start gap-3 text-blue-400 hover:text-blue-300">
			<a class="flex-shrink-0 w-10 h-10" target="_blank" href={project.href}
				><img
					class="w-full h-full object-contain"
					src={project.src}
					alt="{project.title} Logo"
				/></a
			>
			<div class="flex-1">
				<a
					target="_blank"
					href={project.href}
					class="inline-flex items-center gap-1.5 text-lg font-semibold  transition-colors"
				>
					{project.title}
					<IconExternalLink size={18} />
				</a>
			</div>
		</div>
		<a
			target="_blank"
			href={project.gitUrl}
			aria-label="GitHub Repository"
			class="text-slate-400 hover:text-slate-300 transition-colors"
		>
			<IconBrandGithub size={20} />
		</a>
	</div>
	<p class="text-sm text-slate-400 pl-13">
		{project.desc}
	</p>
	<div class="flex flex-wrap gap-1.5 pl-13">
		{#each project.tags as tag}
			<span class="px-2.5 py-1 text-xs text-slate-400 bg-slate-800/50 rounded">{tag}</span>
		{/each}
	</div>
</div>

{/snippet}