// Rundgang durch ornament.cloud – Hochformat (1080 × 1920, 30 fps, 49,5 s, ohne Ton), 22. Oktober 2026
// Das Menü der Website ist eine durchgehende Ebene: erst gross in der Mitte, dann unten, das Kästchen der Szene ist aktiv.
// Inhalte: Menü (Namen und Symbole aus kopfleiste.js), Leads und Titel der Seiten Apps, Masterprompts, Zettelkasten, Social Media, Art,
// der Satz aus der Beschreibung der Startseite und der Zettel «Die Brücke» – alles unverändert aus der Website (daten.mjs).
// Intro, Outro, Stil und Textbausteine kommen aus der gemeinsamen Vorlage (src/vorlage/).
import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame } from "remotion";
import daten from "./data/rundgang.json";
import { FARBE, SANS, SERIF } from "../vorlage/stil";
import { Grund, INTRO, Intro, Leise, Marke, OUTRO, Oben, Outro, Titel, blende, klemm, steig, weich } from "../vorlage/Bausteine";

// ---------- Zeitplan (Bilder) ----------
export const T = {
  intro: 0, menue: INTRO, apps: 210, prompts: 420, zettel: 630, beispiel: 810, social: 1020, art: 1155,
  signet: 1305, ende: 1305 + OUTRO,
};
/** welches Kästchen in welcher Szene aktiv ist (Index in daten.menu) */
const AKTIV: [number, number][] = [[T.apps, 0], [T.prompts, 1], [T.zettel, 2], [T.social, 3], [T.art, 4]];

// ---------- Symbole des Menüs ----------
/** Ein Symbol aus dem Menü (viewBox 24 × 24), zeichnet sich mit p von 0 bis 1; dicke: Strichbreite im fertigen Bild (px) */
const Symbol: React.FC<{ markup: string; groesse: number; p?: number; dicke?: number; farbe?: string }> = ({ markup, groesse, p = 1, dicke = 4, farbe = FARBE.text }) => (
  <svg
    viewBox="0 0 24 24" width={groesse} height={groesse}
    style={{ fill: "none", stroke: farbe, strokeWidth: dicke / (groesse / 24), strokeLinecap: "round", strokeLinejoin: "round", strokeDasharray: 1, strokeDashoffset: 1 - p }}
    // pathLength="1" an jedem Element, damit sich alle Teile gleichzeitig zeichnen
    dangerouslySetInnerHTML={{ __html: markup.replace(/<(path|rect|circle)/g, '<$1 pathLength="1"') }}
  />
);
const zeichne = (f: number, a: number, d = 30) => interpolate(f, [a, a + d], [0, 1], { ...klemm, easing: Easing.inOut(Easing.cubic) });

// ---------- Das Menü als durchgehende Ebene ----------
const KASTEN = { breite: 168, hoehe: 176, abstand: 15 };

const MenueEbene: React.FC = () => {
  const f = useCurrentFrame() + T.menue;  // Bild im ganzen Video
  // erst gross in der Mitte, beim Wechsel zu «Apps» nach unten und kleiner
  const unten = interpolate(f, [T.apps - 10, T.apps + 14], [0, 1], { ...klemm, easing: weich });
  const top = interpolate(unten, [0, 1], [880, 1610]);
  const s = interpolate(unten, [0, 1], [1, 0.78]);
  const o = interpolate(f, [T.signet - 14, T.signet], [1, 0], klemm);
  const aktiv = AKTIV.reduce((w, [ab, i]) => (f >= ab ? i : w), -1);
  return (
    <div style={{ position: "absolute", left: 90, width: 900, top, scale: s, transformOrigin: "50% 0", opacity: o, display: "flex", gap: KASTEN.abstand }}>
      {daten.menu.map(({ name, symbol }, i) => {
        const a = T.menue + 14 + i * 8;
        const an = i === aktiv;
        const leise = aktiv >= 0 && !an;
        return (
          <div key={name} style={{
            width: KASTEN.breite, height: KASTEN.hoehe, boxSizing: "border-box", borderRadius: 18,
            border: `${an ? 5 : 2.5}px solid ${an ? FARBE.text : FARBE.linie}`, backgroundColor: an ? "#ffffff" : "transparent",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
            opacity: interpolate(f, [a, a + 12], [0, 1], klemm), translate: `0 ${steig(f, a)}px`,
          }}>
            <Symbol markup={symbol} groesse={72} p={zeichne(f, a, 24)} dicke={4} farbe={leise ? FARBE.leise : FARBE.text} />
            <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 32, color: leise ? FARBE.leise : FARBE.text }}>{name}</div>
          </div>
        );
      })}
    </div>
  );
};

