// Social-Paket im Ganzen: ein kurzer echter Lauf von tools/social-paket.mjs mit gerechnetem Testton (--probe --nur 1 --sekunden 2) in einen
// Temp-Ordner. Geprüft wird mit ffprobe: zwei MP4 (1080 × 1920 und 1080 × 1080), je eine Video- und eine Audiospur, H.264/yuv420p, 30 Bilder/s,
// AAC, Dauer rund 2 s; dazu das Standbild und texte.md. Ein zweiter Lauf liest eine echte Datei (24 Bit Stereo) über --audio.
// Braucht ffmpeg/ffprobe und Playwright (Chromium).
//   NODE_PATH=$(npm root -g) node --test tests/social-paket.e2e.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const ep = JSON.parse(readFileSync(join(root, "listen/directer/ep.json"), "utf8"));
const probe = (datei) => JSON.parse(spawnSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", datei], { encoding: "utf8" }).stdout);
const werkzeug = (args) => spawnSync(process.execPath, [join(root, "tools/social-paket.mjs"), ...args], { encoding: "utf8", env: process.env, timeout: 240_000 });

function pruefeFilm(datei, breite, hoehe, sekunden, kanaele) {
  const p = probe(datei), video = p.streams.filter((s) => s.codec_type === "video"), ton = p.streams.filter((s) => s.codec_type === "audio");
  assert.equal(video.length, 1, "eine Videospur");
  assert.equal(ton.length, 1, "eine Audiospur");
  assert.deepEqual([video[0].width, video[0].height], [breite, hoehe]);
  assert.equal(video[0].codec_name, "h264");
  assert.equal(video[0].pix_fmt, "yuv420p");
  assert.equal(video[0].r_frame_rate, "30/1");
  assert.equal(Number(video[0].nb_frames), sekunden * 30);
  assert.equal(ton[0].codec_name, "aac");
  assert.equal(ton[0].channels, kanaele);
  assert.ok(Math.abs(Number(p.format.duration) - sekunden) < 0.15, `Dauer ${p.format.duration} s`);
  assert.ok(Math.abs(Number(ton[0].duration) - sekunden) < 0.15, `Ton ${ton[0].duration} s`);
}

test("Probelauf: zwei Filme, Standbild und Texte für den ersten Track", () => {
  const aus = mkdtempSync(join(tmpdir(), "social-e2e-"));
  try {
    const r = werkzeug(["directer", "--probe", "--nur", "1", "--sekunden", "2", "--aus", aus]);
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const t = ep.tracks[0].titel.toLowerCase().replace(/[^a-z0-9]+/g, "-"), kopf = `PROBE-directer-01-${t}`;
    assert.deepEqual(readdirSync(aus).sort(), [`${kopf}-1x1.mp4`, `${kopf}-9x16.jpg`, `${kopf}-9x16.mp4`, "texte.md"]);
    pruefeFilm(join(aus, `${kopf}-9x16.mp4`), 1080, 1920, 2, 1);
    pruefeFilm(join(aus, `${kopf}-1x1.mp4`), 1080, 1080, 2, 1);
    const bild = probe(join(aus, `${kopf}-9x16.jpg`)).streams[0];
    assert.deepEqual([bild.width, bild.height], [1080, 1920]);
    assert.ok(statSync(join(aus, `${kopf}-9x16.jpg`)).size > 100_000, "Standbild ist kein leeres Bild");
    const md = readFileSync(join(aus, "texte.md"), "utf8");
    assert.match(md, /^# PROBE – /);
    assert.ok(md.includes(`${kopf}-9x16.mp4`) && md.includes("ornament.cloud/listen/directer"));
    // ein- und ausgeblendet: das erste und das letzte Bild sind dunkel, die Mitte nicht
    const hell = (s) => { const b = spawnSync("ffmpeg", ["-v", "error", "-ss", String(s), "-i", join(aus, `${kopf}-1x1.mp4`), "-frames:v", "1", "-vf", "scale=8:8,format=gray", "-f", "rawvideo", "-"], { encoding: "buffer" }).stdout; return b.reduce((x, y) => x + y, 0) / b.length; };
    const [anfang, mitte, ende] = [0, 1, 1.95].map(hell);
    assert.ok(anfang < 25 && ende < 30 && mitte > 60, `Helligkeit ${anfang.toFixed(0)} / ${mitte.toFixed(0)} / ${ende.toFixed(0)}`);
  } finally { rmSync(aus, { recursive: true, force: true }); }
});

test("Echte Datei über --audio: 24 Bit Stereo, Marken aus ep.json, Ton bleibt stereo", () => {
  const dir = mkdtempSync(join(tmpdir(), "social-e2e-"));
  try {
    // eine WAV in der Länge bis zum Ende des ersten Tracks wäre gross; darum ffmpeg: leiser Ton, zwischen 20 und 23 s laut
    const sek = Math.ceil(ep.tracks[0].samples / ep.abtastrate), wav = join(dir, "ton.wav");
    const f = spawnSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", `sine=frequency=110:sample_rate=${ep.abtastrate}:duration=${sek}`, "-af", "volume='if(between(t,20,23),1,0.05)':eval=frame", "-ac", "2", "-c:a", "pcm_s24le", wav], { encoding: "utf8" });
    assert.equal(f.status, 0, f.stderr);
    const r = werkzeug(["directer", "--audio", wav, "--nur", "1", "--sekunden", "2", "--aus", join(dir, "aus")]);
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.match(r.stdout, /PCM 24 Bit, stereo/);
    const dateien = readdirSync(join(dir, "aus")).sort();
    assert.ok(dateien.every((d) => !d.includes("PROBE")), "ohne --probe kein PROBE im Namen");
    if (!ep.social?.ausschnitte?.[ep.tracks[0].titel]) assert.match(r.stdout, /Ausschnitt ab 0:2[01] \(Energie\)/, "findet die laute Stelle");
    pruefeFilm(join(dir, "aus", dateien.find((d) => d.endsWith("-9x16.mp4"))), 1080, 1920, 2, 2);
    assert.ok(!readFileSync(join(dir, "aus/texte.md"), "utf8").includes("PROBE"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
