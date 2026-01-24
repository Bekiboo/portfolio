<script lang="ts">
	import { currentLanguage, loadLanguage } from '$lib/i18n/store'

	const toggleLanguage = async () => {
		const newLang = $currentLanguage === 'en' ? 'fr' : 'en'
		await loadLanguage(newLang)
	}
</script>

<button
	onclick={toggleLanguage}
	class="px-3 py-1 text-sm font-medium transition-colors border rounded border-slate-400 text-slate-400 hover:bg-slate-400 hover:text-slate-900"
>
	{$currentLanguage.toUpperCase()}
</button>

<style>
	button {
		font-family: monospace;
	}
</style>
