<script lang="ts">
	import { IconExternalLink } from '@tabler/icons-svelte'
	import { translations } from '$lib/i18n/store'
</script>

<div class="space-y-2">
	<div>
		<h3 class="text-lg font-semibold">{$translations.academics?.degreeTitle || 'Bachelor of Science in Applied Technology'}</h3>
		<p class="text-xs text-slate-400">
			{$translations.academics?.period || '2024'} · {$translations.academics?.gpa || '3.96 GPA'} · <span class="text-amber-400">{$translations.academics?.honor || 'Summa Cum Laude'}</span>
		</p>
	</div>

	<a
		target="_blank"
		href={$translations.academics?.university?.url || 'https://www.byui.edu/'}
		class="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
	>
		{$translations.academics?.university?.name || 'Brigham Young University Idaho'}
		<IconExternalLink size={16} />
	</a>

	<div class="text-xs text-slate-500">
		{$translations.academics?.coursework || 'Additional coursework in Web Development, Computer Programming, and Business Analysis'}
	</div>
</div>
