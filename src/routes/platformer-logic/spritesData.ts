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

// Only the sprites the game actually draws. The full sheet set is archived under
// /archive/static-unused (+ git history), restorable if a character/effect is rewired.
const sprites: SpriteData = {
	punk: {
		idle: { frames: 4, speed: 10, img: loadImage('/sprites/Characters/Punk/Idle1.png') },
		run: { frames: 6, img: loadImage('/sprites/Characters/Punk/Run1.png') },
		jump: { frames: 4, speed: 10, img: loadImage('/sprites/Characters/Punk/Jump1.png') },
		punch: { frames: 6, speed: 3, img: loadImage('/sprites/Characters/Punk/Attack1.png') },
		punch_2: { frames: 8, speed: 4, img: loadImage('/sprites/Characters/Punk/Attack2.png') },
		run_attack: { frames: 6, img: loadImage('/sprites/Characters/Punk/Run_attack.png') }
	},
	// 'biker'/'cyborg' are ENEMY skins (ground biker; cyborg-skinned flyer/shooter/charger/
	// brute) — character-sheet enemies only animate on 'run'. The dropped idle/jump/punch
	// frames belonged to the parked multi-class player system; restore from git if it returns.
	biker: {
		run: { frames: 6, img: loadImage('/sprites/Characters/Biker/Run.png') }
	},
	cyborg: {
		run: { frames: 6, img: loadImage('/sprites/Characters/Cyborg/Run.png') }
	},
	// Compact 48×48 "gadget" sheets (art fills the whole frame, vs the 48×80 character
	// sheets whose art sits up top). Turret: walk / telegraph (sped-up idle) / fire (attack);
	// drone: hover (idle) / drop bomb (attack).
	turret: {
		idle: { frames: 4, speed: 10, img: loadImage('/sprites/Turret/Idle.png'), width: 48, height: 48 },
		walk: { frames: 4, speed: 6, img: loadImage('/sprites/Turret/Walk.png'), width: 48, height: 48 },
		attack: { frames: 4, speed: 4, img: loadImage('/sprites/Turret/Attack.png'), width: 48, height: 48 }
	},
	drone: {
		idle: { frames: 4, speed: 6, img: loadImage('/sprites/Drone/Idle.png'), width: 48, height: 48 },
		attack: { frames: 4, speed: 4, img: loadImage('/sprites/Drone/Attack.png'), width: 48, height: 48 }
	},
	effect: {
		// smoke_12: ground puff (art low in frame) — footfalls, recoil, pickups. smoke_14:
		// symmetric burst centred in frame — explosion read on an entity centre (deaths).
		smoke_12: { frames: 4, speed: 5, img: loadImage('/sprites/Effects/Smoke/12.png') },
		smoke_14: { frames: 6, speed: 5, img: loadImage('/sprites/Effects/Smoke/14.png'), width: 48, height: 48 }
	},
	// Weapon skins (referenced by WEAPON_TYPES.sprite); only the equipped ones are loaded.
	// Frame _1 is the resting pose (a _2 muzzle-flash swap is a later polish pass).
	weapon: {
		gun_1: { img: loadImage('/sprites/Weapons/Guns/7_1.png') }, // pistol
		gun_2: { img: loadImage('/sprites/Weapons/Guns/2_1.png') }, // shotgun
		gun_3: { img: loadImage('/sprites/Weapons/Guns/3_1.png') }, // smg
		rifle_1: { img: loadImage('/sprites/Weapons/Rifles/1_1.png') } // rifle
	},
	hand: {
		punk_3: { img: loadImage('/sprites/Hands/Punk/3.png') }
	},
	projectile: {
		blue: { img: loadImage('/sprites/Bullets/5.png'), width: 30, height: 4 }
	}
}

export default sprites
