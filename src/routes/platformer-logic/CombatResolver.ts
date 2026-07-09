import { get } from 'svelte/store'
import { collision } from './utils'
import { Effect } from './Effect'
import { XpGem } from './XpGem'
import { HealthPack } from './HealthPack'
import { CreditCrate } from './CreditCrate'
import { ENEMY_TYPES } from './enemyTypes'
import type { Enemy } from './Enemy'
import {
	effectsStore,
	enemiesStore,
	projectilesStore,
	xpGemsStore,
	bombsStore,
	healthPacksStore,
	creditCratesStore
} from '$lib/stores'
import { score, playerHp, maxHp, credits, addXp, gameOver } from '$lib/game'
import { CRIT_MULT } from './upgrades'
import type { GameWorld } from './GameWorld.svelte'

const SHIELD_FLASH_STEPS = 12 // steps the shield break/absorb ring is drawn
const CREDIT_DROP_CHANCE = 0.08 // chance a slain enemy drops a credit crate (rare)
const CREDIT_CRATE_VALUE = 5 // credits banked per crate

// Combat resolution, split out of GameWorld: bolt/contact/bomb hits, kills + drops, the base
// shield, life-steal, and the floating damage-number / shock-ring FX. It operates on its host
// GameWorld's run state (player, i-frames, the XP-pool stat fields, the FX arrays) — the run's
// upgrade stats still live on GameWorld (mutated by upgrades.ts), so this reads them via `gw`.
// GameWorld keeps a thin `shockwave()` forwarder so passive items (items.ts) still trigger blasts
// through the same path, and drives the player's weapons/powers itself (they call shockwave here).
export class CombatResolver {
	constructor(private gw: GameWorld) {}

	// A blast at (cx, cy): damage + knockback every enemy within `radius`, spawn an expanding
	// ring + a burst puff. Shared by nova (instant) and slam (on landing). A killing blow drops
	// its gem/score the same way a bolt would — enemy.hit self-removes and onEnemyKilled banks.
	// Public so passive items (thorns, explosive) can trigger their own blasts through the same path.
	shockwave(cx: number, cy: number, radius: number, damage: number, knockback: number, color: string) {
		this.gw.shockRings.push({ x: cx, y: cy, max: radius, t: 1, color })
		effectsStore.add(new Effect({ x: cx, y: cy }, 'smoke_14', { centered: true }))
		for (const enemy of enemiesStore.list.slice()) {
			if (enemy.health <= 0) continue // already killed this chain — don't double-count the kill
			const ex = enemy.pos.x + enemy.width / 2
			const ey = enemy.pos.y + enemy.height / 2
			const d = Math.hypot(ex - cx, ey - cy)
			if (d > radius) continue
			const nx = (ex - cx) / (d || 1)
			enemy.pos.x += nx * knockback
			enemy.pos.y -= knockback * 0.3 // a little upward pop for feel
			if (damage > 0) {
				this.spawnDamageNumber(ex, enemy.pos.y, damage, false)
				if (enemy.hit(damage)) this.onEnemyKilled(enemy)
			}
		}
	}

	// Pop a floating damage number over (x, y). Crits read bigger + amber. Capped at 60 live numbers
	// so a big explosive chain can't balloon the array.
	private spawnDamageNumber(x: number, y: number, amount: number, crit = false) {
		if (this.gw.damageNumbers.length >= 60) this.gw.damageNumbers.shift()
		this.gw.damageNumbers.push({
			x: x + (Math.random() - 0.5) * 14,
			y,
			vy: -0.6,
			t: 1,
			text: `${amount}`,
			color: crit ? '#fbbf24' : '#e2e8f0', // amber-400 / slate-200
			size: crit ? 20 : 13
		})
	}

