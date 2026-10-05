// ORNA – Erklärvideo im Hochformat (1080 × 1920, 30 fps, 51,5 s, ohne Ton)
// Das Rad ist eine durchgehende Ebene (sein Zustand hängt nur am Bild), die Texte liegen als Szenen darüber.
// Inhalte: Namen, Zeichen und die Konstellation Eva Hesse × Susan Leigh Star aus den Daten von ORNA (unverändert);
// Raum und Zeit aus dem Werkbericht und dem Prüfraster «Nebeneinander und Nacheinander»; die sechs Prüfdimensionen
// und die Sätze zum Feld wörtlich aus dem Werkbericht (src/doppelspalt/werkbericht.md).
// Intro, Outro, Stil und Textbausteine kommen aus der gemeinsamen Vorlage (src/vorlage/).
import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame } from "remotion";
import daten from "./data/orna.json";
import { Rad, zielDrehung } from "./Rad";
import { FARBE, SANS, SERIF } from "../vorlage/stil";
import { Auszug, Grund, INTRO, Intro, Leise, Marke, OUTRO, Oben, Outro, Titel, Unten, blende, klemm, steig } from "../vorlage/Bausteine";

// ---------- Zeitplan (Bilder) ----------
// Reihenfolge (Wunsch vom 5. Oktober 2026): Intro, Titel, Ringe, Drehung, Textauszug, Raum, Zeit, Prüfdimensionen, Feld, Schluss, Outro
export const T = {
  intro: 0, titel: INTRO, ringe: 180, drehung: 285, halt: 435, text: 525, raum: 705, zeit: 810,
  kriterien: 930, feld: 1155, schluss: 1275, signet: 1365, ende: 1365 + OUTRO,
};

// ---------- Das Rad als durchgehende Ebene ----------
const TREFFER = { a: daten.beispiel.a, t: daten.beispiel.t };
const ZIEL_AUSSEN = zielDrehung(TREFFER.a) + 720;     // zwei volle Umdrehungen im Uhrzeigersinn
const ZIEL_INNEN = zielDrehung(TREFFER.t) - 720;      // gegenläufig

const RadEbene: React.FC = () => {
  const f = useCurrentFrame();
  // Drehung zur Begegnung; bei «Zeit lässt sie nacheinander erscheinen» drehen die Ringe von dort gegeneinander weiter.
  // Zum Schluss (das Rad war bei Prüfdimensionen und Feld ausgeblendet) steht wieder die Begegnung auf der Achse.
  const lauf = interpolate(f, [T.drehung, T.halt], [0, 1], { ...klemm, easing: Easing.bezier(0.2, 0.55, 0.15, 1) });
  const drift = f >= T.schluss ? 0 : interpolate(f, [T.zeit, T.kriterien], [0, 0.6 * (T.kriterien - T.zeit)], klemm);
  const aussen = lauf * ZIEL_AUSSEN + drift;
  const innen = lauf * ZIEL_INNEN - drift;
  const sichtbar = interpolate(f, [T.titel + 8, T.titel + 80], [0, 1], klemm);
  const zurueck = f >= T.schluss ? 1 : interpolate(f, [T.halt, T.halt + 20, T.raum, T.raum + 20], [0, 1, 1, 0], klemm);
  const treffer = (f >= T.halt && f < T.raum + 20) || f >= T.schluss ? TREFFER : null;
  const achse = interpolate(f, [T.titel + 50, T.titel + 80], [0, 1], klemm);
  // erst nach dem Intro; weg während Textauszug, Prüfdimensionen und Feld; zum Schluss wieder da
  const o = interpolate(f,
    [T.titel, T.titel + 10, T.text, T.text + 18, T.raum - 12, T.raum, T.kriterien, T.kriterien + 24, T.schluss, T.schluss + 24, T.signet - 14, T.signet],
    [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0], klemm);
  const s = interpolate(f, [T.kriterien, T.kriterien + 24, T.schluss, T.schluss + 24], [1, 0.9, 0.9, 1], klemm);
  return (
    <div style={{ position: "absolute", left: 90, top: 545, opacity: o, scale: s }}>
      <Rad groesse={900} aussen={aussen} innen={innen} sichtbar={sichtbar} treffer={treffer} zurueck={zurueck} achse={achse} />
    </div>
  );
};

// ---------- Szenen ----------
const SzeneTitel: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Oben o={blende(f, 0, T.ringe - T.titel)} y={steig(f, 0)}>
      <Marke>ORNA</Marke>
      <Titel groesse={104}>Zufällige<br />Begegnungen</Titel>
    </Oben>
  );
};

const SzeneRinge: React.FC = () => {
  const f = useCurrentFrame();
  const d = T.drehung - T.ringe;
  return (
    <>
      <Oben o={blende(f, 0, d)} y={steig(f, 0)}>
        <Marke farbe={FARBE.text}>Aussen · 20 Künstler:innen</Marke>
        <Leise groesse={34}>Agnes Martin · Eva Hesse · On Kawara · Sol LeWitt …</Leise>
        <div style={{ height: 6 }} />
        <Marke farbe={FARBE.text}>Innen · 20 Theoretiker:innen</Marke>
        <Leise groesse={34}>Karen Barad · Donna Haraway · Henri Bergson · Niklas Luhmann …</Leise>
      </Oben>
      <Unten o={blende(f, 6, d)} y={steig(f, 6)}>
        <Titel>Zwei Ringe, gegenläufig</Titel>
      </Unten>
    </>
  );
};

