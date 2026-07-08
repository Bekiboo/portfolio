import { get } from 'svelte/store'
import { Platform } from './Platform'
import { Player } from './Player'
import { Enemy } from './Enemy'
import { XpGem } from './XpGem'
import { HealthPack } from './HealthPack'
import { CreditCrate } from './CreditCrate'
import { Effect } from './Effect'
import { Portal, type PortalPlacement } from './Portal'
import { ENEMY_TYPES, type EnemyKind } from './enemyTypes'
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
import { collision } from './utils'
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
	addXp,
	gameOver,
	stopRun,
	paused as pausedStore,
	pauseGame,
	resumeGame
} from '$lib/game'
import {
	waveDuration,
	waveDef,
	waveSpawnInterval,
	waveEnemyCap,
	waveEnemySpeed,
	waveEnemyHealth,
	waveContactDamage,
	type WaveDef
} from './waves'
import { drawHud, drawPowerHud, drawWaveBanner, drawIntermissionPrompt, WAVE_BANNER_MS } from './hud'
import { nearestEnemy } from './los'
import type { Power } from './Power'
import {
	rollChoices,
	weaponChoices,
	powerChoices,
	rollShopOffers,
	type ShopOffer,
	CRIT_MULT,
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
const SHIELD_FLASH_STEPS = 12 // steps the shield break/absorb ring is drawn
const SPAWN_DWELL_MS = 1500 // how long the player must hold the spawn pedestal to launch the next wave
const SPAWN_FLASH_MS = 260 // spawn burst when the hold completes and the wave triggers
const INTERMISSION_MAGNET_MUL = 10 // pickup-radius boost during the rest so leftover gems get swept in
const MAX_ACTIVE_PORTALS = 2 // concurrent rifts on the field — keeps spawns clustered and legible
const MAX_HORDE = 6 // most enemies a single rift disgorges before it collapses
const WEAPON_MILESTONE_LEVEL = 3 // reaching this level grants a 2nd weapon (a special pick, not the shop)
const POWER_MILESTONE_LEVEL = 5 // reaching this level grants a special power on the S key (another special pick)
const SHOP_SLOTS = 3 // weapon/power offers shown at the intermission shop
const ITEM_SLOTS = 3 // passive-item offers shown on the shop's second board
const CREDIT_DROP_CHANCE = 0.08 // chance a slain enemy drops a credit crate (rare)
const CREDIT_CRATE_VALUE = 5 // credits banked per crate

// The mini-game simulation: owns the canvas, the player, the fixed-timestep loop,
// the spawn director, combat resolution and the run-scoped upgrade state. The Svelte
// component is a thin shell that mounts this and renders the modals from the reactive
// fields below (levelUpOpen / choices / rerolls). Difficulty policy lives in waves.ts,
// the upgrade table in upgrades.ts, HUD drawing in hud.ts and auto-aim in los.ts.
export class GameWorld {
	// --- Rendering context (set on mount) ---
	private canvas!: HTMLCanvasElement
	private ctx!: CanvasRenderingContext2D
	player!: Player

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
	private proceduralPlatforms: Platform[] = []
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
	private shieldRegenTimer = 0 // steps since the last hit / last regen tick
	private shieldFlash = 0 // steps left on the break/absorb ring VFX
	private shieldFlashBig = false // was the last flash a full break (bigger ring)?

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
	private shockRings: { x: number; y: number; max: number; t: number; color: string }[] = []

	// --- Wave / run timing ---
	private spawnTimer = 0
	private spawnSide = 0
	private invuln = 0
	private wasPlaying = false
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
		this.spawnPlayerOnPedestal()
		this.rafId = requestAnimationFrame(this.animate) // Start the animation loop
	}

	destroy() {
		// Stop the loop so remounting (e.g. crossing the 1024px breakpoint) doesn't
		// stack multiple animation loops.
		if (this.rafId !== null) cancelAnimationFrame(this.rafId)
		enemiesStore.clear()
		projectilesStore.clear()
		xpGemsStore.clear()
		bombsStore.clear()
		healthPacksStore.clear()
		creditCratesStore.clear()
		portalsStore.clear()
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
		this.canvasDirty = false
	}

	private collectPlatforms() {
		const collidingElements = document.querySelectorAll('[data-colliding]')
		this.platforms = []
		for (let i = 0; i < collidingElements.length; i++) {
			const el = collidingElements[i].getBoundingClientRect()
			this.platforms.push(new Platform(el.width, el.height, el.y, el.x)) // DOM: invisible
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
		const W = this.canvas.width
		const H = this.canvas.height
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
		// A themed wave can open with an elite (slow bullet-sponge): a dedicated rift tears
		// open and strides it out, so even the miniboss beat arrives through a portal.
		if (def.eliteAtStart) this.openPortalsForBatch([def.eliteAtStart])
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

	// Is the player standing on the spawn pedestal ([data-spawn], the Start/Stop button)?
	// Requires both horizontal overlap and feet near the button top, so the player can't
	// charge the hold from an arena ledge floating above it.
	private atSpawn() {
		const spawnEl = document.querySelector('[data-spawn]')
		if (!spawnEl) return true // no pedestal in the DOM → don't soft-lock the run
		const r = spawnEl.getBoundingClientRect()
		const px = this.player.pos.x + this.player.width / 2
		const feet = this.player.pos.y + this.player.height
		const nearX = px > r.x - 40 && px < r.x + r.width + 40
		const nearY = feet > r.top - 90 && feet < r.top + 30
		return nearX && nearY
	}

	// Pulsing "come here" glow over the spawn pedestal during the rest, tightening and
	// brightening as the hold charges. Drawn on the canvas so it sits on the focus veil.
	private drawSpawnGlow() {
		const spawnEl = document.querySelector('[data-spawn]')
		if (!spawnEl) return
		const r = spawnEl.getBoundingClientRect()
		const cx = r.x + r.width / 2
		const cy = r.y + r.height / 2
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
		const spawnEl = document.querySelector('[data-spawn]')
		if (!spawnEl) return
		const r = spawnEl.getBoundingClientRect()
		const cx = r.x + r.width / 2
		const cy = r.y + r.height / 2
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
	private queueLevelUps(n: number) {
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
	private itemsOnKill(enemy: Enemy) {
		for (const it of this.items) it.type.onKill?.(this, enemy, it)
	}
	private itemsOnHit(enemy: Enemy, dmg: number) {
		for (const it of this.items) it.type.onHit?.(this, enemy, dmg, it)
	}
	private itemsOnDamaged(amount: number) {
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

	// --- Spawn director -------------------------------------------------------
	// A wall-flush perch ledge with no turret currently riding it (so two turrets don't
	// stack on the same edge). null if every perch is taken or the layout has none.
	private freeEdgePerch(): Platform | null {
		const perches = this.proceduralPlatforms.filter((p) => p.edge)
		const free = perches.filter(
			(p) =>
				!enemiesStore.list.some(
					(e) => e.perched && e.pos.x + e.width / 2 >= p.left && e.pos.x + e.width / 2 <= p.left + p.width
				)
		)
		return free.length ? free[Math.floor(Math.random() * free.length)] : null
	}

	private spawnEnemy(kind: EnemyKind) {
		const w = get(wave)
		const t = ENEMY_TYPES[kind]
		// Turrets ride a wall-flush perch when one is free: dropped onto the edge ledge, they
		// can't fall and just fire inward (perched behaviour in Enemy.#updateTurret). With no
		// free perch they fall back to the rolling floor turret below.
		if (kind === 'turret') {
			const perch = this.freeEdgePerch()
			if (perch) {
				const px = perch.edge === 'left' ? perch.left : perch.left + perch.width - t.width
				const enemy = new Enemy(
					{ x: px, y: perch.top - t.height },
					{ kind, speed: 0, health: waveEnemyHealth(kind, w), damage: waveContactDamage(kind, w) }
				)
				enemy.perched = true
				enemiesStore.add(enemy)
				return
			}
		}
		// Alternate the side each enemy walks/flies in from.
		const fromLeft = this.spawnSide++ % 2 === 0
		// 'onscreen' kinds (the anchored turret) deploy in view; the rest enter from
		// off the nearest side.
		const x =
			t.spawnX === 'onscreen'
				? this.canvas.width * (0.15 + Math.random() * 0.7)
				: fromLeft
					? -60
					: this.canvas.width + 60
		// 'air' kinds enter high in an altitude band; ground kinds at floor level —
		// offset by their own height so a tall brute doesn't spawn sunk into the floor.
		const y =
			t.spawnY === 'air' ? this.canvas.height * (t.altitude ?? 0.32) : this.canvas.height - t.height
		// Chase kinds scale speed with the wave (waveSpeedMul); fixed kinds use their base.
		const speed = t.waveSpeedMul != null ? waveEnemySpeed(w) * t.waveSpeedMul : t.speed
		enemiesStore.add(
			new Enemy(
				{ x, y },
				{ kind, speed, health: waveEnemyHealth(kind, w), damage: waveContactDamage(kind, w) }
			)
		)
	}

	// --- Portal-based spawning ------------------------------------------------
	// Enemies no longer trickle in one-by-one from the edges. On each spawn tick the director
	// assembles a small BATCH (up to MAX_HORDE) using the same floors/deficit/ground brain as
	// before, then tears open a rift to carry it: air kinds get an air rift, ground kinds a
	// ground rift, turrets keep perching directly. The rift telegraphs, then pours the pack
	// out — clustered and readable instead of scattered.
	private countKind(k: EnemyKind) {
		return enemiesStore.list.filter((e) => e.kind === k).length
	}

	// Enemies still queued inside open rifts (not yet materialised). Counted toward the field
	// so the director doesn't overfill while a telegraph is still winding up.
	private queuedCount(k?: EnemyKind) {
		let n = 0
		for (const p of portalsStore.list) n += k ? p.queue.filter((q) => q === k).length : p.queue.length
		return n
	}

	// Pick the single best kind to add given the live field, the rifts' pending queues, and a
	// `projected` tally of what's already in the batch being assembled. Unmet pressure floors
	// win first (weighted by how far below target they sit, so a totally-absent bomber isn't
	// starved by a flyer that's only one short); otherwise draw fodder from the theme's ground
	// pool (repeats weight the odds — ['biker','biker','charger'] is 2:1 bikers).
	private pickSpawnKind(def: WaveDef, projected: Map<EnemyKind, number>): EnemyKind | null {
		const total = (k: EnemyKind) => this.countKind(k) + this.queuedCount(k) + (projected.get(k) ?? 0)
		const deficits = Object.entries(def.floors ?? {})
			.map(([kind, target]) => ({ kind: kind as EnemyKind, need: target - total(kind as EnemyKind) }))
			.filter((p) => p.need > 0)
		if (deficits.length) {
			let r = Math.random() * deficits.reduce((s, p) => s + p.need, 0)
			let chosen = deficits[deficits.length - 1].kind // guard against FP undershoot
			for (const p of deficits) {
				r -= p.need
				if (r < 0) {
					chosen = p.kind
					break
				}
			}
			return chosen
		}
		return def.ground.length ? def.ground[Math.floor(Math.random() * def.ground.length)] : null
	}

	// Keep the field topped up to the wave cap. While a rift can still be opened and the field
	// (live + queued) is under cap, assemble a batch and open rift(s) for it. If the field is
	// capped but a pressure floor is unmet, retire the ground unit stuck furthest below a
	// camping player and open a small rift for the missing vector — no spot stays safe.
	private spawnFromBudget() {
		const def = waveDef(get(wave))
		if (portalsStore.list.length >= MAX_ACTIVE_PORTALS) return // let the open rifts finish first
		const effective = enemiesStore.list.length + this.queuedCount()
		if (effective >= def.cap) {
			this.cullForMissingFloor(def)
			return
		}
		const room = Math.min(def.cap - effective, MAX_HORDE)
		const projected = new Map<EnemyKind, number>()
		const batch: EnemyKind[] = []
		for (let i = 0; i < room; i++) {
			const kind = this.pickSpawnKind(def, projected)
			if (!kind) break
			batch.push(kind)
			projected.set(kind, (projected.get(kind) ?? 0) + 1)
		}
		if (batch.length) this.openPortalsForBatch(batch)
	}

	// Field is capped and a pressure floor is still unmet: cull the stuck camper and rift in
	// the missing vector.
	private cullForMissingFloor(def: WaveDef) {
		const total = (k: EnemyKind) => this.countKind(k) + this.queuedCount(k)
		const missing = Object.entries(def.floors ?? {})
			.map(([kind, target]) => ({ kind: kind as EnemyKind, need: target - total(kind as EnemyKind) }))
			.filter((p) => p.need > 0)
		if (!missing.length) return
		let stuck: Enemy | null = null
		let worst = -Infinity
		for (const e of enemiesStore.list) {
			if (!ENEMY_TYPES[e.kind].cullable) continue
			const below = e.pos.y - this.player.pos.y
			if (below > worst) {
				worst = below
				stuck = e
			}
		}
		if (stuck) {
			enemiesStore.delete(stuck)
			this.openPortalsForBatch([missing[0].kind])
		}
	}

	// Split a batch by placement and open the rift(s) to carry it. Turrets don't ride portals —
	// they perch directly (a single, readable unit, not part of the dispersal problem).
	private openPortalsForBatch(batch: EnemyKind[]) {
		const air: EnemyKind[] = []
		const ground: EnemyKind[] = []
		for (const k of batch) {
			if (k === 'turret') this.spawnEnemy('turret')
			else if (ENEMY_TYPES[k].spawnY === 'air') air.push(k)
			else ground.push(k)
		}
		if (air.length) this.openPortal('air', air)
		if (ground.length) this.openPortal('ground', ground)
	}

	// Choose where a rift tears open. Air rifts hover in the altitude band on an alternating
	// side; ground rifts sit at floor level at a screen edge (preferred), or sometimes ride a
	// visible ledge (edge perches first) so a pack can drop in from a platform.
	private pickPortalSite(placement: PortalPlacement): { pos: { x: number; y: number }; anchor: Platform | null } {
		const W = this.canvas.width
		const H = this.canvas.height
		const fromLeft = this.spawnSide++ % 2 === 0
		if (placement === 'air') {
			return { pos: { x: fromLeft ? W * 0.14 : W * 0.86, y: H * 0.3 }, anchor: null }
		}
		const ledges = this.proceduralPlatforms.filter((p) => p.visible)
		if (ledges.length && Math.random() < 0.35) {
			const perches = ledges.filter((p) => p.edge)
			const pool = perches.length ? perches : ledges
			const ledge = pool[Math.floor(Math.random() * pool.length)]
			return { pos: { x: ledge.left + ledge.width / 2, y: ledge.top - 4 }, anchor: ledge }
		}
		return { pos: { x: fromLeft ? 44 : W - 44, y: H - 30 }, anchor: null }
	}

	private openPortal(placement: PortalPlacement, kinds: EnemyKind[]) {
		const { pos, anchor } = this.pickPortalSite(placement)
		// Ground rifts rise out of their surface (a ledge top, else the canvas floor); air rifts
		// float free (null). Keeps the rift from sinking under the ground or a passerelle.
		const baseY = placement === 'air' ? null : anchor ? anchor.top : this.canvas.height
		portalsStore.add(new Portal(pos, placement, kinds, anchor, baseY))
	}

	// Build a wave-scaled Enemy of `kind` at (x, y). Shared by the rift emitter and the direct
	// turret spawn so toughness/speed ramps stay in one place.
	private makeEnemy(kind: EnemyKind, x: number, y: number): Enemy {
		const w = get(wave)
		const t = ENEMY_TYPES[kind]
		const speed = t.waveSpeedMul != null ? waveEnemySpeed(w) * t.waveSpeedMul : t.speed
		return new Enemy(
			{ x, y },
			{ kind, speed, health: waveEnemyHealth(kind, w), damage: waveContactDamage(kind, w) }
		)
	}

	// A rift released a unit: drop it into the world at the rift's mouth (centred for air,
	// on the ledge for a platform rift, at floor level otherwise) and let it behave normally.
	private materializeFromPortal(portal: Portal, kind: EnemyKind) {
		const t = ENEMY_TYPES[kind]
		let x: number
		let y: number
		if (portal.placement === 'air') {
			x = portal.pos.x - t.width / 2
			y = portal.pos.y - t.height / 2
		} else if (portal.anchor) {
			const a = portal.anchor
			x = Math.min(Math.max(a.left, portal.pos.x - t.width / 2), a.left + a.width - t.width)
			y = a.top - t.height
		} else {
			x = portal.pos.x - t.width / 2
			y = this.canvas.height - t.height
		}
		enemiesStore.add(this.makeEnemy(kind, x, y))
	}

	// Advance every open rift, materialise whatever it emits this frame, and retire the ones
	// that have finished collapsing.
	private updatePortals(frameTime: number) {
		for (const portal of portalsStore.list.slice()) {
			for (const kind of portal.update(frameTime)) this.materializeFromPortal(portal, kind)
			if (portal.done) portalsStore.delete(portal)
		}
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

	// A blast at (cx, cy): damage + knockback every enemy within `radius`, spawn an expanding
	// ring + a burst puff. Shared by nova (instant) and slam (on landing). A killing blow drops
	// its gem/score the same way a bolt would — enemy.hit self-removes and onEnemyKilled banks.
	// Public so passive items (thorns, explosive) can trigger their own blasts through the same path.
	shockwave(cx: number, cy: number, radius: number, damage: number, knockback: number, color: string) {
		this.shockRings.push({ x: cx, y: cy, max: radius, t: 1, color })
		effectsStore.add(new Effect({ x: cx, y: cy }, 'smoke_14', { centered: true }))
		for (const enemy of enemiesStore.list.slice()) {
			if (enemy.health <= 0) continue // already killed this chain — don't double-count the kill
			const ex = enemy.pos.x + enemy.width / 2
			const ey = enemy.pos.y + enemy.height / 2
			const d = Math.hypot(ex - cx, ey - cy)
			if (d > radius) continue
			const nx = (ex - cx) / (d || 1)
			enemy.pos.x += nx * knockback
			enemy.pos.y -= knockback * 0.3 // a little upward pop for feel
			if (damage > 0 && enemy.hit(damage)) this.onEnemyKilled(enemy)
		}
	}

	// Age and draw the blast rings (nova / slam). Purely visual; expands and fades over ~0.32s.
	private drawShockRings(frameTime: number) {
		for (let i = this.shockRings.length - 1; i >= 0; i--) {
			const ring = this.shockRings[i]
			ring.t -= frameTime / 320
			if (ring.t <= 0) {
				this.shockRings.splice(i, 1)
				continue
			}
			const grow = 0.45 + (1 - ring.t) * 0.95 // 45% → ~140% of the blast radius
			this.ctx.save()
			this.ctx.globalAlpha = Math.max(0, ring.t)
			this.ctx.strokeStyle = ring.color
			this.ctx.lineWidth = 4
			this.ctx.beginPath()
			this.ctx.arc(ring.x, ring.y, ring.max * grow, 0, Math.PI * 2)
			this.ctx.stroke()
			this.ctx.restore()
		}
	}

	// Life Steal stat: a connecting bolt has `lifeStealChance` to heal 1 HP (capped at max).
	// Chance-based rather than per-hit flat so the many small bolts don't trivialise survival.
	private tryLifeSteal() {
		if (this.lifeStealChance <= 0) return
		if (get(playerHp) >= get(maxHp)) return
		if (Math.random() < this.lifeStealChance) {
			playerHp.update((h) => Math.min(get(maxHp), h + 1))
		}
	}

	// Enemy took a lethal hit: bank score, drop its XP gem (falls under gravity) and,
	// while the player is hurt, maybe a med-kit.
	private onEnemyKilled(enemy: Enemy) {
		score.update((s) => s + 1)
		xpGemsStore.add(
			new XpGem(
				{ x: enemy.pos.x + enemy.width / 2 - 7, y: enemy.pos.y + enemy.height / 2 },
				{ value: enemy.xpValue }
			)
		)
		// Luck raises every drop chance (Brotato-style): med-kits and credit crates roll at
		// (base × (1 + luck)).
		const luckMul = 1 + this.luck
		if (get(playerHp) < get(maxHp) && Math.random() < ENEMY_TYPES[enemy.kind].medkitDrop * luckMul) {
			healthPacksStore.add(
				new HealthPack({ x: enemy.pos.x + enemy.width / 2 - 9, y: enemy.pos.y + enemy.height / 2 })
			)
		}
		// Rare credit crate — the shop currency (banked on walk-over, spent at the intermission).
		if (Math.random() < CREDIT_DROP_CHANCE * luckMul) {
			creditCratesStore.add(
				new CreditCrate(
					{ x: enemy.pos.x + enemy.width / 2 - 10, y: enemy.pos.y + enemy.height / 2 },
					{ value: CREDIT_CRATE_VALUE }
				)
			)
		}
		// Passive items react to the kill last (an explosive relic may chain into more kills — the
		// shockwave/resolveHits health guards keep a chain from re-banking an already-dead enemy).
		this.itemsOnKill(enemy)
	}

	// Bullet → enemy hits. Snapshot both pools first: delete() swaps the store arrays
	// mid-loop, so iterate copies (the old writable froze the loop the same way).
	private resolveHits() {
		const projs = projectilesStore.list.slice()
		const foes = enemiesStore.list.slice()
		if (!projs.length || !foes.length) return
		for (const projectile of projs) {
			if (projectile.hostile) continue // enemy shots don't hit enemies
			const projRect = {
				width: projectile.width,
				height: projectile.height,
				top: projectile.pos.y - projectile.height / 2,
				left: projectile.pos.x - projectile.width / 2
			}
			for (const enemy of foes) {
				if (enemy.health <= 0) continue // killed earlier this frame (e.g. an item chain) — skip
				const enemyRect = {
					width: enemy.width,
					height: enemy.height,
					top: enemy.pos.y,
					left: enemy.pos.x
				}
				if (collision(enemyRect, projRect)) {
					// Global stats layer over the bolt's own damage: +Damage flat, then a Crit
					// roll for CRIT_MULT×. A killing bolt drops XP (tumbles under gravity, so the
					// player must leave a safe perch to bank it) and, while hurt, maybe a med-kit.
					let dmg = projectile.damage + this.bonusDamage
					if (this.critChance > 0 && Math.random() < this.critChance) {
						dmg = Math.round(dmg * CRIT_MULT)
						effectsStore.add(
							new Effect(
								{ x: enemy.pos.x + enemy.width / 2, y: enemy.pos.y + enemy.height / 2 },
								'smoke_14',
								{ centered: true }
							)
						)
					}
					if (enemy.hit(dmg)) this.onEnemyKilled(enemy)
					else this.itemsOnHit(enemy, dmg) // a survivor was struck (items may react)
					this.tryLifeSteal() // a connecting bolt may heal (Life Steal stat)
					projectilesStore.delete(projectile)
					break
				}
			}
		}
	}

	// Take `amount` damage + i-frames; 0 HP ends the run. Shared by contact, shots
	// and bomb blasts (each passes its own scaled damage). The base shield soaks the hit
	// first: a charge is spent (no HP lost) and the bubble breaks briefly instead.
	private damagePlayer(amount = 1) {
		// Dodge (Brotato): a per-hit roll to avoid the hit entirely. No i-frames granted, so each
		// overlapping step rolls fresh — a high-dodge build flickers through contact.
		if (this.dodgeChance > 0 && Math.random() < this.dodgeChance) {
			effectsStore.add(new Effect({ x: this.player.pos.x, y: this.player.pos.y + 28 }, 'smoke_12'))
			return
		}
		this.shieldRegenTimer = 0 // any incoming damage stalls shield regen
		if (this.shieldCharges > 0) {
			this.shieldCharges--
			this.invuln = this.invulnSteps
			this.shieldFlash = SHIELD_FLASH_STEPS
			this.shieldFlashBig = this.shieldCharges === 0 // full break reads bigger
			return
		}
		// Armor reduces the damage that reaches HP, but a hit always lands for at least 1 so it
		// still stings (matters most against the bigger late-wave hits).
		const dealt = Math.max(1, Math.round(amount * (1 - this.armorReduction)))
		const hp = get(playerHp) - dealt
		playerHp.set(hp)
		this.invuln = this.invulnSteps
		effectsStore.add(new Effect({ x: this.player.pos.x, y: this.player.pos.y + 28 }, 'smoke_12'))
		this.itemsOnDamaged(dealt) // reactive items (thorns) fire on a real HP loss
		if (hp <= 0) gameOver()
	}

	// Regenerate the shield: one charge every shieldRegenSteps while below max and not
	// recently hit (damagePlayer resets the timer). The flash VFX ticks down each step.
	private updateShield() {
		if (this.shieldFlash > 0) this.shieldFlash--
		if (this.shieldCharges >= this.shieldMax) return
		this.shieldRegenTimer++
		if (this.shieldRegenTimer >= this.shieldRegenSteps) {
			this.shieldCharges++
			this.shieldRegenTimer = 0
		}
	}

	// Draw the shield bubble around the player (interpolated position): a steady faint
	// ring while it has charges, plus an expanding burst on a break/absorb.
	private drawShield(alpha: number) {
		const px = this.player.prevPos.x + (this.player.pos.x - this.player.prevPos.x) * alpha
		const py = this.player.prevPos.y + (this.player.pos.y - this.player.prevPos.y) * alpha
		const cx = px + this.player.width / 2
		const cy = py + this.player.height / 2
		const baseR = this.player.width * 0.72
		const ctx = this.ctx
		if (this.shieldFlash > 0) {
			const t = 1 - this.shieldFlash / SHIELD_FLASH_STEPS // 0 → 1 over the burst
			ctx.save()
			ctx.globalAlpha = Math.max(0, 1 - t)
			ctx.strokeStyle = '#67e8f9' // cyan-300
			ctx.lineWidth = this.shieldFlashBig ? 4 : 2
			ctx.beginPath()
			ctx.arc(cx, cy, baseR + (this.shieldFlashBig ? 42 : 22) * t, 0, Math.PI * 2)
			ctx.stroke()
			ctx.restore()
		}
		if (this.shieldCharges > 0) {
			const strength = this.shieldCharges / Math.max(1, this.shieldMax)
			ctx.save()
			ctx.strokeStyle = '#38bdf8' // sky-400
			ctx.shadowColor = '#38bdf8'
			ctx.shadowBlur = 8
			ctx.lineWidth = 2
			ctx.globalAlpha = 0.14 + 0.16 * strength
			ctx.beginPath()
			ctx.arc(cx, cy, baseR, 0, Math.PI * 2)
			ctx.stroke()
			ctx.globalAlpha = 0.05 + 0.05 * strength // faint fill so it reads as a bubble
			ctx.fillStyle = '#38bdf8'
			ctx.fill()
			ctx.restore()
		}
	}

	// Enemy contact → player takes a hit (unless in i-frames).
	private resolvePlayerDamage() {
		if (this.invuln > 0) return
		const playerRect = {
			width: this.player.width,
			height: this.player.height,
			top: this.player.pos.y,
			left: this.player.pos.x
		}
		for (const enemy of enemiesStore.list) {
			// Some kinds (the turret) are harmless to touch — only their bolts bite.
			if (ENEMY_TYPES[enemy.kind].contactDamage === false) continue
			const enemyRect = {
				width: enemy.width,
				height: enemy.height,
				top: enemy.pos.y,
				left: enemy.pos.x
			}
			if (collision(playerRect, enemyRect)) {
				this.damagePlayer(enemy.damage)
				break
			}
		}
	}

	// Hostile bolt hits the player → a hit, and the bolt is spent.
	private resolveEnemyShots() {
		if (this.invuln > 0) return
		const playerRect = {
			width: this.player.width,
			height: this.player.height,
			top: this.player.pos.y,
			left: this.player.pos.x
		}
		for (const projectile of projectilesStore.list) {
			if (!projectile.hostile) continue
			const projRect = {
				width: projectile.width,
				height: projectile.height,
				top: projectile.pos.y - projectile.height / 2,
				left: projectile.pos.x - projectile.width / 2
			}
			if (collision(playerRect, projRect)) {
				this.damagePlayer(projectile.damage)
				projectilesStore.delete(projectile)
				break
			}
		}
	}

	// A detonating bomb hits the player once (a single AoE check on the first step
	// of its explosion). Mark it resolved even during i-frames so an old blast can
	// never carry over and hit after the i-frames lapse.
	private resolveBombs() {
		for (const bomb of bombsStore.list) {
			if (bomb.state !== 'exploding' || bomb.damageApplied) continue
			bomb.damageApplied = true
			if (this.invuln > 0) continue
			const dx = this.player.pos.x + this.player.width / 2 - bomb.centerX
			const dy = this.player.pos.y + this.player.height / 2 - bomb.centerY
			if (Math.hypot(dx, dy) <= bomb.blastRadius) this.damagePlayer(bomb.damage)
		}
	}

	// Walk over a dropped gem (the pickup magnet eases the last few pixels) to bank
	// its XP. Uncollected gems expire on the floor, so a pure camper forfeits them.
	private resolveGemPickups() {
		const gems = xpGemsStore.list.slice()
		if (!gems.length) return
		const playerRect = {
			width: this.player.width,
			height: this.player.height,
			top: this.player.pos.y,
			left: this.player.pos.x
		}
		for (const gem of gems) {
			const gemRect = { width: gem.width, height: gem.height, top: gem.pos.y, left: gem.pos.x }
			if (collision(playerRect, gemRect)) {
				const ups = addXp(gem.value * this.xpMul)
				if (ups > 0) this.queueLevelUps(ups)
				xpGemsStore.delete(gem)
			}
		}
	}

	// Walk over a med-kit to heal — only while hurt, so a full-HP player leaves it on
	// the ground to grab later. Uncollected kits expire.
	private resolveHealthPickups() {
		const packs = healthPacksStore.list.slice()
		if (!packs.length || get(playerHp) >= get(maxHp)) return
		const playerRect = {
			width: this.player.width,
			height: this.player.height,
			top: this.player.pos.y,
			left: this.player.pos.x
		}
		for (const pack of packs) {
			const packRect = { width: pack.width, height: pack.height, top: pack.pos.y, left: pack.pos.x }
			if (collision(playerRect, packRect)) {
				playerHp.update((h) => Math.min(get(maxHp), h + pack.heal))
				effectsStore.add(new Effect({ x: pack.pos.x, y: pack.pos.y }, 'smoke_12'))
				healthPacksStore.delete(pack)
			}
		}
	}

	// Walk over a credit crate to bank its value (no magnet — a deliberate detour). Collectable
	// any time the run is live, including on the walk back to the shop during the intermission.
	private resolveCreditPickups() {
		const crates = creditCratesStore.list.slice()
		if (!crates.length) return
		const playerRect = {
			width: this.player.width,
			height: this.player.height,
			top: this.player.pos.y,
			left: this.player.pos.x
		}
		for (const crate of crates) {
			const crateRect = { width: crate.width, height: crate.height, top: crate.pos.y, left: crate.pos.x }
			if (collision(playerRect, crateRect)) {
				credits.update((c) => c + crate.value)
				effectsStore.add(new Effect({ x: crate.pos.x, y: crate.pos.y }, 'smoke_12'))
				creditCratesStore.delete(crate)
			}
		}
	}

	// --- The loop -------------------------------------------------------------
	private animate = (timestamp: number) => {
		if (this.lastTime === 0) this.lastTime = timestamp
		const frameTime = Math.min(timestamp - this.lastTime, MAX_FRAME_TIME)
		this.lastTime = timestamp

		if (this.canvasDirty) this.resizeCanvas()
		if (this.platformsDirty) this.collectPlatforms()

		const playing = get(gameStatus) === 'playing'

		// On the rising edge of a run, clear the field and reset upgrades. The player
		// keeps its current position — no teleport onto the pedestal.
		if (playing && !this.wasPlaying) {
			enemiesStore.clear()
			projectilesStore.clear()
			xpGemsStore.clear()
			bombsStore.clear()
			healthPacksStore.clear()
			creditCratesStore.clear()
			portalsStore.clear()
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
			keys.power = false
			this.spawnTimer = 0
			this.invuln = 0
			this.waveTimer = 0
			this.intermission = false
			this.spawnDwell = 0
			this.spawnFlash = 0
			this.pendingPlatforms = []
			this.proceduralPlatforms = this.buildLayout() // fresh arena for wave 1
			this.platformsDirty = true
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
				this.updatePortals(frameTime)
				this.waveTimer += frameTime
				if (this.waveTimer >= waveDuration(get(wave))) {
					// Combat over: clear the field, spawn a new arena, and wait for the
					// player to return to spawn (startNextWave advances the wave counter).
					this.enterIntermission()
				} else {
					this.spawnTimer += frameTime
					if (this.spawnTimer >= waveSpawnInterval(get(wave))) {
						this.spawnFromBudget()
						this.spawnTimer = 0
					}
				}
			}
		} else if (!playing) {
			if (enemiesStore.list.length) enemiesStore.clear()
			if (projectilesStore.list.length) projectilesStore.clear()
			if (xpGemsStore.list.length) xpGemsStore.clear()
			if (bombsStore.list.length) bombsStore.clear()
			if (healthPacksStore.list.length) healthPacksStore.clear()
			if (creditCratesStore.list.length) creditCratesStore.clear()
			if (portalsStore.list.length) portalsStore.clear()
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
			keys.power = false
		}

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
					.forEach((gem) => gem.update(this.canvas, this.player, this.platforms, STEP_DELTA, magnet))
				if (playing)
					enemiesStore.list.forEach((enemy) =>
						enemy.update(this.canvas, this.player, this.platforms, STEP_DELTA, enemiesStore.list)
					)
				if (playing)
					bombsStore.list
						.slice()
						.forEach((bomb) => bomb.update(this.canvas, this.platforms, STEP_DELTA))
				if (playing)
					healthPacksStore.list
						.slice()
						.forEach((pack) => pack.update(this.canvas, this.platforms, STEP_DELTA))
				if (playing)
					creditCratesStore.list
						.slice()
						.forEach((crate) => crate.update(this.canvas, this.platforms, STEP_DELTA))
				this.player.update(this.canvas, keys, this.platforms, STEP_DELTA)
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
					this.resolveHits()
					this.resolveGemPickups()
					this.resolveHealthPickups()
					this.resolveCreditPickups()
					if (this.regenPerStep > 0) this.applyRegen()
					this.updateShield()
					if (this.invuln > 0) this.invuln--
					this.resolvePlayerDamage()
					this.resolveEnemyShots()
					this.resolveBombs()
				}
			}
			this.accumulator -= FIXED_STEP
		}
		// Freeze interpolation + sprite animation while paused so entities hold still.
		const alpha = paused ? 1 : this.accumulator / FIXED_STEP
		const animDelta = paused ? 0 : frameTime / 12

		// Render once per frame, interpolating entities between their last two steps.
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
		// Focus mode: ease a dark veil over the page behind the sprites while playing.
		this.dimAlpha += ((playing ? 0.5 : 0) - this.dimAlpha) * 0.12
		if (this.dimAlpha > 0.01) {
			this.ctx.fillStyle = `rgba(2, 6, 23, ${this.dimAlpha})`
			this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
			// Keep the interactive platforms (section titles, buttons) at full
			// brightness by punching the veil out over their rects — only the
			// surrounding CV dims. Skip the procedural ledges: there's no CV under them,
			// so clearing would show a bright hole instead — they draw over the veil.
			for (const p of this.platforms)
				if (!p.visible) this.ctx.clearRect(p.left, p.top, p.width, p.height)
		}
		for (const platform of this.platforms) platform.draw(this.ctx)
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
		if (playing) this.drawShield(alpha)
		// Passive items with a visual (drones) draw over the player.
		if (playing) this.itemsDraw(alpha)
		// Snapshot: Effect.draw() self-removes from the live pool when its animation ends.
		effectsStore.list.slice().forEach((effect: Effect) => effect.draw(this.ctx))
		// Nova / slam blast rings, over everything (age out even if the run just ended).
		this.drawShockRings(frameTime)

		if (playing) {
			drawHud(this.ctx, this.canvas)
			// Special-power badge (glyph + recharge wipe), or nothing until one is earned.
			const pw = this.player.power
			drawPowerHud(
				this.ctx,
				this.canvas,
				pw
					? { glyph: pw.type.glyph, color: pw.type.color, charge: 1 - pw.cooldown / Math.max(1, pw.cooldownSteps) }
					: null
			)
			if (this.waveBanner > 0)
				drawWaveBanner(this.ctx, this.canvas, this.waveBanner, this.waveBannerLabel)
			// During the rest phase, prompt the player to walk back to spawn (pulsing), and
			// show the hold-charge bar once they're on the pedestal.
			if (this.intermission && !this.shopOpen)
				drawIntermissionPrompt(
					this.ctx,
					this.canvas,
					0.5 + 0.5 * Math.sin(this.promptTick * 0.08),
					this.spawnDwell / SPAWN_DWELL_MS
				)
		}
		if (this.waveBanner > 0) this.waveBanner -= frameTime
		if (this.spawnFlash > 0) this.spawnFlash -= frameTime

		this.rafId = requestAnimationFrame(this.animate)
	}
}
