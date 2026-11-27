// Sonnenblume, zweite Fassung: jeder Kern behält seinen Winkel und wandert nur nach aussen (kein Springen der hellen Kerne), und die
// Abweichung vom goldenen Winkel bleibt bei 0,12°, so dass auch am Rand nichts flackert. Die erste Fassung (sonnenblume.js) bleibt.
import { macher } from './sonnenblume.js';
export const baue = macher(0.12, true);