const SzeneAchse: React.FC<{ nr: string; name: string; satz: string; pruefstein: string; frage: string; dauer: number }> = ({ nr, name, satz, pruefstein, frage, dauer }) => {
  const f = useCurrentFrame();
  return (
    <>
      <Oben o={blende(f, 0, dauer)} y={steig(f, 0)}>
        <Marke>{nr} · {name}</Marke>
        <Titel>{satz}</Titel>
      </Oben>
      <Unten o={blende(f, 14, dauer)} y={steig(f, 14)}>
        <Marke farbe={FARBE.text}>Prüfstein: {pruefstein}</Marke>
        <Leise>{frage}</Leise>
      </Unten>
    </>
  );
};

const SzeneDrehung: React.FC = () => {
  const f = useCurrentFrame();
  const d = T.text - T.drehung;
  const stop = T.halt - T.drehung;
  return (
    <>
      <Oben o={blende(f, 0, d)} y={steig(f, 0)}>
        <Marke>Eine Drehung, eine Begegnung</Marke>
        <Titel groesse={60}>Die Geste bestimmt die Bewegung, gezogen wird aus 326 kuratierten Konstellationen.</Titel>
      </Oben>
      <Unten o={blende(f, stop + 8, d)} y={steig(f, stop + 8)}>
        <Marke farbe={FARBE.text}>{daten.artists[TREFFER.a]} × {daten.theorists[TREFFER.t]}</Marke>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 66, lineHeight: 1.15, color: FARBE.text, opacity: interpolate(f, [stop + 30, stop + 46], [0, 1], klemm) }}>
          {daten.beispiel.question}
        </div>
      </Unten>
    </>
  );
};

const DIMENSIONEN: [string, string][] = [
  ["Werkpräzision", "Welches Werk, welche Werkgruppe, welches Verfahren ist gemeint?"],
  ["Theoriepräzision", "Welcher Begriff aus welchem Text trägt die Beziehung, und wo endet die Übertragung?"],
  ["Reibung", "Wo widersprechen oder verschieben sich die beiden Positionen?"],
  ["Zusatzwert", "Welche bestehende Konstellation ist die ähnlichste, und was kommt hinzu?"],
  ["Fragequalität", "Lässt sich die Frage unterschiedlich beantworten oder zurückweisen?"],
  ["Reflexivität", "Welche andere Lesart wäre möglich?"],
];

