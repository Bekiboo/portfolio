import Tooltip from './Tooltip.svelte'
import { mount, unmount } from 'svelte'

export function tooltip(element: HTMLElement) {
	let message: string
	let tooltipComponent: Tooltip

	const props = $state({ message: '', x: 0, y: 0 })

	function mouseOver(event: MouseEvent) {
		if (element.dataset.tooltip) {
			message = element.dataset.tooltip
		}

		tooltipComponent = mount(Tooltip, {
			props,
			target: document.body
		})

		props.x = event.pageX
		props.y = event.pageY
		props.message = message
	}
	function mouseMove(event: MouseEvent) {
		props.x = event.pageX
		props.y = event.pageY
	}

	function mouseLeave() {
		unmount(tooltipComponent)
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
