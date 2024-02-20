<script lang="ts">
	import { tooltip } from '$lib/tooltip/tooltip'

	export let skills: {
		level: string
		baseColor: string
		technos: {
			name: string
			comp: any
			color: string
		}[]
	}[]
</script>

<div class="flex flex-col gap-4">
	{#each skills as { technos, level, baseColor }}
		<div>
			<h3>{level}</h3>
			<ul class="flex">
				{#each technos as { name, comp, color }}
					<li
						data-tooltip={name}
						use:tooltip
						class="techno"
						style:--base-color={baseColor}
						style:--techno-color={color}
					>
						<div class="pointer-events-none">
							<svelte:component this={comp} size={64} stroke={1} color={'currentColor'} />
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
