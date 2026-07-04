import sprites from './spritesData'

type Rect = { width: number; height: number; top: number; left: number }

// Generic AABB overlap test. Works for any two rectangles — platforms, entity
// hitboxes, projectiles — which is what lets entity↔entity collisions reuse it.
export const collision = (rect1: Rect, rect2: Rect) => {
	if (rect1.left >= rect2.left + rect2.width) return false
	if (rect1.left + rect1.width <= rect2.left) return false
	if (rect1.top >= rect2.top + rect2.height) return false
	if (rect1.top + rect1.height <= rect2.top) return false
	return true
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
