// Ein kurzes Musikstück für die Beispielvideos aus PHORMA III (20. Oktober 2026, Wunsch: «bei PHORMA II und III würd ich mir bei den Beispielvideos
// noch ein bis zwei zusätzliche Effekte wünschen»): im Repo liegt keine Musik, und die Effekte von PHORMA III folgen dem Ton – also wird er hier
// gerechnet, wiederholbar, ohne Datei von aussen. 112 Schläge je Minute, Bassdrum auf jedem Schlag, Snare auf zwei und vier, Hi-Hat in Achteln, ein
// Bass in der Grundtonart, ein Arpeggio in Sechzehnteln über vier Akkorden; alle acht Takte ein Bruch (nur Bass und Hat), damit die Einsätze
// danach kräftig schneiden. Mono, 16 Bit, 44,1 kHz, mit Ausklang am Ende.
//   beispielton({ dauer: 28 }) → Buffer (WAV)

export const BPM = 112;
const RATE = 44100;

export function beispielton({ dauer = 28, rate = RATE } = {}) {
  const n = Math.round(dauer * rate), pcm = new Float32Array(n);
  const schlag = 60 / BPM, takt = 4 * schlag;
  const note = (halbton) => 55 * 2 ** (halbton / 12);                                   // A1 = 55 Hz
  const AKKORDE = [[0, 7, 12, 15], [-4, 3, 8, 12], [-7, 0, 5, 12], [-2, 5, 10, 14]];    // a-Moll, F, C, G (in Halbtönen über A)
  const misch = (von, bis, w) => von + (bis - von) * w;
  let s = 7;
  const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const rausch = Float32Array.from({ length: rate }, () => r() * 2 - 1);                 // eine Sekunde Rauschen, wiederverwendet

  for (let i = 0; i < n; i++) {
    const t = i / rate, nr = Math.floor(t / takt), inTakt = t - nr * takt, bruch = nr % 8 === 7;
    const akkord = AKKORDE[Math.floor(nr / 2) % 4];
    let y = 0;
    // Bassdrum: ein fallender Sinus mit Klick
    const sSchlag = inTakt % schlag, kick = Math.exp(-sSchlag * 22) * Math.sin(2 * Math.PI * (48 + 110 * Math.exp(-sSchlag * 30)) * sSchlag);
    if (!bruch) y += 0.75 * kick;
    // Snare auf 2 und 4: Rauschen mit kurzem Ton
    const sSnare = (inTakt + schlag) % (2 * schlag), snare = Math.exp(-sSnare * 18) * (0.6 * rausch[i % rate] + 0.4 * Math.sin(2 * Math.PI * 190 * sSnare));
    if (!bruch) y += 0.4 * snare;
    // Hi-Hat in Achteln, auf den Zwischenschlägen offener
    const sHat = inTakt % (schlag / 2), offen = Math.round(inTakt / (schlag / 2)) % 2 === 1, hat = Math.exp(-sHat * (offen ? 14 : 45)) * rausch[(i * 7) % rate] * (1 - Math.abs(rausch[(i * 3) % rate]) * 0.3);
    y += (offen ? 0.13 : 0.1) * hat;
    // Bass: Grundton des Akkords, auf jedem Schlag neu angerissen, in Achteln mit dem Oktavwechsel
    const achtel = Math.floor(inTakt / (schlag / 2)), sAchtel = inTakt % (schlag / 2), bassTon = note(akkord[0] - 12 + (achtel % 4 === 3 ? 12 : 0));
    const bass = Math.exp(-sAchtel * 5) * (Math.sin(2 * Math.PI * bassTon * t) + 0.3 * Math.sin(2 * Math.PI * bassTon * 2 * t) + 0.15 * Math.sign(Math.sin(2 * Math.PI * bassTon * t)));
    y += 0.32 * bass;
    // Arpeggio in Sechzehnteln, aufwärts, mit einem weichen Filter (die Obertöne bleiben leise), in den Brüchen leiser
    const sechzehntel = Math.floor(inTakt / (schlag / 4)), sSechzehntel = inTakt % (schlag / 4), arpTon = note(akkord[sechzehntel % 4] + 12 + (sechzehntel % 8 >= 4 ? 12 : 0));
    const arp = Math.exp(-sSechzehntel * 9) * (Math.sin(2 * Math.PI * arpTon * t) + 0.2 * Math.sin(2 * Math.PI * arpTon * 3 * t) * Math.exp(-sSechzehntel * 25));
    y += (bruch ? 0.1 : 0.17) * arp;
    // Fläche: der Akkord als leise Sinus, langsam schwebend
    let flaeche = 0;
    for (const h of akkord) flaeche += Math.sin(2 * Math.PI * note(h + 12) * t + 0.3 * Math.sin(t * 0.7 + h));
    y += 0.05 * flaeche;
    // Einschwingen am Anfang, Ausklang am Ende
    const huelle = misch(0, 1, Math.min(1, t / 0.4)) * Math.min(1, (dauer - t) / 1.5);
    pcm[i] = Math.tanh(1.3 * y) * 0.9 * huelle;
  }
  return wav(pcm, rate);
}

export function wav(pcm, rate) {
  const n = pcm.length, b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, pcm[i])) * 32767), 44 + i * 2);
  return b;
}
