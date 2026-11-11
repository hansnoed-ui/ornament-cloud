# Templates prêts à l'emploi

Tous les prompts sont en anglais. Remplacer les `<PLACEHOLDERS>`. Supprimer tout bloc inutile
— ne jamais matelasser.

---

## 1. UGC vertical / talking head façon iPhone

**Mode** : I2V ou multi-référence · **Ratio** : 9:16 · **Durée** : 15–30 s

```
Vertical selfie video. <PERSONNE : âge, style> in <LIEU DOMESTIQUE>, holding the
phone at arm's length, talking directly to camera, off-center framing.

Realistic skin texture, visible pores around the nose and cheeks, natural slight
unevenness, no filter quality. Handheld phone camera feel, casual unsteady framing,
filmed in a real environment, not a professional set. Soft warm window light from
camera-left, natural shadows across the face, no harsh highlights, skin illuminated
without overexposure. <3-4 OBJETS DE DÉSORDRE NOMMÉS> in the background. Subtle
handheld motion mimicking a propped-up phone, slight micro-shake from breathing,
no static locked-off framing.

Performance: warm and conversational at the opening, <ÉMOTION MID-POINT> at the
midpoint, measured authenticity at the close, micro-expression shifts throughout.

Dialogue language: <LANGUE + ACCENT>. She says: {<RÉPLIQUE, 10-20 MOTS MAX>}

Maintain exact appearance from @Image 1, no drift, no deformation, face stable,
no flickering.
Audio: person speaking into the phone microphone, quiet room tone only.
No background music, no ambient noise, no text overlay, no captions, no logos.
```

---

## 2. Pub produit cinématique

**Mode** : multi-référence · **Ratio** : 16:9 ou 9:16 · **Durée** : 15–30 s

```
[Generation Goal]
A <DURÉE>-second product commercial. The central subject is <PRODUIT>, revealed
from macro detail to full product in a <AMBIANCE> setting.

[Materials]
<PRODUIT> corresponds to @Image 1. Use only its exact shape, label typography,
material, and color. Do not alter proportions or label content.
<SCÈNE> references @Image 2. Use only the surface, space, and lighting. Do not
use any people in the image.

[Stage 1]
Initial state: extreme close-up on <DÉTAIL DU PRODUIT>, <MATIÈRE> catching the light.
Primary event: the camera slowly pulls back to reveal the whole product, centered.
End state: the full product is centered in frame, label facing camera and sharp.

[Stage 2]
Continue from the previous stage: the product remains unchanged in shape, label
and position.
Primary event: <ÉLÉMENT D'AMBIANCE : tissu, vapeur, ombre portée qui se déplace>
enters as the light warms.
End state: the product still holds center, now warmly lit.

[Stage 3]
Primary event: a slow push-in toward the label.
End state: the label fills the lower third, crisp and legible.

[Style]
<PALETTE ET LUMIÈRE EN 4 AXES>. Premium commercial look, real material texture,
visible surface grain, no plastic-smooth rendering.

[Maintain Consistency]
Keep the product shape, cap, label content, liquid level, and color exactly
consistent throughout.

Audio: <AMBIANCE DISCRÈTE>. No voice-over, no text overlay, no captions.
```

⚠️ **Verrouiller le produit d'abord, l'esthétique ensuite.** L'ordre compte : le modèle suit
le mieux les premières exigences.

---

## 3. Short vertical TikTok / Reels

**Mode** : T2V ou I2V · **Ratio** : 9:16 · **Durée** : 6–10 s

```
Vertical 9:16. <SUJET> <ACTION AVEC HOOK VISUEL DÈS LA PREMIÈRE SECONDE>.
The camera <UN SEUL MOUVEMENT> at a confident pace.
<LUMIÈRE EN 4 AXES>. <STYLE / ÉTALONNAGE>.
Subject stays close to camera and centered in the vertical frame.
End state: <POSE FINALE STABLE, LOOPABLE>.
Audio: <UN SON>. No background music, no text overlay, no captions.
```

