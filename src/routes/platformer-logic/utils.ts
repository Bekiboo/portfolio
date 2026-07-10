import sprites from './spritesData'
import type { Platform } from './Platform'

type Rect = { width: number; height: number; top: number; left: number }

// World gravity: downward velocity per step. Shared by every falling body so they fall alike.
export const GRAVITY = 0.33

// Per-step time delta every entity.update() advances by (GameWorld's fixed step / 12). Exported
// so ballistic code (grenade launch solve) integrates in the same units. Keep in sync with FIXED_STEP.
export const STEP_DELTA = 1000 / 60 / 12

// Playfield bounds an entity is confined to (floor at `height`, right wall at `width`).
// This is the WORLD size (larger than the viewport); the camera scrolls over it.
export interface Bounds {
	width: number
	height: number
}

// Generic AABB overlap test for any two rectangles (also reused for entity↔entity collisions).
export const collision = (rect1: Rect, rect2: Rect) => {
	if (rect1.left >= rect2.left + rect2.width) return false
	if (rect1.left + rect1.width <= rect2.left) return false
	if (rect1.top >= rect2.top + rect2.height) return false
	if (rect1.top + rect1.height <= rect2.top) return false
	return true
}

// Carries the last two step positions so render can interpolate via `alpha` in [0,1].
export interface Interpolable {
	pos: { x: number; y: number }
	prevPos: { x: number; y: number }
}

// Render position interpolated between the last two steps. Centred sprites add width/2, height/2.
export function lerpPos(e: Interpolable, alpha: number) {
	return {
		x: e.prevPos.x + (e.pos.x - e.prevPos.x) * alpha,
		y: e.prevPos.y + (e.pos.y - e.prevPos.y) * alpha
	}
}

// A falling pickup that rests on the ground; settleOnGround mutates `grounded` each step.
export interface FallingBody extends Interpolable {
	velocity: { x: number; y: number }
	width: number
	height: number
	grounded: boolean
}

// Settle a pickup onto the floor/platform top, bounce off side walls, set `body.grounded`.
// Shared by XpGem/HealthPack/CreditCrate (Bomb detonates on landing, so it keeps its own variant).
export function settleOnGround(body: FallingBody, canvas: Bounds, platforms: Platform[]) {
	body.grounded = false
	if (body.pos.y + body.height >= canvas.height) {
		body.pos.y = canvas.height - body.height
		body.velocity.y = 0
		body.grounded = true
	}
	if (body.velocity.y >= 0) {
		for (const platform of platforms) {
			if (
				collision(
					{ left: body.pos.x, top: body.pos.y, width: body.width, height: body.height },
					platform
				)
			) {
				// Only settle when landing on the top edge (not clipping a side).
				if (body.prevPos.y + body.height <= platform.top + 8) {
					body.pos.y = platform.top - body.height
					body.velocity.y = 0
					body.grounded = true
				}
				break
			}
		}
	}
	if (body.pos.x < 0) {
		body.pos.x = 0
		body.velocity.x *= -0.4
	} else if (body.pos.x + body.width > canvas.width) {
		body.pos.x = canvas.width - body.width
		body.velocity.x *= -0.4
	}
}

// True if a sheet defines this animation. Callers check before #setAnim so a kind missing
// an animation keeps its current one instead of crashing on getSprite of an undefined entry.
export function hasSprite(category: string, animation: string): boolean {
	return !!sprites[category]?.[animation]
}

export function getSprite(category: string, animation: string) {
	const sprite = sprites[category][animation]
	return {
		frames: sprite.frames,
		speed: sprite.speed || 5,
		img: sprite.img,
		width: sprite.width || 48,
		height: sprite.height || 80
	}
}