// ---------- Szenen ----------
const SzeneMenue: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Oben o={blende(f, 0, T.apps - T.menue)} y={steig(f, 0)}>
      <Marke>ornament.cloud</Marke>
      <Titel groesse={84}>{daten.start}</Titel>
    </Oben>
  );
};

/** Kopf einer Szene: Symbol (zeichnet sich), Kennzeile mit dem Namen des Kästchens, Titel */
const Kopf: React.FC<{ i: number; titel: string; dauer: number; groesse?: number; children?: React.ReactNode }> = ({ i, titel, dauer, groesse = 76, children }) => {
  const f = useCurrentFrame();
  return (
    <Oben o={blende(f, 0, dauer)} y={steig(f, 0)}>
      <Symbol markup={daten.menu[i].symbol} groesse={132} p={zeichne(f, 4)} dicke={5} />
      <Marke>{daten.menu[i].name}</Marke>
      <Titel groesse={groesse}>{titel}</Titel>
      {children}
    </Oben>
  );
};

/** eine Liste in der Mitte, Einträge nacheinander (ab Bild a, je n Bilder) */
const Liste: React.FC<{ top: number; dauer: number; a: number; n: number; eintraege: React.ReactNode[] }> = ({ top, dauer, a, n, eintraege }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top, opacity: blende(f, 0, dauer), display: "flex", flexDirection: "column", gap: 26 }}>
      {eintraege.map((e, k) => (
        <div key={k} style={{ opacity: interpolate(f, [a + k * n, a + k * n + 12], [0, 1], klemm), translate: `0 ${steig(f, a + k * n)}px`, borderTop: `2.5px solid ${FARBE.linie}`, paddingTop: 20 }}>{e}</div>
      ))}
    </div>
  );
};

const SzeneApps: React.FC = () => {
  const d = T.prompts - T.apps;
  return (
    <>
      <Kopf i={0} titel={daten.apps.lead} dauer={d} groesse={66} />
      <Liste top={800} dauer={d} a={44} n={20} eintraege={daten.apps.gruppen.map((g) => (
        <React.Fragment key={g.name}>
          <Marke farbe={FARBE.leise}>{g.name}</Marke>
          <div style={{ fontFamily: SERIF, fontSize: 58, lineHeight: 1.2, color: FARBE.text, marginTop: 8 }}>{g.apps.join(" · ")}</div>
        </React.Fragment>
      ))} />
    </>
  );
};

const SzenePrompts: React.FC = () => {
  const d = T.zettel - T.prompts;
  return (
    <>
      <Kopf i={1} titel={daten.prompts.lead} dauer={d} />
      <Liste top={720} dauer={d} a={40} n={18} eintraege={daten.prompts.raster.map((r) => (
        <div key={r} style={{ fontFamily: SERIF, fontSize: 56, lineHeight: 1.15, color: FARBE.text }}>{r}</div>
      ))} />
    </>
  );
};

/** Der Zettelkasten als Raster: je Zyklus eine Zeile Karten; zum Schluss leuchtet der erste Zettel auf */
const SzeneZettel: React.FC = () => {
  const f = useCurrentFrame();
  const d = T.beispiel - T.zettel;
  const k = { b: 80, h: 56, g: 18 };
  const breite = 7 * k.b + 6 * k.g;
  const links = (1080 - breite) / 2 + 30;
  const top = 760;
  const zyklen = daten.zettel.zyklen;
  return (
    <>
      <Kopf i={2} titel={daten.zettel.titel} dauer={d}>
        <Leise>{daten.zettel.unter}</Leise>
      </Kopf>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, opacity: blende(f, 0, d) }}>
        {zyklen.map(({ zyklus, zahl }, r) => (
          <React.Fragment key={zyklus}>
            <div style={{ position: "absolute", left: links - 110, width: 80, textAlign: "right", top: top + r * (k.h + k.g) + 8, fontFamily: SERIF, fontSize: 34, color: FARBE.leise, opacity: interpolate(f, [24 + r * 5, 36 + r * 5], [0, 1], klemm) }}>{zyklus}</div>
            {Array.from({ length: zahl }, (_, c) => {
              const a = 24 + r * 5 + c * 2;
              const erster = r === 0 && c === 0;
              const leuchtet = erster ? interpolate(f, [d - 50, d - 36], [0, 1], klemm) : 0;
              return (
                <div key={c} style={{
                  position: "absolute", left: links + c * (k.b + k.g), top: top + r * (k.h + k.g), width: k.b, height: k.h, boxSizing: "border-box",
                  borderRadius: 6, border: `2.5px solid ${leuchtet > 0.5 ? FARBE.akzent : FARBE.text}`,
                  backgroundColor: leuchtet > 0 ? `rgba(194, 65, 12, ${leuchtet})` : "#ffffff",
                  opacity: interpolate(f, [a, a + 10], [0, 1], klemm), scale: interpolate(f, [a, a + 10], [0.7, 1], { ...klemm, easing: weich }),
                }} />
              );
            })}
          </React.Fragment>
        ))}
        <div style={{ position: "absolute", left: 90, right: 90, top: top + 7 * (k.h + k.g) + 30, textAlign: "center", opacity: interpolate(f, [70, 84], [0, 1], klemm) }}>
          <Marke farbe={FARBE.text}>{daten.zettel.meta}</Marke>
        </div>
      </div>
    </>
  );
};

