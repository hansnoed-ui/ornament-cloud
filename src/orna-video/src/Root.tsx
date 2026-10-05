import { Composition } from "remotion";
import { OrnaVideo, T } from "./Video";
import { BREITE, FPS, HOEHE } from "./theme";

export const RemotionRoot: React.FC = () => (
  <Composition id="OrnaVideo" component={OrnaVideo} durationInFrames={T.ende} fps={FPS} width={BREITE} height={HOEHE} />
);
