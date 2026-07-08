# Extraire le mini-jeu en jeu autonome — analyse

_Note prospective (2026-07-07). Pas un chantier en cours : un repère pour si/quand on
décide de sortir la logique du portfolio pour en faire un vrai jeu navigateur (plateformes
« réelles », décor, scrolling latéral)._

## Verdict : très faisable — le cœur est déjà « en forme de moteur »

Le couplage au CV se résume à **4 endroits précis** ; tout le reste est du jeu pur.

### Déjà portable tel quel
- **Boucle fixed-timestep + interpolation** (`GameWorld.animate`) — qualité moteur.
- **Pools d'entités** (`stores.ts`) — swap-pop O(1), zéro alloc à la despawn.
- **Registres data-driven** (enemies / characters / upgrades / waves) + dispatch.
- **Collision AABB** (`utils.ts` `collision`) — les entités bougent en coords monde contre
  un `Platform[]` abstrait `{left, top, width, height}` ; la collision se fiche de la
  provenance des plateformes.

### Les 4 points de couplage au CV
1. **Source des plateformes** (`GameWorld.collectPlatforms`) : `querySelectorAll('[data-colliding]')`
   + `getBoundingClientRect()`. → remplacer par un **format de niveau / tilemap** qui produit
   le même `Platform[]`. C'est le vrai boulot, mais borné : on change la *source*, pas la physique.
2. **Point de spawn** (`spawnPlayerOnPedestal`) : `querySelector('[data-spawn]')`. → une donnée de niveau.
3. **Découpe de rendu** (veil `clearRect` au-dessus des titres) : portfolio-only, à retirer.
4. **`Player.#keepWithinCanvas`** : clamp en espace-écran → devient des **bornes de niveau**.

### À ajouter (additif, pas un rewrite)
- **Caméra** : LA pièce manquante. `ctx.translate(-cam.x, -cam.y)` avant de dessiner le monde.
  Les entités stockent déjà leur pos monde → le scrolling latéral tombe presque gratuitement.
- **Renderer tilemap + parallaxe** pour le décor. Nouveau mais isolé.
- Découpler `$lib/game`/`$lib/stores` (HP/wave/level) — portables tels quels (Svelte marche
  en standalone).

**Ordre conseillé** : (1) caméra + bornes de niveau, (2) format de niveau qui remplace le DOM,
(3) décor/parallaxe.

## Scalabilité JS : des centaines, oui, sans souci

Repère qui tranche le débat JS-vs-Rust : **Vampire Survivors lui-même est en JS/TS (Phaser)** —
le jeu-phare du genre, milliers d'entités, tourne en JS.

| Échelle | Verdict |
|---|---|
| Centaines d'ennemis + centaines de particules | 60 fps tranquille, petit ménage |
| Bas milliers | Atteignable si on traite les 2 goulots ci-dessous |
| Dizaines de milliers | Canvas 2D + JS peine → WebGL / typed arrays |

**Les 2 vrais goulots (dans l'ordre) :**
1. **Broadphase de collision.** `resolveHits` est une double boucle naïve O(projectiles × ennemis).
   100×100 = OK ; 500×500 → mal. Solution : **grille spatiale uniforme** (hash de cellules).
   C'est LE changement qui débloque les milliers.
2. **Coût de dessin par entité.** Chaque sprite fait `save/translate/rotate/scale/drawImage/restore`.
   À des milliers : virer les transforms (blit direct sans rotation) ou pré-rendre les rotations
   dans un atlas. Les gradients/anneaux (bouclier, bombes) : OK car peu nombreux, à ne pas
   généraliser aux masses.

Détail mineur : les `.slice()` par frame (itération des pools auto-cullés) allouent un tableau/frame
— négligeable à des centaines, à surveiller à des milliers (itérer à l'envers à la place).

**Rust/WASM** : gain souvent surestimé ici. WASM accélère le CPU-bound (simu, collision), mais le
goulot c'est le **rendu** (`drawImage`) que WASM ne touche pas. Le vrai saut viendrait de **WebGL**,
pas d'un changement de langage.
