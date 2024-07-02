<script lang="ts">
	import { IconBrandGithub, IconBrandLinkedin, IconMail } from '@tabler/icons-svelte'

	const email = 'julien.connault@gmail.com'

	const copyEmail = () => {
		navigator.clipboard.writeText(email)
		alert(`Copied ${email} to clipboard`)
	}
</script>

<a href="/">
	<h1
		data-colliding
		class="text-4xl font-bold tracking-wider font-bauhaus text-slate-200 sm:text-5xl"
	>
		Julien Connault
	</h1>
</a>
<h2 class="mt-3 text-lg font-medium tracking-tight text-slate-200 sm:text-xl">
	Junior Front-End Engineer
</h2>
<p class="max-w-xs mt-4 mb-12 leading-normal text-slate-400">
	I'm a design-minded, detail oriented Front-End Engineer passionate about combining clean code with
	interactive design.
</p>

<button data-colliding class="w-48 h-12 px-4 py-2 font-medium uppercase" on:click={copyEmail}
	>Copy Email</button
>

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
	button {
		box-shadow: 0.3em 0.3em 0 0 rgb(30 58 138), inset 6em 3.5em 0 0 rgb(37 99 235);

		transition: box-shadow 0.2s ease-in-out;
	}

	button:hover,
	button:focus {
		outline: none;
		box-shadow: 0.3em 0.3em 0 0 rgb(37 99 235), inset 0.3em 0.3em 0 0 rgb(37 99 235);
	}
</style>
