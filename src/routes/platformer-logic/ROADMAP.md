# Mini-jeu — Roadmap

## Focus actuel : polir le jeu de base (un seul perso)

On revient au **perso de base (le Punk, tir auto à distance)** pour rendre le jeu **plus
fluide, plus sympa** avant d'ajouter du contenu. Le système multi-perso a été **parqué**
(cf. ci-dessous) — l'archi data-driven reste en place (registre `CHARACTERS` + dispatch
`attackStyle`) comme point d'accroche, mais une seule classe est active.

Idées de polish / feel à explorer (à trier ensemble) :

- [x] **Vagues à thèmes** (`waves.ts`) : courbe authored au lieu du ramp continu. Chaque
  vague introduit **un** vecteur à la fois (bikers → volants → brute → tireurs → chargers →
  tourelles → bombardiers), tir tard, avance de départ plus lente (base 2,6 × speedMul).
  Table `WAVES` (1→10) + tail procédural borné ; nom du thème dans la bannière. Durée :
  14s pour V1-V2 (on-ramp), **30s à partir de V3** (`waveDuration`). À tuner : les
  `cap`/`interval`/`speedMul`/`floors` par vague. Thèmes plus poussés → quand on aura plus
  d'ennemis.
- [x] **Balance / bonus** : arme lvl 1 nerfée (cadence 28, projectiles lents à 8) ; tirs
  ennemis à 70% ; bombes de drone bien plus visibles (anneau d'alerte). Bonus revus dans
  `upgrades.ts` : +Velocity (proj. rapides), +Regen (1 PV/5s cumulable), +Spring (saut) ;
  Focus rare & fort (÷2 dispersion), Magnet costaud & rare (+50) ; Iron (invuln) retiré.
- [x] **Bouclier de base** : bulle qui absorbe 1 coup (base), éclate brièvement, régénère
  1 charge / 8s (timer remis à zéro à chaque dégât). Interception centralisée dans
  `GameWorld.damagePlayer` (couvre contact/tirs/bombes). Bonus `bulwark` (+1 charge, cap 4)
  & `recharge` (+20% vitesse, plancher 3s). Idées suivantes : reflet de projectile, charge
  qui explose en dégâts de zone au break.
- [x] **Repos entre vagues + arène procédurale** : la phase de combat dure un temps borné
  (30s V1, +10s/vague, plafond 60s — `waveDuration`), puis **intermission** : le terrain est
  vidé (ennemis/tirs/bombes), gems/soins conservés pour le mop-up. Le joueur doit **revenir
  sur le pédestal** (bouton Start, `atSpawn` = overlap horizontal + pieds près du haut) où un
  **glow d'appel** pulse ; il doit **tenir la position `SPAWN_DWELL_MS` (1,5s)** — barre de
  charge dans le prompt, glow qui s'intensifie. Pendant le maintien, l'**ancien layout se
  fond (renderAlpha 1→0) et le nouveau apparaît (0→1)** ; à la fin, **flash** (`SPAWN_FLASH_MS`)
  et la vague suivante démarre sur les nouvelles ledges (`buildLayout`, `Platform.visible`).
  Consts tunables : `SPAWN_DWELL_MS`, `SPAWN_FLASH_MS`, nombre/placement des ledges.
- [x] **Portails d'ennemis** (`Portal.ts`) : au lieu d'éparpiller les ennemis un par un
  depuis les bords (illisible, jamais jouissif à nettoyer), le spawn director **ouvre des
  rifts porteurs d'un batch**. Un portail **télégraphe 2s** (`PORTAL_OPEN_MS`, aucun ennemi),
  puis **déverse sa horde** un ennemi toutes les 200ms (`PORTAL_EMIT_MS`), puis se referme
  (`PORTAL_CLOSE_MS`). Placement : rift **aérien** (bande d'altitude, côté alterné) pour les
  volants, rift **au sol** (bord d'écran de préférence, parfois sur une ledge/perche) pour les
  marcheurs. Les **tourelles** ne passent pas par un portail (elles perchent direct — unité
  unique, pas un problème de dispersion). Le cerveau existant (floors/deficit/cull) est gardé
  et sert à **assembler le batch** (`pickSpawnKind` → `MAX_HORDE`) ; les ennemis en file dans
  un rift comptent dans le cap (`queuedCount`) pour ne pas surremplir pendant le télégraphe.
  Visuel : rift fuchsia/violet (hostile — distinct du glow cyan ami du pédestal). Consts
  tunables : `PORTAL_OPEN_MS`, `PORTAL_EMIT_MS`, `MAX_ACTIVE_PORTALS` (2), `MAX_HORDE` (6).
- [ ] Feedback de tir (recul, muzzle flash, screenshake léger).
- [ ] Feedback d'impact / de mort plus lisible.
- [ ] Feel du déplacement (accel/decel, coyote time, saut).
- [ ] Lisibilité (contraste ennemis/CV, télégraphes d'attaque).
- [ ] Audio / juice.

> Analyse à part : extraire la logique en **jeu navigateur autonome** (plateformes réelles,
> caméra, scrolling, scalabilité JS) → voir [`EXTRACTION.md`](./EXTRACTION.md).

## Cap suivant : refonte gameplay & économie (façon Brotato / DRG Survivor)

Sortir du modèle « Vampire Survivors » (une seule monnaie XP, choix gratuit forcé) vers une
**double couche** : XP = progression *forcée* générique ; crédits = pouvoir d'achat *choisi*,
spécifique. Cinq systèmes, à construire dans cet ordre. **Décisions prises** : (1er chantier)
**portails** ✅ ; armes = **archétypes mécaniquement distincts** (pas juste des skins) ;
2e arme + pouvoir S = **récompense de palier de niveau** (carte spéciale, pas via boutique).

1. **[x] Portails** (fait — cf. section polish ci-dessus). Indépendant des 4 autres.
2. **[x] Refonte XP** : les gemmes **ne despawnent plus** (`XpGem` : plus de `LIFETIME`/blink —
   l'XP du run est toujours banquable, tension spatiale et non temporelle) ; **level-up = full PV**
   (`chooseUpgrade`, appliqué *après* le pick pour que PV Max remonte au nouveau cap).
   **Pool XP = stats globales façon Brotato** (mis à jour après le chantier 5, cf. plus bas) :
   le pool ne contient plus **que des stats de personnage génériques**, le réglage par arme/pouvoir
   ayant migré à la boutique. Le flag intérimaire `WEAPON_UPGRADES_IN_XP` a été **retiré**.
3. **[x] Deux armes** — fait :
   - `WEAPON_TYPES` (`weaponTypes.ts`, jumeau d'`ENEMY_TYPES`) : 4 archétypes distincts —
     `pistol` (équilibré), `rifle` (lent/longue portée/gros dégâts), `shotgun` (5 plombs cône
     large courte portée), `smg` (cadence folle spray court). Différenciés par les stats
     (cadence/count/spread/portée/vitesse), pas juste le skin.
   - Classe `Weapon` : muzzle + visée + cadence + stats upgradables **par arme** ; vise l'ennemi
     le plus proche **de son muzzle** via `nearestEnemy({pos:muzzle,width:0,height:0}, …)` (0 modif
     `los.ts`). `Player.weapons: Weapon[]`, `Player.equip(kinds)` (1 = centrée, 2 = gauche/droite).
     `GameWorld.playerCombat` pilote chaque arme (vise + tire sur sa propre cadence).
   - Perso = **châssis** : `CharacterType` perd les stats de combat, gagne `weapons: WeaponKind[]`.
   - Upgrades d'arme retargées sur **toutes les armes tenues** (`forEach`) — deviendront per-arme
     à la boutique (chantier 5). Skins dans `archive/static-unused/sprites/Weapons/{Guns,Rifles}`.
   - **Carte-palier faite** : au niveau `WEAPON_MILESTONE_LEVEL` (3), si le joueur est encore
     mono-arme, le level-up propose une **carte spéciale « NOUVELLE ARME »** (fuchsia, non
     rerollable, définitive) → choix de la 2e arme parmi les archétypes non tenus
     (`weaponChoices`). `Player.addWeapon` ajoute sans réinitialiser la 1re (upgrades préservées).
     Le Punk redémarre **mono-pistolet**. Flags reset par run (`weaponMilestoneDone`).
   - **Choix de l'arme de départ** : START (ou RESTART) ouvre un **picker « ARME DE DÉPART »**
     (`weaponSelectOpen`/`launchWith` dans `game.ts`, overlay dans `GameWrapper`, clic ou touches
     1-4) → `GameWorld` équipe `startingWeapon` au démarrage du run. La 2e arme reste le palier.
   - Polish différé : muzzle-flash (_2 frames), et l'arme de départ n'est pas encore filtrée hors
     du palier au cas où on veut la même en double (aujourd'hui le palier ne propose que les autres).
4. **[x] Pouvoir spécial (touche S)** — fait :
   - `POWER_TYPES` (`powerTypes.ts`, 3e jumeau d'`ENEMY_TYPES`/`WEAPON_TYPES`) : 3 archétypes
     mécaniquement distincts, chacun sur un contexte d'input différent — `dash` (esquive
     directionnelle invulnérable, dir tenue sinon face), `slam`/**Onde de choc** (en l'air : plonge
     i-framée → souffle de zone à l'atterrissage ; au sol : stomp direct), `nova` (explosion
     instantanée tout autour, bouton panique). Dégâts + recul + anneau de souffle partagés
     (`GameWorld.shockwave`, réutilise `enemy.hit`/`onEnemyKilled`).
   - Classe `Power` (`Power.ts`, jumelle de `Weapon`) : porte le cooldown + copies mutables des
     stats (upgradeables plus tard côté boutique). `Player.power: Power | null`, `equipPower(kind)`,
     états moteur `dashSteps`/`dashVX`/`slamming` sur le Player. Dispatch par `kind` dans
     `GameWorld.activatePower` (seam comme `attackStyle`/`behavior`).
   - **Input** : `S` = front montant dans `controller.ts` (`keys.power`, ignore la répétition OS,
     comme le saut), consommé dans la boucle (`GameWorld.updatePower`). `down` reste tracké pour un
     futur pouvoir maintien→relâche mais ne pilote toujours rien.
   - **Carte-palier** : au niveau `POWER_MILESTONE_LEVEL` (5), si le joueur n'a pas de pouvoir, le
     level-up propose une carte spéciale **« NOUVEAU POUVOIR »** (indigo, non rerollable, définitive)
     → `powerChoices`. L'état milestone est généralisé (`GameWorld.milestone: 'weapon' | 'power' | null`,
     ex-`isWeaponMilestone`). HUD : badge glyphe + jauge de recharge sous la barre d'XP (`drawPowerHud`).
   - Polish différé : pas d'upgrades de pouvoir dans le pool XP (scope `power`, viendront à la
     boutique) ; feel à tuner (portées/cooldowns/dégâts) ; combo maintien→relâche (charge) pas encore
     câblé ; sprites/VFX dédiés (anneau canvas + puff `smoke_14` pour l'instant).
5. **[x] Crédits + boutique d'intermission** — fait :
   - **Monnaie** : store `credits` (`game.ts`, reset par run), lue dans le HUD (`◈ N` ambre en haut
     à droite). Nouveau drop **caisse de crédits** (`CreditCrate.ts` + `creditCratesStore`) : drop
     **rare** (`CREDIT_DROP_CHANCE` 8%) sur mort d'ennemi, tombe au sol, **pas de magnet** (détour
     volontaire), **ne despawne pas** (la monnaie ne se perd jamais avant la boutique). Ramassée à
     l'overlap (`resolveCreditPickups`), y compris pendant le retour au pédestal.
   - **La boutique réutilise l'intermission** : arriver sur le pédestal (ex-« maintien pour
     continuer ») **ouvre la boutique** (`GameWorld.updateIntermission` → `openShop`), qui **gèle la
     sim** (ajoutée à la condition `paused`). `SHOP_SLOTS` (3) offres payantes ; acheter paie, applique
     et **réapprovisionne ce seul slot** (`buyOffer`, exclut les autres slots visibles). Le bouton
     **LANCER LA VAGUE ▶** (ou Entrée/Échap, touches 1·2·3 pour acheter) démarre la vague suivante.
   - **Offres spécifiques à chaque arme/pouvoir** : `rollShopOffers`/`buildShopCandidates`
     (`upgrades.ts`) lient un template à une **instance** concrète — `Pistolet · Cadence +18%`,
     `Nova · Rayon +30`… Les upgrades d'arme deviennent enfin **per-arme** (un dual-wield règle
     chaque flingue séparément) ; les upgrades de pouvoir (Recharge/Dégâts/Rayon) se gèrent hors du
     pool XP (dash ne voit que Recharge). Overlay `{#if world.shopOpen}` dans `GameWrapper` (accent
     ambre, coûts, désactivé si trop cher).
   - Note : la refonte remplace le **crossfade d'arène au maintien** (la boutique EST le nouveau rôle
     du pédestal) ; le flash de spawn couvre le swap de layout à `startNextWave`.
   - Polish différé / **option en réserve** : **intérêt** (bonus % sur le stock non dépensé — la
     tension Brotato) ; reroll payant des offres ; scaler la valeur/le drop des caisses par vague ;
     sprite dédié de caisse (dessin canvas ambre pour l'instant).

### Pool XP refondu façon Brotato (post-chantier 5)

Le pool d'XP est passé de « upgrades d'arme + divers » à **11 stats globales de personnage** (façon
Brotato) — `UPGRADES` dans `upgrades.ts`, toutes `scope: 'generic'`. Le réglage par arme/pouvoir
vit désormais **uniquement à la boutique**. Nouvelles stats + où elles agissent (`GameWorld`) :

- **Dégâts** (`bonusDamage`, +1/tir), **Cadence** (`fireRateMul`, ×0.9, plancher `MIN_FIRE_MUL`),
  **Chance de critique** (`critChance`, ×`CRIT_MULT`=2, cap `MAX_CRIT`), **Portée** (`rangeBonus`,
  +60, cap `MAX_RANGE_BONUS`), **Vol de vie** (`lifeStealChance`, proc de soin sur tir touché) →
  appliqués dans `playerCombat`/`resolveHits`/`tryLifeSteal`.
- **PV Max** (store `maxHp`+soin), **Armure** (`armorReduction`, dégâts subis ×(1-r), min 1),
  **Esquive** (`dodgeChance`, roll par coup, sans i-frames), **Régénération** (`regenPerStep`) →
  `damagePlayer`/`applyRegen`.
- **Vitesse** (`player.speed`), **Chance** (`luck`, ×(1+luck) sur les drops soins/crédits) →
  `onEnemyKilled`.
- Caps/pas centralisés en tête d'`upgrades.ts` (`MAX_CRIT/DODGE/ARMOR/LIFESTEAL/RANGE_BONUS`,
  `MIN_FIRE_MUL`, `CRIT_MULT`). **Retirés du pool XP** (base-only désormais) : Magnet, Spring
  (saut), Bouclier (Bulwark/Recharge), Greed — à réintégrer plus tard si besoin (boutique ou pool).
  Polish : pas de nombres flottants de dégâts/crit (juste un burst sur crit), à tuner (pas/caps).

### Objets passifs & hooks (3ᵉ canal d'acquisition — `items.ts`)

Troisième canal, à côté du pool XP (stats forcées) et de la boutique arme/pouvoir (réglage choisi) :
des **reliques run-scoped** achetées sur un **2ᵉ tableau de la boutique** (touches 4·5·6). Le point
clé est **architectural** : ajouter du contenu = **ajouter une entrée de data**, jamais éditer le
moteur.

- **Registry** `ITEM_TYPES` (`items.ts`) : chaque objet a `id/name/blurb/glyph/color/cost/maxStacks`
  + les **hooks** auxquels il s'abonne. Instance = `ItemInstance` (`stacks` + `state: Record<string,
  number>` pour l'état par copie, ex. positions/timers de drone).
- **Hooks fan-out** (`GameWorld`, boucles fines `itemsOnX`) branchés aux seams :
  `onKill` (`onEnemyKilled`) · `onHit` (`resolveHits`) · `onDamaged` (`damagePlayer`, sur perte de PV
  réelle) · `onWaveStart` (`startNextWave`) · `onTick` (pas physique) · `onDraw` (rendu).
- **Ré-entrance sécurisée** : un objet `onKill` peut déclencher un `shockwave` (public) qui rappelle
  `onEnemyKilled` → chaîne. Garde `enemy.health <= 0 → continue` ajoutée dans `shockwave` **et**
  `resolveHits` pour ne jamais re-compter un mort.
- **Boutique** : `rollItemOffers` (prix qui monte par stack), `buyItem` (refill du slot), overlay à
  2 tableaux dans `GameWrapper.svelte` (accent teal `data-kind='item'`).
- **5 objets d'amorçage** (un par hook, prouvent l'archi) : **Bouclier renforcé** (`onAcquire`,
  +charge/regen) · **Bottes à ressort** (`onAcquire`, saut+vitesse) · **Drone de combat**
  (`onTick`+`onDraw`, orbite + tir auto via `projectilesStore`, profite de +Dégâts/crit) · **Épines**
  (`onDamaged`, blast de riposte) · **Charge explosive** (`onKill`, blast en chaîne auto-équilibré).
- À faire ensuite (archi prête, = data) : trade-offs / stats négatives, objets à malus, élites/boss
  aux jalons de vague, nombres flottants ; brancher des objets sur `onHit`/`onWaveStart` (câblés,
  non encore utilisés) ; tuner coûts/caps/nombre de slots.

## Parké : le système multi-perso (à reprendre plus tard)

Rangé de côté volontairement (on était allé trop vite). **Rien n'est perdu** — le gros est
dans git ; la partie « abilities » était en cours et non commitée (retirée du tree, mais le
design est noté ici).

**Point de reprise git** (la couche multi-perso committée) :
- `5d8eea8` « Turret + Drone » — tourelle **alliée** déployable (`Turret.ts`) + `turretsStore`.
- `ddb65da` « cyborg + biker » — classes joueur Biker (mêlée) & Cyborg (invocateur), UI de
  sélection, stats/upgrades par classe, dispatch `attackStyle`.

Pour restaurer : `git show <commit>:<path>` ou cherry-pick, puis re-brancher sur l'archi
actuelle (le registre `CHARACTERS` + le `switch(attackStyle)` de `GameWorld.playerAttack`
n'attendent qu'un nouvel `entry` + son `case`).

### Ce qui composait le système (pour mémoire)

- **3 classes, styles distincts** : Punk (duelliste, tir à distance) · Biker (bagarreur,
  arc de mêlée auto + soin-au-kill) · Cyborg (ingénieur, déploie des tourelles alliées).
- **Sélection** : cartes dans le hub + touches 1/2/3.
- **Upgrades par classe** : Biker (cleave/bash/bloodlust) · Cyborg (extra turret / overclock /
  heavy rounds / reinforced), gating via `classes` sur les upgrades.

### Abilities (WIP non commité, retiré — à ré-implémenter)

- **Punk — Dash** (touche S) : burst directionnel avec i-frames (esquive), cooldown ~0,8 s.
- **Biker — Charge** : ruée avant qui laboure (dégâts + recul, i-frames), cooldown ~2× le dash.
- Motion partagée « rush » (Player), hits de charge résolus dans GameWorld.

### Plus loin (jamais commencé)

- **Cyborg** : 2ᵉ allié (drone largable — le sprite `drone` existe déjà, utilisé par l'ennemi).
- Jauges de ressource (rage / énergie) au lieu d'un simple cooldown.
- Modificateurs de projectiles : perce / ricochet / crit.
