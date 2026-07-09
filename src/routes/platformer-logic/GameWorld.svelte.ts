import { get } from 'svelte/store'
import { Platform } from './Platform'
import { Player } from './Player'
import { Enemy } from './Enemy'
import { Effect } from './Effect'
import { SpawnDirector } from './SpawnDirector'
import { CombatResolver } from './CombatResolver'
import { CHARACTERS } from './characters'
import {
	effectsStore,
	enemiesStore,
	projectilesStore,
	xpGemsStore,
	bombsStore,
	healthPacksStore,
	creditCratesStore,
	portalsStore
} from '$lib/stores'
import { keys } from './controller'
import {
	gameStatus,
	score,
	playerHp,
	maxHp,
	wave,
	level,
	credits,
	startingWeapon,
	stopRun,
	openWeaponSelect,
	paused as pausedStore,
	pauseGame,
	resumeGame
} from '$lib/game'
import { waveDuration, waveDef, waveSpawnInterval } from './waves'
import { drawHud, drawPowerHud, drawWaveBanner, drawIntermissionPrompt, WAVE_BANNER_MS } from './hud'
import { nearestEnemy } from './los'
import type { Power } from './Power'
import {
	rollChoices,
	weaponChoices,
	powerChoices,
	rollShopOffers,
	type ShopOffer,
	MIN_FIRE_STEPS,
	BASE_INVULN,
	BASE_MAGNET,
	BASE_JUMP,
	BASE_SHIELD_MAX,
	BASE_SHIELD_REGEN,
	BASE_REROLLS,
	type Upgrade
} from './upgrades'
import { ItemInstance, rollItemOffers, type ItemType, type ItemOffer } from './items'

// Fixed-timestep physics with render interpolation ("Fix Your Timestep"): the
// simulation advances in constant 60 Hz steps (deterministic and refresh-rate
// independent) while draw() interpolates between the last two steps, so motion
// stays smooth at the display's native refresh rate.
const FIXED_STEP = 1000 / 60 // physics tick length (ms)
const STEP_DELTA = FIXED_STEP / 12 // delta unit expected by the entities
const MAX_FRAME_TIME = 100 // clamp accumulated time to avoid a spiral after the tab was hidden
const SPAWN_DWELL_MS = 1500 // how long the player must hold the spawn pedestal to launch the next wave
const SPAWN_FLASH_MS = 260 // spawn burst when the hold completes and the wave triggers
const INTERMISSION_MAGNET_MUL = 10 // pickup-radius boost during the rest so leftover gems get swept in
const WEAPON_MILESTONE_LEVEL = 3 // reaching this level grants a 2nd weapon (a special pick, not the shop)
const POWER_MILESTONE_LEVEL = 5 // reaching this level grants a special power on the S key (another special pick)
const SHOP_SLOTS = 3 // weapon/power offers shown at the intermission shop
const ITEM_SLOTS = 3 // passive-item offers shown on the shop's second board
const ELITE_WAVE_INTERVAL = 5 // every Nth wave opens with a scaled-up elite miniboss
const ENTER_REVEAL_MIN_MS = 550 // reveal dwell before the weapon picker (lets the slide-out + fall play)
const ENTER_REVEAL_MAX_MS = 2200 // hard cap so the picker always opens even if the fall is long

// World & camera: the arena is a WORLD larger than the viewport, scrolled by a loosely-following
// camera. Its size is FIXED in world pixels so the map is consistent regardless of the viewport —
// resizing the window shows more/less of it, it doesn't resize the level. A floor multiple keeps the
// world at least a bit bigger than the viewport on very large monitors (coverage + a little scroll).
const WORLD_W = 2400 // fixed world width  (px)
const WORLD_H = 1200 // fixed world height (px)
const WORLD_MIN_VIEW_MUL = 1.12 // ...but never smaller than the view × this (huge-monitor safety)
// Fixed vertical field of view in world units: the arena always shows this many world px tall,
// whatever the window size OR browser zoom. Only the on-screen scale changes (viewScale), so Cmd +/-
// just rescales the same view instead of showing a different slice of the map. Width follows aspect.
const VIEW_H = 760
// The camera softly recenters on the player at ALL times (no dead-zone that pins it to an edge), and
// leads in the travel direction so you can see what's coming rather than running blind into the edge.
const CAM_LERP_X = 0.14 // horizontal easing toward the target (higher = snappier reaction)
const CAM_LERP_Y = 0.1 //  vertical easing (a touch gentler so jumps stay calm)
const CAM_LOOKAHEAD_X = 0.1 // lead the view this fraction of the viewport in the travel direction
const CAM_LEAD_EASE = 0.01 // how fast the look-ahead shifts in/out (and back to 0 when idle)
const CAM_BIAS_Y = 0.08 // downward bias so the ground below the player stays in view
// Parallax skyline (static/sprites/Background/{1..5}.png). Back→front: 1 = sky, 5 = nearest. `fx`/`fy`
// are how much each layer tracks the camera (0 = fixed, 1 = locked to the world); nearer moves more.
const BG_LAYERS = [
	{ file: '1', fx: 0.05, fy: 0.03 },
	{ file: '2', fx: 0.18, fy: 0.08 },
	{ file: '3', fx: 0.32, fy: 0.12 },
	{ file: '4', fx: 0.46, fy: 0.16 },
	{ file: '5', fx: 0.6, fy: 0.2 }
]
const BG_IMG_W = 576 // native size of every parallax layer (used to scale + tile them)
const BG_IMG_H = 324

// The mini-game simulation: owns the canvas, the player, the fixed-timestep loop,
// the spawn director, combat resolution and the run-scoped upgrade state. The Svelte
// component is a thin shell that mounts this and renders the modals from the reactive
// fields below (levelUpOpen / choices / rerolls). Difficulty policy lives in waves.ts,
// the upgrade table in upgrades.ts, HUD drawing in hud.ts and auto-aim in los.ts.
export class GameWorld {
	// --- Rendering context (set on mount) ---
	private canvas!: HTMLCanvasElement
	ctx!: CanvasRenderingContext2D
	player!: Player
	// Two subsystems split out of this god-object, each holding a back-reference to it: the spawn
	// director (what/where to spawn, portal driving) and the combat resolver (hits, kills + drops,
	// shield, damage-number/shock-ring FX). Both read this world's shared run state via `this`; the
	// upgrade stats they consume still live here (mutated by upgrades.ts). See SpawnDirector /
	// CombatResolver. GameWorld still drives the player's weapons + powers itself.
	private director = new SpawnDirector(this)
	private combat = new CombatResolver(this)

	// --- Timestep bookkeeping ---
	private lastTime = 0
	private accumulator = 0
	private rafId: number | null = null

	// Platforms are derived from DOM elements; they only move on scroll/resize, so
	// cache them and recompute lazily instead of every frame (avoids layout thrash).
	// collectPlatforms() merges these DOM platforms with the procedural arena ledges below.
	private platforms: Platform[] = []
	private platformsDirty = true
	private canvasDirty = true
	// Procedural arena ledges: a fresh random layout is generated each wave (a new set at
	// run start and at every intermission), giving the player extra terrain that changes
	// every wave. Merged into `platforms` by collectPlatforms(); rendered (visible=true).
	proceduralPlatforms: Platform[] = []
	// The next wave's ledges, pre-built at intermission and faded in (render-only, not yet
	// collidable) as the old set fades out over the spawn dwell; promoted on hold-complete.
	private pendingPlatforms: Platform[] = []

