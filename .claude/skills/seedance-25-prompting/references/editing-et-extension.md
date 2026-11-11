# Editing, extension, transitions

## Paramètres auto-verrouillés

Ces modes verrouillent des paramètres de génération d'après l'entrée. L'utilisateur ne peut
pas les régler séparément. À savoir **avant** de promettre un ratio ou une durée.

| Tâche | Ratio | Durée |
|---|---|---|
| Editing vidéo | verrouillé sur la source | verrouillée sur la source (±~0,3 s dû au traitement des frames) |
| First frame / first-and-last frame | verrouillé sur la 1re image (les deux images doivent partager le ratio) | réglable |
| Extension vidéo | verrouillé sur la source | réglable |

Source d'editing : 1 vidéo (≤ 20 s recommandé) + 1–5 images de référence optionnelles.

---

## Editing vidéo

Déclarer la vidéo source comme **unique master d'édition**, puis la cible, la portée, le
matériau cible et ce qu'il faut préserver.

```
[Edit Goal]
Edit @Video 1. Within <the entire video or a specific time range>, <add, remove,
replace, or adjust> <visual object, region, or audio category>.

[Source Video Role]
@Video 1 is the sole editing master. It defines <characters, scene, actions,
composition, camera movement, occlusion relationships, audio, and event order>.

[Target Material Role]
@Image 1 or @Audio 1 defines <specified attributes of the target object or sound>.

[Edit Scope]
Modify only <object, region, time range, or audio category>.

[Content to Preserve]
Keep <visual content, motion, audio, and timing relationships that must not change>
from @Video 1.
```

### Remplacement de sujet — clause Timeline Inheritance

Sans elle, le nouvel objet ne reprend pas la timeline de l'ancien :

```
[Timeline Inheritance]
<Target object> inherits every appearance, motion, occlusion, and exit of <original
object>, including timing, duration, path, and speed changes.
Except for the object or area explicitly modified above, keep all other people,
props, scene content, camera movements, cuts, and event order from @Video 1 unchanged.
```

### Remplacement de fond

Cadrer la portée explicitement hors de la silhouette :

```
[Edit Scope]
Modify only <background outside the subject's silhouette>. Do not modify <subject
identity, facial features, hairstyle, clothing, expression, position, size, or motion>.
```

Le green-screen 2.5 va plus loin : le sujet **réagit à la physique du nouvel environnement**
(vêtements, cheveux, lumière). Le préciser si on le veut :
`The subject's clothing and hair react to the wind of the new environment.`

### Editing audio

Dialogue, langue, voix, musique et effets s'éditent indépendamment. Nommer la catégorie, le
changement, et ce qui ne doit pas bouger :

```
Edit @Video 1. Remove only the original background music. Keep the character
dialogue, lip sync, ambience, and action sound effects; preserve the visuals,
camera treatment, and editing rhythm from @Video 1.
```

C'est la voie propre pour **remplacer une VO générée par une VO française externe** tout en
gardant le reste intact.

---

## Extension vidéo

Règle critique : **aligner la frame de raccord avant de décrire le nouveau contenu.**

### Extension avant (après la source)

```
@Video 1 is the source video to extend forward.

Extend @Video 1 forward. The first frame of the extended segment directly continues
from the last frame of @Video 1. Maintain continuity in <subject pose and
orientation>, <prop position>, <background and spatial relationships>, <camera
position and composition>, <lighting>, and <motion direction>.

Then, <décrire la nouvelle action, l'événement, la caméra ou l'audio à ajouter>.

Throughout the extension, maintain continuity in <character identity and clothing>,
<key props>, <background layout>, and <axis of action>.
Keep each subject as the same continuous instance throughout: do not duplicate or split it.
```

Si on ajoute de nouveaux matériaux (un prop que le personnage va utiliser), déclarer leurs
rôles d'abord, mais préciser que **la dernière frame de la source contrôle toujours l'image
d'ouverture** — les nouveaux matériaux complètent, ils ne remplacent pas la frontière.

### Extension arrière (avant la source)

