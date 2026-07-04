import { writable, type Writable } from 'svelte/store'
import type { Effect } from '../routes/platformer-logic/Effect'
import type { Projectile } from '../routes/platformer-logic/Projectile'
import type { Enemy } from '../routes/platformer-logic/Enemy'
import type { XpGem } from '../routes/platformer-logic/XpGem'
import type { Bomb } from '../routes/platformer-logic/Bomb'
import type { HealthPack } from '../routes/platformer-logic/HealthPack'

export const effects = writable<Effect[]>([])

export const effectsStore = {
	subscribe: effects.subscribe,
	set: (value: Effect[]) => effects.set(value),
	update: (updateFn: (currentEffects: Effect[]) => Effect[]) => effects.update(updateFn),
	add: (animation: Effect) => effects.update((currentEffects) => [...currentEffects, animation]),
	delete: (animationToRemove: Effect) =>
		effects.update((currentEffects) =>
			currentEffects.filter((effect) => effect !== animationToRemove)
		)
}

export const projectiles = writable<Projectile[]>([])

export const projectilesStore = {
	subscribe: projectiles.subscribe,
	set: (value: Projectile[]) => projectiles.set(value),
	update: (updateFn: (currentProjectiles: Projectile[]) => Projectile[]) =>
		projectiles.update(updateFn),
	add: (animation: Projectile) =>
		projectiles.update((currentProjectiles) => [...currentProjectiles, animation]),
	delete: (animationToRemove: Projectile) =>
		projectiles.update((currentProjectiles) =>
			currentProjectiles.filter((projectile) => projectile !== animationToRemove)
		)
}

export const enemies = writable<Enemy[]>([])

export const enemiesStore = {
	subscribe: enemies.subscribe,
	set: (value: Enemy[]) => enemies.set(value),
	update: (updateFn: (current: Enemy[]) => Enemy[]) => enemies.update(updateFn),
	add: (enemy: Enemy) => enemies.update((current) => [...current, enemy]),
	delete: (toRemove: Enemy) => enemies.update((current) => current.filter((e) => e !== toRemove))
}

export const xpGems = writable<XpGem[]>([])

export const xpGemsStore = {
	subscribe: xpGems.subscribe,
	set: (value: XpGem[]) => xpGems.set(value),
	update: (updateFn: (current: XpGem[]) => XpGem[]) => xpGems.update(updateFn),
	add: (gem: XpGem) => xpGems.update((current) => [...current, gem]),
	delete: (toRemove: XpGem) => xpGems.update((current) => current.filter((g) => g !== toRemove))
}

export const bombs = writable<Bomb[]>([])

export const bombsStore = {
	subscribe: bombs.subscribe,
	set: (value: Bomb[]) => bombs.set(value),
	update: (updateFn: (current: Bomb[]) => Bomb[]) => bombs.update(updateFn),
	add: (bomb: Bomb) => bombs.update((current) => [...current, bomb]),
	delete: (toRemove: Bomb) => bombs.update((current) => current.filter((b) => b !== toRemove))
}

export const healthPacks = writable<HealthPack[]>([])

export const healthPacksStore = {
	subscribe: healthPacks.subscribe,
	set: (value: HealthPack[]) => healthPacks.set(value),
	update: (updateFn: (current: HealthPack[]) => HealthPack[]) => healthPacks.update(updateFn),
	add: (pack: HealthPack) => healthPacks.update((current) => [...current, pack]),
	delete: (toRemove: HealthPack) =>
		healthPacks.update((current) => current.filter((p) => p !== toRemove))
}

export const platforms = writable(null)
export const player = writable(null)
export const keys = writable(null)
export const sprites = writable(null)

export const GRAVITY = 0.5
export const JUMP_FORCE = -10
export const MAX_JUMP = 2
export const PLAYER_WIDTH = 48
export const PLAYER_HEIGHT = 80
export const PLAYER_SPEED = 6
