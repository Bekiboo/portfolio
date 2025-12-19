<script lang="ts">
	import { IconBrandGithub, IconBrandLinkedin, IconMail } from '@tabler/icons-svelte'
	import Button from './Button.svelte'

	const email = 'julien.connault@gmail.com'

	const copyEmail = () => {
		navigator.clipboard.writeText(email)
		// alert(`Copied ${email} to clipboard`)
	}
</script>

<a href="/">
	<h1 class="text-4xl font-bold tracking-wider font-bauhaus text-slate-200 sm:text-5xl">
		Julien Connault
	</h1>
</a>
<h2 class="mt-3 text-lg font-medium tracking-tight text-slate-200 sm:text-xl">
	Software Engineer (Front-End Focused)
</h2>
<p class="max-w-xs mt-4 mb-8 leading-normal text-slate-400">
	Full-Stack Engineer with a strong front-end focus, experienced in building end-to-end systems in
	early-stage startups. I work across UI, API design, authentication, and data modeling, with a
	focus on maintainable architecture and developer experience.
</p>

<button data-colliding onclick={copyEmail}><Button text="Copy Email" classes="uppercase" /></button>

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
<span class="mt-2 font-thin">Email: {email}</span>

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
