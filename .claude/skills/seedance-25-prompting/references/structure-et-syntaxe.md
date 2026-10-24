# Structure, staging et contrôle du temps

## Longueur et hiérarchie

Seedance suit fidèlement les **2–3 premières instructions**. Au-delà de ~8 exigences dans
un même bloc, il commence à en abandonner. Au-delà de ~150–200 mots pour un plan unique,
la dérive d'attention devient nette.

Conséquences pratiques :

- **Mettre le critique en tête.** Ce qui doit absolument tenir (identité du sujet, texture,
  action principale) vient avant le décoratif.
- **La longueur suit ce qu'on a refusé de confier à une référence.** Si `@Image 1` porte
  l'apparence, ne pas la redécrire — décrire le mouvement.
- Supprimer tout adjectif qui ne change pas le rendu. « cinematic, dynamic, beautiful,
  masterpiece, 8K » ne changent rien.
- **Ce plafond est par bloc, pas par prompt.** Un prompt long structuré en `[Stage 1]`,
  `[Stage 2]`… fonctionne très bien : chaque étape est un petit contexte.

## T2V vs I2V

| | T2V | I2V |
|---|---|---|
| Décrire le sujet | oui, complètement | **non** — l'image le définit déjà |
| Décrire le décor | oui | non, sauf ce qui change |
| Décrire le mouvement | oui | **c'est tout le prompt** |
| À ajouter | rien | `keep the existing lighting and composition` |

En I2V, une seule action crédible bat une chorégraphie. Et vérifier que le mode caméra n'est
pas verrouillé sur « fixe » dans l'UI, sinon les mouvements demandés sont ignorés.

## Staging — obligatoire au-delà de ~8 s

Ne jamais écrire un paragraphe plat pour une séquence à plusieurs événements. Découper.
**Une étape = un seul changement principal + un état final observable.**

```
[Generation Goal]
Generate a <type de vidéo>. The central subject is <sujet>, and the primary event
is <résumé de l'histoire>.

[Stage 1]
Initial state: <état initial des personnages, props, décor>.
Primary event: <une seule action ou événement>.
End state: <positions, possession des props, état visible du décor>.

[Stage 2]
Continue from the previous stage: <ce qui doit rester inchangé>.
Primary event: <une seule action>.
End state: <état observable>.

[Stage 3]
Primary event: <événement de clôture>.
End state: <état visible final>.

[Maintain Consistency]
Keep <identité, nombre de personnages, vêtements, possession des props,
orientation spatiale, relations audio> consistent.
```

### Le End State émotionnel (spécifique 2.5)

Sur une passe de 30 s, un état final purement physique ne suffit pas : le modèle joue neutre
entre les étapes. Ajouter, sur les séquences avec un humain à l'écran, une ligne d'état
émotionnel à chaque étape :

```
End state: the bouquet is centered on the shelf. Emotional state: quiet
satisfaction, shoulders dropping, a small unforced smile.
```

Découpage recommandé pour 30 s : **3 à 4 beats**, typiquement
`hook 0-5 s / développement 5-16 s / preuve 16-25 s / résolution 25-30 s`.

## Timecodes

Utiliser le staging par défaut. Ne passer aux timecodes que quand un passage de relais, une
entrée/sortie, une transition ou un beat doit être calé à un moment précis.

| Motif | Usage | Exemple |
|---|---|---|
| Plage | Allouer le rythme d'un segment | `0-3 seconds… 3-7 seconds… 7-12 seconds…` |
| Point exact | Un événement clé unique | `At 5 seconds, the camera whip-pans rapidly to the left.` |
| Relatif | Un délai entre deux événements | `Three seconds after the character presses the button, the lights fade.` |

Règles :

- Les plages doivent être **consécutives et sans chevauchement**.
- Un timecode est un **budget de temps**, pas un point de montage. L'action peut arriver
  légèrement avant ou après la borne.
- Trop peu de contenu dans une plage = trop de liberté laissée au modèle. Trop de contenu =
  coupes excessives ou événements abandonnés.
- **Jamais de cadence dans la seconde** (« trois actions en une seconde »).
- Terminer chaque segment timecodé par un état final explicite, comme une étape :

```
0-5 seconds: An empty wooden display table. A hand places a white ceramic plate
on it. End state: the hand has left the frame, only the white plate remains centered.
5-10 seconds: Remove the white plate, then place a clear glass on the table.
End state: only the clear glass remains centered.
```

## Multi-plans

Seedance gère les coupes nativement. Livrer **un seul bloc** avec les plans dedans, pas des
prompts séparés — sinon on perd la continuité que le modèle sait tenir.

Trois conventions, par ordre de fiabilité :

1. **Blocs temporels** (recommandé sur 2.5) — `0-8 seconds: … 8-18 seconds: …`
2. **Labels de plans** — `Shot 1: … Shot 2: …` (utile avec un storyboard)
3. **`cut to`** en prose — hérité de 2.0, encore accepté

Ne pas dépasser 4 plans dans une passe de 30 s. Au-delà, chaque plan est trop court pour
s'établir et la dérive d'identité augmente.

## Formats structurés

**Il n'existe pas de mode JSON** pour le corps créatif. La structure passe par des labels
entre crochets (`[Stage 1]`, `[Characters]`, `[Edit Goal]`) et les crochets audio
(`()`, `<>`, `{}`, `【】`). Le JSON n'existe qu'au niveau API, pour déclarer les rôles des
médias en entrée.

À l'intérieur d'un bloc labellisé, **écrire en prose**, pas en fragments. Les listes à puces
dégradent le suivi d'instruction.

## Ordre de rédaction recommandé

1. Sujet + action principale
2. Ancrage de cohérence (références, ce qui ne doit pas dériver)
3. Texture / réalisme si le rendu doit passer pour du réel
4. Lumière (clause dédiée)
5. Décor et environnement
6. Caméra (un mouvement)
7. Arc émotionnel si humain à l'écran
8. Audio
9. Exclusions

Les points 1 à 3 sont ceux que le modèle suivra le plus fidèlement. C'est délibéré.
