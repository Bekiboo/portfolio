export function colorHover(element: HTMLElement) {
	const color = element.dataset.color

	function mouseOver() {
		if (!color) {
			return
		}
		element.style.color = color
	}
	function mouseLeave() {
		element.style.color = ''
	}

	element.addEventListener('mouseover', mouseOver)
	element.addEventListener('mouseleave', mouseLeave)

	return {
		destroy() {
			element.removeEventListener('mouseover', mouseOver)
			element.removeEventListener('mouseleave', mouseLeave)
		}
	}
}