	// Age and draw the floating damage numbers (rise + fade over ~0.7s). Over everything, like rings.
	drawDamageNumbers(frameTime: number) {
		for (let i = this.gw.damageNumbers.length - 1; i >= 0; i--) {
			const d = this.gw.damageNumbers[i]
			d.t -= frameTime / 700
			d.y += (d.vy * frameTime) / 16
			if (d.t <= 0) {
				this.gw.damageNumbers.splice(i, 1)
				continue
			}
			this.gw.ctx.save()
			this.gw.ctx.globalAlpha = Math.max(0, Math.min(1, d.t * 1.4))
			this.gw.ctx.fillStyle = d.color
			this.gw.ctx.font = `700 ${d.size}px ui-monospace, monospace`
			this.gw.ctx.textAlign = 'center'
			this.gw.ctx.textBaseline = 'middle'
			this.gw.ctx.lineWidth = 3
			this.gw.ctx.strokeStyle = 'rgba(2, 6, 23, 0.7)' // slate-950 outline for legibility over sprites
			this.gw.ctx.strokeText(d.text, d.x, d.y)
			this.gw.ctx.fillText(d.text, d.x, d.y)
			this.gw.ctx.restore()
		}
	}

	// Age and draw the blast rings (nova / slam). Purely visual; expands and fades over ~0.32s.
	drawShockRings(frameTime: number) {
		for (let i = this.gw.shockRings.length - 1; i >= 0; i--) {
			const ring = this.gw.shockRings[i]
			ring.t -= frameTime / 320
			if (ring.t <= 0) {
				this.gw.shockRings.splice(i, 1)
				continue
			}
			const grow = 0.45 + (1 - ring.t) * 0.95 // 45% → ~140% of the blast radius
			this.gw.ctx.save()
			this.gw.ctx.globalAlpha = Math.max(0, ring.t)
			this.gw.ctx.strokeStyle = ring.color
			this.gw.ctx.lineWidth = 4
			this.gw.ctx.beginPath()
			this.gw.ctx.arc(ring.x, ring.y, ring.max * grow, 0, Math.PI * 2)
			this.gw.ctx.stroke()
			this.gw.ctx.restore()
		}
	}

	// Life Steal stat: a connecting bolt has `lifeStealChance` to heal 1 HP (capped at max).
	// Chance-based rather than per-hit flat so the many small bolts don't trivialise survival.
	private tryLifeSteal() {
		if (this.gw.lifeStealChance <= 0) return
		if (get(playerHp) >= get(maxHp)) return
		if (Math.random() < this.gw.lifeStealChance) {
			playerHp.update((h) => Math.min(get(maxHp), h + 1))
		}
	}

	// Enemy took a lethal hit: bank score, drop its XP gem (falls under gravity) and,
	// while the player is hurt, maybe a med-kit.
	private onEnemyKilled(enemy: Enemy) {
		score.update((s) => s + 1)
		xpGemsStore.add(
			new XpGem(
				{ x: enemy.pos.x + enemy.width / 2 - 7, y: enemy.pos.y + enemy.height / 2 },
				{ value: enemy.xpValue }
			)
		)
		// Luck raises every drop chance (Brotato-style): med-kits and credit crates roll at
		// (base × (1 + luck)).
		const luckMul = 1 + this.gw.luck
		if (get(playerHp) < get(maxHp) && Math.random() < ENEMY_TYPES[enemy.kind].medkitDrop * luckMul) {
			healthPacksStore.add(
				new HealthPack({ x: enemy.pos.x + enemy.width / 2 - 9, y: enemy.pos.y + enemy.height / 2 })
			)
		}
		// An elite always drops a fat credit crate (its whole point as a milestone reward), on top of
		// its big gem — so clearing one meaningfully funds the next shop.
		if (enemy.elite) {
			creditCratesStore.add(
				new CreditCrate(
					{ x: enemy.pos.x + enemy.width / 2 - 10, y: enemy.pos.y + enemy.height / 2 },
					{ value: CREDIT_CRATE_VALUE * 3 }
				)
			)
		}
		// Rare credit crate — the shop currency (banked on walk-over, spent at the intermission).
		else if (Math.random() < CREDIT_DROP_CHANCE * luckMul) {
			creditCratesStore.add(
				new CreditCrate(
					{ x: enemy.pos.x + enemy.width / 2 - 10, y: enemy.pos.y + enemy.height / 2 },
					{ value: CREDIT_CRATE_VALUE }
				)
			)
		}
		// Passive items react to the kill last (an explosive relic may chain into more kills — the
		// shockwave/resolveHits health guards keep a chain from re-banking an already-dead enemy).
		this.gw.itemsOnKill(enemy)
	}

