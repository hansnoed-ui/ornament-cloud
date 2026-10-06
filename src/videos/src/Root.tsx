// Alle Videos von ornament.cloud, je eine Composition. Neue Videos trägt «npm run neu -- <name>» unten ein.
import { Composition } from "remotion";
import { OrnaVideo, T } from "./orna/Video";
import { BREITE, FPS, HOEHE } from "./vorlage/stil";
import { DoppelpruefungVideo, T as TDoppelpruefung } from "./doppelpruefung/Video";
// neue Videos: Import

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="OrnaVideo" component={OrnaVideo} durationInFrames={T.ende} fps={FPS} width={BREITE} height={HOEHE} />
    <Composition id="DoppelpruefungVideo" component={DoppelpruefungVideo} durationInFrames={TDoppelpruefung.ende} fps={FPS} width={BREITE} height={1440} />   {/* 3:4 (Wunsch vom 6. Oktober 2026) */}
    {/* neue Videos: Composition */}
  </>
);
