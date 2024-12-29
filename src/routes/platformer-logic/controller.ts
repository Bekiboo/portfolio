import type { Player } from './Player'

export const keys = {
	left: false,
	right: false,
	up: false,
	down: false,
	punch: false,
	onkeydown: (e: KeyboardEvent, player: Player) => {
		switch (e.code) {
			case 'KeyA':
				keys.left = true
				break
			case 'KeyD':
				keys.right = true
				break
			case 'KeyW':
				keys.up = true
				player.jump()
				break
			case 'KeyS':
				keys.down = true
				break
			case 'KeyK':
				keys.punch = true
				break
		}
	},
	onkeyup: (e: KeyboardEvent, player: Player) => {
		switch (e.code) {
			case 'KeyA':
				keys.left = false
				break
			case 'KeyD':
				keys.right = false
				break
			case 'KeyW':
				keys.up = false
				break
			case 'KeyS':
				keys.down = false
				break
			case 'KeyK':
				keys.punch = false
				break
		}
	}
}
