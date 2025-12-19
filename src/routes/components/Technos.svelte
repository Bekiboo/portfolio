<script lang="ts">
	const skills = [
		{
			category: 'Frontend',
			technos: [
				'Svelte / SvelteKit',
				'TypeScript',
				'JavaScript',
				'HTML5 / CSS3',
				'Tailwind CSS',
				'Vite'
			]
		},
		{
			category: 'Backend',
			technos: [
				'Node.js',
				'NestJS',
				'SQL (PostgreSQL)',
				'Prisma / TypeORM',
				'REST APIs',
				'Auth & RBAC'
			]
		},
		{
			category: 'Tooling & DX',
			technos: ['Git', 'MSW', 'Zod', 'Docker', 'CI basics']
		},
		{
			category: 'Integrations',
			technos: ['Supabase', 'Stripe', 'Firebase']
		}
	]
</script>

<div class="flex flex-col gap-4">
	{#each skills as { category, technos }}
		<div>
			<h3 class="mb-2 text-sm font-semibold text-slate-300">{category}</h3>
			<ul class="flex flex-wrap gap-1.5">
				{#each technos as techno}
					<li
						class="px-2.5 py-1 text-xs text-slate-400 bg-slate-800/50 rounded transition-colors hover:bg-slate-700/50 hover:text-slate-300"
					>
						{techno}
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</div>
