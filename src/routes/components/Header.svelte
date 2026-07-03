<script lang="ts">
	import {
		IconBrandGithub,
		IconBrandLinkedin,
		IconMail,
		IconCopy,
		IconCheck
	} from '@tabler/icons-svelte'
	import LanguageSwitcher from './LanguageSwitcher.svelte'
	import { translations } from '$lib/i18n/store'

	const email = 'julien.connault@gmail.com'

	let copied = $state(false)
	let copiedTimeout: ReturnType<typeof setTimeout> | undefined
	const copyEmail = () => {
		navigator.clipboard.writeText(email)
		copied = true
		clearTimeout(copiedTimeout)
		copiedTimeout = setTimeout(() => (copied = false), 1500)
	}
</script>


<a href="/">
	<h1 class="text-4xl font-bold tracking-wider font-bauhaus text-slate-200 sm:text-5xl">
		{$translations.header?.name || 'Julien Connault'}
	</h1>
</a>
<h2 class="mt-3 text-lg font-medium tracking-tight text-slate-200 sm:text-xl">
	{$translations.header?.title || 'Software Engineer (Front-End Focused)'}
</h2>
<p class="max-w-xs mt-4 mb-8 leading-normal text-slate-400">
	{$translations.header?.description || 'Full-Stack Engineer...'}
</p>

<ul class="flex items-center mt-8 ml-1" aria-label="Social media">
	<li class="mr-5">
		<a
			class="block hover:text-blue-400"
			href="https://github.com/Bekiboo"
			target="_blank"
			rel="noreferrer"
			><span class="sr-only">GitHub</span>
			<IconBrandGithub size={36} stroke={1} color={'currentColor'} />
		</a>
	</li>
	<li class="mr-5">
		<a
			class="block hover:text-blue-400"
			href="https://www.linkedin.com/in/julien-connault/"
			target="_blank"
			rel="noreferrer"
			><span class="sr-only">LinkedIn</span>
			<IconBrandLinkedin size={36} stroke={1} color={'currentColor'} />
		</a>
	</li>
	<li class="mr-5">
		<a class="block hover:text-blue-400" href="mailto:{email}" target="_blank" rel="noreferrer"
			><span class="sr-only">LinkedIn</span>
			<IconMail size={36} stroke={1} color={'currentColor'} />
		</a>
	</li>
</ul>
<button
	onclick={copyEmail}
	class="group mt-2 inline-flex items-center gap-1.5 font-thin text-slate-400 transition hover:text-blue-400"
	aria-label={copied ? 'Email copied to clipboard' : `Copy email address ${email}`}
>
	<span>{email}</span>
	{#if copied}
		<span class="inline-flex text-blue-400"><IconCheck size={16} stroke={1.5} /></span>
	{:else}
		<span class="inline-flex opacity-60 transition group-hover:opacity-100"
			><IconCopy size={16} stroke={1.5} /></span
		>
	{/if}
</button>

<div class="mt-4">
	<LanguageSwitcher />
</div>
<style>
	/* button {
		box-shadow:
			0.3em 0.3em 0 0 rgb(30 58 138),
			inset 6em 3.5em 0 0 rgb(37 99 235);

		transition: box-shadow 0.2s ease-in-out;
	}

	button:hover,
	button:focus {
		outline: none;
		box-shadow:
			0.3em 0.3em 0 0 rgb(37 99 235),
			inset 0.3em 0.3em 0 0 rgb(37 99 235);
	} */
</style>