---

## 4. Cinématique narratif 30 s multi-plans

**Mode** : multi-référence + staging · **Ratio** : 16:9 · **Durée** : 30 s

```
[Generation Goal]
A 30-second <GENRE> sequence. The central subject is <SUJET>, and the primary
event is <RÉSUMÉ>.

[Characters]
<PERSO A> corresponds to @Image 1. Use only the appearance, hairstyle, and clothing.
<PERSO B> corresponds to @Image 2. Use only the appearance, hairstyle, and clothing.
Do not interchange these characters' appearances, clothing, actions, or dialogue.

[Scenes]
<LIEU> references @Image 3. Use only the space, materials, and lighting. Do not
use the people in the image.

0-8 seconds: <PLAN 1 : taille de plan, action, caméra>.
End state: <état visible + état émotionnel>.
8-18 seconds: <PLAN 2>. End state: <état visible + état émotionnel>.
18-26 seconds: <PLAN 3>. End state: <état visible + état émotionnel>.
26-30 seconds: <PLAN DE CLÔTURE>. End state: <état final>.

[Style]
<LUMIÈRE 4 AXES>. <ÉTALONNAGE>. <ANCRAGE PELLICULE/CAMÉRA>.

[Maintain Consistency]
Keep character identity, number of characters, clothing, prop ownership, spatial
direction, and lighting consistent across all shots.

Audio: <AMBIANCE + EFFETS>. <(MUSIQUE) SI VOULUE>.
No text overlay, no captions, no logos.
```

---

## 5. Animation d'image fixe / logo / motion design

**Mode** : I2V · **Ratio** : celui de l'image

```
Animate @Image 1. Keep the existing composition, lighting, colors, and all text
exactly as they are in the image.
Apply <UN SEUL MOUVEMENT : gentle parallax / slow push-in / light sweep across
the surface / subtle depth separation between foreground and background>.
The motion is slow and continuous, with no cuts.
Do not add, remove, or redraw any element. No deformation of text or logo shapes.
Audio: <UN SON DISCRET OU AUCUN>. No background music, no captions.
```

---

## 6. Video-to-video / restyle / VFX

**Mode** : editing · **Ratio et durée verrouillés sur la source**

```
[Edit Goal]
Edit @Video 1. Across the entire video, <TRANSFORMATION VOULUE>.

[Source Video Role]
@Video 1 is the sole editing master. It defines the characters, scene, actions,
composition, camera movement, occlusion relationships, and event order.

[Edit Scope]
Modify only <CIBLE PRÉCISE>.

[Content to Preserve]
Keep the camera movement, pacing, cuts, subject identity, and event timing from
@Video 1 unchanged.

[Style]
<STYLE CIBLE DÉCRIT CONCRÈTEMENT>.
```

Pour un remplacement d'objet, ajouter la clause `[Timeline Inheritance]`
(voir `editing-et-extension.md`).

---

## 7. Interview / documentaire

**Mode** : multi-référence · **Ratio** : 16:9

```
Medium close-up of <PERSONNE> seated in <LIEU RÉEL, 3 OBJETS NOMMÉS>, speaking
to an off-camera interviewer, gaze slightly off-axis from the lens.

Realistic skin texture, visible pores, natural slight unevenness, no filter quality.
<LUMIÈRE EN 4 AXES>. Steady tripod shot with very slight breathing movement,
shallow depth of field, background softly out of focus.

Performance: <ÉMOTION D'OUVERTURE> at the start, shifting to <ÉMOTION FINALE>
through <2-4 INDICES VISIBLES>.

Dialogue language: <LANGUE + ACCENT>. He says: {<RÉPLIQUE COURTE>}

Maintain exact appearance from @Image 1, no drift, no deformation, face stable.
Audio: quiet room tone and the speaker's voice only.
No background music, no text overlay, no captions.
```
