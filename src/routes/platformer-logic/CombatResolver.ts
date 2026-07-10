import { get } from 'svelte/store'
import { collision } from './utils'
import { Effect } from './Effect'
import { XpGem } from './XpGem'
import { HealthPack } from './HealthPack'
import { CreditCrate } from './CreditCrate'
import { ENEMY_TYPES } from './enemyTypes'
import { FLAME_HALF_ANGLE, BEAM_HALF_WIDTH, type Weapon } from './Weapon'
import type { Enemy } from './Enemy'
import {
	effectsStore,
	enemiesStore,
	projectilesStore,
	xpGemsStore,
	bombsStore,
	grenadesStore,
	healthPacksStore,
	creditCratesStore
} from '$lib/stores'
import { score, playerHp, maxHp, credits, addXp, gameOver } from '$lib/game'
import { CRIT_MULT } from './upgrades'
import type { GameWorld } from './GameWorld.svelte'

const GRENADE_KNOCKBACK = 6 // outward shove per enemy caught in a Lance-grenade blast
const BEAM_FALLOFF = 0.5 // laser damage multiplier per enemy deeper along the beam
const SHIELD_FLASH_STEPS = 12 // steps the shield break/absorb ring is drawn
const CREDIT_DROP_CHANCE = 0.08 // chance a slain enemy drops a credit crate (rare)
const CREDIT_CRATE_VALUE = 5 // credits banked per crate

// Combat resolution split out of GameWorld: bolt/contact/bomb hits, kills + drops, the base
// shield, life-steal, and the damage-number / shock-ring FX. Reads the run's upgrade stats
// (which live on GameWorld, mutated by upgrades.ts) via `gw`. GameWorld keeps a thin
// `shockwave()` forwarder so passive items (items.ts) trigger blasts through the same path.
export class CombatResolver {
	constructor(private gw: GameWorld) {}

	// Blast at (cx, cy): damage + knockback every enemy within `radius`, spawn a ring + puff.
	// Shared by nova (instant), slam (on landing) and passive items. Kills drop gem/score like a
	// bolt (enemy.hit self-removes, onEnemyKilled banks).
	shockwave(cx: number, cy: number, radius: number, damage: number, knockback: number, color: string) {
		this.gw.shockRings.push({ x: cx, y: cy, max: radius, t: 1, color })
		effectsStore.add(new Effect({ x: cx, y: cy }, 'smoke_14', { centered: true }))
		for (const enemy of enemiesStore.list.slice()) {
			if (enemy.health <= 0) continue // killed earlier this chain — don't double-count
			const ex = enemy.pos.x + enemy.width / 2
			const ey = enemy.pos.y + enemy.height / 2
			const d = Math.hypot(ex - cx, ey - cy)
			if (d > radius) continue
			const nx = (ex - cx) / (d || 1)
			enemy.pos.x += nx * knockback
			enemy.pos.y -= knockback * 0.3 // slight upward pop for feel
			if (damage > 0) {
				this.spawnDamageNumber(ex, enemy.pos.y, damage, false)
				if (enemy.hit(damage)) this.onEnemyKilled(enemy)
			}
		}
	}

	// Pop a floating damage number over (x, y). Crits read bigger + amber. Capped at 60 live
	// numbers so a big explosive chain can't balloon the array.
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