Décrire ce qui se passe avant, puis **atterrir explicitement sur la première frame de la
source comme état final**. Dire juste « puis enchaîner sur la vidéo source » fait fuiter des
éléments trop tôt ou dériver l'image après avoir atteint la cible.

```
@Video 1 is the source video to extend backward.

Extend @Video 1 backward. Before the source video begins, <action, événement,
caméra ou audio précédents>.

The last frame of the extended segment naturally connects to the first frame of
@Video 1: <subject pose and orientation>, <prop position>, and <background and
spatial relationships>. Match the <camera position and composition>, <lighting>,
and <motion direction> of @Video 1's first frame.

Throughout the extension, maintain continuity in <character identity and clothing>,
<key props>, <background layout>, and <axis of action>.
```

Avec des matériaux supplémentaires, dire lesquels appartiennent au segment arrière et
lesquels ne doivent apparaître qu'après le début de la source.

### Notes

- Les frames de raccord se connectent **visuellement**, pas au pixel près. Relire les deux
  côtés de la frontière **et** tout le segment étendu.
- Extension simple : jusqu'à 30 s. Extensions imbriquées : 60 s cumulés. Mode Ultra Long
  Video : jusqu'à 180 s.
- Le volume audio du segment étendu peut différer légèrement de la source. Prévoir un
  passage au mixage.

---

## Transition seamless entre deux vidéos

Génère le pont continu entre deux clips :
`Vidéo avant → Vidéo après → Action déclencheuse → Caméra → Transformation visuelle → État d'arrivée → Audio`

```
@Video 1 is the before-transition clip. Use its <ending subject, action,
composition, camera direction, and audio>.
@Video 2 is the after-transition clip. Use its <opening subject, composition,
camera direction, and audio>.
Keep <character identity, product structure, scene, and primary action> stable in
the original portions of @Video 1 and @Video 2.

At the end of @Video 1, <subject or foreground object> triggers the transition
through <action>.
The camera <direction et changement de vitesse>, while <shape, material, light,
or space> gradually transforms into <élément correspondant> at the start of @Video 2.
The transition ends naturally at @Video 2's opening composition, preserving
continuity in <subject position, camera direction, and motion trend>.
Audio transitions smoothly from <audio avant> to <audio après>.
```

Méthodes courantes et ce qu'il faut préciser à chaque fois :

| Méthode | À spécifier |
|---|---|
| Plongée / mouvement inversé | direction, changement de vitesse, moment où la scène suivante commence |
| Rotation du personnage | pose, sens de rotation, changement continu du fond |
| Occlusion par le premier plan | quand l'objet remplit le cadre, composition après |
| Morph d'objet | formes et matières correspondantes, processus de transformation |
| Push/pull ou changement de focus | mouvement, cible du focus, relation spatiale continue |

⚠️ La transition vise la **continuité visuelle et sonore**, pas la préservation au pixel près
des deux sources.

---

## One-click video (lot d'images → vidéo montée)

Ne jamais dire simplement « transforme ces images en vidéo ». Toujours spécifier :
`Rôles des matériaux → Ordre des images → Quantité de mouvement → Style de montage → Traitement visuel → Audio`

```
[Material Roles]
@Image 1 is used for <character, product, scene, or opening image>.
@Video 1 is used only for <editing rhythm, transitions, subtitle treatment, or
music style>. Do not use its character identities or scene.

[Arrangement]
Show the images in <upload order, a specified order, or a model-selected thematic order>.
<Relations personnage / produit / lieu / événement à garder cohérentes>.

[Image Motion]
Apply <subtle live motion, parallax, push-in/pull-out, lateral movement, or local
action> to each image.
Keep <subject appearance, product structure, text, or background relationships> stable.

[Final Style]
Use <editing rhythm, transition style, subtitle or graphic treatment, and color style>.

[Audio]
Include <dialogue, ambience, sound effects, or music>.
```

Si l'ordre compte, l'écrire explicitement — le modèle ne l'infère pas. S'il y a plusieurs
personnages ou produits, continuer à les nommer et les lier individuellement.
