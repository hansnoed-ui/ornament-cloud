// ORMA – Ergebniskarte als PNG.
// layoutCard() rechnet nur (Zeilenumbruch, Höhe) und ist ohne Browser prüfbar; drawCard() zeichnet.
// Lange Texte werden nie verkleinert oder abgeschnitten: die Karte wird höher.
// Namen und persönliche Antworten erscheinen nur, wenn sie ausdrücklich ausgewählt wurden.

export const CARD_WIDTH = 1080;
const MIN_HEIGHT = 1350;                     // 4:5, passt in die üblichen Bildformate
const PAD = 96, INNER = CARD_WIDTH - 2 * PAD;
const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const CARD_COLORS = { bg: "#f8f8f6", ink: "#1f1d1a", muted: "#6b665e", line: "#d9d4ca", accent: "#c2410c" };
// Herkunft: die bestehende, veröffentlichte Seite des Werks (keine eigene ORMA-Adresse)
export const ORIGIN = "hansnoed-ui.github.io/ornament-cloud · Nebeneinander, Nacheinander";

const AUFTRAG_LABEL = { beispiel: "Ein Beispiel finden", einwand: "Einen Einwand finden", gestaltung: "Etwas daraus machen" };

/** Text in Zeilen zerlegen, die höchstens `max` breit sind; überlange Wörter werden getrennt */
export function wrap(text, font, max, measure) {
  const out = [];
  for (const para of String(text).replace(/\r\n?/g, "\n").split("\n")) {
    let line = "";
    for (let word of para.split(/\s+/).filter(Boolean)) {
      while (measure(word, font) > max) {                        // überlanges Wort zerteilen
        let cut = word.length - 1;
        while (cut > 1 && measure(word.slice(0, cut) + "-", font) > max) cut -= 1;
        if (line) { out.push(line); line = ""; }
        out.push(word.slice(0, cut) + "-");
        word = word.slice(cut);
      }
      const next = line ? `${line} ${word}` : word;
      if (measure(next, font) <= max) line = next;
      else { out.push(line); line = word; }
    }
    out.push(line);
  }
  return out;
}

/**
 * data: { artist, theorist, question, auftrag, names:{a,b}, answers:{a:{text,oral},b}, result:{mode,gemeinsam,a,b}, date,
 *         labels?:{a,b}, resultLabel? }  – labels/resultLabel: Re-Entry («Ich, am …», «Der dritte Gedanke»)
 * opts: { names, answers, result } – was persönlich ist, nur auf ausdrückliche Auswahl
 */
export function layoutCard(data, opts, measure) {
  const ops = [];
  let y = PAD;
  const text = (t, font, size, color, lh = 1.3, x = PAD, max = INNER) => {
    for (const line of wrap(t, font, max, measure)) {
      y += size * lh;
      ops.push({ type: "text", text: line, font, x, y: y - size * (lh - 1) / 2 - size * 0.18, color });
    }
  };
  const gap = h => { y += h; };
  const rule = () => { ops.push({ type: "line", x1: PAD, x2: CARD_WIDTH - PAD, y: y }); };

  ops.push({ type: "mark", x: CARD_WIDTH - PAD - 60, y: PAD + 26 });
  text("ORMA", `600 34px ${SANS}`, 34, CARD_COLORS.ink, 1.2, PAD, INNER - 140);
  text("Nebeneinander, Nacheinander", `italic 28px ${SERIF}`, 28, CARD_COLORS.muted, 1.3, PAD, INNER - 140);
  gap(64);
  text(`${data.artist} × ${data.theorist}`, `64px ${SERIF}`, 64, CARD_COLORS.ink, 1.15);
  gap(40);
  text(data.question, `40px ${SERIF}`, 40, CARD_COLORS.ink, 1.35);

  const who = k => (data.labels && data.labels[k]) || ((opts.names && data.names[k]) ? data.names[k] : `Person ${k.toUpperCase()}`);
  const answerLabel = k => (data.labels ? data.labels[k] : `Zuerst ${who(k)}`);
  const say = a => (a.oral ? "hat mündlich geantwortet." : a.text.trim() || "–");
  const block = (label, body) => {
    text(label, `600 24px ${SANS}`, 24, CARD_COLORS.muted, 1.4);
    gap(6);
    text(body, `32px ${SANS}`, 32, CARD_COLORS.ink, 1.4);
  };

  const r = data.result || {};
  const hasResult = opts.result && ((r.mode === "gemeinsam" && r.gemeinsam.trim()) || (r.mode === "positionen" && (r.a.trim() || r.b.trim())));
  if (hasResult || opts.answers) {
    gap(56); rule(); gap(24);
    if (data.auftrag && AUFTRAG_LABEL[data.auftrag]) { text(`Spielauftrag: ${AUFTRAG_LABEL[data.auftrag]}`, `600 24px ${SANS}`, 24, CARD_COLORS.accent, 1.4); gap(20); }
  }
  if (hasResult) {
    if (r.mode === "gemeinsam") block(data.resultLabel || "Unser neuer Gedanke", r.gemeinsam.trim());
    else {
      if (r.a.trim()) { block(`Position ${who("a")}`, r.a.trim()); gap(20); }
      if (r.b.trim()) block(`Position ${who("b")}`, r.b.trim());
    }
  }
  if (opts.answers) {
    if (hasResult) gap(36);
    block(answerLabel("a"), say(data.answers.a));
    gap(20);
    block(answerLabel("b"), say(data.answers.b));
  }

  gap(72);
  const footTop = y;
  const FOOT = 20 + 2 * 30 * 1.4;                                // Linie + zwei Zeilen
  const height = Math.max(MIN_HEIGHT, Math.ceil(footTop + FOOT + PAD));
  // Fuss immer am unteren Rand, nie über dem Inhalt
  let fy = height - PAD - 30 * 1.4 * 2;
  ops.push({ type: "line", x1: PAD, x2: CARD_WIDTH - PAD, y: fy - 20 });
  for (const [t, font] of [[data.date || "", `26px ${SANS}`], [ORIGIN, `24px ${SANS}`]]) {
    if (!t) continue;
    fy += 30 * 1.4;
    ops.push({ type: "text", text: t, font, x: PAD, y: fy - 10, color: CARD_COLORS.muted });
  }
  return { width: CARD_WIDTH, height, ops };
}

/** Bildmarke: zwei Ringe, die sich überschneiden, der Schnittpunkt als Akzent */
function drawMark(ctx, x, y) {
  ctx.save();
  ctx.strokeStyle = CARD_COLORS.ink;
  ctx.lineWidth = 2.5;
  for (const dx of [-13, 13]) { ctx.beginPath(); ctx.arc(x + dx, y, 24, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = CARD_COLORS.accent;
  ctx.beginPath(); ctx.arc(x, y - Math.sqrt(24 * 24 - 13 * 13), 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawCard(canvas, layout) {
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = CARD_COLORS.bg;
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.textBaseline = "alphabetic";
  for (const op of layout.ops) {
    if (op.type === "text") { ctx.font = op.font; ctx.fillStyle = op.color; ctx.fillText(op.text, op.x, op.y); }
    else if (op.type === "line") { ctx.strokeStyle = CARD_COLORS.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(op.x1, op.y); ctx.lineTo(op.x2, op.y); ctx.stroke(); }
    else if (op.type === "mark") drawMark(ctx, op.x, op.y);
  }
}

/** Messfunktion für den Browser */
export function canvasMeasure() {
  const ctx = document.createElement("canvas").getContext("2d");
  return (t, font) => { ctx.font = font; return ctx.measureText(t).width; };
}