	// Run tunables, bumped by the level-up upgrades (upgrades.ts mutates these) and
	// restored to their baseline by resetUpgrades() on a fresh run. Weapon-side tunables
	// (cadence, range, bolt count…) moved onto the per-weapon Weapon instances.
	invulnSteps = BASE_INVULN
	magnetRadius = BASE_MAGNET
	xpMul = 1 // XP banked per gem
	regenPerStep = 0 // HP healed per physics step (Regen upgrade adds 1 HP / 5s per stack)
	private regenAccum = 0 // fractional-HP carry so sub-1-HP-per-step regen still heals

	// --- Brotato-style global character stats (the XP-pool rewards) -----------
	// Generic, character-wide (not per-weapon — the shop tunes individual weapons). Reset to
	// baseline by resetUpgrades() and bumped by the level-up stat picks (upgrades.ts). Read by
	// the combat resolution below. Max HP / Speed / Regen live in their own stores/fields above.
	bonusDamage = 0 // flat damage added to every bolt hit
	critChance = 0 // 0..1 chance a bolt deals CRIT_MULT× damage
	dodgeChance = 0 // 0..1 chance to shrug off an incoming hit entirely
	armorReduction = 0 // 0..cap fraction of incoming damage prevented (min 1 still lands)
	lifeStealChance = 0 // 0..1 chance a damaging bolt heals 1 HP
	rangeBonus = 0 // px added to every weapon's engagement range
	fireRateMul = 1 // global cadence multiplier applied on top of each weapon's fireSteps (<1 = faster)
	luck = 0 // drop-rate bonus: crate/med-kit chances scale by (1 + luck)
	// Base shield: a bubble that soaks incoming hits. Each hit spends a charge (no HP
	// lost) and breaks the bubble briefly; a charge regenerates every shieldRegenSteps,
	// and any incoming damage resets that timer (no regen while under fire).
	shieldMax = BASE_SHIELD_MAX // charges when full (Bulwark raises it)
	shieldCharges = BASE_SHIELD_MAX // current charges (each absorbs one hit)
	shieldRegenSteps = BASE_SHIELD_REGEN // steps to regen one charge (Recharge lowers it)
	shieldRegenTimer = 0 // steps since the last hit / last regen tick (read/written by CombatResolver)
	shieldFlash = 0 // steps left on the break/absorb ring VFX
	shieldFlashBig = false // was the last flash a full break (bigger ring)?

	// --- Level-up pick state (read by the Svelte template, hence reactive) ---
	// gameStatus stays 'playing' during the pick (so the field isn't cleared); these
	// freeze the sim and drive the pick modal until a choice is made.
	levelUpOpen = $state(false)
	choices = $state<Upgrade[]>([])
	rerolls = $state(0)
	// Which special milestone card the current pick is, if any ('weapon' = choose a 2nd weapon,
	// 'power' = choose a special power) rather than a normal upgrade — the UI swaps its heading
	// and hides the reroll for these. null = ordinary level-up roll.
	milestone = $state<'weapon' | 'power' | null>(null)
	private pendingLevelUps = 0
	private weaponMilestoneDone = false // the 2nd-weapon card only ever appears once per run
	private powerMilestoneDone = false // the power card only ever appears once per run

	// --- Intermission shop (read by the Svelte template, hence reactive) ---
	// Opens when the player reaches the pedestal during the rest; freezes the sim (added to the
	// pause condition) and offers SHOP_SLOTS paid weapon/power upgrades. Its launch button starts
	// the next wave. `credits` lives in game.ts (a HUD store); these just drive the overlay.
	shopOpen = $state(false)
	shopOffers = $state<ShopOffer[]>([])

	// --- Passive items (roadmap: misc bonuses) -------------------------------
	// The third acquisition channel: run-scoped relics bought from the shop's SECOND board. Each
	// subscribes to combat/lifecycle hooks (onKill/onHit/onDamaged/onWaveStart/onTick/onDraw) that
	// this class fans out at fixed seams, so adding an item is a data entry in items.ts — never an
	// engine edit. `itemOffers` drives the board (reactive); `items` is the held collection.
	items: ItemInstance[] = []
	itemOffers = $state<ItemOffer[]>([])

	// Expanding blast rings (nova / slam shockwaves) — purely visual, aged by frameTime and
	// drawn over the sprites. Kept off the entity pools since they never interact.
	shockRings: { x: number; y: number; max: number; t: number; color: string }[] = []

	// Floating damage numbers: a tiny text rises + fades over each damaged enemy. Crits show bigger
	// and amber. Purely visual (like shockRings), aged by frameTime and capped so a big chain can't
	// grow the array without bound.
	damageNumbers: { x: number; y: number; vy: number; t: number; text: string; color: string; size: number }[] = []

	// --- Wave / run timing ---
	private spawnTimer = 0
	invuln = 0 // i-frame countdown; shared by CombatResolver (grants/reads) and the loop (ticks it)
	private wasPlaying = false
	// The playfield is a WORLD larger than the viewport (recomputed on resize); entities are confined
	// to this rather than the canvas. The camera scrolls the viewport around it, behind a parallax
	// skyline. cameraX/Y are the viewport's top-left in world space (0,0 = portfolio mode).
	world = { width: 0, height: 0 }
	// The on-screen view: viewScale is device px per world unit (so Cmd +/- only rescales); viewW/viewH
	// are the world units visible (viewH fixed = VIEW_H, viewW follows aspect). Used for the camera,
	// parallax and HUD (all view-space), while entities live in the full `world`.
	private viewScale = 1
	private viewW = 0
	private viewH = VIEW_H
	private cameraX = 0
	private cameraY = 0
	private camLeadX = 0 // eased look-ahead offset (leads the view in the travel direction)
	private wasInArena = false
	private bgImages: HTMLImageElement[] = [] // parallax layers, lazy-loaded in mount()
	// Entry reveal ('entering'): the character falls into the arena from wherever it stood before the
	// weapon picker opens. wasEntering detects the rising edge; enterTimer counts the reveal; the pick
	// opens once landed; enteredFromReveal tells the run's rising edge to keep the fallen pose.
	private wasEntering = false
	private enterTimer = 0
	private enterPickShown = false
	private enteredFromReveal = false
	private dimAlpha = 0 // eased screen-dim while playing (focus mode)
	private waveTimer = 0 // ms elapsed in the current wave's combat phase
	private waveBanner = 0 // ms remaining on the current banner
	private waveBannerLabel = '' // theme name shown on the current banner
	// Rest phase between waves: the field is cleared and the player must walk back to the
	// spawn pedestal and hold to trigger the next wave. No combat/spawns while this is true.
	private intermission = false
	private promptTick = 0 // drives the pulsing "return to spawn" prompt
	private spawnDwell = 0 // ms held on the spawn pedestal this intermission (0 → SPAWN_DWELL_MS)
	private spawnFlash = 0 // ms remaining on the spawn burst when a wave launches

	// --- Lifecycle -----------------------------------------------------------
	mount(canvas: HTMLCanvasElement) {
		this.canvas = canvas
		this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D
		this.player = new Player({ x: 0, y: 0 })
		// Preload the parallax skyline layers (drawn behind the arena once a run starts).
		this.bgImages = BG_LAYERS.map((l) => {
			const img = new Image()
			img.src = `/sprites/Background/${l.file}.png`
			return img
		})
		this.spawnPlayerOnPedestal()
		this.rafId = requestAnimationFrame(this.animate) // Start the animation loop
	}

	destroy() {
		// Stop the loop so remounting (e.g. crossing the 1024px breakpoint) doesn't
		// stack multiple animation loops.
		if (this.rafId !== null) cancelAnimationFrame(this.rafId)
		this.clearAllPools()
	}

