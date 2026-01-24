<script lang="ts">
	import { translations } from '$lib/i18n/store'
</script>

<div class="space-y-8">
	{#each $translations.experience || [] as { title, company, location, period, description, highlights }}
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