	// Bullet → enemy hits. Snapshot both pools first: delete() swaps the store arrays
	// mid-loop, so iterate copies (the old writable froze the loop the same way).
	resolveHits() {
		const projs = projectilesStore.list.slice()
		const foes = enemiesStore.list.slice()
		if (!projs.length || !foes.length) return
		for (const projectile of projs) {
			if (projectile.hostile) continue // enemy shots don't hit enemies
			const projRect = {
				width: projectile.width,
				height: projectile.height,
				top: projectile.pos.y - projectile.height / 2,
				left: projectile.pos.x - projectile.width / 2
			}
			for (const enemy of foes) {
				if (enemy.health <= 0) continue // killed earlier this frame (e.g. an item chain) — skip
				const enemyRect = {
					width: enemy.width,
					height: enemy.height,
					top: enemy.pos.y,
					left: enemy.pos.x
				}
				if (collision(enemyRect, projRect)) {
					// Global stats layer over the bolt's own damage: +Damage flat, then a Crit
					// roll for CRIT_MULT×. A killing bolt drops XP (tumbles under gravity, so the
					// player must leave a safe perch to bank it) and, while hurt, maybe a med-kit.
					let dmg = projectile.damage + this.gw.bonusDamage
					let crit = false
					if (this.gw.critChance > 0 && Math.random() < this.gw.critChance) {
						crit = true
						dmg = Math.round(dmg * CRIT_MULT)
						effectsStore.add(
							new Effect(
								{ x: enemy.pos.x + enemy.width / 2, y: enemy.pos.y + enemy.height / 2 },
								'smoke_14',
								{ centered: true }
							)
						)
					}
					this.spawnDamageNumber(enemy.pos.x + enemy.width / 2, enemy.pos.y, dmg, crit)
					if (enemy.hit(dmg)) this.onEnemyKilled(enemy)
					else this.gw.itemsOnHit(enemy, dmg) // a survivor was struck (items may react)
					this.tryLifeSteal() // a connecting bolt may heal (Life Steal stat)
					projectilesStore.delete(projectile)
					break
				}
			}
		}
	}

	// Take `amount` damage + i-frames; 0 HP ends the run. Shared by contact, shots
	// and bomb blasts (each passes its own scaled damage). The base shield soaks the hit
	// first: a charge is spent (no HP lost) and the bubble breaks briefly instead.
	private damagePlayer(amount = 1) {
		// Dodge (Brotato): a per-hit roll to avoid the hit entirely. No i-frames granted, so each
		// overlapping step rolls fresh — a high-dodge build flickers through contact.
		if (this.gw.dodgeChance > 0 && Math.random() < this.gw.dodgeChance) {
			effectsStore.add(new Effect({ x: this.gw.player.pos.x, y: this.gw.player.pos.y + 28 }, 'smoke_12'))
			return
		}
		this.gw.shieldRegenTimer = 0 // any incoming damage stalls shield regen
		if (this.gw.shieldCharges > 0) {
			this.gw.shieldCharges--
			this.gw.invuln = this.gw.invulnSteps
			this.gw.shieldFlash = SHIELD_FLASH_STEPS
			this.gw.shieldFlashBig = this.gw.shieldCharges === 0 // full break reads bigger
			return
		}
		// Armor reduces the damage that reaches HP, but a hit always lands for at least 1 so it
		// still stings (matters most against the bigger late-wave hits).
		const dealt = Math.max(1, Math.round(amount * (1 - this.gw.armorReduction)))
		const hp = get(playerHp) - dealt
		playerHp.set(hp)
		this.gw.invuln = this.gw.invulnSteps
		effectsStore.add(new Effect({ x: this.gw.player.pos.x, y: this.gw.player.pos.y + 28 }, 'smoke_12'))
		this.gw.itemsOnDamaged(dealt) // reactive items (thorns) fire on a real HP loss
		if (hp <= 0) gameOver()
	}

