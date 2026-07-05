import type { Effect } from '../routes/platformer-logic/Effect'
import type { Projectile } from '../routes/platformer-logic/Projectile'
import type { Enemy } from '../routes/platformer-logic/Enemy'
import type { XpGem } from '../routes/platformer-logic/XpGem'
import type { Bomb } from '../routes/platformer-logic/Bomb'
import type { HealthPack } from '../routes/platformer-logic/HealthPack'
import type { Turret } from '../routes/platformer-logic/Turret'

// Entity collections are plain-array pools, NOT Svelte stores. They're mutated
// ~60×/second by the game loop and drawn imperatively to the canvas, so nothing in
// the DOM subscribes to them — the reactive machinery was pure overhead. The old
// `writable` pattern copied the whole array on every spawn (`[...list, x]`) and
// filtered it on every despawn (both O(n) and allocating), then notified subscribers.
// Here `add` is a push and `delete` is an O(1) swap-pop, with zero notifications.
// Run/HUD state the UI actually renders (score, wave, HP, level…) stays reactive in
// game.ts — only these per-frame simulation arrays moved off the reactive graph.
export class Pool<T> {
	list: T[] = []

	add(item: T) {
		this.list.push(item)
	}

	// Swap-pop: O(1) removal without allocating. Draw/update order isn't preserved,
	// which is fine — nothing depends on it. Callers that remove *while iterating this
	// same pool* must iterate a snapshot (`list.slice()`) — the same discipline the old
	// store required (its `.filter` returned a fresh array, freezing the in-flight loop).
	delete(item: T) {
		const i = this.list.indexOf(item)
		if (i === -1) return
		this.list[i] = this.list[this.list.length - 1]
		this.list.pop()
	}

	clear() {
		this.list.length = 0
	}
}

export const effectsStore = new Pool<Effect>()
export const projectilesStore = new Pool<Projectile>()
export const enemiesStore = new Pool<Enemy>()
export const xpGemsStore = new Pool<XpGem>()
export const bombsStore = new Pool<Bomb>()
export const healthPacksStore = new Pool<HealthPack>()
// Friendly deployables (Cyborg's turrets). Non-hostile bolts route through resolveHits.
export const turretsStore = new Pool<Turret>()
