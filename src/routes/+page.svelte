<script lang="ts">
	import GameWrapper from './GameWrapper.svelte'
</script>

<GameWrapper>
	<header
		class="lg:sticky lg:top-0 lg:flex lg:max-h-screen lg:w-1/2 lg:flex-col lg:justify-between lg:py-24"
	>
		<a href="/">
			<h1 class="colliding text-4xl font-bold tracking-tight text-slate-200 sm:text-5xl">
				Julien Connault
			</h1>
		</a>
		<h2 class="mt-3 text-lg font-medium tracking-tight text-slate-200 sm:text-xl">
			Junior Front-End Engineer
		</h2>
		<p class="mt-4 max-w-xs leading-normal">
			I'm a design-minded, detail oriented Front-End Engineer passionate about combining beautiful
			code with interactive design.
		</p>
	</header>
	<main id="content" class="pt-24 lg:w-1/2 lg:py-24">
		<section
			id="about"
			class="mb-16 scroll-mt-16 md:mb-24 lg:mb-36 lg:scroll-mt-24"
			aria-label="About me"
		>
			<div
				class="sticky top-0 z-20 -mx-6 mb-4 w-screen bg-slate-900/75 px-6 py-5 backdrop-blur md:-mx-12 md:px-12 lg:sr-only lg:relative lg:top-auto lg:mx-auto lg:w-full lg:px-0 lg:py-0 lg:opacity-0"
			>
				<h2 class="text-sm font-bold uppercase tracking-widest text-slate-200 lg:sr-only">About</h2>
			</div>
			<div>
				<p class="mb-4">
					Back in 2012, I decided to try my hand at creating custom Tumblr themes and tumbled head
					first into the rabbit hole of coding and web development. Fast-forward to today, and I’ve
					had the privilege of building software for an<!-- -->
					<a
						class="font-medium text-slate-200 hover:text-teal-300 focus-visible:text-teal-300"
						href="https://us.mullenlowe.com/"
						target="_blank"
						rel="noreferrer">advertising agency</a
					>, a<!-- -->
					<a
						class="font-medium text-slate-200 hover:text-teal-300 focus-visible:text-teal-300"
						href="https://starry.com/"
						target="_blank"
						rel="noreferrer">start-up</a
					>, a<!-- -->
					<a
						class="font-medium text-slate-200 hover:text-teal-300 focus-visible:text-teal-300"
						href="https://scout.camd.northeastern.edu/"
						target="_blank"
						rel="noreferrer">student-led design studio</a
					>, and a<!-- -->
					<a
						class="font-medium text-slate-200 hover:text-teal-300 focus-visible:text-teal-300"
						href="https://www.apple.com/apple-music/"
						target="_blank"
						rel="noreferrer">huge corporation</a
					>.
				</p>
				<p class="mb-4">
					My main focus these days is building products and leading projects for our clients at<!-- -->
					<a
						class="font-medium text-slate-200 hover:text-teal-300 focus-visible:text-teal-300"
						href="https://upstatement.com/"
						target="_blank"
						rel="noreferrer">Upstatement</a
					>. In my free time I've also released an<!-- -->
					<a
						class="font-medium text-slate-200 hover:text-teal-300 focus-visible:text-teal-300"
						href="https://www.newline.co/courses/build-a-spotify-connected-app"
						target="_blank"
						rel="noreferrer">online video course</a
					>
					<!-- -->that covers everything you need to know to build a web app with the Spotify API.
				</p>
				<p>
					When I’m not at the computer, I’m usually rock climbing, hanging out with my wife and two
					cats, or running around Hyrule searching for<!-- -->
					<span
						class="group/korok inline-flex lg:cursor-[url('/images/koroks/Elma.png'),_pointer] lg:font-medium lg:text-slate-200"
						><span class="sr-only">Korok seeds</span><span
							class="group-hover/korok:text-red-400 transition duration-75 group-hover/korok:-translate-y-px delay-[50ms]"
							aria-hidden="true">K</span
						><span
							class="group-hover/korok:text-orange-400 transition duration-75 group-hover/korok:-translate-y-px delay-[75ms]"
							aria-hidden="true">o</span
						><span
							class="group-hover/korok:text-yellow-400 transition duration-75 group-hover/korok:-translate-y-px delay-[100ms]"
							aria-hidden="true">r</span
						><span
							class="group-hover/korok:text-lime-400 transition duration-75 group-hover/korok:-translate-y-px delay-[125ms]"
							aria-hidden="true">o</span
						><span
							class="group-hover/korok:text-green-400 transition duration-75 group-hover/korok:-translate-y-px delay-[150ms]"
							aria-hidden="true">k</span
						><span
							class="group-hover/korok:text-teal-400 transition duration-75 group-hover/korok:-translate-y-px delay-[175ms]"
							aria-hidden="true">&nbsp;</span
						><span
							class="group-hover/korok:text-cyan-400 transition duration-75 group-hover/korok:-translate-y-px delay-[200ms]"
							aria-hidden="true">s</span
						><span
							class="group-hover/korok:text-sky-400 transition duration-75 group-hover/korok:-translate-y-px delay-[225ms]"
							aria-hidden="true">e</span
						><span
							class="group-hover/korok:text-blue-400 transition duration-75 group-hover/korok:-translate-y-px delay-[250ms]"
							aria-hidden="true">e</span
						><span
							class="group-hover/korok:text-indigo-400 transition duration-75 group-hover/korok:-translate-y-px delay-[275ms]"
							aria-hidden="true">d</span
						><span
							class="group-hover/korok:text-violet-400 transition duration-75 group-hover/korok:-translate-y-px delay-[300ms]"
							aria-hidden="true">s</span
						></span
					>.
				</p>
			</div>
		</section>
		<section
			id="experience"
			class="mb-16 scroll-mt-16 md:mb-24 lg:mb-36 lg:scroll-mt-24"
			aria-label="Work experience"
		>
			<div
				class="sticky top-0 z-20 -mx-6 mb-4 w-screen bg-slate-900/75 px-6 py-5 backdrop-blur md:-mx-12 md:px-12 lg:sr-only lg:relative lg:top-auto lg:mx-auto lg:w-full lg:px-0 lg:py-0 lg:opacity-0"
			>
				<h2 class="text-sm font-bold uppercase tracking-widest text-slate-200 lg:sr-only">
					Experience
				</h2>
			</div>
			<div>
				<ol class="group/list">
					<li class="mb-12">
						<div
							class="group relative grid pb-1 transition-all sm:grid-cols-8 sm:gap-8 md:gap-4 lg:hover:!opacity-100 lg:group-hover/list:opacity-50"
						>
							<div
								class="absolute -inset-x-4 -inset-y-4 z-0 hidden rounded-md transition motion-reduce:transition-none lg:-inset-x-6 lg:block lg:group-hover:bg-slate-800/50 lg:group-hover:shadow-[inset_0_1px_0_0_rgba(148,163,184,0.1)] lg:group-hover:drop-shadow-lg"
							/>
							<header
								class="z-10 mb-2 mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2"
								aria-label="2018 to Present"
							>
								2018 — Present
							</header>
							<div class="z-10 sm:col-span-6">
								<h3 class="font-medium leading-snug text-slate-200">
									<div>
										<a
											class="inline-flex items-baseline font-medium leading-tight text-slate-200 hover:text-teal-300 focus-visible:text-teal-300 group/link text-base"
											href="https://upstatement.com"
											target="_blank"
											rel="noreferrer"
											aria-label="Lead Engineer at Upstatement"
											><span
												class="absolute -inset-x-4 -inset-y-2.5 hidden rounded md:-inset-x-6 md:-inset-y-4 lg:block"
											/><span
												>Lead Engineer ·<!-- -->
												<span class="inline-block"
													>Upstatement<svg
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 20 20"
														fill="currentColor"
														class="inline-block h-4 w-4 shrink-0 transition-transform group-hover/link:-translate-y-1 group-hover/link:translate-x-1 group-focus-visible/link:-translate-y-1 group-focus-visible/link:translate-x-1 motion-reduce:transition-none ml-1 translate-y-px"
														aria-hidden="true"
														><path
															fill-rule="evenodd"
															d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
															clip-rule="evenodd"
														/></svg
													></span
												></span
											></a
										>
									</div>
									<div><div class="text-slate-500" aria-hidden="true">Senior Engineer</div></div>
									<div><div class="text-slate-500" aria-hidden="true">Engineer</div></div>
								</h3>
								<p class="mt-2 text-sm leading-normal">
									Deliver high-quality, robust production code for a diverse array of projects for
									clients including Harvard Business School, Everytown for Gun Safety, Pratt
									Institute, Koala Health, Vanderbilt University, The 19th News, and more. Provide
									leadership within engineering department through close collaboration, knowledge
									shares, and mentorship.
								</p>
								<ul class="mt-2 flex flex-wrap" aria-label="Technologies used">
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											React
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											React Native
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											SCSS
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											WordPress
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											JavaScript
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											TypeScript
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											PHP
										</div>
									</li>
								</ul>
							</div>
						</div>
					</li>
					<li class="mb-12">
						<div
							class="group relative grid pb-1 transition-all sm:grid-cols-8 sm:gap-8 md:gap-4 lg:hover:!opacity-100 lg:group-hover/list:opacity-50"
						>
							<div
								class="absolute -inset-x-4 -inset-y-4 z-0 hidden rounded-md transition motion-reduce:transition-none lg:-inset-x-6 lg:block lg:group-hover:bg-slate-800/50 lg:group-hover:shadow-[inset_0_1px_0_0_rgba(148,163,184,0.1)] lg:group-hover:drop-shadow-lg"
							/>
							<header
								class="z-10 mb-2 mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2"
								aria-label="July to December 2017"
							>
								July — Dec 2017
							</header>
							<div class="z-10 sm:col-span-6">
								<h3 class="font-medium leading-snug text-slate-200">
									<div>
										<a
											class="inline-flex items-baseline font-medium leading-tight text-slate-200 hover:text-teal-300 focus-visible:text-teal-300 group/link text-base"
											href="https://www.apple.com/apple-music/"
											target="_blank"
											rel="noreferrer"
											aria-label="UI Engineer Co-op at Apple"
											><span
												class="absolute -inset-x-4 -inset-y-2.5 hidden rounded md:-inset-x-6 md:-inset-y-4 lg:block"
											/><span
												>UI Engineer Co-op ·<!-- -->
												<span class="inline-block"
													>Apple<svg
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 20 20"
														fill="currentColor"
														class="inline-block h-4 w-4 shrink-0 transition-transform group-hover/link:-translate-y-1 group-hover/link:translate-x-1 group-focus-visible/link:-translate-y-1 group-focus-visible/link:translate-x-1 motion-reduce:transition-none ml-1 translate-y-px"
														aria-hidden="true"
														><path
															fill-rule="evenodd"
															d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
															clip-rule="evenodd"
														/></svg
													></span
												></span
											></a
										>
									</div>
								</h3>
								<p class="mt-2 text-sm leading-normal">
									Developed and styled interactive web apps for Apple Music, including the UI of
									Apple Music’s embeddable web player widget for in-browser user authorization and
									full song playback.
								</p>
								<ul class="mt-2 flex flex-wrap" aria-label="Related links">
									<li class="mr-4">
										<a
											class="relative mt-2 inline-flex items-center text-sm font-medium text-slate-300 hover:text-teal-300 focus-visible:text-teal-300"
											href="https://developer.apple.com/documentation/musickitjs"
											target="_blank"
											rel="noreferrer"
											><svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 20 20"
												fill="currentColor"
												class="mr-1 h-3 w-3"
												aria-hidden="true"
												><path
													d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z"
												/><path
													d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z"
												/></svg
											><span>MusicKit.js</span></a
										>
									</li>
									<li class="mr-4">
										<a
											class="relative mt-2 inline-flex items-center text-sm font-medium text-slate-300 hover:text-teal-300 focus-visible:text-teal-300"
											href="https://9to5mac.com/2018/06/03/apple-music-embeddable-web-player-listen-browser/"
											target="_blank"
											rel="noreferrer"
											><svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 20 20"
												fill="currentColor"
												class="mr-1 h-3 w-3"
												aria-hidden="true"
												><path
													d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z"
												/><path
													d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z"
												/></svg
											><span>9to5Mac</span></a
										>
									</li>
									<li class="mr-4">
										<a
											class="relative mt-2 inline-flex items-center text-sm font-medium text-slate-300 hover:text-teal-300 focus-visible:text-teal-300"
											href="https://www.theverge.com/2017/10/5/16433770/facebook-messenger-apple-music-bot-song-streaming"
											target="_blank"
											rel="noreferrer"
											><svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 20 20"
												fill="currentColor"
												class="mr-1 h-3 w-3"
												aria-hidden="true"
												><path
													d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z"
												/><path
													d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z"
												/></svg
											><span>The Verge</span></a
										>
									</li>
								</ul>
								<ul class="mt-2 flex flex-wrap" aria-label="Technologies used">
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											Ember
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											SCSS
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											JavaScript
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											MusicKit.js
										</div>
									</li>
								</ul>
							</div>
						</div>
					</li>
					<li class="mb-12">
						<div
							class="group relative grid pb-1 transition-all sm:grid-cols-8 sm:gap-8 md:gap-4 lg:hover:!opacity-100 lg:group-hover/list:opacity-50"
						>
							<div
								class="absolute -inset-x-4 -inset-y-4 z-0 hidden rounded-md transition motion-reduce:transition-none lg:-inset-x-6 lg:block lg:group-hover:bg-slate-800/50 lg:group-hover:shadow-[inset_0_1px_0_0_rgba(148,163,184,0.1)] lg:group-hover:drop-shadow-lg"
							/>
							<header
								class="z-10 mb-2 mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2"
								aria-label="2016 to 2017"
							>
								2016 — 2017
							</header>
							<div class="z-10 sm:col-span-6">
								<h3 class="font-medium leading-snug text-slate-200">
									<div>
										<a
											class="inline-flex items-baseline font-medium leading-tight text-slate-200 hover:text-teal-300 focus-visible:text-teal-300 group/link text-base"
											href="https://scout.camd.northeastern.edu/"
											target="_blank"
											rel="noreferrer"
											aria-label="Developer at Scout Studio"
											><span
												class="absolute -inset-x-4 -inset-y-2.5 hidden rounded md:-inset-x-6 md:-inset-y-4 lg:block"
											/><span
												>Developer · Scout<!-- -->
												<span class="inline-block"
													>Studio<svg
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 20 20"
														fill="currentColor"
														class="inline-block h-4 w-4 shrink-0 transition-transform group-hover/link:-translate-y-1 group-hover/link:translate-x-1 group-focus-visible/link:-translate-y-1 group-focus-visible/link:translate-x-1 motion-reduce:transition-none ml-1 translate-y-px"
														aria-hidden="true"
														><path
															fill-rule="evenodd"
															d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
															clip-rule="evenodd"
														/></svg
													></span
												></span
											></a
										>
									</div>
								</h3>
								<p class="mt-2 text-sm leading-normal">
									Collaborated with other student designers and engineers on pro-bono projects to
									create new brands, design systems, and websites for organizations in the
									community.
								</p>
								<ul class="mt-2 flex flex-wrap" aria-label="Technologies used">
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											Jekyll
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											SCSS
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											JavaScript
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											WordPress
										</div>
									</li>
								</ul>
							</div>
						</div>
					</li>
					<li class="mb-12">
						<div
							class="group relative grid pb-1 transition-all sm:grid-cols-8 sm:gap-8 md:gap-4 lg:hover:!opacity-100 lg:group-hover/list:opacity-50"
						>
							<div
								class="absolute -inset-x-4 -inset-y-4 z-0 hidden rounded-md transition motion-reduce:transition-none lg:-inset-x-6 lg:block lg:group-hover:bg-slate-800/50 lg:group-hover:shadow-[inset_0_1px_0_0_rgba(148,163,184,0.1)] lg:group-hover:drop-shadow-lg"
							/>
							<header
								class="z-10 mb-2 mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2"
								aria-label="July to December 2016"
							>
								July — Dec 2016
							</header>
							<div class="z-10 sm:col-span-6">
								<h3 class="font-medium leading-snug text-slate-200">
									<div>
										<a
											class="inline-flex items-baseline font-medium leading-tight text-slate-200 hover:text-teal-300 focus-visible:text-teal-300 group/link text-base"
											href="https://starry.com/"
											target="_blank"
											rel="noreferrer"
											aria-label="Software Engineer Co-op at Starry"
											><span
												class="absolute -inset-x-4 -inset-y-2.5 hidden rounded md:-inset-x-6 md:-inset-y-4 lg:block"
											/><span
												>Software Engineer Co-op ·<!-- -->
												<span class="inline-block"
													>Starry<svg
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 20 20"
														fill="currentColor"
														class="inline-block h-4 w-4 shrink-0 transition-transform group-hover/link:-translate-y-1 group-hover/link:translate-x-1 group-focus-visible/link:-translate-y-1 group-focus-visible/link:translate-x-1 motion-reduce:transition-none ml-1 translate-y-px"
														aria-hidden="true"
														><path
															fill-rule="evenodd"
															d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
															clip-rule="evenodd"
														/></svg
													></span
												></span
											></a
										>
									</div>
								</h3>
								<p class="mt-2 text-sm leading-normal">
									Worked with the UI team to engineer and improve major features of Starry’s
									customer-facing Android app.
								</p>
								<ul class="mt-2 flex flex-wrap" aria-label="Related links">
									<li class="mr-4">
										<a
											class="relative mt-2 inline-flex items-center text-sm font-medium text-slate-300 hover:text-teal-300 focus-visible:text-teal-300"
											href="https://play.google.com/store/apps/details?id=com.starry.management&amp;hl=en_US&amp;gl=US"
											target="_blank"
											rel="noreferrer"
											><svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 20 20"
												fill="currentColor"
												class="mr-1 h-3 w-3"
												aria-hidden="true"
												><path
													d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z"
												/><path
													d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z"
												/></svg
											><span>Android App</span></a
										>
									</li>
									<li class="mr-4">
										<a
											class="relative mt-2 inline-flex items-center text-sm font-medium text-slate-300 hover:text-teal-300 focus-visible:text-teal-300"
											href="https://starry.com/blog/product/whats-new-screentime-just-got-better-for-parents"
											target="_blank"
											rel="noreferrer"
											><svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 20 20"
												fill="currentColor"
												class="mr-1 h-3 w-3"
												aria-hidden="true"
												><path
													d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z"
												/><path
													d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z"
												/></svg
											><span>ScreenTime 2.0</span></a
										>
									</li>
								</ul>
								<ul class="mt-2 flex flex-wrap" aria-label="Technologies used">
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											Cordova
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											Backbone
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											JavaScript
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											CSS
										</div>
									</li>
								</ul>
							</div>
						</div>
					</li>
					<li class="mb-12">
						<div
							class="group relative grid pb-1 transition-all sm:grid-cols-8 sm:gap-8 md:gap-4 lg:hover:!opacity-100 lg:group-hover/list:opacity-50"
						>
							<div
								class="absolute -inset-x-4 -inset-y-4 z-0 hidden rounded-md transition motion-reduce:transition-none lg:-inset-x-6 lg:block lg:group-hover:bg-slate-800/50 lg:group-hover:shadow-[inset_0_1px_0_0_rgba(148,163,184,0.1)] lg:group-hover:drop-shadow-lg"
							/>
							<header
								class="z-10 mb-2 mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2"
								aria-label="July to December 2015"
							>
								July — Dec 2015
							</header>
							<div class="z-10 sm:col-span-6">
								<h3 class="font-medium leading-snug text-slate-200">
									<div>
										<a
											class="inline-flex items-baseline font-medium leading-tight text-slate-200 hover:text-teal-300 focus-visible:text-teal-300 group/link text-base"
											href="https://us.mullenlowe.com/"
											target="_blank"
											rel="noreferrer"
											aria-label="Creative Technologist Co-op at MullenLowe U.S."
											><span
												class="absolute -inset-x-4 -inset-y-2.5 hidden rounded md:-inset-x-6 md:-inset-y-4 lg:block"
											/><span
												>Creative Technologist Co-op · MullenLowe<!-- -->
												<span class="inline-block"
													>U.S.<svg
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 20 20"
														fill="currentColor"
														class="inline-block h-4 w-4 shrink-0 transition-transform group-hover/link:-translate-y-1 group-hover/link:translate-x-1 group-focus-visible/link:-translate-y-1 group-focus-visible/link:translate-x-1 motion-reduce:transition-none ml-1 translate-y-px"
														aria-hidden="true"
														><path
															fill-rule="evenodd"
															d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
															clip-rule="evenodd"
														/></svg
													></span
												></span
											></a
										>
									</div>
								</h3>
								<p class="mt-2 text-sm leading-normal">
									Developed, maintained, and shipped production code for client websites. Clients
									included JetBlue, Lovesac, U.S. Cellular, U.S. Department of Defense, and more.
								</p>
								<ul class="mt-2 flex flex-wrap" aria-label="Technologies used">
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											HTML
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											CSS
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											JavaScript
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											jQuery
										</div>
									</li>
								</ul>
							</div>
						</div>
					</li>
				</ol>
				<div class="mt-12">
					<a
						class="inline-flex items-center font-medium leading-tight text-slate-200 font-semibold text-slate-200 group"
						aria-label="View Full Résumé"
						href="/resume.pdf"
						><span
							><span
								class="border-b border-transparent pb-px transition group-hover:border-teal-300 motion-reduce:transition-none"
								>View Full<!-- -->
							</span><span class="whitespace-nowrap"
								><span
									class="border-b border-transparent pb-px transition group-hover:border-teal-300 motion-reduce:transition-none"
									>Résumé</span
								><svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									class="ml-1 inline-block h-4 w-4 shrink-0 -translate-y-px transition-transform group-hover:translate-x-2 group-focus-visible:translate-x-2 motion-reduce:transition-none"
									aria-hidden="true"
									><path
										fill-rule="evenodd"
										d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
										clip-rule="evenodd"
									/></svg
								></span
							></span
						></a
					>
				</div>
			</div>
		</section>
		<section
			id="projects"
			class="mb-16 scroll-mt-16 md:mb-24 lg:mb-36 lg:scroll-mt-24"
			aria-label="Selected projects"
		>
			<div
				class="sticky top-0 z-20 -mx-6 mb-4 w-screen bg-slate-900/75 px-6 py-5 backdrop-blur md:-mx-12 md:px-12 lg:sr-only lg:relative lg:top-auto lg:mx-auto lg:w-full lg:px-0 lg:py-0 lg:opacity-0"
			>
				<h2 class="text-sm font-bold uppercase tracking-widest text-slate-200 lg:sr-only">
					Projects
				</h2>
			</div>
			<div>
				<ul class="group/list">
					<li class="mb-12">
						<div
							class="group relative grid gap-4 pb-1 transition-all sm:grid-cols-8 sm:gap-8 md:gap-4 lg:hover:!opacity-100 lg:group-hover/list:opacity-50"
						>
							<div
								class="absolute -inset-x-4 -inset-y-4 z-0 hidden rounded-md transition motion-reduce:transition-none lg:-inset-x-6 lg:block lg:group-hover:bg-slate-800/50 lg:group-hover:shadow-[inset_0_1px_0_0_rgba(148,163,184,0.1)] lg:group-hover:drop-shadow-lg"
							/>
							<div class="z-10 sm:order-2 sm:col-span-6">
								<h3>
									<a
										class="inline-flex items-baseline font-medium leading-tight text-slate-200 hover:text-teal-300 focus-visible:text-teal-300 group/link text-base"
										href="https://www.newline.co/courses/build-a-spotify-connected-app"
										target="_blank"
										rel="noreferrer"
										aria-label="Build a Spotify Connected App"
										><span
											class="absolute -inset-x-4 -inset-y-2.5 hidden rounded md:-inset-x-6 md:-inset-y-4 lg:block"
										/><span
											>Build a Spotify Connected<!-- -->
											<span class="inline-block"
												>App<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 20 20"
													fill="currentColor"
													class="inline-block h-4 w-4 shrink-0 transition-transform group-hover/link:-translate-y-1 group-hover/link:translate-x-1 group-focus-visible/link:-translate-y-1 group-focus-visible/link:translate-x-1 motion-reduce:transition-none ml-1 translate-y-px"
													aria-hidden="true"
													><path
														fill-rule="evenodd"
														d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
														clip-rule="evenodd"
													/></svg
												></span
											></span
										></a
									>
								</h3>
								<p class="mt-2 text-sm leading-normal">
									Video course that teaches how to build a web app with the Spotify Web API. Topics
									covered include the principles of REST APIs, user auth flows, Node, Express,
									React, Styled Components, and more.
								</p>
							</div>
							<img
								alt=""
								loading="lazy"
								width="200"
								height="48"
								decoding="async"
								data-nimg="1"
								class="rounded border-2 border-slate-200/10 transition group-hover:border-slate-200/30 sm:order-1 sm:col-span-2 sm:translate-y-1"
								style="color:transparent"
								srcset="/_next/image?url=%2Fimages%2Fprojects%2Fcourse-card.png&amp;w=256&amp;q=75 1x, /_next/image?url=%2Fimages%2Fprojects%2Fcourse-card.png&amp;w=640&amp;q=75 2x"
								src="/_next/image?url=%2Fimages%2Fprojects%2Fcourse-card.png&amp;w=640&amp;q=75"
							/>
						</div>
					</li>
					<li class="mb-12">
						<div
							class="group relative grid gap-4 pb-1 transition-all sm:grid-cols-8 sm:gap-8 md:gap-4 lg:hover:!opacity-100 lg:group-hover/list:opacity-50"
						>
							<div
								class="absolute -inset-x-4 -inset-y-4 z-0 hidden rounded-md transition motion-reduce:transition-none lg:-inset-x-6 lg:block lg:group-hover:bg-slate-800/50 lg:group-hover:shadow-[inset_0_1px_0_0_rgba(148,163,184,0.1)] lg:group-hover:drop-shadow-lg"
							/>
							<div class="z-10 sm:order-2 sm:col-span-6">
								<h3>
									<a
										class="inline-flex items-baseline font-medium leading-tight text-slate-200 hover:text-teal-300 focus-visible:text-teal-300 group/link text-base"
										href="https://spotify-profile.herokuapp.com/"
										target="_blank"
										rel="noreferrer"
										aria-label="Spotify Profile"
										><span
											class="absolute -inset-x-4 -inset-y-2.5 hidden rounded md:-inset-x-6 md:-inset-y-4 lg:block"
										/><span
											>Spotify<!-- -->
											<span class="inline-block"
												>Profile<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 20 20"
													fill="currentColor"
													class="inline-block h-4 w-4 shrink-0 transition-transform group-hover/link:-translate-y-1 group-hover/link:translate-x-1 group-focus-visible/link:-translate-y-1 group-focus-visible/link:translate-x-1 motion-reduce:transition-none ml-1 translate-y-px"
													aria-hidden="true"
													><path
														fill-rule="evenodd"
														d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
														clip-rule="evenodd"
													/></svg
												></span
											></span
										></a
									>
								</h3>
								<p class="mt-2 text-sm leading-normal">
									Web app for visualizing personalized Spotify data. View your top artists, top
									tracks, recently played tracks, and detailed audio information about each track.
									Create and save new playlists of recommended tracks based on your existing
									playlists and more.
								</p>
								<a
									class="relative mt-2 inline-flex items-center text-sm font-medium text-slate-300 hover:text-teal-300 focus-visible:text-teal-300"
									href="https://github.com/bchiang7/spotify-profile"
									target="_blank"
									rel="noreferrer"
									aria-label="564 stars on GitHub"
									><svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
										fill="currentColor"
										class="mr-1 h-3 w-3"
										aria-hidden="true"
										><path
											fill-rule="evenodd"
											d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
											clip-rule="evenodd"
										/></svg
									><span>564</span></a
								>
								<ul class="mt-2 flex flex-wrap" aria-label="Technologies used:">
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											React
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											Express
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											Spotify API
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											Heroku
										</div>
									</li>
								</ul>
							</div>
							<img
								alt=""
								loading="lazy"
								width="200"
								height="48"
								decoding="async"
								data-nimg="1"
								class="rounded border-2 border-slate-200/10 transition group-hover:border-slate-200/30 sm:order-1 sm:col-span-2 sm:translate-y-1"
								style="color:transparent"
								srcset="/_next/image?url=%2Fimages%2Fprojects%2Fspotify-profile.png&amp;w=256&amp;q=75 1x, /_next/image?url=%2Fimages%2Fprojects%2Fspotify-profile.png&amp;w=640&amp;q=75 2x"
								src="/_next/image?url=%2Fimages%2Fprojects%2Fspotify-profile.png&amp;w=640&amp;q=75"
							/>
						</div>
					</li>
					<li class="mb-12">
						<div
							class="group relative grid gap-4 pb-1 transition-all sm:grid-cols-8 sm:gap-8 md:gap-4 lg:hover:!opacity-100 lg:group-hover/list:opacity-50"
						>
							<div
								class="absolute -inset-x-4 -inset-y-4 z-0 hidden rounded-md transition motion-reduce:transition-none lg:-inset-x-6 lg:block lg:group-hover:bg-slate-800/50 lg:group-hover:shadow-[inset_0_1px_0_0_rgba(148,163,184,0.1)] lg:group-hover:drop-shadow-lg"
							/>
							<div class="z-10 sm:order-2 sm:col-span-6">
								<h3>
									<a
										class="inline-flex items-baseline font-medium leading-tight text-slate-200 hover:text-teal-300 focus-visible:text-teal-300 group/link text-base"
										href="https://halcyon-theme.netlify.app/"
										target="_blank"
										rel="noreferrer"
										aria-label="Halcyon Theme"
										><span
											class="absolute -inset-x-4 -inset-y-2.5 hidden rounded md:-inset-x-6 md:-inset-y-4 lg:block"
										/><span
											>Halcyon<!-- -->
											<span class="inline-block"
												>Theme<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 20 20"
													fill="currentColor"
													class="inline-block h-4 w-4 shrink-0 transition-transform group-hover/link:-translate-y-1 group-hover/link:translate-x-1 group-focus-visible/link:-translate-y-1 group-focus-visible/link:translate-x-1 motion-reduce:transition-none ml-1 translate-y-px"
													aria-hidden="true"
													><path
														fill-rule="evenodd"
														d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
														clip-rule="evenodd"
													/></svg
												></span
											></span
										></a
									>
								</h3>
								<p class="mt-2 text-sm leading-normal">
									Minimal dark blue theme for VS Code, Sublime Text, Atom, iTerm, and more.
								</p>
								<a
									class="relative mt-2 inline-flex items-center text-sm font-medium text-slate-300 hover:text-teal-300 focus-visible:text-teal-300"
									href="https://marketplace.visualstudio.com/items?itemName=brittanychiang.halcyon-vscode"
									target="_blank"
									rel="noreferrer"
									aria-label="Over 100,000 installs on Visual Studio Code Marketplace"
									><svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
										fill="currentColor"
										class="mr-1 h-4 w-4"
										aria-hidden="true"
										><path
											d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z"
										/><path
											d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"
										/></svg
									><span>100k+ Installs</span></a
								>
							</div>
							<img
								alt=""
								loading="lazy"
								width="200"
								height="48"
								decoding="async"
								data-nimg="1"
								class="rounded border-2 border-slate-200/10 transition group-hover:border-slate-200/30 sm:order-1 sm:col-span-2 sm:translate-y-1"
								style="color:transparent"
								srcset="/_next/image?url=%2Fimages%2Fprojects%2Fhalcyon.png&amp;w=256&amp;q=75 1x, /_next/image?url=%2Fimages%2Fprojects%2Fhalcyon.png&amp;w=640&amp;q=75 2x"
								src="/_next/image?url=%2Fimages%2Fprojects%2Fhalcyon.png&amp;w=640&amp;q=75"
							/>
						</div>
					</li>
					<li class="mb-12">
						<div
							class="group relative grid gap-4 pb-1 transition-all sm:grid-cols-8 sm:gap-8 md:gap-4 lg:hover:!opacity-100 lg:group-hover/list:opacity-50"
						>
							<div
								class="absolute -inset-x-4 -inset-y-4 z-0 hidden rounded-md transition motion-reduce:transition-none lg:-inset-x-6 lg:block lg:group-hover:bg-slate-800/50 lg:group-hover:shadow-[inset_0_1px_0_0_rgba(148,163,184,0.1)] lg:group-hover:drop-shadow-lg"
							/>
							<div class="z-10 sm:order-2 sm:col-span-6">
								<h3>
									<a
										class="inline-flex items-baseline font-medium leading-tight text-slate-200 hover:text-teal-300 focus-visible:text-teal-300 group/link text-base"
										href="https://v4.brittanychiang.com/"
										target="_blank"
										rel="noreferrer"
										aria-label="brittanychiang.com (v4)"
										><span
											class="absolute -inset-x-4 -inset-y-2.5 hidden rounded md:-inset-x-6 md:-inset-y-4 lg:block"
										/><span
											>brittanychiang.com<!-- -->
											<span class="inline-block"
												>(v4)<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 20 20"
													fill="currentColor"
													class="inline-block h-4 w-4 shrink-0 transition-transform group-hover/link:-translate-y-1 group-hover/link:translate-x-1 group-focus-visible/link:-translate-y-1 group-focus-visible/link:translate-x-1 motion-reduce:transition-none ml-1 translate-y-px"
													aria-hidden="true"
													><path
														fill-rule="evenodd"
														d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
														clip-rule="evenodd"
													/></svg
												></span
											></span
										></a
									>
								</h3>
								<p class="mt-2 text-sm leading-normal">
									An old portfolio site built with Gatsby with 6k+ stars and 3k+ forks
								</p>
								<a
									class="relative mt-2 inline-flex items-center text-sm font-medium text-slate-300 hover:text-teal-300 focus-visible:text-teal-300"
									href="https://github.com/bchiang7/v4"
									target="_blank"
									rel="noreferrer"
									aria-label="6484 stars on GitHub"
									><svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
										fill="currentColor"
										class="mr-1 h-3 w-3"
										aria-hidden="true"
										><path
											fill-rule="evenodd"
											d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
											clip-rule="evenodd"
										/></svg
									><span>6,484</span></a
								>
								<ul class="mt-2 flex flex-wrap" aria-label="Technologies used:">
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											Gatsby
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											Styled Components
										</div>
									</li>
									<li class="mr-1.5 mt-2">
										<div
											class="flex items-center rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium leading-5 text-teal-300"
										>
											Netlify
										</div>
									</li>
								</ul>
							</div>
							<img
								alt=""
								loading="lazy"
								width="200"
								height="48"
								decoding="async"
								data-nimg="1"
								class="rounded border-2 border-slate-200/10 transition group-hover:border-slate-200/30 sm:order-1 sm:col-span-2 sm:translate-y-1"
								style="color:transparent"
								srcset="/_next/image?url=%2Fimages%2Fprojects%2Fv4.png&amp;w=256&amp;q=75 1x, /_next/image?url=%2Fimages%2Fprojects%2Fv4.png&amp;w=640&amp;q=75 2x"
								src="/_next/image?url=%2Fimages%2Fprojects%2Fv4.png&amp;w=640&amp;q=75"
							/>
						</div>
					</li>
				</ul>
				<div class="mt-12">
					<a
						class="inline-flex items-center font-medium leading-tight text-slate-200 font-semibold text-slate-200 group"
						aria-label="View Full Project Archive"
						href="/archive"
						><span
							><span
								class="border-b border-transparent pb-px transition group-hover:border-teal-300 motion-reduce:transition-none"
								>View Full Project<!-- -->
							</span><span class="whitespace-nowrap"
								><span
									class="border-b border-transparent pb-px transition group-hover:border-teal-300 motion-reduce:transition-none"
									>Archive</span
								><svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									class="ml-1 inline-block h-4 w-4 shrink-0 -translate-y-px transition-transform group-hover:translate-x-2 group-focus-visible:translate-x-2 motion-reduce:transition-none"
									aria-hidden="true"
									><path
										fill-rule="evenodd"
										d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
										clip-rule="evenodd"
									/></svg
								></span
							></span
						></a
					>
				</div>
			</div>
		</section>
		<section
			id="writing"
			class="mb-16 scroll-mt-16 md:mb-24 lg:mb-36 lg:scroll-mt-24"
			aria-label="Blog posts"
		>
			<div
				class="sticky top-0 z-20 -mx-6 mb-4 w-screen bg-slate-900/75 px-6 py-5 backdrop-blur md:-mx-12 md:px-12 lg:sr-only lg:relative lg:top-auto lg:mx-auto lg:w-full lg:px-0 lg:py-0 lg:opacity-0"
			>
				<h2 class="text-sm font-bold uppercase tracking-widest text-slate-200 lg:sr-only">
					Writing
				</h2>
			</div>
			<div>
				<ul class="group/list">
					<li class="mb-12">
						<div
							class="group relative grid grid-cols-8 gap-4 transition-all sm:items-center sm:gap-8 md:gap-4 lg:hover:!opacity-100 lg:group-hover/list:opacity-50"
						>
							<div
								class="absolute -inset-x-4 -inset-y-4 z-0 hidden rounded-md transition motion-reduce:transition-none lg:-inset-x-6 lg:block lg:group-hover:bg-slate-800/50 lg:group-hover:shadow-[inset_0_1px_0_0_rgba(148,163,184,0.1)] lg:group-hover:drop-shadow-lg"
							/>
							<img
								alt="Telescope"
								loading="lazy"
								width="200"
								height="48"
								decoding="async"
								data-nimg="1"
								class="z-10 col-span-2 rounded border-2 border-slate-200/10 transition group-hover:border-slate-200/30 sm:col-span-2"
								style="color:transparent"
								srcset="/_next/image?url=%2Fimages%2Fwriting%2Falgolia-search.jpeg&amp;w=256&amp;q=75 1x, /_next/image?url=%2Fimages%2Fwriting%2Falgolia-search.jpeg&amp;w=640&amp;q=75 2x"
								src="/_next/image?url=%2Fimages%2Fwriting%2Falgolia-search.jpeg&amp;w=640&amp;q=75"
							/>
							<div class="z-10 col-span-6">
								<p class="-mt-1 text-sm font-semibold leading-6">2020</p>
								<h3 class="-mt-1">
									<a
										class="inline-flex items-baseline font-medium leading-tight text-slate-200 hover:text-teal-300 focus-visible:text-teal-300 group/link text-base"
										href="https://upstatement.com/blog/integrating-algolia-search-with-wordpress-multisite/"
										target="_blank"
										rel="noreferrer"
										aria-label="Integrating Algolia Search with WordPress Multisite"
										><span
											class="absolute -inset-x-4 -inset-y-2.5 hidden rounded md:-inset-x-6 md:-inset-y-4 lg:block"
										/><span
											>Integrating Algolia Search with WordPress<!-- -->
											<span class="inline-block"
												>Multisite<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 20 20"
													fill="currentColor"
													class="inline-block h-4 w-4 shrink-0 transition-transform group-hover/link:-translate-y-1 group-hover/link:translate-x-1 group-focus-visible/link:-translate-y-1 group-focus-visible/link:translate-x-1 motion-reduce:transition-none ml-1 translate-y-px"
													aria-hidden="true"
													><path
														fill-rule="evenodd"
														d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
														clip-rule="evenodd"
													/></svg
												></span
											></span
										></a
									>
								</h3>
							</div>
						</div>
					</li>
					<li class="mb-12">
						<div
							class="group relative grid grid-cols-8 gap-4 transition-all sm:items-center sm:gap-8 md:gap-4 lg:hover:!opacity-100 lg:group-hover/list:opacity-50"
						>
							<div
								class="absolute -inset-x-4 -inset-y-4 z-0 hidden rounded-md transition motion-reduce:transition-none lg:-inset-x-6 lg:block lg:group-hover:bg-slate-800/50 lg:group-hover:shadow-[inset_0_1px_0_0_rgba(148,163,184,0.1)] lg:group-hover:drop-shadow-lg"
							/>
							<img
								alt="Headless horseamn"
								loading="lazy"
								width="200"
								height="48"
								decoding="async"
								data-nimg="1"
								class="z-10 col-span-2 rounded border-2 border-slate-200/10 transition group-hover:border-slate-200/30 sm:col-span-2"
								style="color:transparent"
								srcset="/_next/image?url=%2Fimages%2Fwriting%2Fheadless.jpeg&amp;w=256&amp;q=75 1x, /_next/image?url=%2Fimages%2Fwriting%2Fheadless.jpeg&amp;w=640&amp;q=75 2x"
								src="/_next/image?url=%2Fimages%2Fwriting%2Fheadless.jpeg&amp;w=640&amp;q=75"
							/>
							<div class="z-10 col-span-6">
								<p class="-mt-1 text-sm font-semibold leading-6">2019</p>
								<h3 class="-mt-1">
									<a
										class="inline-flex items-baseline font-medium leading-tight text-slate-200 hover:text-teal-300 focus-visible:text-teal-300 group/link text-base"
										href="https://upstatement.com/blog/building-a-headless-mobile-app-cms-from-scratch/"
										target="_blank"
										rel="noreferrer"
										aria-label="Building a Headless Mobile App CMS From Scratch"
										><span
											class="absolute -inset-x-4 -inset-y-2.5 hidden rounded md:-inset-x-6 md:-inset-y-4 lg:block"
										/><span
											>Building a Headless Mobile App CMS From<!-- -->
											<span class="inline-block"
												>Scratch<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 20 20"
													fill="currentColor"
													class="inline-block h-4 w-4 shrink-0 transition-transform group-hover/link:-translate-y-1 group-hover/link:translate-x-1 group-focus-visible/link:-translate-y-1 group-focus-visible/link:translate-x-1 motion-reduce:transition-none ml-1 translate-y-px"
													aria-hidden="true"
													><path
														fill-rule="evenodd"
														d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
														clip-rule="evenodd"
													/></svg
												></span
											></span
										></a
									>
								</h3>
							</div>
						</div>
					</li>
				</ul>
			</div>
		</section>
		<footer class="max-w-md pb-16 text-sm text-slate-500 sm:pb-0">
			<p>
				Loosely designed in<!-- -->
				<a
					href="https://www.figma.com/"
					class="font-medium text-slate-400 hover:text-teal-300 focus-visible:text-teal-300"
					target="_blank"
					rel="noreferrer">Figma</a
				>
				<!-- -->and coded in<!-- -->
				<a
					href="https://code.visualstudio.com/"
					class="font-medium text-slate-400 hover:text-teal-300 focus-visible:text-teal-300"
					target="_blank"
					rel="noreferrer">Visual Studio Code</a
				>
				<!-- -->by yours truly. Built with<!-- -->
				<a
					href="https://nextjs.org/"
					class="font-medium text-slate-400 hover:text-teal-300 focus-visible:text-teal-300"
					target="_blank"
					rel="noreferrer">Next.js</a
				>
				<!-- -->and<!-- -->
				<a
					href="https://tailwindcss.com/"
					class="font-medium text-slate-400 hover:text-teal-300 focus-visible:text-teal-300"
					target="_blank"
					rel="noreferrer">Tailwind CSS</a
				>, deployed with<!-- -->
				<a
					href="https://vercel.com/"
					class="font-medium text-slate-400 hover:text-teal-300 focus-visible:text-teal-300"
					target="_blank"
					rel="noreferrer">Vercel</a
				>. All text is set in the<!-- -->
				<a
					href="https://rsms.me/inter/"
					class="font-medium text-slate-400 hover:text-teal-300 focus-visible:text-teal-300"
					target="_blank"
					rel="noreferrer">Inter</a
				>
				<!-- -->typeface.
			</p>
		</footer>
	</main>
</GameWrapper>
