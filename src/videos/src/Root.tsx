// Alle Videos von ornament.cloud, je eine Composition. Neue Videos trägt «npm run neu -- <name>» unten ein.
import { Composition, Folder } from "remotion";
import { OrnaVideo, T } from "./orna/Video";
import { BREITE, FPS, HOEHE } from "./vorlage/stil";
import { DoppelpruefungVideo, T as TDoppelpruefung } from "./doppelpruefung/Video";
import { DreiervergleichVideo, T as TDreiervergleich } from "./dreiervergleich/Video";
import { MenschVideo, T as TMensch, zeitplan as zeitplanMensch } from "./mensch/Video";
import { StartAnimation, TStart, WachstumVideo, T as TWachstum } from "./wachstum/Video";
import { RundgangVideo, T as TRundgang } from "./rundgang/Video";
import { DAUER as DauerNeubau, NeubauVideo, SZENEN as SzenenNeubau } from "./neubau/Video";
import { ReelVideo, SZENEN as SzenenReel, dauer as dauerReel } from "./reel/Video";
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
    <Composition id="RundgangVideo" component={RundgangVideo} durationInFrames={TRundgang.ende} fps={FPS} width={BREITE} height={HOEHE} />
    {/* «neubau»: ornament.cloud/b/ in der Gestaltung des Neubaus, 9:16; jede Szene auch einzeln (22. Oktober 2026) */}
    <Composition id="NeubauVideo" component={NeubauVideo} durationInFrames={DauerNeubau} fps={FPS} width={BREITE} height={HOEHE} />
    <Folder name="Neubau-Szenen">
      {SzenenNeubau.map(({ id, Szene, dauer }) => <Composition key={id} id={id} component={Szene} durationInFrames={dauer} fps={FPS} width={BREITE} height={HOEHE} />)}
    </Folder>
    {/* Reel «Was bringst du mit?»: Werbefilm für /b/, 9:16 (22. Oktober 2026) */}
    <Composition id="ReelVideo" component={ReelVideo} durationInFrames={dauerReel("ii")} fps={FPS} width={BREITE} height={HOEHE} defaultProps={{ logo: "ii" as const }} />
    {/* dasselbe Reel in 4:5, 1:1 und 16:9 (23. Oktober 2026): eigenes Raster je Format (reel/Format.tsx), nicht skaliert */}
    <Composition id="ReelVideo45" component={ReelVideo} durationInFrames={dauerReel("ii")} fps={FPS} width={1080} height={1350} defaultProps={{ logo: "ii" as const, format: "4:5" as const }} />
    <Composition id="ReelVideo11" component={ReelVideo} durationInFrames={dauerReel("ii")} fps={FPS} width={1080} height={1080} defaultProps={{ logo: "ii" as const, format: "1:1" as const }} />
    <Composition id="ReelVideo169" component={ReelVideo} durationInFrames={dauerReel("ii")} fps={FPS} width={1920} height={1080} defaultProps={{ logo: "ii" as const, format: "16:9" as const }} />
    <Composition id="ReelVideoLogoIII" component={ReelVideo} durationInFrames={dauerReel("iii")} fps={FPS} width={BREITE} height={HOEHE} defaultProps={{ logo: "iii" as const }} />
    <Folder name="Reel-Szenen">
      {SzenenReel.map(({ id, Szene, dauer }) => <Composition key={id} id={id} component={Szene} durationInFrames={dauer} fps={FPS} width={BREITE} height={HOEHE} />)}
    </Folder>
    {/* neue Videos: Composition */}
  </>
);
