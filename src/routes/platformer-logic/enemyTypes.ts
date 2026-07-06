// Data-driven enemy registry. Everything that used to be scattered across Enemy.ts
// (stats, look, movement behaviour, separation) AND GameWrapper (spawn placement,
// speed profile, drop table) lives here in one entry per kind. WHEN and HOW MANY of each
// kind appears is not here — that's authored per-wave in waves.ts (the WaveDef table).
// Adding an enemy = one entry below (plus a new movement function + dispatch case in
// Enemy.ts *only* if it needs a genuinely new pattern; kinds that reuse an existing
// `behavior` need zero code changes), then reference it from a wave in waves.ts.

export type EnemyKind = 'biker' | 'flyer' | 'shooter' | 'bomber' | 'turret' | 'charger' | 'brute'

// Movement pattern. Several kinds can share one (biker + brute → 'ground'); Enemy.ts
// maps each to an update routine.
export type Behavior = 'ground' | 'flyer' | 'shooter' | 'bomber' | 'turret' | 'charger'

// Horizontal spawn origin: walk in from the nearest side, or deploy on-screen (turret).
export type SpawnX = 'side' | 'onscreen'
// Vertical spawn origin: at floor level, or up in an altitude band (flyer/bomber).
export type SpawnY = 'floor' | 'air'

export interface EnemyType {
	// --- Combat baselines (the spawn director scales these up by wave) ---
	health: number // base HP before the per-wave toughness ramp
	speed: number // fixed move speed (used as-is unless `waveSpeedMul` is set)
	waveSpeedMul?: number // if set, spawn speed = waveEnemySpeed(w) * this (chase kinds)
	damage: number // fallback contact/shot damage (constructor default)
	contactBase: number // base contact damage before the per-wave ramp (director)
	contactDamage?: boolean // does touching its body hurt the player? (default true; turret false — only its bolts bite)
	xp: number // gem value dropped on death

	// --- Hitbox + look ---
	width: number
	height: number
	// Character sheets (biker/cyborg, 48×80) draw at width*scale × height*scale from
	// the top-left. Gadget sheets (turret/drone, 48×48) draw the frame at frame*scale
	// (aspect-correct), anchored per `spriteAnchor`.
	spriteScale: number
	sprite: 'biker' | 'cyborg' | 'drone' | 'turret' // which character/gadget sheet
	spriteAnchor?: 'topLeft' | 'foot' | 'center' // draw anchor (default 'topLeft' character; 'foot' floor gadget, 'center' hover gadget)

	// --- Simulation ---
	behavior: Behavior
	gravity: boolean // does it fall? (flyer/bomber hover, so false)
	patrol: boolean // start with horizontal velocity? (bomber cruises)
	separates: boolean // pushed apart from neighbours? (anchored/hover kinds don't)
	separatesVertically: boolean // spread on the Y axis too? (flyers only)
	fireInterval?: number // physics steps between shots/drops (shooter/turret/bomber)

	// --- Spawn placement ---
	spawnX: SpawnX
	spawnY: SpawnY
	altitude?: number // for spawnY 'air': fraction of canvas height (default 0.32)

	// --- Wave director ---
	// Composition (which kinds, how many, when) is authored per-wave in waves.ts; the two
	// fields here are the only enemy-side hooks the director still reads at runtime.
	cullable?: boolean // interchangeable ground fodder the director may retire to free a slot
	medkitDrop: number // chance to drop a med-kit on death (while the player is hurt)
}

export const ENEMY_TYPES: Record<EnemyKind, EnemyType> = {
	// Numerous close-range fodder — the plain baseline.
	biker: {
		health: 3, speed: 2.4, waveSpeedMul: 1.0, damage: 1, contactBase: 1, xp: 1,
		width: 48, height: 80, spriteScale: 2, sprite: 'biker',
		behavior: 'ground', gravity: true, patrol: false, separates: true, separatesVertically: false,
		spawnX: 'side', spawnY: 'floor', cullable: true, medkitDrop: 0.05
	},
	// Homing air unit — no perch is safe.
	flyer: {
		health: 2, speed: 2.0, waveSpeedMul: 0.8, damage: 1, contactBase: 1, xp: 1,
		width: 48, height: 80, spriteScale: 2, sprite: 'cyborg',
		behavior: 'flyer', gravity: false, patrol: false, separates: true, separatesVertically: true,
		spawnX: 'side', spawnY: 'air', altitude: 0.32, medkitDrop: 0.05
	},
	// Standoff gunner — peppers perches out of melee reach.
	shooter: {
		health: 2, speed: 1.6, damage: 1, contactBase: 1, xp: 1,
		width: 48, height: 80, spriteScale: 2, sprite: 'cyborg',
		behavior: 'shooter', gravity: true, patrol: false, separates: true, separatesVertically: false,
		fireInterval: 110, spawnX: 'side', spawnY: 'floor', medkitDrop: 0.05
	},
	// Nimble rusher — closes then dashes; punishes standing still.
	charger: {
		health: 2, speed: 2.2, waveSpeedMul: 1.05, damage: 1, contactBase: 1, xp: 1,
		width: 44, height: 76, spriteScale: 1.9, sprite: 'cyborg',
		behavior: 'charger', gravity: true, patrol: false, separates: true, separatesVertically: false,
		spawnX: 'side', spawnY: 'floor', cullable: true, medkitDrop: 0.05
	},
	// Rolling turret — trundles in from a side on its treads, stops, briefly speeds up
	// its idle as a tell, then fires a fan of bolts toward its cannon side. Advances in
	// jerky steps toward the interior and occasionally turns around. Its body is
	// harmless (contactDamage:false) — only the bolts bite.
	turret: {
		health: 6, speed: 0, damage: 1, contactBase: 1, contactDamage: false, xp: 2,
		width: 52, height: 44, spriteScale: 2, sprite: 'turret', spriteAnchor: 'foot',
		behavior: 'turret', gravity: true, patrol: false, separates: false, separatesVertically: false,
		spawnX: 'side', spawnY: 'floor', medkitDrop: 0.12
	},
	// Hovering bomber (drone) — patrols overhead, rains area bombs, tanky. (Effective
	// spawn speed was 1.4 in the old switch, overriding the config; kept exactly.)
	bomber: {
		health: 7, speed: 1.4, damage: 2, contactBase: 2, xp: 2,
		width: 46, height: 40, spriteScale: 1.9, sprite: 'drone', spriteAnchor: 'center',
		behavior: 'bomber', gravity: false, patrol: true, separates: false, separatesVertically: false,
		fireInterval: 150, spawnX: 'side', spawnY: 'air', altitude: 0.32, medkitDrop: 0.12
	},
	// Elite brute — big, slow, heavy contact hit, drops a fat gem. Waves that open with one
	// set `eliteAtStart: 'brute'` in waves.ts.
	brute: {
		health: 12, speed: 1.3, damage: 2, contactBase: 2, xp: 3,
		width: 64, height: 104, spriteScale: 2.3, sprite: 'cyborg',
		behavior: 'ground', gravity: true, patrol: false, separates: true, separatesVertically: false,
		spawnX: 'side', spawnY: 'floor', medkitDrop: 0.5
	}
}
