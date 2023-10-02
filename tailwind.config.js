/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				bauhaus: ['Bauhaus']
			},
			colors: {
				'space-cadet': '#24295C',
				'delft-blue': '#38456e',
				'persian-red': '#d23324' //very similar to red-600
				// cyan-50
				// neutral-50
			}
		}
	}
}
