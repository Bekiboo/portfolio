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

// Only the sprites the game actually draws are loaded here. The full original
// sheet set (biker/cyborg characters, every smoke/effect variant, spare weapons,
// etc.) is archived under /archive/static-unused and can be restored from there
// plus git history if a character/effect is ever wired back in.
const sprites: SpriteData = {
	punk: {
		idle: { frames: 4, speed: 10, img: loadImage('/sprites/Characters/Punk/Idle1.png') },
		run: { frames: 6, img: loadImage('/sprites/Characters/Punk/Run1.png') },
		jump: { frames: 4, speed: 10, img: loadImage('/sprites/Characters/Punk/Jump1.png') },
		punch: { frames: 6, speed: 3, img: loadImage('/sprites/Characters/Punk/Attack1.png') },
		punch_2: { frames: 8, speed: 4, img: loadImage('/sprites/Characters/Punk/Attack2.png') },
		run_attack: { frames: 6, img: loadImage('/sprites/Characters/Punk/Run_attack.png') }
	},
	// The 'biker' and 'cyborg' sheets are ENEMY skins (the ground biker; cyborg-skinned
	// flyer/shooter/charger/brute) — character-sheet enemies only ever animate on 'run'.
	// The extra idle/jump/punch/run_attack frames belonged to the parked multi-class PLAYER
	// system and were removed with it; restore them from git if a class comes back.
	biker: {
		run: { frames: 6, img: loadImage('/sprites/Characters/Biker/Run.png') }
	},
	cyborg: {
		run: { frames: 6, img: loadImage('/sprites/Characters/Cyborg/Run.png') }
	},
	// Compact 48×48 "gadget" sheets (art fills the whole frame, unlike the 48×80
	// character sheets whose art sits in the top portion). Multi-animation: the
	// turret rolls (walk), telegraphs a shot (a sped-up idle), then fires (attack);
	// the drone hovers (idle) and drops bombs (attack).
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
		// smoke_12 is a ground puff (art sits low in the frame) — used for footfalls,
		// muzzle recoil, pickups. smoke_14 is a symmetric burst centred in its frame,
		// so it reads as an explosion when placed on an entity's centre (enemy deaths).
		smoke_12: { frames: 4, speed: 5, img: loadImage('/sprites/Effects/Smoke/12.png') },
		smoke_14: { frames: 6, speed: 5, img: loadImage('/sprites/Effects/Smoke/14.png'), width: 48, height: 48 }
	},
	weapon: {
		gun_1: { img: loadImage('/sprites/Weapons/Guns/7_1.png') }
	},
	hand: {
		punk_3: { img: loadImage('/sprites/Hands/Punk/3.png') }
	},
	projectile: {
		blue: { img: loadImage('/sprites/Bullets/5.png'), width: 30, height: 4 }
	}
}

export default sprites
