<script lang="ts">
	import { tooltip } from '$lib/tooltip/tooltipAction.svelte'
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
		IconBrandThreejs,
		IconSql,
		IconBrandVite,
		IconBrandGraphql,
		IconBrandPrisma,
		IconBrandStripe,
		IconBrandNextjs,
	} from '@tabler/icons-svelte'

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
				{ name: 'Git', comp: IconBrandGit, color: '#f05032' },
				{ name: 'Typescript', comp: IconBrandTypescript, color: '#007acc' },
				{ name: 'Supabase', comp: IconBrandSupabase, color: '#3ecf8e' },
				{ name: 'Tailwind', comp: IconBrandTailwind, color: '#06b6d4' }
			]
		},
		{
			level: 'Experienced',
			baseColor: 'rgb(162 175 204)',
			technos: [
				{ name: 'SASS', comp: IconBrandSass, color: '#cc6699' },
				{ name: 'SQL', comp: IconSql, color: '#f29111' },
				{ name: 'Angular', comp: IconBrandAngular, color: '#dd0031' },
				{ name: 'Vite', comp: IconBrandVite, color: '#646cff' },
				{ name: 'Prisma', comp: IconBrandPrisma, color: '#ffffff' },
				{ name: 'Stripe', comp: IconBrandStripe, color: '#6772e5' },
				{ name: 'Next.js', comp: IconBrandNextjs, color: '#ffffff' }
			]
		},
		{
			level: 'Familiar',
			baseColor: 'rgb(128 138 157)',
			technos: [
				{ name: 'Python', comp: IconBrandPython, color: '#3776ab' },
				{ name: 'Mongodb', comp: IconBrandMongodb, color: '#4db33d' },
				{ name: 'Firebase', comp: IconBrandFirebase, color: '#ffca28' },
				{ name: 'Three.js', comp: IconBrandThreejs, color: '#ffffff' },
				{ name: 'GraphQL', comp: IconBrandGraphql, color: '#e535ab' }
			]
		}
	]
</script>

<div class="flex flex-col gap-4">
	{#each skills as { technos, level, baseColor }}
		<div>
			<h3>{level}</h3>
			<ul class="flex flex-wrap">
				{#each technos as { name, comp, color }}
					{@const SvelteComponent = comp}
					<li
						data-tooltip={name}
						use:tooltip
						class="techno"
						style:--base-color={baseColor}
						style:--techno-color={color}
					>
						<div class="pointer-events-none">
							<SvelteComponent size={64} stroke={1} color={'currentColor'} />
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</div>

<style>
	.techno {
		color: var(--base-color);
	}

	.techno:hover {
		color: var(--techno-color);
	}
</style>
