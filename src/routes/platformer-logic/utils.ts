import type { Platform } from './Platform'

export const collision = (
	rect1: { width: number; height: number; top: number; left: number },
	rect2: Platform
) => {
	if (rect1.left > rect2.left + rect2.width) return false
	if (rect1.left + rect1.width < rect2.left) return false
	if (rect1.top > rect2.top + rect2.height) return false
	if (rect1.top + rect1.height < rect2.top) return false
	return true
}

export function loadImage(src: string) {
	const image = new Image()
	image.src = src
	return image
}
