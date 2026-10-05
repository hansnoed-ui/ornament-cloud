// Alle Videos von ornament.cloud, je eine Composition. Neue Videos trägt «npm run neu -- <name>» unten ein.
import { Composition } from "remotion";
import { OrnaVideo, T } from "./orna/Video";
import { BREITE, FPS, HOEHE } from "./vorlage/stil";
// neue Videos: Import

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="OrnaVideo" component={OrnaVideo} durationInFrames={T.ende} fps={FPS} width={BREITE} height={HOEHE} />
    {/* neue Videos: Composition */}
  </>
);
