# Audio, dialogue et français

Seedance 2.5 génère **l'audio nativement et synchronisé** en une passe : dialogue lip-syncé,
effets calés sur l'action, ambiance, musique. Nouveauté 2.5 : une **piste audio seule** peut
piloter le rythme, le beat-matching et le lip-sync.

Conséquence directe : **si tu ne dis rien sur l'audio, le modèle en invente** — le plus
souvent une musique de fond dont personne ne voulait. Le bloc audio et la ligne d'exclusion
ne sont donc jamais optionnels.

## Syntaxe des crochets

| Contenu | Syntaxe | Exemple |
|---|---|---|
| Musique | `()` | `(Soft, rhythmic piano music plays in the background)` |
| Effets sonores | `<>` | `<A bell rings in the distance>` |
| Dialogue | `{}` | `{Hello, welcome back.}` |
| Sous-titres | `【】` | `【Chapter One: Departure】` |

Sur fal.ai et plusieurs plateformes tierces, la convention est plus simple : **dialogue entre
guillemets doubles**, ce qui suffit à déclencher le lip-sync. Les deux conventions coexistent
— vérifier l'UI avant de livrer.

## Dialogue

Ordre pour toute langue autre que le chinois :

> **Langue + accent régional + style de diction + locuteur + `{réplique}`**

```
Dialogue language: British English. The woman says in a warm London accent:
{Looks like the clouds are finally breaking.}
```

Règles :

- **Un locuteur à la fois.** Nommer chaque locuteur, une réplique par locuteur, ajouter
  `no overlapping dialogue`. Si ça dérape, séparer les échanges en plans distincts.
- **Répliques courtes** : 5–12 mots pour 10 s, ~20 mots pour 15 s. Au-delà de ~8 s de parole
  continue, la bouche devient molle.
- Insérer des **beats écrits** comme points de resynchronisation :
  `She pauses, then continues: {…}`
- Le texte à l'écran (sous-titres, panneaux, prix) n'est **pas** fiable au pixel près :
  l'exclure du prompt et l'ajouter en post.

## Références audio

Pour cloner un timbre : clip **propre, close-mic, sec, 10–15 s** par personnage. Le modèle
préserve timbre, accent et débit — mais traîne aussi les artefacts du micro. Ajouter
`clean audio, no room reverb, no background noise`.

Enregistrer la référence à ~80 % de la vitesse naturelle améliore la stabilité du lip-sync.

## SFX, ambiance, musique

Une clause courte en fin de prompt. **1 ambiance + 1 effet par ligne**, pas plus :

```
Audio: ambient café noise and the clink of a spoon against ceramic.
```
```
Audio: ocean waves and wind. No music.
```

- Une chanson complète avec paroles n'est **pas** fiable.
- La musique parasite est un biais d'entraînement récurrent → l'exclure explicitement quand
  on n'en veut pas.

---

## Le français — état des lieux honnête

**Ce qui est certain :** le français n'est **pas nommé explicitement** dans la communication
officielle du modèle. Le post de lancement ne cite aucune langue ; les listes officielles
antérieures citent anglais, mandarin, japonais, coréen, espagnol, portugais, indonésien.
La documentation entreprise parle de « plus de 10 langues » sans les énumérer.

**Ce qui est observé :** le français fonctionne. Les tests francophones sur des phrases
courtes donnent un lip-sync propre au phonème et une voix naturelle. Mais avec de la
variance : dérive d'accent entre générations (un personnage sonne français puis vaguement
canadien), et une voix un peu synthétique comparée à un TTS dédié — Seedance optimise la
**synchronisation**, pas le plafond de qualité vocale.

**Traiter le français comme l'espagnol ou le portugais** (bon sur phrases courtes, dérive sur
les longues), pas comme l'anglais ou le mandarin (les plus propres).

### Les 5 contournements qui marchent

1. **Répliques courtes.** 5–12 mots. C'est le levier n°1, loin devant les autres.
2. **Langue et accent explicites à chaque plan.** `Dialogue language: French from France.
   She speaks with a neutral Parisian accent.` Ne pas se contenter de « French ».
3. **Ne pas mélanger les langues dans une même scène.** Le mélange dégrade la prononciation,
   sauf pour les noms propres.
4. **Découper les longues répliques** en plusieurs générations, puis monter.
5. **Beats écrits** comme points de resynchronisation dans les répliques de plus d'une phrase.

### La voie premium : dub externe

Pour une VO française broadcast, la meilleure qualité vient d'un pipeline en deux temps :

1. Générer la vidéo **muette** (`generate_audio: false` sur fal, ou exclusions explicites).
2. Doubler via un TTS dédié (type ElevenLabs) puis appliquer un lip-sync.

Coût : un léger drift visible sur les plosives (p/b/m). Bénéfice : contrôle total du timbre,
du débit et de la direction d'acteur, et pas de dérive d'accent entre plans.

Variante propre si la vidéo existe déjà avec un audio généré : passer par l'**editing audio**
(`editing-et-extension.md`) pour ne remplacer que la piste voix en gardant l'image intacte.

### Non vérifié — à ne pas présenter comme acquis

L'astuce d'écrire le français en **orthographe phonétique** pour corriger une prononciation
n'est documentée nulle part. Elle peut se tester empiriquement, mais ne pas la vendre comme
une technique validée.