	// Empty every entity pool (enemies, projectiles, the three pickups, portals) in one call.
	// Guarded per-store so it's cheap to call every idle frame — a store only fires its reactive
	// update when it actually had contents. Used on destroy, on the rising edge of a reveal/run,
	// and while idle to keep the home screen clear. (The intermission swap in enterIntermission
	// clears only a subset, so it keeps its own inline block.)
	private clearAllPools() {
		if (enemiesStore.list.length) enemiesStore.clear()
		if (projectilesStore.list.length) projectilesStore.clear()
		if (xpGemsStore.list.length) xpGemsStore.clear()
		if (bombsStore.list.length) bombsStore.clear()
		if (healthPacksStore.list.length) healthPacksStore.clear()
		if (creditCratesStore.list.length) creditCratesStore.clear()
		if (portalsStore.list.length) portalsStore.clear()
	}

	// --- Input ----------------------------------------------------------------
	handleKeyDown(e: KeyboardEvent) {
		// During a level-up pause, 1/2/3 pick an upgrade, R rerolls, Escape quits;
		// swallow the rest so movement keys don't leak into the frozen sim.
		if (this.levelUpOpen) {
			if (e.code === 'Escape') stopRun()
			else if (e.code === 'Digit1' || e.code === 'Numpad1') this.chooseUpgrade(this.choices[0])
			else if (e.code === 'Digit2' || e.code === 'Numpad2') this.chooseUpgrade(this.choices[1])
			else if (e.code === 'Digit3' || e.code === 'Numpad3') this.chooseUpgrade(this.choices[2])
			else if (e.code === 'KeyR') this.reroll()
			return
		}
		// Intermission shop open: 1/2/3 buy an offer, Enter/Escape launch the next wave; the rest
		// is swallowed so movement doesn't leak into the frozen sim.
		if (this.shopOpen) {
			if (e.code === 'Enter' || e.code === 'Escape') this.launchFromShop()
			else if (e.code === 'Digit1' || e.code === 'Numpad1') this.buyOffer(this.shopOffers[0])
			else if (e.code === 'Digit2' || e.code === 'Numpad2') this.buyOffer(this.shopOffers[1])
			else if (e.code === 'Digit3' || e.code === 'Numpad3') this.buyOffer(this.shopOffers[2])
			// 4/5/6 buy from the item board (the second column of the shop overlay).
			else if (e.code === 'Digit4' || e.code === 'Numpad4') this.buyItem(this.itemOffers[0])
			else if (e.code === 'Digit5' || e.code === 'Numpad5') this.buyItem(this.itemOffers[1])
			else if (e.code === 'Digit6' || e.code === 'Numpad6') this.buyItem(this.itemOffers[2])
			return
		}
		// Pause menu open: Escape resumes; movement keys are swallowed so they don't leak
		// into the frozen sim (the Continue/Quit buttons handle the rest).
		if (get(pausedStore)) {
			if (e.code === 'Escape') resumeGame()
			return
		}
		// Escape pauses an active run (Continue/Quit modal) and dismisses game-over;
		// everything else is movement.
		if (e.code === 'Escape') {
			const st = get(gameStatus)
			if (st === 'playing') pauseGame()
			else if (st === 'over') stopRun()
			return
		}
		keys.onkeydown(e, this.player)
	}

	handleKeyUp(e: KeyboardEvent) {
		keys.onkeyup(e, this.player)
	}

	// Platforms/canvas are cached; mark them stale on scroll/resize.
	markDirty = () => {
		this.platformsDirty = true
		this.canvasDirty = true
	}

	private resizeCanvas() {
		this.canvas.width = this.canvas.clientWidth
		this.canvas.height = this.canvas.clientHeight
		// Fixed vertical field of view: viewScale maps world units → device px, so a smaller/larger (or
		// zoomed) window just rescales the SAME view. Width follows the aspect ratio (not the zoom).
		this.viewScale = (this.canvas.height || 1) / VIEW_H
		this.viewH = VIEW_H
		this.viewW = this.canvas.width / this.viewScale
		// Fixed world size (so the map doesn't change with the window), floored to stay bigger than the
		// view on very wide screens.
		this.world.width = Math.max(WORLD_W, this.viewW * WORLD_MIN_VIEW_MUL)
		this.world.height = Math.max(WORLD_H, this.viewH * WORLD_MIN_VIEW_MUL)
		this.canvasDirty = false
	}

	private collectPlatforms() {
		this.platforms = []
		// Portfolio mode (idle) only: the CV's interactive elements are climbable platforms. Once a
		// run starts the portfolio is hidden and the arena is PURELY procedural — so we skip the DOM
		// platforms entirely (they'd also read as zero-rects while hidden anyway).
		if (get(gameStatus) === 'idle') {
			const collidingElements = document.querySelectorAll('[data-colliding]')
			for (let i = 0; i < collidingElements.length; i++) {
				const el = collidingElements[i].getBoundingClientRect()
				this.platforms.push(new Platform(el.width, el.height, el.y, el.x)) // DOM: invisible
			}
		}
		for (const p of this.proceduralPlatforms) this.platforms.push(p) // arena: visible ledges
		this.platformsDirty = false
	}

	// Roll a fresh set of arena ledges for the next wave — a new layout every wave, but with
	// deliberate structure rather than scattered noise: two wall-flush perch ledges (enemy
	// spawn points, e.g. a perched turret firing inward) plus interior ledges laid out on a
	// regular column grid so spacing reads as designed. All marked visible so Platform.draw()
	// renders them. Returns the set; the caller decides if it's the live or pending layout.
	private buildLayout(): Platform[] {
		const W = this.world.width
		const H = this.world.height
		const thick = 20
		const ledges: Platform[] = []

		// Wall-flush perches: one on each side, at a jittered mid height. Flush to the edge
		// so an enemy can ride in on the wall and hold it (the spawn director perches turrets
		// here).
		const perchW = Math.min(140, W * 0.14)
		const perchY = () => H * (0.4 + Math.random() * 0.26)
		const left = new Platform(perchW, thick, perchY(), 0)
		left.visible = true
		left.edge = 'left'
		const right = new Platform(perchW, thick, perchY(), W - perchW)
		right.visible = true
		right.edge = 'right'
		ledges.push(left, right)

		// Interior ledges on a regular column grid: one per column, each centred in its
		// column with a little horizontal jitter and a varied height, so the field is evenly
		// spaced without looking mechanical.
		const cols = 3 + Math.floor(Math.random() * 2) // 3–4 interior ledges
		const usableL = W * 0.18
		const usableR = W * 0.82
		const colW = (usableR - usableL) / cols
		const bandTop = H * 0.36
		const bandBot = H * 0.74
		for (let i = 0; i < cols; i++) {
			const w = 100 + Math.random() * 80
			const slack = Math.max(0, colW - w - 24)
			const colLeft = usableL + i * colW + 12 + Math.random() * slack
			const top = bandTop + Math.random() * (bandBot - bandTop)
			const ledge = new Platform(w, thick, top, colLeft)
			ledge.visible = true
			ledges.push(ledge)
		}
		return ledges
	}

	// Combat timer expired: enter the rest phase. Clear the threat (enemies + their bombs
	// and bolts) for a true breather — but keep gems/health packs so the player can mop up
	// on the walk back. Pre-build the next arena; it stays render-only at alpha 0 until the
	// player holds the pedestal, then fades in as the old set fades out.
	private enterIntermission() {
		this.intermission = true
		this.spawnDwell = 0
		for (const e of enemiesStore.list)
			effectsStore.add(new Effect({ x: e.pos.x, y: e.pos.y }, 'smoke_12'))
		enemiesStore.clear()
		projectilesStore.clear()
		bombsStore.clear()
		portalsStore.clear() // any mid-telegraph rifts vanish with the cleared field
		this.pendingPlatforms = this.buildLayout()
		for (const p of this.pendingPlatforms) p.renderAlpha = 0
	}

