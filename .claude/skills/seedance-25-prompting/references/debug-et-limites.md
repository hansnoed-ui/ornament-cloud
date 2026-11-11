# Debug, limites et checklist

## Méthode

**Nommer le défaut avant de corriger.** Quatre familles souvent confondues :

| Défaut | Signe |
|---|---|
| **Flicker** | Variations de luminosité/couleur d'une image à l'autre, surtout en zones peu contrastées : peau, ciel, murs |
| **Jitter** | Petits sauts de position, bords qui tremblent |
| **Warp** | Géométrie qui se déforme : mains, petits objets, lignes fines |
| **Drift** | Le visage, le logo ou le vêtement dérive progressivement — apparaît typiquement après ~10 s |

Ensuite : **changer une seule variable à la fois**, relancer 2–3 variantes. Règle empirique
utile — un plan qui « lit » bien en image fixe tient mieux en mouvement.

## Matrice symptôme → correction

| Symptôme | Cause fréquente | Correction |
|---|---|---|
| Peau lisse, cireuse, « plastique » | Défaut du modèle, jamais contredit | Clause de texture haute dans le prompt (`realisme-et-ugc.md`) |
| « Ça fait trop pub » | Défauts cinéma non contredits | Les 7 couches réalisme, pas seulement une ou deux |
| Flicker | Cutout d'entrée aux bords sales, lumière non ancrée | Nettoyer l'alpha (feather 1–1,5 px, dehalo) ; ancrer une source + une surface ; raccourcir ou changer l'angle |
| Warp des mains / petits objets | Gestes complexes, lignes fines, mouvement rapide | Recadrer plus large, `hands at rest`, faire l'insert dans un plan séparé |
| Dérive d'identité après 10 s | Sujet décrit vaguement, pas de référence, clip trop long | Référence image + **même nom répété à l'identique** (jamais « il / l'homme / le détective » en alternance) + `no drift, no deformation` |
| Texte illisible à l'écran | Le modèle n'est pas fiable en typo | Exclure le texte du prompt, l'ajouter en post |
| Physique / foules instables | Limite reconnue du modèle | Simplifier, réduire figurants et effets, un seul mouvement |
| Instructions ignorées | > ~150 mots dans un bloc, > 8 exigences, directions conflictuelles | Couper, prioriser en tête, un seul comportement caméra |
| Musique ou sous-titres parasites | Biais d'entraînement | Ligne d'exclusion explicite |
| Livraison plate sur 30 s | Pas d'arc émotionnel | Ajouter l'arc + un état émotionnel par étape |
| Mouvement de caméra ignoré en I2V | Mode caméra verrouillé dans l'UI, ou directions concurrentes | Débloquer la caméra ; retirer les mouvements en conflit |
| Sujet dupliqué | Plusieurs vues du même objet non déclarées | `All these images define one single object. The output must contain only one.` |
| Prompt refusé (modération) | Personnalité publique, marque, contenu sensible | Reformuler en description générique. Vérifier le **rendu**, pas juste l'absence d'erreur — le modèle substitue parfois en silence |

## Limites dures — ne pas survendre

- **Les timecodes allouent du temps, ce ne sont pas des points de montage à la frame.**
- Un prompt d'editing **augmente la probabilité** que les événements clés s'alignent sur la
  source — il ne garantit pas le recouvrement image par image.
- Le multi-référence sert à choisir/combiner le bon matériau par scène, **pas** à faire
  apparaître tous les matériaux simultanément.
- Sous-titres, formules, panneaux, specs produit, typo de marque : **références préparées +
  post-production**. Le prompt seul ne garantit rien.
- **Editing** : ratio et durée verrouillés sur la source (écart possible ~0,3 s), non
  réglables séparément.
- **First / first-and-last frame** : ratio verrouillé sur la 1re image, durée réglable.
  Ratios différents entre 1re et dernière image → la dernière frame s'étire.
- **Extension** : ratio verrouillé sur la source, durée réglable. Le volume audio du segment
  étendu peut différer légèrement.
- **One-click video** : si l'ordre des images ou le mapping des personnages compte, il doit
  être écrit — le modèle ne l'infère pas.
- **Transitions seamless** : continuité visuelle et sonore, pas préservation au pixel près
  des deux sources.
- Les frames de raccord se connectent visuellement, jamais au pixel près.

## Limites techniques des matériaux

| Type | Limite dure | Zone confortable |
|---|---|---|
| Images | 30 max, ≤ 4K chacune | 1–8 sujets distincts |
| Vidéos | 10 max, ≤ 30 s cumulées | 1–5 sujets, 5–10 s chacune |
| Audio | 10 clips max, ≤ 30 s cumulés | Uniquement les clips directement utiles |
| Source d'editing | 1 vidéo + 1–5 images de référence | Source ≤ 20 s |

Durée : génération native jusqu'à 30 s (97–721 frames). Extension simple : 30 s. Extensions
imbriquées : 60 s cumulés. Mode Ultra Long Video : jusqu'à 180 s. Résolution de sortie :
**480p / 720p selon la plateforme** — le 4K est annoncé côté marketing, à vérifier dans l'UI
avant de le promettre.

## Checklist avant livraison

La plupart des points ne s'appliquent que si la technique concernée est utilisée.

**Base**
- [ ] Le sujet et l'action principale sont clairs et en tête du prompt
- [ ] ≤ ~8 exigences par bloc, ≤ ~100 mots pour un plan simple
- [ ] Un seul mouvement de caméra principal + un mot de vitesse
- [ ] Aucune négation portant sur un objet visible (reformulée en positif)
- [ ] Bloc audio présent + ligne d'exclusions présente
- [ ] Ratio et durée recommandés indiqués sous le prompt

**Références**
- [ ] Chaque matériau dit ce qu'il apporte **et** ce qu'il ne faut pas en tirer
- [ ] Chaque personnage, produit et prop est nommé et lié à une référence précise
- [ ] Les références sont sélectionnées par scène, pas toutes convoquées d'un coup
- [ ] Plusieurs vues d'un même objet : déclaré comme un objet unique
- [ ] First/last : chaque image a **un seul** rôle, et les deux partagent le ratio

**Long format**
- [ ] Chaque étape contient un seul changement principal et un état final explicite
- [ ] Un état émotionnel par étape s'il y a un humain à l'écran
- [ ] ≤ 4 plans dans une passe de 30 s
- [ ] Identité, nombre de personnages, vêtements, possession des props et directions
      spatiales restent cohérents du premier au dernier plan

**Réalisme (si le rendu doit passer pour du réel)**
- [ ] Texture de peau explicite
- [ ] Lumière décrite en 4 axes, dans sa propre clause
- [ ] Décor encombré avec 3–4 objets nommés
- [ ] Micro-mouvement handheld
- [ ] Arc émotionnel
- [ ] Ancrage de cohérence + exclusions

**Modes spécifiques**
- [ ] Editing : master unique, portée, quantité cible et contenu à préserver définis
- [ ] Editing avec remplacement : clause `[Timeline Inheritance]` présente
- [ ] Extension : frame de raccord, tendance du mouvement et continuité audio vérifiées
- [ ] Storyboard : dit quelle structure hériter, pas une reproduction littérale
- [ ] Blockout : grossier vs fin identifié en premier
- [ ] Termes de caméra rares et émotions abstraites traduits en indices observables
- [ ] Les modes à paramètres verrouillés respectent leurs règles de ratio/durée
