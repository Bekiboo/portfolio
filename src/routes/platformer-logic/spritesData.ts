import { effect } from '@melt-ui/svelte/internal/helpers'

// Define an interface for the sprite data
interface SpriteData {
	[key: string]: {
		[key: string]: {
			frames: number
			speed?: number
			src: string
			width?: number
			height?: number
		}
	}
}

// Define the actual sprites data
const sprites: SpriteData = {
	biker: {
		idle: { frames: 4, speed: 10, src: '/sprites/Characters/Biker/Idle.png' },
		run: { frames: 6, src: '/sprites/Characters/Biker/Run.png' },
		jump: { frames: 4, speed: 10, src: '/sprites/Characters/Biker/Jump.png' },
		punch: { frames: 6, speed: 3, src: '/sprites/Characters/Biker/Attack1.png' },
		run_attack: { frames: 6, src: '/sprites/Characters/Biker/Run_attack.png' }
	},
	effect: {
		smoke_1: { frames: 4, speed: 5, src: '/sprites/Effects/Smoke/1.png' },
		smoke_2: { frames: 4, speed: 5, src: '/sprites/Effects/Smoke/2.png' },
		smoke_3: { frames: 4, speed: 5, src: '/sprites/Effects/Smoke/3.png' },
		smoke_4: { frames: 4, speed: 5, src: '/sprites/Effects/Smoke/4.png' },
		smoke_5: { frames: 4, speed: 5, src: '/sprites/Effects/Smoke/5.png' },
		smoke_6: { frames: 4, speed: 5, src: '/sprites/Effects/Smoke/6.png' },
		smoke_7: { frames: 4, speed: 5, src: '/sprites/Effects/Smoke/7.png' },
		smoke_8: { frames: 4, speed: 5, src: '/sprites/Effects/Smoke/8.png' },
		smoke_9: { frames: 4, speed: 5, src: '/sprites/Effects/Smoke/9.png' },
		smoke_10: { frames: 4, speed: 5, src: '/sprites/Effects/Smoke/10.png' },
		smoke_11: { frames: 4, speed: 5, src: '/sprites/Effects/Smoke/11.png' },
		smoke_12: { frames: 4, speed: 5, src: '/sprites/Effects/Smoke/12.png' }
	}
}

// Export the sprites data
export default sprites