	// The hold completed: promote the pre-built arena to the live (collidable) layout, fire
	// the spawn burst, and start the next wave.
	private startNextWave() {
		this.intermission = false
		this.shopOpen = false
		this.spawnDwell = 0
		this.spawnFlash = SPAWN_FLASH_MS
		for (const p of this.pendingPlatforms) p.renderAlpha = 1
		this.proceduralPlatforms = this.pendingPlatforms
		this.pendingPlatforms = []
		this.platformsDirty = true // fold the new ledges into `platforms` next frame
		this.waveTimer = 0
		this.spawnTimer = 0
		wave.update((w) => w + 1)
		const def = waveDef(get(wave))
		this.waveBanner = WAVE_BANNER_MS
		this.waveBannerLabel = def.label
		// Every Nth wave opens with a true ELITE (scaled-up miniboss, dropped centre-stage). On a
		// non-milestone wave a themed `eliteAtStart` still trickles a normal miniboss in via a rift.
		if (get(wave) % ELITE_WAVE_INTERVAL === 0) this.director.spawnElite(def.eliteAtStart ?? 'brute')
		else if (def.eliteAtStart) this.director.openPortalsForBatch([def.eliteAtStart])
		this.itemsOnWaveStart() // items may prime themselves at the top of a wave
	}

	// Advance the rest phase: once the player walks back onto the pedestal, open the shop (which
	// freezes the sim). Buying and launching the next wave happen from the shop overlay — the old
	// hold-to-continue is replaced by the shop as the pedestal's purpose.
	private updateIntermission() {
		this.promptTick++
		if (!this.shopOpen && this.atSpawn()) this.openShop()
	}

	// --- Intermission shop ----------------------------------------------------
	// Stock the shop from the player's current weapons/power and freeze the sim.
	private openShop() {
		this.shopOffers = rollShopOffers(this, SHOP_SLOTS)
		this.itemOffers = rollItemOffers(this, ITEM_SLOTS)
		this.shopOpen = true
	}

	// Buy an offer: pay its cost, apply it to the bound weapon/power, then refill just that slot
	// with a fresh offer (excluding the other visible slots so no duplicate shows). No-op if the
	// player can't afford it or the offer capped out between roll and click.
	buyOffer(offer: ShopOffer | undefined) {
		if (!this.shopOpen || !offer) return
		if (get(credits) < offer.cost || !offer.available()) return
		credits.update((c) => c - offer.cost)
		offer.apply()
		const others = new Set(this.shopOffers.filter((o) => o.id !== offer.id).map((o) => o.id))
		const [next] = rollShopOffers(this, 1, others)
		this.shopOffers = this.shopOffers
			.map((o) => (o.id === offer.id ? next : o))
			.filter((o): o is ShopOffer => !!o)
	}

	// Buy a passive item from the shop's second board: pay, grant/stack it, then refill just that
	// slot (excluding the other visible item slots). No-op if unaffordable or the item capped out.
	buyItem(offer: ItemOffer | undefined) {
		if (!this.shopOpen || !offer) return
		if (get(credits) < offer.cost || !offer.available()) return
		credits.update((c) => c - offer.cost)
		offer.apply()
		const others = new Set(this.itemOffers.filter((o) => o.id !== offer.id).map((o) => o.id))
		const [next] = rollItemOffers(this, 1, others)
		this.itemOffers = this.itemOffers
			.map((o) => (o.id === offer.id ? next : o))
			.filter((o): o is ItemOffer => !!o)
	}

	// Leave the shop and start the next wave (the shop's primary action).
	launchFromShop() {
		this.shopOpen = false
		this.startNextWave()
	}

	// The in-game spawn pedestal: a game-owned pad on the arena floor (bottom-centre), NOT the DOM
	// Start button anymore (the portfolio is hidden during a run). Anchors the intermission shop,
	// the return-to-spawn prompt and the launch glow/flash. Canvas-relative, so it follows resizes.
	private spawnRect() {
		const w = 96
		const h = 14
		return { x: this.world.width / 2 - w / 2, top: this.world.height - h, width: w, height: h }
	}

	// Is the player standing on the spawn pad? Horizontal overlap (with a little slack) + feet near
	// the floor, so the player can't trigger it from an arena ledge floating above the pad.
	private atSpawn() {
		const r = this.spawnRect()
		const px = this.player.pos.x + this.player.width / 2
		const feet = this.player.pos.y + this.player.height
		const nearX = px > r.x - 50 && px < r.x + r.width + 50
		const nearY = feet > this.world.height - 70
		return nearX && nearY
	}

	// Snap the player onto the spawn pad (clean arena entry at run start). Zeroes motion so they
	// don't inherit velocity from wherever they were standing in the portfolio.
	private placePlayerAtSpawn() {
		const r = this.spawnRect()
		this.player.pos.x = r.x + r.width / 2 - this.player.width / 2
		this.player.pos.y = this.world.height - this.player.height
		this.player.prevPos.x = this.player.pos.x
		this.player.prevPos.y = this.player.pos.y
		this.player.velocity.x = 0
		this.player.velocity.y = 0
		effectsStore.add(new Effect({ x: this.player.pos.x, y: this.player.pos.y + 28 }, 'smoke_12'))
	}

	// Draw the spawn pad on the arena floor so the player can always find "home" (where the shop
	// opens between waves). A rounded slab with a cyan top edge; the glow/flash layer over it.
	private drawSpawnPad() {
		const r = this.spawnRect()
		const ctx = this.ctx
		ctx.save()
		ctx.fillStyle = 'rgba(15, 23, 42, 0.9)' // slate-900 slab
		ctx.beginPath()
		ctx.roundRect(r.x, r.top, r.width, r.height, 5)
		ctx.fill()
		ctx.fillStyle = 'rgba(103, 232, 249, 0.85)' // cyan-300 top lip
		ctx.fillRect(r.x + 4, r.top, r.width - 8, 2)
		ctx.restore()
	}

	// Pulsing "come here" glow over the spawn pedestal during the rest, tightening and
	// brightening as the hold charges. Drawn on the canvas so it sits on the focus veil.
	private drawSpawnGlow() {
		const r = this.spawnRect()
		const cx = r.x + r.width / 2
		const cy = r.top + r.height / 2
		const p = this.spawnDwell / SPAWN_DWELL_MS
		const pulse = 0.5 + 0.5 * Math.sin(this.promptTick * 0.12)
		const intensity = 0.35 + 0.65 * p // dim call-to-action → full charge
		const base = Math.max(r.width, r.height)
		const radius = base * (1.5 + 0.7 * pulse * (1 - p) + 1.3 * p)
		this.ctx.save()
		const g = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
		g.addColorStop(0, `rgba(103, 232, 249, ${0.55 * intensity})`) // cyan-300 core
		g.addColorStop(0.5, `rgba(56, 189, 248, ${0.28 * intensity})`) // sky-400
		g.addColorStop(1, 'rgba(56, 189, 248, 0)')
		this.ctx.fillStyle = g
		this.ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
		this.ctx.restore()
	}

