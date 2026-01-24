import { writable } from 'svelte/store'
import enData from './locales/en.json'

export type Language = 'en' | 'fr'

type Translations = typeof enData

// Initialize with browser language or default to 'en'
const getInitialLanguage = (): Language => {
	if (typeof window !== 'undefined') {
		const browserLang = navigator.language.split('-')[0]
		return (browserLang === 'fr' ? 'fr' : 'en') as Language
	}
	return 'en'
}

export const currentLanguage = writable<Language>(getInitialLanguage())

// Synchronous default to English to avoid empty content on first render
export const translations = writable<Translations>(enData as Translations)

// Load translations for a language
export async function loadLanguage(lang: Language) {
	try {
		const module = await import(`./locales/${lang}.json`)
		translations.set(module.default)
		currentLanguage.set(lang)
		// Persist language choice
		if (typeof window !== 'undefined') {
			localStorage.setItem('preferredLanguage', lang)
		}
	} catch (error) {
		console.error(`Failed to load language: ${lang}`, error)
	}
}

// Initialize on first load
if (typeof window !== 'undefined') {
	const savedLang = localStorage.getItem('preferredLanguage') as Language | null
	const initial = savedLang || getInitialLanguage()
	// Only load if different from the default English data
	if (initial !== 'en') {
		loadLanguage(initial)
	}
}
