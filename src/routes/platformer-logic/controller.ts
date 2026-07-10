import type { Player } from './Player'

export interface KeyState {
	left: boolean
	right: boolean
	up: boolean
	down: boolean
	punch: boolean
	power: boolean // one-shot: set on an S press, consumed by GameWorld.updatePower
}

export const keys = {
	left: false,
	right: false,
	up: false,
	down: false,
	punch: false,
	power: false,
	onkeydown: (e: KeyboardEvent, player: Player) => {
		switch (e.code) {
			case 'KeyA':
				keys.left = true
				break
			case 'KeyD':
				keys.right = true
				break
			case 'KeyW':
				// Jump on the initial press only; ignore OS key-repeat, else holding W
				// would instantly consume the double jump.
				if (!keys.up) player.jump()
				keys.up = true
				break
			case 'KeyS':
				// Rising edge only → fire the equipped power. `down` is tracked for a
				// future hold/charge power; drives nothing today.
				if (!keys.down) keys.power = true
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
