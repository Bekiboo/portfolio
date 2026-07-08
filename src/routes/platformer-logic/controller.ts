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
				// Only jump on the initial press; ignore the OS key-repeat while held,
				// otherwise holding W would instantly consume the double jump.
				if (!keys.up) player.jump()
				keys.up = true
				break
			case 'KeyS':
				// Rising edge only (ignore the OS key-repeat) → fire the equipped special power.
				// `down` is still tracked for a future hold/charge power; it drives nothing today.
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
