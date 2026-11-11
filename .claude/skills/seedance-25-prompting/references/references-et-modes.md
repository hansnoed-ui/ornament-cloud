# Références et modes d'entrée

Seedance 2.5 accepte jusqu'à **50 matériaux** : ≤ 30 images (≤ 4K), ≤ 10 vidéos (≤ 30 s
cumulées), ≤ 10 audios (≤ 30 s cumulés). C'est le vrai super-pouvoir du modèle — et la
première source d'échec quand les rôles ne sont pas déclarés.

Le but n'est **jamais** de faire apparaître tous les matériaux en même temps : c'est de
définir les relations entre personnages, props, décors, actions et audio pour que le modèle
choisisse le bon matériau au bon moment.

---

## Multi-référence

### 1. Nommer et mapper chaque sujet individuellement

Une ligne par sujet, un fichier par sujet :

```
<Character A> corresponds to @Image 1. Use only the appearance, hairstyle, and clothing.
<Character B> corresponds to @Image 2. Use only the appearance, hairstyle, and clothing.
<Prop A> corresponds to @Image 3. Use only the structure, material, and color.
<Scene A> references @Image 4. Use only the spatial layout, architecture, and
lighting. Do not use the people in the image.
```

❌ Jamais de référence groupée floue : « @Images 1 through 4 define four characters
respectively » ne dit pas qui est qui.

### 2. Grouper par type dès qu'il y a plusieurs sujets

```
[Characters]
<Conservator> corresponds to @Image 1. Use only the appearance, hairstyle, and clothing.
<Registrar> corresponds to @Image 2. Use only the appearance, hairstyle, and clothing.
Do not interchange these characters' appearances, clothing, actions, positions, or dialogue.

[Props]
<Sample Case> corresponds to @Image 5 and belongs only to <Conservator>.

[Scenes]
<Conservation Lab> references @Image 7. Use only the space, materials, and lighting.

[Motion and Audio]
@Video 1 defines the motion of <Conservator> opening <Sample Case>. Do not use the
person or scene from the video.
@Audio 1 defines <Guide>'s voice and specified dialogue.
```

### 3. Profil centralisé pour un sujet récurrent

Dès qu'un sujet traverse plusieurs scènes ou porte plusieurs matériaux :

```
[Subject Profile: Conservator]
Appearance and clothing: @Image 1.
Fixed prop: <Sample Case> from @Image 5.
Locations: <Conservation Lab> and <Gallery>.
Motion references: the case-opening motion from @Video 1.
Do not use: other characters' clothing. Do not give this character other equipment.
```

### 4. Sélectionner les références scène par scène

```
Scene 1 | Inspection in the Conservation Lab
Use: <Conservator>, <Sample Case>, <Conservation Lab>, and the case-opening
motion from @Video 1.
Event: <Conservator> opens <Sample Case> at the workbench and inspects the sample.
End state: <Conservator> remains on the inner side of the workbench.
<Sample Case> stays beside the conservator's right hand.
```

### Rappels

- Plusieurs vues du même objet : le dire explicitement — « All four images define one
  folding desk lamp. The output must contain only one lamp throughout. » Sinon le modèle
  duplique le sujet.
- **Vues séparées > collage.** Des images indépendantes s'alignent mieux qu'une grille.
- Quand une vidéo de référence porte déjà le mouvement, **ne pas redécrire le mouvement en
  texte** : ça entre en conflit. Dire seulement quels attributs hériter.
- Une vidéo seule = référence de **mouvement et rythme**, pas d'identité.
- Zones de stabilité (pas des plafonds durs) : 1–8 sujets en images, 1–5 sujets en vidéo à
  5–10 s. Monter jusqu'aux limites dures reste possible, mais la stabilité chute.

### Qualité des images de référence

Pour l'identité : **portrait face caméra, mi-corps**, résolution correcte, fond neutre.
Les profils et les photos de groupe donnent des résultats nettement moins stables.

---

## First / last frame

Déclarer chaque image d'ancrage **séparément**. ❌ « @Images 1 and 2 are the first and last
frames » ne marche pas. Les deux images doivent partager le même ratio, sinon la dernière
frame s'étire.

