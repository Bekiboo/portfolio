import { writable, derived, get } from 'svelte/store'
import { CHARACTERS } from '../routes/platformer-logic/characters'

export type GameStatus = 'idle' | 'playing' | 'over'

// idle → nothing running · playing → active run · over → game-over screen.
// Clicks fire and the page text is unselectable only while 'playing'; movement,
// jump and aim work regardless of status.
export const gameStatus = writable<GameStatus>('idle')

// Convenience boolean used by the loop and layout: true only during an active run.
export const gameStarted = derived(gameStatus, ($s) => $s === 'playing')

// Per-run state, reset by startRun().
export const MAX_HP = 10 // base HP cap (shown as a gauge); Vitality raises the current cap
export const maxHp = writable(MAX_HP) // current HP cap (grows with Vitality)
export const score = writable(0)
export const playerHp = writable(MAX_HP)
// Current wave (1-based). Advances on a timer while playing and drives the
// difficulty ramp (spawn rate, enemy count, enemy speed) in the game loop.
export const wave = writable(1)

// Collected experience. Enemies drop gems on death that fall to the floor; the
// player banks their value by walking over them. `xp` is the run total (shown at
// game over); `levelXp`/`levelXpNeeded` track progress toward the next level.
export const xp = writable(0)
export const level = writable(1)
export const levelXp = writable(0)
// XP to advance from the given level to the next. A steep geometric ramp on
// purpose: level-ups pause the fight, so they must be rare and meaningful (~one
// every 30-45s) rather than a constant interruption. L1→2 needs 8, then ×1.4
// each level (8, 11, 16, 22, 31, 43, 60…).
export const levelReq = (lvl: number) => Math.round(8 * Math.pow(1.4, lvl - 1))
export const levelXpNeeded = writable(levelReq(1))

// Bank `value` XP; returns how many level-ups it triggered (0 if none). The game
// loop pauses for an upgrade pick when this returns a positive number.
export function addXp(value: number): number {
	xp.update((n) => n + value)
	let cur = get(levelXp) + value
	let lvl = get(level)
	let need = get(levelXpNeeded)
	let ups = 0
	while (cur >= need) {
		cur -= need
		lvl += 1
		ups += 1
		need = levelReq(lvl)
	}
	if (ups > 0) {
		level.set(lvl)
		levelXpNeeded.set(need)
	}
	levelXp.set(cur)
	return ups
}

/** Begin a fresh run: reset score, seed HP from the base character, then play. */
export function startRun() {
	const hp = CHARACTERS.punk.maxHp
	score.set(0)
	maxHp.set(hp)
	playerHp.set(hp)
	wave.set(1)
	xp.set(0)
	level.set(1)
	levelXp.set(0)
	levelXpNeeded.set(levelReq(1))
	gameStatus.set('playing')
}

/** Manual stop → back to idle. */
export function stopRun() {
	gameStatus.set('idle')
}

/** Player died → game-over screen (score/HP kept for display). */
export function gameOver() {
	gameStatus.set('over')
}
