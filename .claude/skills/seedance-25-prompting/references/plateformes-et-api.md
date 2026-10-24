# Plateformes, API et choix de modèle

## Identifiants de modèle

Seedance 2.5 a été présenté le 23 juin 2026 (Volcano Engine FORCE) et lancé officiellement
le **31 juillet 2026**. ByteDance a sauté les versions 2.1 à 2.4 pour signaler un saut
générationnel.

| | Identifiant |
|---|---|
| BytePlus ModelArk 2.5 | `dreamina-seedance-2-5-260628` |
| Volcano Ark 2.5 | `doubao-seedance-2-5-260628` |
| BytePlus ModelArk 2.0 | `dreamina-seedance-2-0-260128` |
| Volcano Ark 2.0 | `doubao-seedance-2-0-260128` |

La grammaire de prompt de 2.5 est **rétrocompatible avec 2.0** : les templates de ce skill
fonctionnent sur les deux sans réécriture. Les fonctions propres à 2.5 (30 s en une passe,
50 références, clay render, édition au timestamp, green-screen) sont simplement ignorées ou
dégradées sur 2.0.

## Comparatif des accès

| Plateforme | Version | Points clés |
|---|---|---|
| **Dreamina / CapCut** | 2.5 | Accès international le plus à jour. L'UI attribue les IDs de référence (`@Image 1`), expose first/last frame, multi-référence, editing, clay render. C'est ici que 2.5 est le plus complet |
| **Jimeng / Doubao Pro** | 2.5 | Chine. Numéro de téléphone chinois requis |
| **BytePlus / Volcano API** | 2.5 et 2.0 | Mêmes tags `@`. Job asynchrone : submit → poll ou webhook. Résolution, ratio et durée en paramètres de requête, hors prompt |
| **fal.ai** | selon la version servie | Pay-per-use. Dialogue entre guillemets doubles, `cut to` pour empiler les plans, `generate_audio: false` pour générer muet et doubler ensuite |
| **Higgsfield** | selon la version servie | Partenaire officiel ByteDance. Workflow vidéo, Soul ID pour la cohérence de visage |
| **WaveSpeed / Replicate / Freepik / Krea / Pollo** | variable | Relais. Vérifier la version exacte servie, elle change souvent |

## Différences de prompting selon la plateforme

- **Dialogue** : crochets `{}` sur Dreamina/API ; **guillemets doubles** sur fal.ai et
  plusieurs relais. Vérifier l'UI.
- **Coupes** : `cut to` en prose sur 2.0 ; blocs temporels (`0-8 seconds:`) préférables
  sur 2.5.
- **Paramètres** : sur Dreamina ils sont dans l'UI ; via API ce sont des champs de requête.
  Dans les deux cas ils **ne vont pas dans le prompt**.
- **Audio muet** : `generate_audio: false` sur fal ; sur Dreamina, passer par les exclusions
  explicites.

## Coûts

Les grilles publiées à l'ouverture (à revérifier, elles bougent) : facturation au token côté
Volcano/BytePlus, avec un tarif plus élevé sans input vidéo qu'avec. Ordres de grandeur
relayés : de l'ordre de 1 à 2 $ pour 30 s en réglages bas, nettement plus en haute
résolution. Pour référence, Seedance 2.0 tournait autour de 0,06 $/s en standard et
0,022 $/s en variante Fast, avec des surcouches plateforme chez les revendeurs.

⚠️ Aucun de ces chiffres n'est stable. Toujours vérifier la grille en vigueur avant de
chiffrer un volume de production.

## Quand choisir Seedance 2.5 — et quand non

**Choisir Seedance 2.5 pour :**
- Un récit long tenu en une passe (pub 30 s, court métrage, previz)
- La cohérence personnage/produit sur plusieurs plans via références lourdes
- L'édition locale : green-screen, remplacement d'objet, édition au timestamp
- Le blocking 3D / clay render, sans équivalent direct ailleurs

**Choisir autre chose pour :**

| Besoin | Modèle |
|---|---|
| Résolution et fluidité maximales (4K/60 fps natif) | **Kling 3.0** |
| Dialogue anglais broadcast le plus régulier sur longue prise, intégration Google Cloud | **Veo 3.1** |
| Editing par instruction, rendu de texte à l'écran, 11 langues de dialogue dont le français documenté | **MiniMax H3** |
| Poids ouverts / auto-hébergement | famille **Wan** |

⚠️ Ne pas démarrer de nouveau projet sur **Sora 2** : un chemin de dépréciation a été annoncé.

## Note sur les sources

L'écosystème de contenu autour de Seedance est fortement pollué par du SEO généré : des
dizaines de sites republient les mêmes chiffres avec des variantes contradictoires, y compris
des références académiques inexistantes. En cas de doute sur une spec, **la seule source à
suivre est la documentation ByteDance / Dreamina / BytePlus**, pas un comparatif tiers.

Les chiffres à traiter comme non confirmés tant qu'ils ne sont pas vus dans l'UI ou la doc
entreprise : la sortie 4K, le plafond exact des extensions, et la liste des langues de
dialogue supportées.