	// Bright expanding burst over the pedestal at the instant the hold completes.
	private drawSpawnFlash() {
		const r = this.spawnRect()
		const cx = r.x + r.width / 2
		const cy = r.top + r.height / 2
		const t = this.spawnFlash / SPAWN_FLASH_MS // 1 → 0
		const base = Math.max(r.width, r.height)
		const radius = base * (0.6 + (1 - t) * 2.6)
		this.ctx.save()
		this.ctx.globalAlpha = t
		const g = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
		g.addColorStop(0, `rgba(224, 242, 254, ${0.5 * t})`) // sky-100 core
		g.addColorStop(1, 'rgba(224, 242, 254, 0)')
		this.ctx.fillStyle = g
		this.ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
		this.ctx.strokeStyle = '#e0f2fe' // sky-100 ring
		this.ctx.lineWidth = 3
		this.ctx.beginPath()
		this.ctx.arc(cx, cy, radius, 0, Math.PI * 2)
		this.ctx.stroke()
		this.ctx.restore()
	}

	private spawnPlayerOnPedestal() {
		// Pop the player onto the Start button ([data-spawn]) with a smoke puff and
		// zero its motion. Used on mount and at the start of every run.
		const spawnEl = document.querySelector('[data-spawn]')
		if (!spawnEl) return
		const r = spawnEl.getBoundingClientRect()
		this.player.pos.x = r.x + r.width / 2 - this.player.width / 2
		this.player.pos.y = r.top - this.player.height
		this.player.prevPos.x = this.player.pos.x
		this.player.prevPos.y = this.player.pos.y
		this.player.velocity.x = 0
		this.player.velocity.y = 0
		effectsStore.add(new Effect({ x: this.player.pos.x, y: this.player.pos.y + 28 }, 'smoke_12'))
	}

	// --- Upgrades -------------------------------------------------------------
	private resetUpgrades() {
		// Base stats come from the active class (Player.cfg); the level-up upgrades bump
		// them from here. Invuln, magnet, regen and jump aren't class-specific in v1, so
		// they keep their global baselines.
		const c = this.player.cfg
		this.invulnSteps = BASE_INVULN
		this.magnetRadius = BASE_MAGNET
		this.xpMul = 1
		this.regenPerStep = 0
		this.regenAccum = 0
		// Brotato global stats back to baseline.
		this.bonusDamage = 0
		this.critChance = 0
		this.dodgeChance = 0
		this.armorReduction = 0
		this.lifeStealChance = 0
		this.rangeBonus = 0
		this.fireRateMul = 1
		this.luck = 0
		this.shieldMax = BASE_SHIELD_MAX
		this.shieldCharges = BASE_SHIELD_MAX
		this.shieldRegenSteps = BASE_SHIELD_REGEN
		this.shieldRegenTimer = 0
		this.shieldFlash = 0
		this.player.speed = c.speed
		this.player.jumpStrength = BASE_JUMP
		// Weapon combat stats (cadence, count, damage, spread, speed, range) are per-weapon now
		// and reset on their own instances; the level-up weapon upgrades bump these copies.
		for (const weapon of this.player.weapons) weapon.reset()
		// Special power is granted mid-run (null at run start), but clear its motion state and
		// cooldown defensively in case a run is re-entered while one is somehow still held.
		this.player.dashSteps = 0
		this.player.slamming = false
		this.player.power?.reset()
		this.shockRings.length = 0
		this.damageNumbers.length = 0
		// Drop any held passive items (a fresh run starts with none; their stat effects were folded
		// into the baseline stats reset above, so clearing the list is enough).
		this.items.length = 0
	}

	// Passive regeneration (Regen upgrade): heal fractional HP each step, carrying the
	// remainder so a sub-1-HP-per-step rate still lands whole hearts. Caps at max HP.
	private applyRegen() {
		const cap = get(maxHp)
		if (get(playerHp) >= cap) {
			this.regenAccum = 0
			return
		}
		this.regenAccum += this.regenPerStep
		if (this.regenAccum >= 1) {
			const heal = Math.floor(this.regenAccum)
			this.regenAccum -= heal
			playerHp.update((h) => Math.min(cap, h + heal))
		}
	}

	// Spend a reroll to redraw the current choices (no-op when none are left, or on the
	// weapon-milestone card — the 2nd-weapon offer isn't rerollable).
	reroll() {
		if (!this.levelUpOpen || this.milestone || this.rerolls <= 0) return
		this.rerolls--
		this.choices = rollChoices(this)
	}

	// Build the next pick. Milestone cards replace the normal roll at set levels and fire once
	// each: the 2nd weapon (WEAPON_MILESTONE_LEVEL, still solo) first, then the special power
	// (POWER_MILESTONE_LEVEL, none held). Otherwise the normal weighted upgrade roll.
	private openPick() {
		if (
			!this.weaponMilestoneDone &&
			this.player.weapons.length < 2 &&
			get(level) >= WEAPON_MILESTONE_LEVEL
		) {
			const offers = weaponChoices(this)
			if (offers.length) {
				this.choices = offers
				this.milestone = 'weapon'
				return
			}
		}
		if (!this.powerMilestoneDone && !this.player.power && get(level) >= POWER_MILESTONE_LEVEL) {
			const offers = powerChoices(this)
			if (offers.length) {
				this.choices = offers
				this.milestone = 'power'
				return
			}
		}
		this.milestone = null
		this.choices = rollChoices(this)
	}

	// Queue the level-ups earned this step; open the modal on the first one.
	// Called by CombatResolver when a banked gem crosses a level threshold, hence non-private.
	queueLevelUps(n: number) {
		this.pendingLevelUps += n
		if (!this.levelUpOpen) {
			this.openPick()
			this.levelUpOpen = true
		}
	}

	// Apply the pick, then present the next queued level-up (if any) or resume play.
	chooseUpgrade(u: Upgrade) {
		if (!this.levelUpOpen || !u) return
		u.apply(this)
		if (this.milestone === 'weapon') this.weaponMilestoneDone = true // 2nd weapon claimed
		else if (this.milestone === 'power') this.powerMilestoneDone = true // power claimed
		// A level-up fully heals (Brotato-style reward for surviving the climb). Applied
		// AFTER the pick so a +max-HP choice (Vitality) tops up to the new, higher cap.
		playerHp.set(get(maxHp))
		this.pendingLevelUps--
		if (this.pendingLevelUps > 0) this.openPick()
		else {
			this.levelUpOpen = false
			this.milestone = null
		}
	}

	// --- Passive items (misc bonuses) ----------------------------------------
	// Grant an item, or stack it if already held and below its cap, running its onAcquire each time
	// so per-stack stat bumps apply. Bought from the shop's item board (buyItem).
	acquireItem(type: ItemType) {
		const max = type.maxStacks ?? 1
		const existing = this.items.find((it) => it.type.id === type.id)
		if (existing) {
			if (existing.stacks >= max) return
			existing.stacks++
			type.onAcquire?.(this, existing)
		} else {
			const inst = new ItemInstance(type)
			this.items.push(inst)
			type.onAcquire?.(this, inst)
		}
	}

	// How many stacks of an item the player holds (0 if none) — the shop prices/caps offers with it.
	itemStacks(id: string) {
		return this.items.find((it) => it.type.id === id)?.stacks ?? 0
	}

	// Hook fan-out: each held item may subscribe to these combat/lifecycle seams. Kept as thin loops
	// so a new item is a data entry in items.ts, never an engine edit here. onKill can re-enter (an
	// item's blast kills more), which is fine — shockwave/resolveHits skip already-dead enemies.
	// Fanned out by CombatResolver at the kill / hit / damage-taken seams, so left non-private.
	itemsOnKill(enemy: Enemy) {
		for (const it of this.items) it.type.onKill?.(this, enemy, it)
	}
	itemsOnHit(enemy: Enemy, dmg: number) {
		for (const it of this.items) it.type.onHit?.(this, enemy, dmg, it)
	}
	itemsOnDamaged(amount: number) {
		for (const it of this.items) it.type.onDamaged?.(this, amount, it)
	}
	private itemsOnWaveStart() {
		for (const it of this.items) it.type.onWaveStart?.(this, it)
	}
	private itemsTick(dt: number) {
		for (const it of this.items) it.type.onTick?.(this, dt, it)
	}
	private itemsDraw(alpha: number) {
		for (const it of this.items) it.type.onDraw?.(this, this.ctx, alpha, it)
	}

