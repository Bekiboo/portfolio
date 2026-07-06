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
- [ ] Feedback de tir (recul, muzzle flash, screenshake léger).
- [ ] Feedback d'impact / de mort plus lisible.
- [ ] Feel du déplacement (accel/decel, coyote time, saut).
- [ ] Lisibilité (contraste ennemis/CV, télégraphes d'attaque).
- [ ] Audio / juice.

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
