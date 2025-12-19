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

<div class="flex flex-col gap-6">
	{#each skills as { category, technos }}
		<div>
			<h3 class="mb-3 text-lg font-semibold">{category}</h3>
			<ul class="flex flex-wrap gap-2">
				{#each technos as techno}
					<li class="techno">
						{techno}
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</div>

<style>
	.techno {
		padding: 0.5rem 1rem;
		background-color: rgba(226, 232, 240, 0.1);
		border: 1px solid rgba(226, 232, 240, 0.2);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		transition: all 0.2s;
	}

	.techno:hover {
		background-color: rgba(226, 232, 240, 0.2);
		border-color: rgba(226, 232, 240, 0.4);
		transform: translateY(-2px);
	}
</style>
