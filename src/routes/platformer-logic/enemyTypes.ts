// Data-driven enemy registry. Everything that used to be scattered across Enemy.ts
// (stats, look, movement behaviour, separation) AND GameWrapper (spawn placement,
// speed profile, wave pressure floors, drop table, elite scheduling) lives here in
// one entry per kind. Adding an enemy = one entry below (plus a new movement
// function + dispatch case in Enemy.ts *only* if it needs a genuinely new pattern;
// kinds that reuse an existing `behavior` need zero code changes).

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
	xp: number // gem value dropped on death

	// --- Hitbox + look ---
	width: number
	height: number
	spriteScale: number // sprite is drawn at width*scale × height*scale
	sprite: 'biker' | 'cyborg' // which character sheet
	accent: string // aura colour so same-body kinds read apart
	glow: boolean // paint the accent aura?

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
	floor?: (w: number) => number // guaranteed on-field count this wave (pressure types)
	elite?: { fromWave: number } // miniboss: keep one alive from this wave on
	cullable?: boolean // interchangeable ground fodder the director may retire to free a slot
	medkitDrop: number // chance to drop a med-kit on death (while the player is hurt)
}

// Order matters: the pressure-floor list in the spawn director is built by filtering
// this record, so the relative order of the `floor` types (flyer, shooter, turret,
// bomber) is preserved here to keep the director's tie-break identical.
export const ENEMY_TYPES: Record<EnemyKind, EnemyType> = {
	// Numerous close-range fodder — the plain baseline (no aura).
	biker: {
		health: 3, speed: 2.4, waveSpeedMul: 1.0, damage: 1, contactBase: 1, xp: 1,
		width: 48, height: 80, spriteScale: 2, sprite: 'biker', accent: '#f87171', glow: false,
		behavior: 'ground', gravity: true, patrol: false, separates: true, separatesVertically: false,
		spawnX: 'side', spawnY: 'floor', cullable: true, medkitDrop: 0.05
	},
	// Homing air unit — no perch is safe.
	flyer: {
		health: 2, speed: 2.0, waveSpeedMul: 0.8, damage: 1, contactBase: 1, xp: 1,
		width: 48, height: 80, spriteScale: 2, sprite: 'cyborg', accent: '#c084fc', glow: true,
		behavior: 'flyer', gravity: false, patrol: false, separates: true, separatesVertically: true,
		spawnX: 'side', spawnY: 'air', altitude: 0.32,
		floor: (w) => Math.min(4, 1 + Math.floor((w - 1) / 2)), medkitDrop: 0.05
	},
	// Standoff gunner — peppers perches out of melee reach.
	shooter: {
		health: 2, speed: 1.6, damage: 1, contactBase: 1, xp: 1,
		width: 48, height: 80, spriteScale: 2, sprite: 'cyborg', accent: '#38bdf8', glow: true,
		behavior: 'shooter', gravity: true, patrol: false, separates: true, separatesVertically: false,
		fireInterval: 110, spawnX: 'side', spawnY: 'floor',
		floor: (w) => (w < 2 ? 0 : Math.min(3, 1 + Math.floor((w - 2) / 2))), medkitDrop: 0.05
	},
	// Nimble rusher — closes then dashes; punishes standing still.
	charger: {
		health: 2, speed: 2.2, waveSpeedMul: 1.05, damage: 1, contactBase: 1, xp: 1,
		width: 44, height: 76, spriteScale: 1.9, sprite: 'cyborg', accent: '#fb7185', glow: true,
		behavior: 'charger', gravity: true, patrol: false, separates: true, separatesVertically: false,
		spawnX: 'side', spawnY: 'floor', cullable: true, medkitDrop: 0.05
	},
	// Anchored turret — never chases, sprays bolts in all directions.
	turret: {
		health: 6, speed: 0, damage: 1, contactBase: 1, xp: 2,
		width: 52, height: 80, spriteScale: 2, sprite: 'cyborg', accent: '#a78bfa', glow: true,
		behavior: 'turret', gravity: true, patrol: false, separates: false, separatesVertically: false,
		fireInterval: 150, spawnX: 'onscreen', spawnY: 'floor',
		floor: (w) => (w < 3 ? 0 : Math.min(2, 1 + Math.floor((w - 3) / 3))), medkitDrop: 0.12
	},
	// Hovering bomber — patrols overhead, rains area bombs, tanky. (Effective spawn
	// speed was 1.4 in the old switch, overriding the config; kept exactly.)
	bomber: {
		health: 7, speed: 1.4, damage: 2, contactBase: 2, xp: 2,
		width: 52, height: 82, spriteScale: 2.1, sprite: 'cyborg', accent: '#fb923c', glow: true,
		behavior: 'bomber', gravity: false, patrol: true, separates: false, separatesVertically: false,
		fireInterval: 150, spawnX: 'side', spawnY: 'air', altitude: 0.32,
		floor: (w) => (w < 4 ? 0 : Math.min(2, 1 + Math.floor((w - 4) / 3))), medkitDrop: 0.12
	},
	// Elite brute — big, slow, heavy contact hit, drops a fat gem. One alive from wave 3.
	brute: {
		health: 12, speed: 1.3, damage: 2, contactBase: 2, xp: 3,
		width: 64, height: 104, spriteScale: 2.3, sprite: 'cyborg', accent: '#ef4444', glow: true,
		behavior: 'ground', gravity: true, patrol: false, separates: true, separatesVertically: false,
		spawnX: 'side', spawnY: 'floor', elite: { fromWave: 3 }, medkitDrop: 0.5
	}
}
