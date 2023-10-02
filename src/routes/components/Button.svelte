<button class="relative h-12 px-4 py-2 font-medium uppercase colliding w-fit">
	<slot />
</button>

<style>
	button {
		box-shadow: 0.3em 0.3em 0 0 #880505, inset 6em 3.5em 0 0 var(--persian-red);

		transition: box-shadow 0.2s ease-in-out;
	}

	button:hover,
	button:focus {
		outline: none;
		box-shadow: 0.3em 0.3em 0 0 var(--persian-red), inset 0.3em 0.3em 0 0 var(--persian-red);
	}
</style>