	// --- Combat resolution ----------------------------------------------------
	// Drive the player's weapons each step: every weapon aims from its own muzzle at the
	// nearest enemy IT can reach (so a left and a right weapon cover different threats),
	// then fires on its own cadence. When not playing (intermission) weapons still aim
	// straight ahead but hold fire. Only 'ranged' (the Punk) is wired; 'melee'/'deploy'
	// re-slot here when their classes come back (see characters.ts / ROADMAP.md).
	private playerCombat(playing: boolean) {
		if (this.player.cfg.attackStyle !== 'ranged') return
		for (const weapon of this.player.weapons) {
			const muzzle = weapon.muzzle(this.player)
			// A zero-size aim source centres nearestEnemy exactly on the muzzle point. The global
			// Range stat extends every weapon's own engagement range.
			const range = weapon.attackRange + this.rangeBonus
			const target = playing
				? nearestEnemy({ pos: muzzle, width: 0, height: 0 }, this.platforms, range)
				: null
			weapon.aimAt(target, muzzle, this.player.direction)
			if (!playing) continue
			if (weapon.cooldown > 0) {
				weapon.cooldown--
				continue
			}
			if (target) {
				weapon.shoot(muzzle)
				// Per-weapon cadence, sped up by the global Attack Speed stat (fireRateMul).
				weapon.cooldown = Math.max(MIN_FIRE_STEPS, Math.round(weapon.fireSteps * this.fireRateMul))
			}
		}
	}

	// --- Special power (touche S) ---------------------------------------------
	// Tick the equipped power's cooldown each step and fire it on an 'S' press (a rising-edge
	// flag the controller sets). No power → just clear the flag so a later grant doesn't fire
	// a stale press. Called every step while playing.
	private updatePower() {
		const power = this.player.power
		if (!power) {
			keys.power = false
			return
		}
		power.tick()
		if (keys.power) {
			keys.power = false
			if (power.ready) this.activatePower(power)
		}
	}

	// Dispatch the power by kind (the seam mirrors attackStyle / enemy behaviour). Each case
	// reads the power's mutable stats, may grant i-frames, and puts it on cooldown.
	private activatePower(power: Power) {
		const p = this.player
		switch (power.type.kind) {
			case 'dash': {
				// Dash the held direction, or the way we face if no direction is held.
				const dir = keys.left ? -1 : keys.right ? 1 : p.direction === 'left' ? -1 : 1
				p.startDash(dir * power.type.speed, power.type.duration)
				this.invuln = Math.max(this.invuln, power.type.invulnSteps)
				break
			}
			case 'slam': {
				if (p.isFalling) {
					// Airborne: plunge; the shockwave fires on landing (resolveSlamLanding).
					p.startSlam(power.type.speed)
					this.invuln = Math.max(this.invuln, power.type.invulnSteps)
				} else {
					// Grounded: stomp right here, no plunge.
					this.shockwave(
						p.pos.x + p.width / 2, p.pos.y + p.height,
						power.radius, power.damage, power.knockback, power.type.color
					)
				}
				break
			}
			case 'nova': {
				this.shockwave(
					p.pos.x + p.width / 2, p.pos.y + p.height / 2,
					power.radius, power.damage, power.knockback, power.type.color
				)
				this.invuln = Math.max(this.invuln, power.type.invulnSteps)
				break
			}
		}
		power.trigger()
	}

	// The slam plunge landed: detonate the ground shockwave once. Watched each step after the
	// player moves, so isFalling is fresh (the vertical collision cleared it on touchdown).
	private resolveSlamLanding() {
		const p = this.player
		if (!p.slamming || p.isFalling) return
		p.slamming = false
		const power = p.power
		if (!power || power.type.kind !== 'slam') return
		this.shockwave(
			p.pos.x + p.width / 2, p.pos.y + p.height,
			power.radius, power.damage, power.knockback, power.type.color
		)
	}

	// Thin forwarder to the combat resolver's blast, kept on GameWorld so the powers above and the
	// passive items (items.ts, which receive a GameWorld) trigger blasts through the same path.
	shockwave(cx: number, cy: number, radius: number, damage: number, knockback: number, color: string) {
		this.combat.shockwave(cx, cy, radius, damage, knockback, color)
	}

	// --- Camera & parallax ----------------------------------------------------
	// Softly recenter on the player at all times (no dead-zone), leading the view in the travel
	// direction so you see what's coming instead of running blind into the edge. The lead eases in/out
	// (and back to 0 when idle → exact recenter); a gentle downward bias keeps the ground in view.
	// Easing keeps it smooth so it doesn't yank/nauseate. `snap` jumps straight to target (run entry).
	private updateCamera(snap = false) {
		const viewW = this.viewW
		const viewH = this.viewH
		const maxX = Math.max(0, this.world.width - viewW)
		const maxY = Math.max(0, this.world.height - viewH)
		const px = this.player.pos.x + this.player.width / 2
		const py = this.player.pos.y + this.player.height / 2
		const dir = this.player.velocity.x > 0.01 ? 1 : this.player.velocity.x < -0.01 ? -1 : 0
		const desiredLead = dir * viewW * CAM_LOOKAHEAD_X
		this.camLeadX += (desiredLead - this.camLeadX) * (snap ? 1 : CAM_LEAD_EASE)
		const tx = Math.max(0, Math.min(px - viewW / 2 + this.camLeadX, maxX))
		const ty = Math.max(0, Math.min(py - viewH / 2 + viewH * CAM_BIAS_Y, maxY))
		if (snap) {
			this.cameraX = tx
			this.cameraY = ty
		} else {
			this.cameraX += (tx - this.cameraX) * CAM_LERP_X
			this.cameraY += (ty - this.cameraY) * CAM_LERP_Y
		}
	}

	// Parallax skyline behind the arena (replaces the flat focus veil). Drawn in SCREEN space with a
	// per-layer fraction of the camera offset — far layers barely move, near layers more — over an
	// opaque gradient base so the CV never bleeds through once faded in. `alpha` is the idle↔arena
	// crossfade (dimAlpha). Each layer is scaled to the viewport height and tiled across its width;
	// its bottom stays at/below the viewport bottom, rising toward the floor as the camera descends.
	private drawParallax(alpha: number) {
		const ctx = this.ctx
		const viewW = this.viewW
		const viewH = this.viewH
		const maxY = Math.max(1, this.world.height - viewH)
		ctx.save()
		ctx.globalAlpha = Math.min(1, alpha)
		const g = ctx.createLinearGradient(0, 0, 0, viewH)
		g.addColorStop(0, '#0b1120') // slate-950-ish top
		g.addColorStop(1, '#05070e') // darker toward the floor
		ctx.fillStyle = g
		ctx.fillRect(0, 0, viewW, viewH)
		const scale = viewH / BG_IMG_H
		const tileW = BG_IMG_W * scale
		for (let i = 0; i < BG_LAYERS.length; i++) {
			const img = this.bgImages[i]
			if (!img || !img.complete || img.naturalWidth === 0) continue
			const layer = BG_LAYERS[i]
			const bottomY = viewH + (maxY - this.cameraY) * layer.fy // ≥ viewH → no gap at the bottom
			const topY = bottomY - viewH
			let offX = -((this.cameraX * layer.fx) % tileW)
			if (offX > 0) offX -= tileW
			for (let x = offX; x < viewW; x += tileW) ctx.drawImage(img, x, topY, tileW, viewH)
		}
		ctx.restore()
	}

