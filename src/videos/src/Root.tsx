// Alle Videos von ornament.cloud, je eine Composition. Neue Videos trägt «npm run neu -- <name>» unten ein.
import { Composition } from "remotion";
import { OrnaVideo, T } from "./orna/Video";
import { BREITE, FPS, HOEHE } from "./vorlage/stil";
import { DoppelpruefungVideo, T as TDoppelpruefung } from "./doppelpruefung/Video";
import { DreiervergleichVideo, T as TDreiervergleich } from "./dreiervergleich/Video";
import { MenschVideo, T as TMensch, zeitplan as zeitplanMensch } from "./mensch/Video";
import { StartAnimation, TStart, WachstumVideo, T as TWachstum } from "./wachstum/Video";
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
    {/* Startanimation der Website: nur die Zeichen (1,4-mal so schnell) und das Signet, hell und dunkel (9. Oktober 2026) */}
    <Composition id="StartAnimation" component={StartAnimation} durationInFrames={TStart.ende} fps={FPS} width={BREITE} height={1080} />
    <Composition id="StartAnimationDunkel" component={StartAnimation} durationInFrames={TStart.ende} fps={FPS} width={BREITE} height={1080} defaultProps={{ dunkel: true }} />
    {/* neue Videos: Composition */}
  </>
);
