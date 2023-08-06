export class Platform {
	clientWidth: number;
	clientHeight: number;
	offsetTop: number;
	offsetLeft: number;

	constructor(el: HTMLElement) {
		this.clientWidth = el.clientWidth;
		this.clientHeight = el.clientHeight;
		this.offsetTop = el.offsetTop;
		this.offsetLeft = el.offsetLeft;
	}
}