const SzeneKriterien: React.FC = () => {
  const f = useCurrentFrame();
  const d = T.feld - T.kriterien;
  const aus = interpolate(f, [d - 12, d], [1, 0], klemm);
  return (
    <AbsoluteFill style={{ opacity: aus }}>
      <Oben o={interpolate(f, [10, 24], [0, 1], klemm)} y={steig(f, 10)}>
        <Marke>Sechs Prüfdimensionen</Marke>
        <Titel>Was eine Paarung leisten muss</Titel>
      </Oben>
      <div style={{ position: "absolute", left: 90, right: 90, top: 470, display: "flex", flexDirection: "column", gap: 24 }}>
        {DIMENSIONEN.map(([name, frage], i) => {
          const a = 34 + i * 22;
          return (
            <div key={name} style={{ opacity: interpolate(f, [a, a + 12], [0, 1], klemm), translate: `0 ${steig(f, a)}px`, borderTop: `1.5px solid ${FARBE.linie}`, paddingTop: 18 }}>
              <div style={{ fontFamily: SERIF, fontSize: 52, lineHeight: 1.1, color: FARBE.text }}>{name}</div>
              <Leise groesse={32}>{frage}</Leise>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 90, right: 90, top: 1730, opacity: interpolate(f, [160, 174], [0, 1], klemm) }}>
        <Marke farbe={FARBE.text}>Werk- und Theoriepräzision sind Mindestbedingungen.</Marke>
      </div>
    </AbsoluteFill>
  );
};

const SzeneFeld: React.FC = () => {
  const f = useCurrentFrame();
  const d = T.schluss - T.feld;
  const zelle = 42;
  const besetzt = Math.round(interpolate(f, [12, 80], [0, daten.pairs.length], { ...klemm, easing: Easing.bezier(0.4, 0, 0.2, 1) }));
  const voll = new Set(daten.pairs.slice(0, besetzt).map(([a, t]) => `${a}-${t}`));
  return (
    <AbsoluteFill style={{ opacity: blende(f, 0, d) }}>
      <Oben o={1} y={steig(f, 0)}>
        <Marke>Das Feld · 20 × 20</Marke>
        <Titel>{daten.count} von 400 möglichen Paarungen</Titel>
      </Oben>
      <svg width={zelle * 20} height={zelle * 20} style={{ position: "absolute", left: (1080 - zelle * 20) / 2, top: 560 }}>
        {Array.from({ length: 400 }, (_, k) => {
          const a = Math.floor(k / 20), t = k % 20;
          const x = t * zelle + zelle / 2, y = a * zelle + zelle / 2;
          return voll.has(`${a}-${t}`)
            ? <circle key={k} cx={x} cy={y} r={11} fill={FARBE.text} />
            : <circle key={k} cx={x} cy={y} r={10} fill="none" stroke={FARBE.leise} strokeWidth={1.5} opacity={interpolate(f, [80, 100], [0.25, 1], klemm)} />;
        })}
      </svg>
      {/* Achsen des Felds: Zeilen = Künstler:innen, Spalten = Theoretiker:innen */}
      <div style={{ position: "absolute", left: (1080 - zelle * 20) / 2, top: 518, fontFamily: SANS, fontSize: 26, color: FARBE.leise }}>Theoretiker:innen →</div>
      <div style={{ position: "absolute", left: (1080 - zelle * 20) / 2 - 40, top: 560 + zelle * 20, fontFamily: SANS, fontSize: 26, color: FARBE.leise, rotate: "-90deg", transformOrigin: "0 0" }}>← Künstler:innen</div>
      <Unten o={interpolate(f, [86, 100], [0, 1], klemm)} y={steig(f, 86)}>
        <div style={{ height: 30 }} />
        <Marke farbe={FARBE.text}>Die 74 freien Felder sind nicht verboten.</Marke>
        <Leise groesse={34}>Sie dokumentieren den Unterschied zwischen mathematischer und kuratorischer Möglichkeit.</Leise>
      </Unten>
    </AbsoluteFill>
  );
};

const SzeneSchluss: React.FC = () => {
  const f = useCurrentFrame();
  const aus = interpolate(f, [T.signet - T.schluss - 14, T.signet - T.schluss], [1, 0], klemm);
  return (
    <>
      <Oben o={Math.min(interpolate(f, [10, 26], [0, 1], klemm), aus)} y={steig(f, 10)}>
        <Titel groesse={72}>Dieses Rad erzeugt keine Antworten. Es erzeugt Konstellationen.</Titel>
      </Oben>
      <Unten o={Math.min(interpolate(f, [30, 46], [0, 1], klemm), aus)} y={steig(f, 30)}>
        <Marke>ORNA</Marke>
        <Leise>ornament.cloud · Apps</Leise>
      </Unten>
    </>
  );
};

// ---------- Das ganze Video ----------
export const OrnaVideo: React.FC = () => {
  return (
    <Grund>
      <RadEbene />
      <Sequence name="Intro" from={T.intro} durationInFrames={INTRO}><Intro kopf={{ titel: "ORNA", unter: ["app", "web"] }} /></Sequence>
      <Sequence name="Titel" from={T.titel} durationInFrames={T.ringe - T.titel}><SzeneTitel /></Sequence>
      <Sequence name="Ringe" from={T.ringe} durationInFrames={T.drehung - T.ringe}><SzeneRinge /></Sequence>
      <Sequence name="Drehung" from={T.drehung} durationInFrames={T.text - T.drehung}><SzeneDrehung /></Sequence>
      <Sequence name="Text" from={T.text} durationInFrames={T.raum - T.text}>
        <Auszug kennzeile={`${daten.artists[TREFFER.a]} × ${daten.theorists[TREFFER.t]}`} text={daten.beispiel.auszug}
          hinweis="Auszug aus dem Text zur Konstellation" dauer={T.raum - T.text} />
      </Sequence>
      <Sequence name="Raum" from={T.raum} durationInFrames={T.zeit - T.raum}>
        <SzeneAchse nr="Achse 1" name="Verräumlichung" satz="Raum lässt Unterschiede nebeneinander erscheinen." pruefstein="Rückkehr"
          frage="Was lässt sich wiederfinden, vergleichen und als dieselbe Stelle erkennen?" dauer={T.zeit - T.raum} />
      </Sequence>
      <Sequence name="Zeit" from={T.zeit} durationInFrames={T.kriterien - T.zeit}>
        <SzeneAchse nr="Achse 2" name="Verzeitlichung" satz="Zeit lässt sie nacheinander erscheinen." pruefstein="Irreversibilität"
          frage="Was verändert sich durch die Aktualisierung, sodass eine Wiederkehr keine identische Rückkehr ist?" dauer={T.kriterien - T.zeit} />
      </Sequence>
      <Sequence name="Kriterien" from={T.kriterien} durationInFrames={T.feld - T.kriterien}><SzeneKriterien /></Sequence>
      <Sequence name="Feld" from={T.feld} durationInFrames={T.schluss - T.feld}><SzeneFeld /></Sequence>
      <Sequence name="Schluss" from={T.schluss} durationInFrames={T.signet - T.schluss}><SzeneSchluss /></Sequence>
      <Sequence name="Outro" from={T.signet} durationInFrames={OUTRO}><Outro /></Sequence>
    </Grund>
  );
};