	// Regenerate the shield: one charge every shieldRegenSteps while below max and not
	// recently hit (damagePlayer resets the timer). The flash VFX ticks down each step.
	updateShield() {
		if (this.gw.shieldFlash > 0) this.gw.shieldFlash--
		if (this.gw.shieldCharges >= this.gw.shieldMax) return
		this.gw.shieldRegenTimer++
		if (this.gw.shieldRegenTimer >= this.gw.shieldRegenSteps) {
			this.gw.shieldCharges++
			this.gw.shieldRegenTimer = 0
		}
	}

	// Draw the shield bubble around the player (interpolated position): a steady faint
	// ring while it has charges, plus an expanding burst on a break/absorb.
	drawShield(alpha: number) {
		const px = this.gw.player.prevPos.x + (this.gw.player.pos.x - this.gw.player.prevPos.x) * alpha
		const py = this.gw.player.prevPos.y + (this.gw.player.pos.y - this.gw.player.prevPos.y) * alpha
		const cx = px + this.gw.player.width / 2
		const cy = py + this.gw.player.height / 2
		const baseR = this.gw.player.width * 0.72
		const ctx = this.gw.ctx
		if (this.gw.shieldFlash > 0) {
			const t = 1 - this.gw.shieldFlash / SHIELD_FLASH_STEPS // 0 → 1 over the burst
			ctx.save()
			ctx.globalAlpha = Math.max(0, 1 - t)
			ctx.strokeStyle = '#67e8f9' // cyan-300
			ctx.lineWidth = this.gw.shieldFlashBig ? 4 : 2
			ctx.beginPath()
			ctx.arc(cx, cy, baseR + (this.gw.shieldFlashBig ? 42 : 22) * t, 0, Math.PI * 2)
			ctx.stroke()
			ctx.restore()
		}
		if (this.gw.shieldCharges > 0) {
			const strength = this.gw.shieldCharges / Math.max(1, this.gw.shieldMax)
			ctx.save()
			ctx.strokeStyle = '#38bdf8' // sky-400
			ctx.shadowColor = '#38bdf8'
			ctx.shadowBlur = 8
			ctx.lineWidth = 2
			ctx.globalAlpha = 0.14 + 0.16 * strength
			ctx.beginPath()
			ctx.arc(cx, cy, baseR, 0, Math.PI * 2)
			ctx.stroke()
			ctx.globalAlpha = 0.05 + 0.05 * strength // faint fill so it reads as a bubble
			ctx.fillStyle = '#38bdf8'
			ctx.fill()
			ctx.restore()
		}
	}

	// Enemy contact → player takes a hit (unless in i-frames).
	resolvePlayerDamage() {
		if (this.gw.invuln > 0) return
		const playerRect = {
			width: this.gw.player.width,
			height: this.gw.player.height,
			top: this.gw.player.pos.y,
			left: this.gw.player.pos.x
		}
		for (const enemy of enemiesStore.list) {
			// Some kinds (the turret) are harmless to touch — only their bolts bite.
			if (ENEMY_TYPES[enemy.kind].contactDamage === false) continue
			const enemyRect = {
				width: enemy.width,
				height: enemy.height,
				top: enemy.pos.y,
				left: enemy.pos.x
			}
			if (collision(playerRect, enemyRect)) {
				this.damagePlayer(enemy.damage)
				break
			}
		}
	}