/** Ein Zettel als Karteikarte: Kennzeile, Titel, Schlusssatz, Weiterdenken */
const SzeneBeispiel: React.FC = () => {
  const f = useCurrentFrame();
  const d = T.social - T.beispiel;
  const z = daten.zettel.beispiel;
  const karte = interpolate(f, [0, 18], [0, 1], { ...klemm, easing: weich });
  return (
    <AbsoluteFill style={{ opacity: blende(f, 0, d) }}>
      <div style={{ position: "absolute", left: 90, top: 150 }}>
        <Marke>{z.kenn}</Marke>
      </div>
      <div style={{
        position: "absolute", left: 90, right: 90, top: 250, padding: "60px 64px", boxSizing: "border-box",
        backgroundColor: "#ffffff", border: `2.5px solid ${FARBE.linie}`, borderRadius: 14, boxShadow: "0 18px 50px rgba(31, 29, 26, 0.10)",
        rotate: `${interpolate(karte, [0, 1], [-2.5, 0])}deg`, translate: `0 ${interpolate(karte, [0, 1], [60, 0])}px`,
      }}>
        <Titel groesse={96}>{z.titel}</Titel>
        <div style={{ marginTop: 34, fontFamily: SERIF, fontStyle: "italic", fontSize: 56, lineHeight: 1.28, color: FARBE.text, textWrap: "pretty", opacity: interpolate(f, [16, 30], [0, 1], klemm) }}>
          {z.schluss}
        </div>
        <div style={{ marginTop: 44, borderTop: `2.5px solid ${FARBE.linie}`, paddingTop: 28, opacity: interpolate(f, [60, 72], [0, 1], klemm) }}>
          <Marke farbe={FARBE.text}>Weiterdenken</Marke>
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 10, columnGap: 24 }}>
            {z.verweise.map((v, k) => (
              <div key={v.name} style={{ opacity: interpolate(f, [66 + k * 6, 78 + k * 6], [0, 1], klemm) }}>
                <div style={{ fontFamily: SANS, fontSize: 26, color: FARBE.leise }}>{v.fach}</div>
                <div style={{ fontFamily: SERIF, fontSize: 40, color: FARBE.text }}>{v.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Szene mit grossem Symbol in der Mitte (Social, Art) */
const SzeneGross: React.FC<{ i: number; titel: string; dauer: number }> = ({ i, titel, dauer }) => {
  const f = useCurrentFrame();
  return (
    <>
      <Oben o={blende(f, 0, dauer)} y={steig(f, 0)}>
        <Marke>{daten.menu[i].name}</Marke>
        <Titel>{titel}</Titel>
      </Oben>
      <div style={{ position: "absolute", left: (1080 - 520) / 2, top: 880, opacity: blende(f, 0, dauer) }}>
        <Symbol markup={daten.menu[i].symbol} groesse={520} p={zeichne(f, 10, 50)} dicke={9} />
      </div>
    </>
  );
};

export const RundgangVideo: React.FC = () => (
  <Grund>
    <Sequence durationInFrames={INTRO}><Intro kopf={{ titel: "ornament.cloud", unter: ["apps", "prompts", "zettel"] }} /></Sequence>
    <Sequence from={T.menue} durationInFrames={T.signet - T.menue}><MenueEbene /></Sequence>
    <Sequence from={T.menue} durationInFrames={T.apps - T.menue}><SzeneMenue /></Sequence>
    <Sequence from={T.apps} durationInFrames={T.prompts - T.apps}><SzeneApps /></Sequence>
    <Sequence from={T.prompts} durationInFrames={T.zettel - T.prompts}><SzenePrompts /></Sequence>
    <Sequence from={T.zettel} durationInFrames={T.beispiel - T.zettel}><SzeneZettel /></Sequence>
    <Sequence from={T.beispiel} durationInFrames={T.social - T.beispiel}><SzeneBeispiel /></Sequence>
    <Sequence from={T.social} durationInFrames={T.art - T.social}><SzeneGross i={3} titel={daten.social.lead} dauer={T.art - T.social} /></Sequence>
    <Sequence from={T.art} durationInFrames={T.signet - T.art}><SzeneGross i={4} titel={daten.art.lead} dauer={T.signet - T.art} /></Sequence>
    <Sequence from={T.signet} durationInFrames={OUTRO}><Outro /></Sequence>
  </Grund>
);