	// --- The loop -------------------------------------------------------------
	private animate = (timestamp: number) => {
		if (this.lastTime === 0) this.lastTime = timestamp
		const frameTime = Math.min(timestamp - this.lastTime, MAX_FRAME_TIME)
		this.lastTime = timestamp

		if (this.canvasDirty) this.resizeCanvas()
		if (this.platformsDirty) this.collectPlatforms()

		const status = get(gameStatus)
		const playing = status === 'playing'
		const entering = status === 'entering'
		// In the arena (world coords + camera + parallax) for the reveal, the run and the game-over
		// card; the portfolio (screen coords, no camera) otherwise.
		const inArena = playing || entering || status === 'over'

		// Rising edge of the reveal (idle/over → entering): build the arena the character will fall
		// INTO, clear any stale field, and let gravity carry it down from wherever it stood (the DOM
		// platforms drop out of collectPlatforms as soon as we leave 'idle', so it falls through the
		// page into the arena). NO teleport. The weapon picker opens below once it has landed.
		if (entering && !this.wasEntering) {
			this.clearAllPools()
			this.shopOpen = false
			this.intermission = false
			this.spawnDwell = 0
			this.spawnFlash = 0
			this.shockRings.length = 0
			this.damageNumbers.length = 0
			this.pendingPlatforms = []
			this.proceduralPlatforms = this.buildLayout() // the arena the character drops into
			this.platformsDirty = true // fold in the ledges + drop the DOM platforms so it falls
			this.enterTimer = 0
			this.enterPickShown = false
			this.enteredFromReveal = true // the coming run keeps the fallen pose (no spawn-pad snap)
			this.updateCamera(true) // centre the view on the character before it starts falling
		}
		this.wasEntering = entering

		// Falling edge of the arena (→ idle, i.e. a quit): the character's position is in world space,
		// so pop it back onto the portfolio pedestal (screen space) so it's visible on the returning CV.
		if (this.wasInArena && !inArena) this.spawnPlayerOnPedestal()
		this.wasInArena = inArena

		// On the rising edge of a run, reset the run state. When the run was reached through the reveal
		// the arena + the player's position were already established (it fell in), so we DON'T rebuild
		// the layout or snap it onto the pad — it keeps wherever it landed.
		if (playing && !this.wasPlaying) {
			this.clearAllPools()
			// (Re)configure the Player from the character registry, then reset its base stats.
			// One class ships today (Punk); the registry stays the seam for re-adding classes.
			this.player.applyCharacter(CHARACTERS.punk)
			this.player.equip([get(startingWeapon)]) // the weapon chosen in the launch picker
			this.resetUpgrades()
			this.rerolls = BASE_REROLLS
			this.levelUpOpen = false
			this.pendingLevelUps = 0
			this.milestone = null
			this.weaponMilestoneDone = false
			this.powerMilestoneDone = false
			this.shopOpen = false
			this.shopOffers = []
			this.itemOffers = []
			this.shockRings.length = 0
			this.damageNumbers.length = 0
			keys.power = false
			this.spawnTimer = 0
			this.invuln = 0
			this.waveTimer = 0
			this.intermission = false
			this.spawnDwell = 0
			this.spawnFlash = 0
			// The reveal already built the wave-1 arena and let the character fall in, so keep both.
			// The fallback (a run started without a reveal — shouldn't happen) rebuilds + snaps in.
			if (!this.enteredFromReveal || this.proceduralPlatforms.length === 0) {
				this.pendingPlatforms = []
				this.proceduralPlatforms = this.buildLayout() // fresh arena for wave 1
				this.platformsDirty = true
				this.placePlayerAtSpawn()
			}
			this.enteredFromReveal = false
			// Open on the wave-1 theme banner so the first encounter is announced too.
			this.waveBanner = WAVE_BANNER_MS
			this.waveBannerLabel = waveDef(get(wave)).label
		}
		this.wasPlaying = playing

		// A run that ended (Escape/quit) with a pick still open drops the pick.
		if (!playing && this.levelUpOpen) {
			this.levelUpOpen = false
			this.pendingLevelUps = 0
			this.milestone = null
		}
		// Sim freeze (field preserved, not cleared): a level-up pick, the pause menu, or the
		// intermission shop.
		const paused = this.levelUpOpen || this.shopOpen || get(pausedStore)

		// Advance the wave on a timer, then spawn enemies at the current wave's rate/
		// cap. Frozen while a pick is open; the field is cleared once truly stopped.
		if (playing && !paused) {
			if (this.intermission) {
				// Rest phase: no spawns, no timer. The next wave starts once the player has
				// walked back to the pedestal and held it for SPAWN_DWELL_MS (crossfading the
				// arena layout meanwhile).
				this.updateIntermission()
			} else {
				// Advance open rifts every frame (they emit their hordes on their own timers).
				this.director.updatePortals(frameTime)
				this.waveTimer += frameTime
				if (this.waveTimer >= waveDuration(get(wave))) {
					// Combat over: clear the field, spawn a new arena, and wait for the
					// player to return to spawn (startNextWave advances the wave counter).
					this.enterIntermission()
				} else {
					this.spawnTimer += frameTime
					if (this.spawnTimer >= waveSpawnInterval(get(wave))) {
						this.director.spawnFromBudget()
						this.spawnTimer = 0
					}
				}
			}
		} else if (entering) {
			// Reveal in progress: no spawns/combat yet — just let the character fall in (its update
			// runs in the fixed-step block below). Open the weapon picker once it has landed, or after
			// a hard cap so a long fall never leaves the reveal hanging.
			this.enterTimer += frameTime
			const landed = !this.player.isFalling
			if (
				!this.enterPickShown &&
				(this.enterTimer >= ENTER_REVEAL_MAX_MS ||
					(this.enterTimer >= ENTER_REVEAL_MIN_MS && landed))
			) {
				this.enterPickShown = true
				openWeaponSelect()
			}
		} else if (!playing) {
			this.clearAllPools()
			this.shopOpen = false
			this.invuln = 0
			this.waveBanner = 0
			// Drop the arena ledges so the idle/home screen shows none (they're re-rolled
			// on the next run start).
			if (this.proceduralPlatforms.length || this.pendingPlatforms.length) {
				this.proceduralPlatforms = []
				this.pendingPlatforms = []
				this.platformsDirty = true
			}
			this.intermission = false
			this.spawnDwell = 0
			this.spawnFlash = 0
			if (this.shockRings.length) this.shockRings.length = 0
			if (this.damageNumbers.length) this.damageNumbers.length = 0
			keys.power = false
		}

		// Entities are confined to the WORLD while in the arena; to the viewport in portfolio mode
		// (idle), where the character roams/climbs the CV within the visible screen.
		const bounds = inArena ? this.world : this.canvas

		// Advance physics in fixed steps, consuming the elapsed real time. A level-up
		// pause skips the updates entirely, freezing every entity in place.
		this.accumulator += frameTime
		while (this.accumulator >= FIXED_STEP) {
			if (!paused) {
				// Snapshot the self-culling pools (a projectile/gem/bomb/pack removes itself
				// from its live pool inside update()); iterate a copy so none is skipped.
				// Enemies don't self-remove in update() (death happens in resolveHits), so
				// they iterate live and pass the live list for neighbour separation.
				projectilesStore.list
					.slice()
					.forEach((projectile) => projectile.update(STEP_DELTA, this.platforms))
				// During the between-wave rest, boost the pickup radius so leftover gems sweep
				// in on the walk back to spawn; it reverts the moment the next wave starts.
				const magnet = this.intermission
					? this.magnetRadius * INTERMISSION_MAGNET_MUL
					: this.magnetRadius
				xpGemsStore.list
					.slice()
					.forEach((gem) => gem.update(bounds, this.player, this.platforms, STEP_DELTA, magnet))
				if (playing)
					enemiesStore.list.forEach((enemy) =>
						enemy.update(bounds, this.player, this.platforms, STEP_DELTA, enemiesStore.list)
					)
				if (playing)
					bombsStore.list
						.slice()
						.forEach((bomb) => bomb.update(bounds, this.platforms, STEP_DELTA))
				if (playing)
					healthPacksStore.list
						.slice()
						.forEach((pack) => pack.update(bounds, this.platforms, STEP_DELTA))
				if (playing)
					creditCratesStore.list
						.slice()
						.forEach((crate) => crate.update(bounds, this.platforms, STEP_DELTA))
				this.player.update(bounds, keys, this.platforms, STEP_DELTA)
				// Special power (S): tick its cooldown, fire on press, and detonate a slam that
				// just landed. After player.update so isFalling reflects this step's landing.
				if (playing) {
					this.updatePower()
					this.resolveSlamLanding()
					this.itemsTick(STEP_DELTA) // passive items advance (drones move + fire) each step
				}
				// Auto-attack: each weapon aims from its own muzzle and fires on its own cadence.
				this.playerCombat(playing)
				if (playing) {
					this.combat.resolveHits()
					this.combat.resolveGemPickups()
					this.combat.resolveHealthPickups()
					this.combat.resolveCreditPickups()
					if (this.regenPerStep > 0) this.applyRegen()
					this.combat.updateShield()
					if (this.invuln > 0) this.invuln--
					this.combat.resolvePlayerDamage()
					this.combat.resolveEnemyShots()
					this.combat.resolveBombs()
				}
			}
			this.accumulator -= FIXED_STEP
		}
		// Loosely track the character after the step so the view follows this frame's movement.
		if (inArena) this.updateCamera()
		// Freeze interpolation + sprite animation while paused so entities hold still.
		const alpha = paused ? 1 : this.accumulator / FIXED_STEP
		const animDelta = paused ? 0 : frameTime / 12

		// Render once per frame, interpolating entities between their last two steps. Reset any prior
		// transform, clear the whole device canvas, then — IN THE ARENA ONLY — apply the fixed-view
		// scale so the world/parallax/HUD render in view units (zoom-invariant). In portfolio mode we
		// stay at 1:1 device px so the character lines up with the real CV elements it climbs.
		this.ctx.setTransform(1, 0, 0, 1, 0, 0)
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
		if (inArena) this.ctx.scale(this.viewScale, this.viewScale)
		// Arena backdrop: a run HIDES the portfolio (see +layout), so paint the parallax skyline behind
		// the sprites, eased in/out (dimAlpha) so idle↔play crossfades. At idle it stays transparent —
		// the CV shows through and the player climbs the page (portfolio mode). Held up through the
		// game-over card too (portfolio stays hidden until idle), so death sits in the arena.
		this.dimAlpha += ((get(gameStatus) !== 'idle' ? 1 : 0) - this.dimAlpha) * 0.12
		// Only under the view scale (inArena); on a quit the CV returns cleanly without a mis-scaled draw.
		if (inArena && this.dimAlpha > 0.01) this.drawParallax(this.dimAlpha)

		// World space: shift everything by the camera while in the arena. In portfolio mode the
		// transform is identity, so entities render at their screen coords and climb the live CV.
		this.ctx.save()
		if (inArena) this.ctx.translate(-Math.round(this.cameraX), -Math.round(this.cameraY))
		// World floor: a faint ground band across the arena's bottom edge with a lit cyan lip.
		if (inArena) {
			const fy = this.world.height
			this.ctx.fillStyle = 'rgba(148, 163, 184, 0.06)'
			this.ctx.fillRect(0, fy - 44, this.world.width, 44)
			this.ctx.fillStyle = 'rgba(103, 232, 249, 0.1)'
			this.ctx.fillRect(0, fy - 2, this.world.width, 2)
		}
		for (const platform of this.platforms) platform.draw(this.ctx)
		// The in-game spawn pad (home base for the intermission shop), on the floor under the sprites.
		// Shown during the reveal too, so the arena reads as "home" as the character drops in.
		if (playing || entering) this.drawSpawnPad()
		// The next wave's ledges fade in over the hold (render-only until promoted).
		if (playing && this.intermission)
			for (const pf of this.pendingPlatforms) pf.draw(this.ctx)
		// Spawn pedestal call-to-action glow during the rest, and the launch burst after.
		if (playing && this.intermission) this.drawSpawnGlow()
		if (playing && this.spawnFlash > 0) this.drawSpawnFlash()
		// Enemy rifts, behind the gems/enemies so hordes read as emerging in front of them.
		if (playing) portalsStore.list.forEach((portal) => portal.draw(this.ctx))
		xpGemsStore.list.forEach((gem) => gem.draw(this.ctx, alpha))
		healthPacksStore.list.forEach((pack) => pack.draw(this.ctx, alpha))
		creditCratesStore.list.forEach((crate) => crate.draw(this.ctx, alpha))
		enemiesStore.list.forEach((enemy) => enemy.draw(this.ctx, animDelta, alpha))
		bombsStore.list.forEach((bomb) => bomb.draw(this.ctx, alpha))
		projectilesStore.list.forEach((projectile) => projectile.draw(this.ctx, alpha))
		// Blink the player while invulnerable after a hit (but always show it paused).
		if (paused || this.invuln <= 0 || Math.floor(this.invuln / 6) % 2 === 0) {
			this.player.draw(this.ctx, animDelta, alpha)
		}
		// Shield bubble over the player (only in an active run, so idle shows none).
		if (playing) this.combat.drawShield(alpha)
		// Passive items with a visual (drones) draw over the player.
		if (playing) this.itemsDraw(alpha)
		// Snapshot: Effect.draw() self-removes from the live pool when its animation ends.
		effectsStore.list.slice().forEach((effect: Effect) => effect.draw(this.ctx))
		// Nova / slam blast rings, over everything (age out even if the run just ended).
		this.combat.drawShockRings(frameTime)
		// Floating damage numbers, topmost so they read over sprites and rings alike.
		this.combat.drawDamageNumbers(frameTime)
		this.ctx.restore() // end world space — the HUD/overlays below are screen-fixed

		if (playing) {
			// The HUD is drawn under the view scale (still in effect here), so it uses view units.
			const view = { width: this.viewW, height: this.viewH }
			drawHud(this.ctx, view)
			// Special-power badge (glyph + recharge wipe), or nothing until one is earned.
			const pw = this.player.power
			drawPowerHud(
				this.ctx,
				view,
				pw
					? { glyph: pw.type.glyph, color: pw.type.color, charge: 1 - pw.cooldown / Math.max(1, pw.cooldownSteps) }
					: null
			)
			if (this.waveBanner > 0)
				drawWaveBanner(this.ctx, view, this.waveBanner, this.waveBannerLabel)
			// During the rest phase, prompt the player to walk back to spawn (pulsing), and
			// show the hold-charge bar once they're on the pedestal.
			if (this.intermission && !this.shopOpen)
				drawIntermissionPrompt(
					this.ctx,
					view,
					0.5 + 0.5 * Math.sin(this.promptTick * 0.08),
					this.spawnDwell / SPAWN_DWELL_MS
				)
		}
		if (this.waveBanner > 0) this.waveBanner -= frameTime
		if (this.spawnFlash > 0) this.spawnFlash -= frameTime

		this.rafId = requestAnimationFrame(this.animate)
	}
}
