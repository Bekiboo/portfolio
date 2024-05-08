import type { projectiles } from '$lib/stores'

interface SpriteData {
	[key: string]: {
		[key: string]: {
			frames?: number
			speed?: number
			img: HTMLImageElement
			width?: number
			height?: number
		}
	}
}

export function loadImage(src: string) {
	const image = new Image()
	image.src = src
	return image
}

const sprites: SpriteData = {
	biker: {
		idle: { frames: 4, speed: 10, img: loadImage('/sprites/Characters/Biker/Idle.png') },
		run: { frames: 6, img: loadImage('/sprites/Characters/Biker/Run.png') },
		jump: { frames: 4, speed: 10, img: loadImage('/sprites/Characters/Biker/Jump.png') },
		punch: { frames: 6, speed: 3, img: loadImage('/sprites/Characters/Biker/Attack1.png') },
		punch_2: { frames: 8, speed: 4, img: loadImage('/sprites/Characters/Biker/Attack2.png') },
		special_attack: {
			frames: 8,
			speed: 3,
			img: loadImage('/sprites/Characters/Biker/Attack3.png')
		},
		run_attack: { frames: 6, img: loadImage('/sprites/Characters/Biker/Run_attack.png') }
	},
	cyborg: {
		idle: { frames: 4, speed: 10, img: loadImage('/sprites/Characters/Cyborg/Idle.png') },
		run: { frames: 6, img: loadImage('/sprites/Characters/Cyborg/Run.png') },
		jump: { frames: 4, speed: 10, img: loadImage('/sprites/Characters/Cyborg/Jump.png') },
		punch: { frames: 6, speed: 3, img: loadImage('/sprites/Characters/Cyborg/Attack1.png') },
		punch_2: { frames: 8, speed: 4, img: loadImage('/sprites/Characters/Cyborg/Attack2.png') },
		special_attack: {
			frames: 8,
			speed: 3,
			img: loadImage('/sprites/Characters/Cyborg/Attack3.png')
		},
		run_attack: { frames: 6, img: loadImage('/sprites/Characters/Cyborg/Run_attack.png') }
	},
	punk: {
		idle: { frames: 4, speed: 10, img: loadImage('/sprites/Characters/Punk/Idle1.png') },
		run: { frames: 6, img: loadImage('/sprites/Characters/Punk/Run1.png') },
		jump: { frames: 4, speed: 10, img: loadImage('/sprites/Characters/Punk/Jump1.png') },
		punch: { frames: 6, speed: 3, img: loadImage('/sprites/Characters/Punk/Attack1.png') },
		punch_2: { frames: 8, speed: 4, img: loadImage('/sprites/Characters/Punk/Attack2.png') },
		special_attack: {
			frames: 8,
			speed: 3,
			img: loadImage('/sprites/Characters/Punk/Attack3.png')
		},
		run_attack: { frames: 6, img: loadImage('/sprites/Characters/Punk/Run_attack.png') }
	},

	effect: {
		smoke_1: {
			frames: 4,
			speed: 5,
			img: loadImage('/sprites/Effects/Smoke/1.png'),
			width: 24,
			height: 24
		},
		smoke_2: { frames: 4, speed: 5, img: loadImage('/sprites/Effects/Smoke/2.png') },
		smoke_3: { frames: 4, speed: 5, img: loadImage('/sprites/Effects/Smoke/3.png') },
		smoke_4: { frames: 4, speed: 5, img: loadImage('/sprites/Effects/Smoke/4.png') },
		smoke_5: { frames: 4, speed: 5, img: loadImage('/sprites/Effects/Smoke/5.png') },
		smoke_6: { frames: 4, speed: 5, img: loadImage('/sprites/Effects/Smoke/6.png') },
		smoke_7: { frames: 4, speed: 5, img: loadImage('/sprites/Effects/Smoke/7.png') },
		smoke_8: { frames: 4, speed: 5, img: loadImage('/sprites/Effects/Smoke/8.png') },
		smoke_9: { frames: 4, speed: 5, img: loadImage('/sprites/Effects/Smoke/9.png') },
		smoke_10: { frames: 4, speed: 5, img: loadImage('/sprites/Effects/Smoke/10.png') },
		smoke_11: { frames: 4, speed: 5, img: loadImage('/sprites/Effects/Smoke/11.png') },
		smoke_12: { frames: 4, speed: 5, img: loadImage('/sprites/Effects/Smoke/12.png') },
		spinning_star: { frames: 4, speed: 5, img: loadImage('/sprites/Effects/Other/2.png') }
	},
	weapon: {
		gun_1: { img: loadImage('/sprites/Weapons/Guns/7_1.png') }
	},
	hand: {
		punk_3: { img: loadImage('/sprites/Hands/Punk/3.png') }
	},
	projectile: {
		blue: { img: loadImage('/sprites/Bullets/5.png') }
	}
}

export default sprites