```
@Image 1 is the first frame. It defines the opening composition, subject position,
pose, prop state, scene, and camera direction.
@Image 2 is the last frame. It defines the ending composition, subject position,
pose, prop state, scene, and camera direction.
@Image 3 defines <Subject A>'s <appearance and clothing>. Do not change the
first-frame composition defined by @Image 1 or the last-frame composition
defined by @Image 2.

<Décrire une action continue unique>.
The video begins naturally from the first frame defined by @Image 1 and reaches
the last frame defined by @Image 2 after the continuous action.
Between the first and last frames, maintain continuity in <character identity,
prop structure and ownership, scene layout, and camera direction>.
```

Épingler la dernière frame supprime le failure mode « la fin dérive ». C'est un outil de
coût autant que de qualité.

## Multi-keyframes (3+ images ordonnées)

Ouvrir par « Use @Image 1 through @Image N as keyframes in this order », puis décrire
**l'état clé** que chaque image représente. Les keyframes contrôlent l'ordre des étapes et
les états clés — **pas** chaque frame intermédiaire. Images indépendantes > grille.

## Storyboard

Une planche communique l'histoire, l'ordre des plans et la composition approximative —
**pas une reproduction stricte panneau par panneau**. Préférer ≤ 15 panneaux, trait propre,
peu de texte.

```
@Image 1 provides an <N-panel storyboard grid> for shot order and approximate
composition. Read it <left to right, top to bottom>. Do not use the grid's
<line-art style, text labels, or placeholder characters>.
@Image 2 defines <Subject A>'s <appearance and clothing>.

Shot 1: <taille de plan, action, état du décor>.
Shot 2: <taille de plan, action, mouvement de caméra ou transition>.
...
Shot N: <action de clôture et état visible final>.

The final video uses <style visuel>. Audio includes <dialogue, ambiance, effets, musique>.
```

## Blockout et clay render

D'abord déterminer si le blockout contrôle un **squelette de mouvement** (grossier) ou un
**modèle complet** (fin). Ça décide de la structure du prompt.

| Type | Sert à | Matériau | Focus du prompt |
|---|---|---|---|
| **Grossier** | Prévisualiser action, trajectoires, blocking, caméra, coupes | Géométrie simple + séquence d'action complète ; ajouter les images de perso/props/décor à part | Mapper chaque forme à son sujet réel ; dire quelles infos temporelles/spatiales hériter |
| **Fin / clay render** | Modèle complet à re-texturer | Modèle propre — pas de lignes de trajectoire, d'axes ni de frustums caméra | Préserver structure/action/caméra ; définir ce qu'on re-rend |

**Grossier :**

```
@Video 1 is a coarse blockout reference. It provides only <motion paths, subject
blocking, camera position, camera movement, cuts, lighting changes, sound rhythm,
or spatial relationships>. Do not use its blockout appearance, materials, or scene.
<Blockout Subject A> in @Video 1 corresponds to <Subject A>.
@Image 1 defines <Subject A>'s <appearance, clothing, or structure>.

<Subject> completes <action principale> in <scène>.
Keep <motion path, blocking, camera movement, cuts, lighting, sound rhythm> from @Video 1.
The final video uses <characters, scene, materials, and visual style>.
```

Préférer des formes simples aux relations claires. Les appendices (bras, ailes) ne doivent
apparaître que si leur séquence d'action est complète, sinon le mouvement sort raide.

**Fin / clay render :**

```
@Video 1 is a fine blockout reference. Preserve <subject structure, action, spatial
layout, camera position, camera movement, and cuts>. Do not use its original gray
materials or empty background.
@Image 1 defines <subject>'s <character appearance, material, color, or surface details>.

Re-render <subject> from @Video 1 as <sujet final>, and re-render the scene as
<décor final>. Keep <structure, action, camera treatment, and spatial relationships>
from @Video 1. Use <materials, colors, and style>.
```

Le clay render est la nouveauté 2.5 la plus sous-exploitée : un blocking 3D non texturé fixe
d'un coup la composition, les poses, les trajectoires, les angles de caméra **et** la lumière
physique. C'est la voie la plus fiable pour un plan complexe qu'on veut reproductible.
