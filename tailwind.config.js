/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		colors: {
			'space-cadet': '#24295C',
			'delft-blue': '#38456e',
			'persian-red': '#d23324' //very similar to red-600
			// cyan-50
			// neutral-50
		},
		extend: {
			fontFamily: {
				bauhaus: ['Bauhaus']
			}
		}
	},
	plugins: [require('daisyui')],
	daisyui: {
		themes: [
			{
				myLightTheme: {
					primary: '#d23324',
					secondary: '#38456e',
					accent: '#2DD4BF',
					neutral: '#3d4451',
					'base-100': '#24295C'
				}
			}
			// 'dark',
			// 'cupcake'
		]
	}
}
