<script lang="ts">
	const experiences = [
		{
			title: 'Full-Stack Engineer',
			company: 'Ensombl (Certless)',
			location: 'Remote',
			period: 'Nov 2025 – Present',
			description:
				'Building the foundations of Certless, a multi-role platform for secure logistics and document verification.',
			highlights: [
				'Initialized the monorepo architecture (NestJS, SvelteKit, Docker) and implemented authentication, RBAC, and invitation flows',
				'Integrated Better Auth with custom adapters and migrated backend validation to Zod with shared types',
				'Set up MSW-based mock APIs and role-based dashboards to enable faster and safer frontend iteration',
				'Reviewed API specifications, aligned end-to-end flows, and helped onboard other developers'
			]
		},
		{
			title: 'Full-Stack Engineer',
			company: 'Auvo Digital (Orobo)',
			location: 'Remote',
			period: 'Mar 2025 – Sep 2025',
			description:
				'Worked on Orobo, a platform for Digital Product Passports (DPPs) and verifiable credentials.',
			highlights: [
				'Developed full-stack features using Svelte, NestJS, and SQL-based databases',
				'Built reusable, accessible UI components and contributed to backend APIs and data modeling',
				'Progressively took ownership of backend responsibilities within the NestJS codebase'
			]
		},
		{
			title: 'Full-Stack Web Developer',
			company: 'Elevatus Foundation',
			location: '',
			period: '2022 – Present',
			description:
				'Designing, building, and maintaining the website of a non-profit supporting trafficked children in Madagascar.',
			highlights: [
				'Full ownership from design to production, including a recent complete redesign to improve UX and accessibility',
				'Implemented a blog system with admin authentication and features supporting donor engagement'
			]
		},
		{
			title: 'Early-Stage Startup & Client Projects',
			company: '',
			location: '',
			period: '2022 – 2024',
			description:
				'Contributed to multiple early-stage startups and client projects, often with full-stack ownership, while completing a Bachelor’s degree.',
			highlights: [
				'Worked in small teams or solo on MVPs and V0 platforms under tight constraints',
				'Developed strong autonomy, adaptability, and pragmatic problem-solving skills'
			]
		}
	]
</script>

<div class="space-y-8">
	{#each experiences as { title, company, location, period, description, highlights }}
		<div class="space-y-2">
			<div>
				<h3 class="text-lg font-semibold">
					{title}{#if company}<span class="text-slate-400"> — {company}</span>{/if}
				</h3>
				<p class="text-xs text-slate-500">
					{#if location}{location} ·
					{/if}{period}
				</p>
			</div>

			<p class="text-sm text-slate-300">{description}</p>

			{#if highlights.length > 0}
				<ul class="space-y-1.5 text-sm text-slate-400">
					{#each highlights as highlight}
						<li class="flex gap-2">
							<span class="text-blue-400 text-xs mt-0.5">▸</span>
							<span>{highlight}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/each}
</div>
