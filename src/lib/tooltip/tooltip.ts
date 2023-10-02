import Tooltip from './Tooltip.svelte'

export function tooltip(element: HTMLElement) {
	let message: string
	let tooltipComponent: Tooltip

	function mouseOver(event: MouseEvent) {
		if (element.dataset.tooltip) {
			message = element.dataset.tooltip
		}

		tooltipComponent = new Tooltip({
			props: {
				message: message,
				x: event.pageX,
				y: event.pageY
			},
			target: document.body
		})
	}
	function mouseMove(event: MouseEvent) {
		tooltipComponent.$set({
			x: event.pageX,
			y: event.pageY
		})
	}
	function mouseLeave() {
		tooltipComponent.$destroy()
	}

	element.addEventListener('mouseover', mouseOver)
	element.addEventListener('mouseleave', mouseLeave)
	element.addEventListener('mousemove', mouseMove)

	return {
		destroy() {
			element.removeEventListener('mouseover', mouseOver)
			element.removeEventListener('mouseleave', mouseLeave)
			element.removeEventListener('mousemove', mouseMove)
		}
	}
}
