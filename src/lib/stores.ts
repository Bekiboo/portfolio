import { writable, type Writable } from 'svelte/store'
import type { Effect } from '../routes/platformer-logic/Effect'

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
