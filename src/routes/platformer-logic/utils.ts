import sprites from './spritesData'
import type { Platform } from './Platform'

type Rect = { width: number; height: number; top: number; left: number }

// World gravity: downward velocity added per physics step. Shared by every falling body
// (Player, Enemy, and the Bomb/XpGem/HealthPack/CreditCrate pickups) so they all fall at the
// same rate — previously this constant was redeclared identically in each of those files.
export const GRAVITY = 0.33

// The playfield bounds an entity is confined to (floor at `height`, right wall at `width`).
// Structurally satisfied by the canvas, but the arena is now a WORLD larger than the viewport,
// so entities take these bounds (GameWorld passes its world size) rather than the canvas itself.
// The camera then scrolls the viewport around this world (see GameWorld render + parallax).
export interface Bounds {
	width: number
	height: number
}

// Generic AABB overlap test. Works for any two rectangles — platforms, entity
// hitboxes, projectiles — which is what lets entity↔entity collisions reuse it.
export const collision = (rect1: Rect, rect2: Rect) => {
	if (rect1.left >= rect2.left + rect2.width) return false
	if (rect1.left + rect1.width <= rect2.left) return false
	if (rect1.top >= rect2.top + rect2.height) return false
	if (rect1.top + rect1.height <= rect2.top) return false
	return true
}

// A body that carries the last two physics-step positions, so its render can be
// interpolated. Every entity's draw() is passed an `alpha` in [0,1]; lerpPos returns
// the smoothed top-left. See the fixed-timestep loop in GameWorld.
export interface Interpolable {
	pos: { x: number; y: number }
	prevPos: { x: number; y: number }
}

// Render position interpolated between the last two physics steps. Centred sprites
// (Bomb, XpGem) add width/2, height/2 to the result themselves.
export function lerpPos(e: Interpolable, alpha: number) {
	return {
		x: e.prevPos.x + (e.pos.x - e.prevPos.x) * alpha,
		y: e.prevPos.y + (e.pos.y - e.prevPos.y) * alpha
	}
}

// A falling pickup that rests on the ground. settleOnGround mutates `grounded`
// (and clamps pos/velocity) each step.
export interface FallingBody extends Interpolable {
	velocity: { x: number; y: number }
	width: number
	height: number
	grounded: boolean
}

// Settle a falling pickup onto the canvas floor or the top of any platform it lands on,
// and bounce it off the side walls. Sets `body.grounded`. Shared by XpGem/HealthPack/
// CreditCrate, which all rest identically (Bomb detonates on landing instead, so it
// keeps its own variant).
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
				// Only settle when it dropped onto the top edge (not clipping a side).
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

// True if a character sheet defines this animation. Enemies that switch animations
// (turret idle/walk/attack, drone idle/attack) call this before #setAnim so a kind
// missing an animation silently keeps its current one instead of crashing on a
// getSprite of an undefined entry.
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