	// Age and draw the floating damage numbers (rise + fade over ~0.7s).
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
			this.gw.ctx.strokeStyle = 'rgba(2, 6, 23, 0.7)' // slate-950 outline for legibility
			this.gw.ctx.strokeText(d.text, d.x, d.y)
			this.gw.ctx.fillText(d.text, d.x, d.y)
			this.gw.ctx.restore()
		}
	}

	// Age and draw the blast rings (nova / slam). Visual only; expands and fades over ~0.32s.
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
	// Chance-based, not per-hit flat, so many small bolts don't trivialise survival.
	private tryLifeSteal() {
		if (this.gw.lifeStealChance <= 0) return
		if (get(playerHp) >= get(maxHp)) return
		if (Math.random() < this.gw.lifeStealChance) {
			playerHp.update((h) => Math.min(get(maxHp), h + 1))
		}
	}

	// Lethal hit: bank score, drop the XP gem (falls under gravity) and, while hurt, maybe a med-kit.
	private onEnemyKilled(enemy: Enemy) {
		score.update((s) => s + 1)
		xpGemsStore.add(
			new XpGem(
				{ x: enemy.pos.x + enemy.width / 2 - 7, y: enemy.pos.y + enemy.height / 2 },
				{ value: enemy.xpValue }
			)
		)
		// Luck raises every drop chance: med-kits and crates roll at base × (1 + luck).
		const luckMul = 1 + this.gw.luck
		if (get(playerHp) < get(maxHp) && Math.random() < ENEMY_TYPES[enemy.kind].medkitDrop * luckMul) {
			healthPacksStore.add(
				new HealthPack({ x: enemy.pos.x + enemy.width / 2 - 9, y: enemy.pos.y + enemy.height / 2 })
			)
		}
		// An elite always drops a fat credit crate (on top of its big gem) to fund the next shop.
		if (enemy.elite) {
			creditCratesStore.add(
				new CreditCrate(
					{ x: enemy.pos.x + enemy.width / 2 - 10, y: enemy.pos.y + enemy.height / 2 },
					{ value: CREDIT_CRATE_VALUE * 3 }
				)
			)
		}
		// Rare credit crate — shop currency (banked on walk-over, spent at the intermission).
		else if (Math.random() < CREDIT_DROP_CHANCE * luckMul) {
			creditCratesStore.add(
				new CreditCrate(
					{ x: enemy.pos.x + enemy.width / 2 - 10, y: enemy.pos.y + enemy.height / 2 },
					{ value: CREDIT_CRATE_VALUE }
				)
			)
		}
		// Passive items react last (an explosive relic may chain more kills; the health guards
		// keep a chain from re-banking an already-dead enemy).
		this.gw.itemsOnKill(enemy)
	}

	// Bullet → enemy hits. Snapshot both pools first: delete() swaps the store arrays
	// mid-loop, so iterate copies.
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
				if (enemy.health <= 0) continue // killed earlier this frame (e.g. item chain)
				const enemyRect = {
					width: enemy.width,
					height: enemy.height,
					top: enemy.pos.y,
					left: enemy.pos.x
				}
				if (collision(enemyRect, projRect)) {
					// Global stats layer over the bolt's damage: +Damage flat, then a Crit roll
					// for CRIT_MULT×.
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
					else this.gw.itemsOnHit(enemy, dmg) // survivor struck (items may react)
					this.tryLifeSteal()
					projectilesStore.delete(projectile)
					break
				}
			}
		}
	}

	// Take `amount` damage + i-frames; 0 HP ends the run. Shared by contact, shots and bomb
	// blasts. The base shield soaks first: a charge is spent (no HP lost), the bubble breaks.
	private damagePlayer(amount = 1) {
		// Dodge: a per-hit roll to avoid the hit. No i-frames, so each overlapping step rolls
		// fresh — a high-dodge build flickers through contact.
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
		// Armor reduces damage reaching HP, but a hit always lands for at least 1.
		const dealt = Math.max(1, Math.round(amount * (1 - this.gw.armorReduction)))
		const hp = get(playerHp) - dealt
		playerHp.set(hp)
		this.gw.invuln = this.gw.invulnSteps
		effectsStore.add(new Effect({ x: this.gw.player.pos.x, y: this.gw.player.pos.y + 28 }, 'smoke_12'))
		this.gw.itemsOnDamaged(dealt) // reactive items (thorns) fire on real HP loss
		if (hp <= 0) gameOver()
	}

	// Regenerate the shield: one charge every shieldRegenSteps while below max and not recently
	// hit (damagePlayer resets the timer). Flash VFX ticks down each step.
	updateShield() {
		if (this.gw.shieldFlash > 0) this.gw.shieldFlash--
		if (this.gw.shieldCharges >= this.gw.shieldMax) return
		this.gw.shieldRegenTimer++
		if (this.gw.shieldRegenTimer >= this.gw.shieldRegenSteps) {
			this.gw.shieldCharges++
			this.gw.shieldRegenTimer = 0
		}
	}

	// Draw the shield bubble (interpolated position): a faint ring while it has charges,
	// plus an expanding burst on a break/absorb.
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
			ctx.globalAlpha = 0.05 + 0.05 * strength // faint fill reads as a bubble
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
			// Some kinds (turret) are harmless to touch — only their bolts bite.
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

	// A detonating bomb hits the player once (single AoE check on the first explosion step).
	// Mark resolved even during i-frames so an old blast can't carry over past them.
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

	// The player's Lance-grenade lobs. Detonate a falling grenade on enemy overlap (mid-arc
	// airbursts — the entity only knows floors/platforms), then apply each armed grenade's blast
	// once via shockwave and remove it. Global +Damage layers on; crit skipped on AoE.
	resolveGrenades() {
		const grenades = grenadesStore.list.slice()
		if (!grenades.length) return
		const foes = enemiesStore.list
		for (const grenade of grenades) {
			if (grenade.state === 'falling') {
				const gRect = {
					left: grenade.pos.x,
					top: grenade.pos.y,
					width: grenade.width,
					height: grenade.height
				}
				for (const enemy of foes) {
					if (enemy.health <= 0) continue
					if (
						collision(gRect, {
							left: enemy.pos.x,
							top: enemy.pos.y,
							width: enemy.width,
							height: enemy.height
						})
					) {
						grenade.detonate()
						break
					}
				}
			}
			if (grenade.state === 'spent' && !grenade.damageApplied) {
				grenade.damageApplied = true
				this.shockwave(
					grenade.centerX,
					grenade.centerY,
					grenade.blastRadius,
					grenade.damage + this.gw.bonusDamage,
					GRENADE_KNOCKBACK,
					'#fb923c' // orange-400 — reads as fire vs the cyan powers
				)
				grenadesStore.delete(grenade)
			}
		}
	}

	// The player's Lance-flammes: a continuous cone damaging EVERY enemy inside it each tick
	// (pierces the crowd). Hit zone (length attackRange, half-angle FLAME_HALF_ANGLE) matches the
	// drawn wedge. Global +Damage layers on; crit skipped (continuous), life-steal procs per hit.
	fireFlame(weapon: Weapon, muzzle: { x: number; y: number }) {
		const range = weapon.attackRange
		const dmg = weapon.damage + this.gw.bonusDamage
		for (const enemy of enemiesStore.list.slice()) {
			if (enemy.health <= 0) continue
			const ex = enemy.pos.x + enemy.width / 2
			const ey = enemy.pos.y + enemy.height / 2
			const dx = ex - muzzle.x
			const dy = ey - muzzle.y
			if (Math.hypot(dx, dy) > range) continue
			// Angular gap between the enemy and the aim, wrapped to [-π, π].
			let diff = Math.atan2(dy, dx) - weapon.angle
			diff = Math.atan2(Math.sin(diff), Math.cos(diff))
			if (Math.abs(diff) > FLAME_HALF_ANGLE) continue
			this.spawnDamageNumber(ex, enemy.pos.y, dmg, false)
			if (enemy.hit(dmg)) this.onEnemyKilled(enemy)
			else this.gw.itemsOnHit(enemy, dmg)
			this.tryLifeSteal()
		}
	}

	// The player's Laser: a continuous piercing beam. Raycast from the muzzle, collect every enemy
	// the thick ray crosses within range, then damage front-to-back with per-enemy falloff until it
	// rounds to nothing (soft pierce cap). Global +Damage feeds the front hit; crit skipped.
	fireBeam(weapon: Weapon, muzzle: { x: number; y: number }) {
		const range = weapon.attackRange
		const dirX = Math.cos(weapon.angle)
		const dirY = Math.sin(weapon.angle)
		const base = weapon.damage + this.gw.bonusDamage
		const hits: { enemy: Enemy; proj: number }[] = []
		for (const enemy of enemiesStore.list.slice()) {
			if (enemy.health <= 0) continue
			const rx = enemy.pos.x + enemy.width / 2 - muzzle.x
			const ry = enemy.pos.y + enemy.height / 2 - muzzle.y
			const proj = rx * dirX + ry * dirY // distance along the beam (negative = behind muzzle)
			if (proj < 0 || proj > range) continue
			const perp = Math.abs(rx * -dirY + ry * dirX) // perpendicular distance to the beam
			if (perp > (enemy.width + enemy.height) / 4 + BEAM_HALF_WIDTH) continue
			hits.push({ enemy, proj })
		}
		if (!hits.length) return
		hits.sort((a, b) => a.proj - b.proj) // nearest first → falloff applies front-to-back
		for (let k = 0; k < hits.length; k++) {
			const dmg = Math.round(base * BEAM_FALLOFF ** k)
			if (dmg <= 0) break // sorted by distance — everything deeper gets even less
			const enemy = hits[k].enemy
			this.spawnDamageNumber(enemy.pos.x + enemy.width / 2, enemy.pos.y, dmg, false)
			if (enemy.hit(dmg)) this.onEnemyKilled(enemy)
			else this.gw.itemsOnHit(enemy, dmg)
			this.tryLifeSteal()
		}
	}

	// Walk over a dropped gem (magnet eases the last few px) to bank its XP. Uncollected
	// gems expire on the floor, so a pure camper forfeits them.
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

	// Walk over a med-kit to heal — only while hurt, so a full-HP player leaves it to grab
	// later. Uncollected kits expire.
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
	// any time the run is live, including the walk back to the shop at intermission.
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