	// Hostile bolt hits the player → a hit, and the bolt is spent.
	resolveEnemyShots() {
		if (this.gw.invuln > 0) return
		const playerRect = {
			width: this.gw.player.width,
			height: this.gw.player.height,
			top: this.gw.player.pos.y,
			left: this.gw.player.pos.x
		}
		for (const projectile of projectilesStore.list) {
			if (!projectile.hostile) continue
			const projRect = {
				width: projectile.width,
				height: projectile.height,
				top: projectile.pos.y - projectile.height / 2,
				left: projectile.pos.x - projectile.width / 2
			}
			if (collision(playerRect, projRect)) {
				this.damagePlayer(projectile.damage)
				projectilesStore.delete(projectile)
				break
			}
		}
	}

	// A detonating bomb hits the player once (a single AoE check on the first step
	// of its explosion). Mark it resolved even during i-frames so an old blast can
	// never carry over and hit after the i-frames lapse.
	resolveBombs() {
		for (const bomb of bombsStore.list) {
			if (bomb.state !== 'exploding' || bomb.damageApplied) continue
			bomb.damageApplied = true
			if (this.gw.invuln > 0) continue
			const dx = this.gw.player.pos.x + this.gw.player.width / 2 - bomb.centerX
			const dy = this.gw.player.pos.y + this.gw.player.height / 2 - bomb.centerY
			if (Math.hypot(dx, dy) <= bomb.blastRadius) this.damagePlayer(bomb.damage)
		}
	}

	// Walk over a dropped gem (the pickup magnet eases the last few pixels) to bank
	// its XP. Uncollected gems expire on the floor, so a pure camper forfeits them.
	resolveGemPickups() {
		const gems = xpGemsStore.list.slice()
		if (!gems.length) return
		const playerRect = {
			width: this.gw.player.width,
			height: this.gw.player.height,
			top: this.gw.player.pos.y,
			left: this.gw.player.pos.x
		}
		for (const gem of gems) {
			const gemRect = { width: gem.width, height: gem.height, top: gem.pos.y, left: gem.pos.x }
			if (collision(playerRect, gemRect)) {
				const ups = addXp(gem.value * this.gw.xpMul)
				if (ups > 0) this.gw.queueLevelUps(ups)
				xpGemsStore.delete(gem)
			}
		}
	}

	// Walk over a med-kit to heal — only while hurt, so a full-HP player leaves it on
	// the ground to grab later. Uncollected kits expire.
	resolveHealthPickups() {
		const packs = healthPacksStore.list.slice()
		if (!packs.length || get(playerHp) >= get(maxHp)) return
		const playerRect = {
			width: this.gw.player.width,
			height: this.gw.player.height,
			top: this.gw.player.pos.y,
			left: this.gw.player.pos.x
		}
		for (const pack of packs) {
			const packRect = { width: pack.width, height: pack.height, top: pack.pos.y, left: pack.pos.x }
			if (collision(playerRect, packRect)) {
				playerHp.update((h) => Math.min(get(maxHp), h + pack.heal))
				effectsStore.add(new Effect({ x: pack.pos.x, y: pack.pos.y }, 'smoke_12'))
				healthPacksStore.delete(pack)
			}
		}
	}

	// Walk over a credit crate to bank its value (no magnet — a deliberate detour). Collectable
	// any time the run is live, including on the walk back to the shop during the intermission.
	resolveCreditPickups() {
		const crates = creditCratesStore.list.slice()
		if (!crates.length) return
		const playerRect = {
			width: this.gw.player.width,
			height: this.gw.player.height,
			top: this.gw.player.pos.y,
			left: this.gw.player.pos.x
		}
		for (const crate of crates) {
			const crateRect = { width: crate.width, height: crate.height, top: crate.pos.y, left: crate.pos.x }
			if (collision(playerRect, crateRect)) {
				credits.update((c) => c + crate.value)
				effectsStore.add(new Effect({ x: crate.pos.x, y: crate.pos.y }, 'smoke_12'))
				creditCratesStore.delete(crate)
			}
		}
	}
}
