# Réalisme et UGC — sortir le modèle de ses défauts

Le problème n'est pas le modèle. Seedance 2.5 sait faire du photoréaliste. Le problème est
son **attracteur par défaut** : publicité léchée. Peau lisse, lumière équilibrée, cadrage
centré, décor rangé, caméra stabilisée.

Le spectateur a été entraîné par des années de pub. Dès qu'un plan « lit » comme produit,
le cerveau le classe comme publicité — et tout ce qui suit joue contre toi. Une vraie vidéo
de téléphone a l'air différente : cadrage de travers, lumière déséquilibrée, peau texturée,
caméra qui flotte, pièce en désordre.

**Tout le travail consiste à payer pour sortir des défauts.** Ces clauses ne sont pas des
options de finition : sans elles le rendu est repérable en une seconde. Elles doivent être
**templatées dans le workflow**, pas ajoutées quand on y pense.

---

## Les 7 couches (à mettre dans chaque prompt UGC)

### 1. Texture de peau — systématiquement

```
realistic skin texture, visible pores around the nose and cheeks,
natural slight unevenness, no filter quality
```

Sans ça : peau lisse, sans pores, cireuse. C'est le signal n°1 de détection.

### 2. Langage anti-polish — tuer les défauts cinéma

```
handheld phone camera feel, casual unsteady framing,
filmed in a real environment, not a professional set
```

Attention : formuler **positivement** l'essentiel (« handheld phone camera feel »), la
négation ne vient qu'en queue de clause comme contraste (« not a professional set »). Voir
la règle des négations dans le SKILL.md — nier un objet visible backfire, nier un registre
de production fonctionne.

### 3. Lumière — une clause à elle seule, pas un mot dans une liste

```
soft warm window light from camera-left, natural shadows across the face,
no harsh highlights, skin illuminated without overexposure
```

Quatre informations : **direction, qualité, comportement des ombres, exposition de la peau**.
Une lumière « belle » mentionnée en passant produit du studio. Une lumière décrite en quatre
axes produit une pièce.

### 4. Encombrement du décor — du vrai désordre nommé

```
messy unmade bed behind her, clothes on the chair,
charger cable on the nightstand, water glass on the side table
```

Un fond propre lit comme du décor de tournage. **Un câble de chargeur lit comme une vraie
chambre.** Nommer 3–4 objets concrets et banals, pas « a lived-in room ».

### 5. Micro-mouvement handheld

```
subtle handheld motion mimicking a propped-up phone,
slight micro-shake from breathing, no static locked-off framing
```

Le cadrage verrouillé est ce que donne une caméra de production. Un téléphone posé respire.

### 6. Arc émotionnel — **le point qui change tout sur 2.5**

```
warm and conversational at the opening, slight surprise at the midpoint,
measured authenticity at the close, micro-expression shifts throughout
```

Sur 2.0 on dirigeait un beat de 5 s : un ton suffisait. **Sur 2.5, une passe de 30 s porte
l'arc entier — tu diriges une performance, plus un instant.** Sans arc, tu obtiens 30 s de
délivré neutre et plat, ce qui est un signal d'IA aussi fort que la peau lisse.

Coupler chaque émotion à un signe **visible** (regard, sourcils, souffle, mains), sinon le
mot reste abstrait. Voir `camera-lumiere-style.md`.

### 7. Ancrage de cohérence + exclusions

```
maintain exact appearance from @Image 1, no drift, no deformation,
face stable, no flickering
```
```
no background music, no ambient noise, no text overlay, no captions, no logos
```

2.5 tient bien mieux l'identité sur une passe qu'en 2.0 — **ça vaut quand même le
verrouillage**. Et comme 2.5 génère l'audio nativement, les exclusions audio comptent
**plus** qu'avant, pas moins : sans elles le modèle ajoute une musique de fond que tu ne
veux pas.

---

## Bloc à coller (UGC générique)

```
Vertical 9:16 selfie video. <PERSONNE> in <LIEU>, holding the phone at arm's
length, talking directly to camera.

Realistic skin texture, visible pores around the nose and cheeks, natural slight
unevenness, no filter quality. Handheld phone camera feel, casual unsteady
framing, filmed in a real environment, not a professional set. Soft warm window
light from camera-left, natural shadows across the face, no harsh highlights,
skin illuminated without overexposure. <3-4 OBJETS DE DÉSORDRE NOMMÉS> in the
background. Subtle handheld motion mimicking a propped-up phone, slight
micro-shake from breathing, no static locked-off framing.

Performance: warm and conversational at the opening, <ÉMOTION MID> at the
midpoint, measured authenticity at the close, micro-expression shifts throughout.

Dialogue language: <LANGUE + ACCENT>. She says: {<RÉPLIQUE COURTE>}

Maintain exact appearance from @Image 1, no drift, no deformation, face stable,
no flickering. Audio: person speaking into the phone microphone, quiet room tone
only. No background music, no ambient noise, no text overlay, no captions, no logos.
```

---

## Les derniers 10 % : la post-production

Le prompt t'amène à ~90 %. Ce qui reste ne se prompte pas :

| Étape | Pourquoi |
|---|---|
| Couche de shake supplémentaire | Le micro-shake généré reste trop régulier |
| Grain léger, faible intensité | Casse la propreté numérique du rendu |
| Étalonnage iPhone chaud | La science couleur du modèle est trop neutre |
| Audio tendance ajouté | Signal de plateforme, jamais généré correctement |
| Captions natives (pas brûlées) | Le rendu typo du modèle n'est pas fiable — d'où les exclusions |

Compter **2 à 3 minutes par reel**. C'est ce qui sépare un UGC IA qui convertit d'un UGC IA
classé « pub » à la première seconde.

---

## Réalisme hors UGC

La même logique s'applique ailleurs, avec des dosages différents :

| Contexte | Ce qu'on garde | Ce qu'on retire |
|---|---|---|
| **Pub produit premium** | Texture de peau/matière, arc émotionnel, exclusions | Le désordre et le handheld — on veut du contrôlé, mais on garde la matière |
| **Documentaire / interview** | Tout sauf le selfie | Le cadrage bras tendu, remplacer par trépied + légère respiration |
| **Cinématique narratif** | Texture, lumière en 4 axes, arc, exclusions | L'anti-polish : ici le look produit est voulu |
| **Talking head corporate** | Texture de peau, lumière décrite, exclusions audio | Désordre et instabilité |

**Le seul élément jamais négociable, quel que soit le registre : la texture de peau et
les exclusions audio/texte.**

---

## Erreurs fréquentes

- **Ajouter les clauses à la fin du prompt.** Le modèle déprioritise après ~8 exigences.
  La texture de peau et la lumière doivent être hautes dans le prompt, pas en queue.
- **Empiler « realistic, photorealistic, 8K, ultra detailed ».** Aucun de ces mots ne dit
  quoi que ce soit d'observable. « visible pores around the nose » en dit plus que les quatre.
- **Décrire le désordre au lieu de le nommer.** « a lived-in messy room » ne produit rien ;
  « charger cable on the nightstand » produit une chambre.
- **Oublier l'arc sur un clip long.** Sur 30 s c'est le défaut le plus visible après la peau.
- **Nier un objet visible** pour « faire vrai » (« no makeup », « no professional lighting »).
  Reformuler en positif : « bare skin, slight redness around the nose », « single window as
  the only light source ».
