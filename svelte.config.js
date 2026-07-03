import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Deploy target is Vercel — use the Vercel adapter explicitly so the build
		// never has to auto-install a platform adapter at build time (which failed
		// under Vercel's pnpm 9 + the config-only pnpm-workspace.yaml).
		adapter: adapter()
	}
};

export default config;
