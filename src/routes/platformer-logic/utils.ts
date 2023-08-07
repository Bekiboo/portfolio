export const collision = (rect1: Rect, rect2: Rect) => {
	if (rect1.left > rect2.left + rect2.width) return false;
	if (rect1.left + rect1.width < rect2.left) return false;
	if (rect1.top > rect2.top + rect2.height) return false;
	if (rect1.top + rect1.height < rect2.top) return false;
	return true;
};

export const collisionDirection = (rect1: Rect, rect2: Rect) => {
	const dx = rect1.left + rect1.width / 2 - (rect2.left + rect2.width / 2); // -18
	const dy = rect1.top + rect1.height / 2 - (rect2.top + rect2.height / 2); // 0
	const width = (rect1.width + rect2.width) / 2; // 20
	const height = (rect1.height + rect2.height) / 2; // 10
	const crossWidth = width * dy; // 0
	const crossHeight = height * dx; // -180
	let collisionDirection = null;

	if (Math.abs(dx) <= width && Math.abs(dy) <= height) {
		if (crossWidth > crossHeight) {
			collisionDirection = crossWidth > -crossHeight ? 'bottom' : 'left';
		} else {
			collisionDirection = crossWidth > -crossHeight ? 'right' : 'top';
		}
	}
	return collisionDirection;
};

export type Rect = {
	left: number;
	top: number;
	width: number;
	height: number;
};

export function loadImage(src: string) {
	const image = new Image();
	image.src = src;
	return image;
}
