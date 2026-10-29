// Alle Videos von ornament.cloud, je eine Composition. Neue Videos trägt «npm run neu -- <name>» unten ein.
import { Composition } from "remotion";
import { OrnaVideo, T } from "./orna/Video";
import { BREITE, FPS, HOEHE } from "./vorlage/stil";
import { DoppelpruefungVideo, T as TDoppelpruefung } from "./doppelpruefung/Video";
import { DreiervergleichVideo, T as TDreiervergleich } from "./dreiervergleich/Video";
import { MenschVideo, T as TMensch, zeitplan as zeitplanMensch } from "./mensch/Video";
import { StartAnimation, TStart, WachstumVideo, T as TWachstum } from "./wachstum/Video";
import { WissenVideo, T as TWissen } from "./wissen/Video";
import { FahrtVideo, T as TFahrt } from "./fahrt/Video";
import { ReiseVideo, MASSE as MReise, T as TReise, zeitplan as zeitplanReise } from "./reise/Video";
// neue Videos: Import

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="OrnaVideo" component={OrnaVideo} durationInFrames={T.ende} fps={FPS} width={BREITE} height={HOEHE} />
    {/* «Liebling, ich habe den Poststrukturalismus strukturiert»: 3:4 und 9:16 (Wunsch vom 6. Oktober 2026) */}
    <Composition id="DoppelpruefungVideo" component={DoppelpruefungVideo} durationInFrames={TDoppelpruefung.ende} fps={FPS} width={BREITE} height={1440} defaultProps={{ hoehe: 1440 }} />
    <Composition id="DoppelpruefungHoch" component={DoppelpruefungVideo} durationInFrames={TDoppelpruefung.ende} fps={FPS} width={BREITE} height={HOEHE} defaultProps={{ hoehe: HOEHE }} />
    {/* «Drei im Doppelspalt der Wahrnehmung»: Luhmann, Baecker, Lehmann, nur 3:4 (Wunsch vom 6. Oktober 2026) */}
    <Composition id="DreiervergleichVideo" component={DreiervergleichVideo} durationInFrames={TDreiervergleich.ende} fps={FPS} width={BREITE} height={1440} />
    {/* «Mensch, Niklas!»: 3:4 (7. Oktober 2026) */}
    <Composition id="MenschVideo" component={MenschVideo} durationInFrames={TMensch.ende} fps={FPS} width={BREITE} height={1440} />
    <Composition id="MenschVideoEN" component={MenschVideo} durationInFrames={zeitplanMensch("en").T.ende} fps={FPS} width={BREITE} height={1440} defaultProps={{ sprache: "en" as const }} />
    <Composition id="MenschVideoES" component={MenschVideo} durationInFrames={zeitplanMensch("es").T.ende} fps={FPS} width={BREITE} height={1440} defaultProps={{ sprache: "es" as const }} />
    {/* «wachstum»: Linienwachstum spielt ornament.cloud, 1:1 (9. Oktober 2026) */}
    <Composition id="WachstumVideo" component={WachstumVideo} durationInFrames={TWachstum.ende} fps={FPS} width={BREITE} height={1080} />
    {/* Startanimation der Website: nur die Zeichen (11 s), ohne Signet, hell und dunkel (9. Oktober 2026) */}
    <Composition id="StartAnimation" component={StartAnimation} durationInFrames={TStart.ende} fps={FPS} width={BREITE} height={1080} />
    <Composition id="StartAnimationDunkel" component={StartAnimation} durationInFrames={TStart.ende} fps={FPS} width={BREITE} height={1080} defaultProps={{ dunkel: true }} />
    {/* «Wissen»: der Obsidian-Tresor als Netz, 4:5, im Look des Labs (27. Oktober 2026) */}
    <Composition id="WissenVideo" component={WissenVideo} durationInFrames={TWissen.ende} fps={FPS} width={BREITE} height={1350} />
    {/* «Fahrt»: 360°-Kamerafahrt um ein 3D-Modell aus einem Bild, 4:5, Lab-Intro und -Outro (27. Oktober 2026) */}
    <Composition id="FahrtVideo" component={FahrtVideo} durationInFrames={TFahrt.ende} fps={FPS} width={BREITE} height={1350} defaultProps={{ ordner: "fahrt-trellis" }} />
    {/* «Reise»: Kamerafahrt durch den Zettelkasten und ORNA im Stil der Graphansicht von Obsidian, 9:16, 4:5, 16:9 (28. Oktober 2026) */}
    <Composition id="ReiseHoch" component={ReiseVideo} durationInFrames={TReise.ende} fps={FPS} width={MReise.hoch.w} height={MReise.hoch.h} defaultProps={{ format: "hoch" as const }} />
    <Composition id="ReiseVideo" component={ReiseVideo} durationInFrames={TReise.ende} fps={FPS} width={MReise.vier.w} height={MReise.vier.h} defaultProps={{ format: "vier" as const }} />
    <Composition id="ReiseQuer" component={ReiseVideo} durationInFrames={TReise.ende} fps={FPS} width={MReise.quer.w} height={MReise.quer.h} defaultProps={{ format: "quer" as const }} />
    {/* Suchauftrag 1 «Vom Profil zum Feed zur Plattform» (29. Oktober 2026): 4:5 und 16:9, mit dem Zettelkasten-Intro */}
    <Composition id="ProfilVideo" component={ReiseVideo} durationInFrames={zeitplanReise("profil").ende} fps={FPS} width={MReise.vier.w} height={MReise.vier.h} defaultProps={{ format: "vier" as const, auftrag: "profil" as const }} />
    <Composition id="ProfilQuer" component={ReiseVideo} durationInFrames={zeitplanReise("profil").ende} fps={FPS} width={MReise.quer.w} height={MReise.quer.h} defaultProps={{ format: "quer" as const, auftrag: "profil" as const }} />
    {/* Suchauftrag 2 «Vom Körper zum blinden Fleck zum Material zur Kunst» (29. Oktober 2026): 4:5 und 16:9 */}
    <Composition id="KoerperVideo" component={ReiseVideo} durationInFrames={zeitplanReise("koerper").ende} fps={FPS} width={MReise.vier.w} height={MReise.vier.h} defaultProps={{ format: "vier" as const, auftrag: "koerper" as const }} />
    <Composition id="KoerperQuer" component={ReiseVideo} durationInFrames={zeitplanReise("koerper").ende} fps={FPS} width={MReise.quer.w} height={MReise.quer.h} defaultProps={{ format: "quer" as const, auftrag: "koerper" as const }} />
    {/* neue Videos: Composition */}
  </>
);
