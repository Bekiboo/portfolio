// Data-driven enemy registry: one entry per kind (stats, look, behaviour, spawn, drops).
// WHEN/HOW MANY each appears is authored per-wave in waves.ts. Adding a kind = one entry
// below (+ a new movement fn + dispatch case in Enemy.ts only if it needs a new pattern).

export type EnemyKind = 'biker' | 'flyer' | 'shooter' | 'bomber' | 'turret' | 'charger' | 'brute'

// Movement pattern; several kinds can share one (biker + brute → 'ground'). Enemy.ts maps each to a routine.
export type Behavior = 'ground' | 'flyer' | 'shooter' | 'bomber' | 'turret' | 'charger'

// Horizontal spawn origin: walk in from nearest side, or deploy on-screen (turret).
export type SpawnX = 'side' | 'onscreen'
// Vertical spawn origin: floor level, or up in an altitude band (flyer/bomber).
export type SpawnY = 'floor' | 'air'

export interface EnemyType {
	// --- Combat baselines (director scales these up by wave) ---
	health: number // base HP before the per-wave toughness ramp
	speed: number // fixed move speed (unless `waveSpeedMul` is set)
	waveSpeedMul?: number // if set, spawn speed = waveEnemySpeed(w) * this (chase kinds)
	damage: number // fallback contact/shot damage (constructor default)
	contactBase: number // base contact damage before the per-wave ramp
	contactDamage?: boolean // does its body hurt the player? (default true; turret false — only bolts bite)
	xp: number // gem value dropped on death

	// --- Hitbox + look ---
	width: number
	height: number
	// Character sheets (48×80) draw width*scale × height*scale from top-left. Gadget sheets
	// (48×48) draw frame*scale (aspect-correct), anchored per `spriteAnchor`.
	spriteScale: number
	sprite: 'biker' | 'cyborg' | 'drone' | 'turret'
	spriteAnchor?: 'topLeft' | 'foot' | 'center' // default 'topLeft'; 'foot' floor gadget, 'center' hover gadget

	// --- Simulation ---
	behavior: Behavior
	gravity: boolean // does it fall? (flyer/bomber hover, so false)
	patrol: boolean // start with horizontal velocity? (bomber cruises)
	separates: boolean // pushed apart from neighbours? (anchored/hover kinds don't)
	separatesVertically: boolean // spread on the Y axis too? (flyers only)
	fireInterval?: number // steps between shots/drops (shooter/turret/bomber)

	// --- Spawn placement ---
	spawnX: SpawnX
	spawnY: SpawnY
	altitude?: number // spawnY 'air': fraction of canvas height (default 0.32)

	// --- Wave director (composition is in waves.ts; these are the only runtime hooks) ---
	cullable?: boolean // interchangeable fodder the director may retire to free a slot
	medkitDrop: number // chance to drop a med-kit on death (while player is hurt)
}

export const ENEMY_TYPES: Record<EnemyKind, EnemyType> = {
	// Close-range fodder baseline. Slow (low waveSpeedMul): pressure is numbers, not speed.
	biker: {
		health: 40, speed: 2.4, waveSpeedMul: 0.8, damage: 1, contactBase: 1, xp: 1,
		width: 48, height: 80, spriteScale: 2, sprite: 'biker',
		behavior: 'ground', gravity: true, patrol: false, separates: true, separatesVertically: false,
		spawnX: 'side', spawnY: 'floor', cullable: true, medkitDrop: 0.05
	},
	// Homing air unit — no perch is safe.
	flyer: {
		health: 4, speed: 2.0, waveSpeedMul: 0.8, damage: 1, contactBase: 1, xp: 1,
		width: 48, height: 80, spriteScale: 2, sprite: 'cyborg',
		behavior: 'flyer', gravity: false, patrol: false, separates: true, separatesVertically: true,
		spawnX: 'side', spawnY: 'air', altitude: 0.32, medkitDrop: 0.05
	},
	// Standoff gunner — peppers perches out of melee reach.
	shooter: {
		health: 4, speed: 1.6, damage: 1, contactBase: 1, xp: 1,
		width: 48, height: 80, spriteScale: 2, sprite: 'cyborg',
		behavior: 'shooter', gravity: true, patrol: false, separates: true, separatesVertically: false,
		fireInterval: 110, spawnX: 'side', spawnY: 'floor', medkitDrop: 0.05
	},
	// Nimble rusher — closes then dashes; punishes standing still.
	charger: {
		health: 4, speed: 2.2, waveSpeedMul: 1.05, damage: 1, contactBase: 1, xp: 1,
		width: 44, height: 76, spriteScale: 1.9, sprite: 'cyborg',
		behavior: 'charger', gravity: true, patrol: false, separates: true, separatesVertically: false,
		spawnX: 'side', spawnY: 'floor', cullable: true, medkitDrop: 0.05
	},
	// Rolling turret — trundles in, stops, speeds its idle as a tell, then fires a fan of
	// bolts toward its cannon side. Body harmless (contactDamage:false); only bolts bite.
	turret: {
		health: 12, speed: 0, damage: 1, contactBase: 1, contactDamage: false, xp: 2,
		width: 52, height: 44, spriteScale: 2, sprite: 'turret', spriteAnchor: 'foot',
		behavior: 'turret', gravity: true, patrol: false, separates: false, separatesVertically: false,
		spawnX: 'side', spawnY: 'floor', medkitDrop: 0.12
	},
	// Hovering bomber (drone) — patrols overhead, rains area bombs, tanky.
	bomber: {
		health: 14, speed: 1.4, damage: 2, contactBase: 2, xp: 2,
		width: 46, height: 40, spriteScale: 1.9, sprite: 'drone', spriteAnchor: 'center',
		behavior: 'bomber', gravity: false, patrol: true, separates: false, separatesVertically: false,
		fireInterval: 150, spawnX: 'side', spawnY: 'air', altitude: 0.32, medkitDrop: 0.12
	},
	// Elite brute — big, slow, heavy contact hit, fat gem. Opened via `eliteAtStart` in waves.ts.
	brute: {
		health: 50, speed: 1.3, damage: 2, contactBase: 2, xp: 3,
		width: 64, height: 104, spriteScale: 2.3, sprite: 'cyborg',
		behavior: 'ground', gravity: true, patrol: false, separates: true, separatesVertically: false,
		spawnX: 'side', spawnY: 'floor', medkitDrop: 0.5
	}
}
