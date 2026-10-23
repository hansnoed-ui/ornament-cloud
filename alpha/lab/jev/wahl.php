<?php
// ORNAMENT LAB – jev live: die Zwischenstelle auf dem Webspace bei Hostpoint (seit 23. Oktober 2026, ersetzt den Worker-Entwurf).
// Die Seite spricht nie selbst mit api.typesafe.ai und kennt keinen Schlüssel. Sie fragt diese Datei unter derselben Adresse wie das Lab;
// erst hier wird der Schlüssel gelesen, und zwar aus einer Datei AUSSERHALB der Website: ~/ornament-geheim/typesafe-schluessel.
// Dorthin legt ihn der Deploy-Workflow aus dem GitHub-Secret TYPESAFE_API_KEY (tools/hostpoint/jev-schluessel.sh); fehlt das Secret,
// löscht er die Datei, und jev live ist aus. Anleitung: alpha/lab/docs/JEV-STATUS.md.
//
//   GET  wahl.php                                 → { bereit: true|false, grund? }   (kostet nichts, fragt jev nicht)
//   POST wahl.php  { verlauf: [...], optionen: [...] }  → { wahrscheinlichkeiten: { "lab.feedback": 0.6, … }, modell, zwischengespeichert }
//   POST wahl.php  { frage: "dramaturgie", merkmale: {...}, optionen: [...] }  → ebenso, für die Animation aus Bild und Klang (seit Lab 0.1.11)
//
// Was die Zwischenstelle annimmt: nur POST von https://ornament.cloud (Origin), JSON, höchstens 2000 Bytes, nur eine Lage, die dieselben
// Regeln erfüllt wie labLage() in fragen.js (Kennungen aus dem festen Katalog, keine freien Texte). Die Frage baut sie selbst mit festem
// Wortlaut (wie labFrage() in fragen.js; tests/lab-jev-php.test.mjs prüft, dass beide Fassungen dasselbe schicken).
// Nach aussen geht nur ein Aufruf: POST https://api.typesafe.ai/v1/systemone (Entscheidungsform CHOICE).
// Grenzen: je Adresse 6 Fragen in der Minute und 60 am Tag; für alle zusammen 200 echte jev-Aufrufe am Tag und 2000 im Monat
// (bei etwa 1000 Eingabe-Token und 0,042 $ je Million Token höchstens rund 9 Cent im Monat). Gleiche Lagen kommen 30 Tage aus dem
// Zwischenspeicher und kosten nichts. Adressen werden nur als Prüfsumme gezählt und am nächsten Tag vergessen.
declare(strict_types=1);

const JEV_URL = 'https://api.typesafe.ai/v1/systemone';
const HERKUNFT = 'https://ornament.cloud';
const MAX_BYTES = 2000;
const HALTBAR = 30 * 24 * 3600;
const GRENZEN = ['je_minute' => 6, 'je_tag_adresse' => 60, 'je_tag' => 200, 'je_monat' => 2000];

/** fester Katalog: Kennung → Beschreibung für jev (gleich wie KATALOG in fragen.js) */
const KATALOG = [
  'fictory.prozess' => 'The Fictory: das Bild zerfällt in Teile, ordnet sich in sechs Operationen neu und setzt sich wieder zusammen (zeitliche Operation)',
  'lab.feedback' => 'Feedback: das Ergebnis wird wiederholt auf sich selbst angewandt, gezoomt, gedreht und farblich verschoben (rekursive Operation)',
  'lab.wiederholung' => 'Wiederholung mit Falloff: das Bild wird im Raster wiederholt, Grösse und Drehung verteilen sich über die Lage (räumliche Operation)',
  'lab.farbe' => 'Farbe modulieren: Farbdrehung, Sättigung, Kontrast, Tonwertstufen (räumliche Operation auf den Farben)',
  'lab.bildsignal' => 'Bildsignal: ein Merkmal des Bildes wird zu einem Steuersignal für andere Operationen (Kopplung)',
  'lab.differenz' => 'Differenz: zeigt und misst den Unterschied zu einem anderen Zustand (Beobachtung)',
  'lab.profil' => 'Kompositorisches Profil: misst Schwerpunkt, Symmetrie, Lichtverteilung, Kontrast, Sättigung und Kantenrichtung des Bildes (Beobachtung)',
  'lab.komposition' => 'Komposition verändern: verstärkt, hebt auf oder kehrt um, was das Profil misst, etwa Symmetrie, Lichtgefälle oder Sättigung (räumliche Operation)',
];
const FRAGE = 'In einem künstlerischen Labor wird ein Bild schrittweise durch Operationen verändert; jedes Ergebnis kann weitergeführt werden. Welche der folgenden Operationen eröffnet als nächster Schritt am ehesten eine Fortsetzung, die sich vom bisherigen Verlauf deutlich unterscheidet, statt ihn nur zu wiederholen?';

/** Dramaturgien und Merkmale (gleich wie DRAMATURGIEN und MERKMALE in fragen.js) */
const DRAMATURGIEN = [
  'vorschlag.puls' => 'Puls: sechs Varianten einer Feedback-Schleife, deren Zoom der Lautstärke folgt; harte Schnitte zwischen ihnen auf den Anschlägen des Klangs',
  'vorschlag.zerfall' => 'Zerfall: das Bild zerfällt in Farbflächen und setzt sich in sechs Zuständen neu zusammen (The Fictory); ruhige Übergänge, bei denen die dunklen Stellen zuerst erscheinen',
  'vorschlag.spiegel' => 'Spiegelung: die Symmetrie des Bildes wird verstärkt oder umgekehrt, je nach Lautstärke des Klangs; weiche Überblendungen im Takt der Anschläge',
  'vorschlag.farbwelle' => 'Farbwelle: die Farben drehen sich mit der Lautstärke durch den Farbkreis, in acht Varianten; Überblendungen im Takt der Anschläge',
  'vorschlag.raster' => 'Vervielfältigung: das Bild wird im Raster wiederholt, die Grösse der Kopien folgt der Lautstärke; Schnitte im Takt der Anschläge',
  'vorschlag.steigerung' => 'Steigerung: drei Operationen nacheinander (Farbe, Wiederholung, Feedback), das Bild verwandelt sich schrittweise immer weiter; lange, ruhige Übergänge',
];
const MERKMALE = [
  'bild' => [
    'kontrast' => ['niedrig' => 'Kontrast niedrig', 'mittel' => 'Kontrast mittel', 'hoch' => 'Kontrast hoch'],
    'farbigkeit' => ['grau' => 'fast ohne Farbe', 'gedaempft' => 'gedämpfte Farben', 'bunt' => 'kräftige Farben'],
    'symmetrie' => ['symmetrisch' => 'nahezu spiegelgleich', 'asymmetrisch' => 'deutlich asymmetrisch'],
    'helligkeit' => ['dunkel' => 'eher dunkel', 'mittel' => 'mittlere Helligkeit', 'hell' => 'eher hell'],
  ],
  'klang' => [
    'dichte' => ['ruhig' => 'wenige Anschläge (weniger als einer je zwei Sekunden)', 'bewegt' => 'regelmässige Anschläge (etwa einer bis zwei je Sekunde)', 'dicht' => 'dichte Anschläge (mehr als zwei je Sekunde)'],
    'dynamik' => ['gleichmaessig' => 'die Lautstärke bleibt etwa gleich', 'anschwellend' => 'wird über die Zeit lauter', 'abschwellend' => 'wird über die Zeit leiser', 'wechselhaft' => 'die Lautstärke wechselt stark'],
  ],
];
const FRAGE_DRAMATURGIE = 'In einem künstlerischen Labor sollen ein Bild und ein Klang zu einer Animation von 30 Sekunden werden; der Klang ist die Tonspur. Gemessen wurden nur die genannten Merkmale. Bei welcher der folgenden Dramaturgien geht die Bewegung am ehesten aus diesem Bild und diesem Klang hervor, statt ihnen von aussen übergestülpt zu werden?';

function antwort(array $daten, int $status = 200): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');   // sonst setzt mod_expires (.htaccess) zehn Minuten Zwischenspeicher
  header('X-Content-Type-Options: nosniff');
  header('X-Robots-Tag: noindex');
  echo json_encode($daten, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function kurz(string $s, int $n): string { return function_exists('mb_substr') ? mb_substr($s, 0, $n) : substr($s, 0, $n); }

/** der Ordner mit dem Schlüssel, ausserhalb der Website: Heimatordner des Webhostings (…/www/ornament.cloud/alpha/lab/jev → fünf Ebenen höher) */
function geheimOrdner(): ?string {
  $kandidaten = [];
  if (PHP_SAPI === 'cli-server' && getenv('ORNAMENT_GEHEIM')) $kandidaten[] = (string) getenv('ORNAMENT_GEHEIM');   // nur für die Tests
  $kandidaten[] = dirname(__DIR__, 5) . '/ornament-geheim';
  if (getenv('HOME')) $kandidaten[] = getenv('HOME') . '/ornament-geheim';
  if (function_exists('posix_getpwuid') && function_exists('posix_geteuid')) { $u = posix_getpwuid(posix_geteuid()); if (!empty($u['dir'])) $kandidaten[] = $u['dir'] . '/ornament-geheim'; }
  foreach ($kandidaten as $k) if (@is_dir($k)) return $k;
  return null;
}

function schluessel(?string $ordner): ?string {
  if ($ordner === null) return null;
  $s = @file_get_contents($ordner . '/typesafe-schluessel');
  if ($s === false) return null;
  $s = trim($s);
  return ($s !== '' && strlen($s) < 400 && !preg_match('/\s/', $s)) ? $s : null;
}

/** Lage prüfen und bereinigen, wie labLage() in fragen.js */
function lage($roh): array {
  if (!is_array($roh) || ($roh !== [] && array_keys($roh) === range(0, count($roh) - 1))) throw new InvalidArgumentException('Lage fehlt');
  if (($roh['frage'] ?? null) === 'dramaturgie') return dramaturgieLage($roh);
  $fremd = array_diff(array_keys($roh), ['verlauf', 'optionen']);
  if ($fremd) throw new InvalidArgumentException('unbekannte Felder: ' . implode(', ', $fremd));
  $verlauf = (isset($roh['verlauf']) && is_array($roh['verlauf'])) ? array_slice(array_values($roh['verlauf']), -8) : [];
  foreach ($verlauf as $k) if (!is_string($k) || !preg_match('/^[a-z]+\.[a-z0-9-]+\z/', $k)) throw new InvalidArgumentException('Verlauf enthält ungültige Kennungen');
  $optionen = [];
  foreach ((isset($roh['optionen']) && is_array($roh['optionen'])) ? array_values($roh['optionen']) : [] as $k) {
    if (!is_string($k) || !isset(KATALOG[$k])) throw new InvalidArgumentException('Optionen müssen 2–6 Kennungen aus dem Katalog sein');
    if (!in_array($k, $optionen, true)) $optionen[] = $k;
  }
  if (count($optionen) < 2 || count($optionen) > 6) throw new InvalidArgumentException('Optionen müssen 2–6 Kennungen aus dem Katalog sein');
  return ['verlauf' => $verlauf, 'optionen' => $optionen];
}

function dramaturgieLage(array $roh): array {
  $fremd = array_diff(array_keys($roh), ['frage', 'merkmale', 'optionen']);
  if ($fremd) throw new InvalidArgumentException('unbekannte Felder: ' . implode(', ', $fremd));
  $m = $roh['merkmale'] ?? null;
  if (!is_array($m) || ($m !== [] && array_keys($m) === range(0, count($m) - 1))) throw new InvalidArgumentException('Merkmale fehlen');
  $stufen = MERKMALE['bild'] + MERKMALE['klang'];
  $fremd = array_diff(array_keys($m), array_keys($stufen));
  if ($fremd) throw new InvalidArgumentException('unbekannte Merkmale: ' . implode(', ', $fremd));
  $merkmale = [];
  foreach ($stufen as $k => $werte) {
    if (!isset($m[$k]) || !is_string($m[$k]) || !array_key_exists($m[$k], $werte)) throw new InvalidArgumentException("Merkmal $k fehlt oder hat keine gültige Stufe");
    $merkmale[$k] = $m[$k];
  }
  $optionen = [];
  foreach ((isset($roh['optionen']) && is_array($roh['optionen'])) ? array_values($roh['optionen']) : [] as $k) {
    if (!is_string($k) || !isset(DRAMATURGIEN[$k])) throw new InvalidArgumentException('Optionen müssen 2–6 Dramaturgien aus dem Katalog sein');
    if (!in_array($k, $optionen, true)) $optionen[] = $k;
  }
  if (count($optionen) < 2 || count($optionen) > 6) throw new InvalidArgumentException('Optionen müssen 2–6 Dramaturgien aus dem Katalog sein');
  return ['frage' => 'dramaturgie', 'merkmale' => $merkmale, 'optionen' => $optionen];
}

/** feste Frage an jev, wie labFrage() in fragen.js */
function frage(array $lage): array {
  if (($lage['frage'] ?? null) === 'dramaturgie') {
    $zeile = function (string $gruppe) use ($lage): string {
      $teile = [];
      foreach (MERKMALE[$gruppe] as $k => $werte) $teile[] = $werte[$lage['merkmale'][$k]];
      return implode('; ', $teile);
    };
    $kriterien = [];
    foreach ($lage['optionen'] as $k) $kriterien[$k] = DRAMATURGIEN[$k];
    return [
      'zustand' => ['labor' => 'ORNAMENT LAB, Animation aus Bild und Klang', 'bild' => $zeile('bild'), 'klang' => $zeile('klang')],
      'fragen' => ['wahl' => ['type' => 'choice', 'instructions' => FRAGE_DRAMATURGIE, 'criteria' => $kriterien]],
    ];
  }
  $zeilen = [];
  foreach ($lage['verlauf'] as $i => $k) $zeilen[] = ($i + 1) . '. ' . (KATALOG[$k] ?? $k);
  $kriterien = [];
  foreach ($lage['optionen'] as $k) $kriterien[$k] = KATALOG[$k];
  return [
    'zustand' => ['labor' => 'ORNAMENT LAB, experimentelle Bildoperationen', 'bisherigerVerlauf' => $zeilen ? implode("\n", $zeilen) : 'noch keine Operation; nur das Ausgangsbild'],
    'fragen' => ['wahl' => ['type' => 'choice', 'instructions' => FRAGE, 'criteria' => $kriterien]],
  ];
}

/** Zähler unter Sperre lesen, ändern, schreiben; $fn gibt null (erlaubt) oder eine Fehlermeldung zurück */
function zaehlen(string $ordner, callable $fn): ?array {
  @mkdir($ordner . '/jev-lab', 0700);
  $h = @fopen($ordner . '/jev-lab/zaehler.json', 'c+');
  if (!$h) return ['Zähler nicht verfügbar', 503];
  flock($h, LOCK_EX);
  $z = json_decode((string) stream_get_contents($h), true);
  if (!is_array($z)) $z = [];
  $tag = gmdate('Y-m-d'); $monat = gmdate('Y-m');
  if (($z['tag'] ?? '') !== $tag) { $z['tag'] = $tag; $z['je_tag'] = 0; $z['adressen'] = []; }
  if (($z['monat'] ?? '') !== $monat) { $z['monat'] = $monat; $z['je_monat'] = 0; }
  $fehler = $fn($z);
  ftruncate($h, 0); rewind($h); fwrite($h, json_encode($z)); fflush($h);
  flock($h, LOCK_UN); fclose($h);
  return $fehler;
}

function grenzen(string $ordner): array {
  $g = GRENZEN;
  $c = @json_decode((string) @file_get_contents($ordner . '/jev-lab.json'), true);   // optional, um die Grenzen zu senken (oder für die Tests)
  if (is_array($c)) foreach ($g as $k => $v) if (isset($c[$k]) && is_int($c[$k]) && $c[$k] >= 0) $g[$k] = $c[$k];
  if (is_array($c) && isset($c['modell']) && is_string($c['modell']) && preg_match('/^[a-z0-9.\-]{1,40}$/', $c['modell'])) $g['modell'] = $c['modell'];
  if (is_array($c) && !empty($c['aus'])) $g['aus'] = true;
  return $g;
}

$ordner = geheimOrdner();
$key = schluessel($ordner);
$methode = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($methode === 'GET' || $methode === 'HEAD') {
  if ($key === null) antwort(['bereit' => false, 'grund' => 'Kein Schlüssel hinterlegt']);
  if (!function_exists('curl_init')) antwort(['bereit' => false, 'grund' => 'PHP ohne curl']);
  if (!empty(grenzen($ordner)['aus'])) antwort(['bereit' => false, 'grund' => 'Ausgeschaltet']);
  antwort(['bereit' => true]);
}
if ($methode !== 'POST') { header('Allow: GET, POST'); antwort(['fehler' => 'nur GET oder POST'], 405); }

$herkunft = $_SERVER['HTTP_ORIGIN'] ?? '';
$erlaubt = [HERKUNFT];
if (PHP_SAPI === 'cli-server' && getenv('ORNAMENT_HERKUNFT')) $erlaubt[] = (string) getenv('ORNAMENT_HERKUNFT');   // nur für die Tests
if (!in_array($herkunft, $erlaubt, true)) antwort(['fehler' => 'Herkunft nicht erlaubt'], 403);
if (isset($_SERVER['HTTP_SEC_FETCH_SITE']) && $_SERVER['HTTP_SEC_FETCH_SITE'] !== 'same-origin') antwort(['fehler' => 'Herkunft nicht erlaubt'], 403);
if (strncasecmp($_SERVER['CONTENT_TYPE'] ?? '', 'application/json', 16) !== 0) antwort(['fehler' => 'nur JSON'], 415);
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > MAX_BYTES) antwort(['fehler' => 'zu gross'], 413);
$text = (string) file_get_contents('php://input', false, null, 0, MAX_BYTES + 1);
if (strlen($text) > MAX_BYTES) antwort(['fehler' => 'zu gross'], 413);
if ($key === null) antwort(['fehler' => 'jev live ist nicht eingerichtet'], 503);
$g = grenzen($ordner);
if (!empty($g['aus'])) antwort(['fehler' => 'jev live ist ausgeschaltet'], 503);

try { $l = lage(json_decode($text, true, 8, JSON_THROW_ON_ERROR)); }
catch (Throwable $e) { antwort(['fehler' => kurz($e instanceof JsonException ? 'kein gültiges JSON' : $e->getMessage(), 120)], 400); }

// je Adresse begrenzen (auch Antworten aus dem Zwischenspeicher)
$adresse = hash_hmac('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? ''), $key);
$f = zaehlen($ordner, function (array &$z) use ($adresse, $g) {
  $a = $z['adressen'][$adresse] ?? ['minute' => 0, 'n_minute' => 0, 'n_tag' => 0];
  $jetzt = intdiv(time(), 60);
  if ($a['minute'] !== $jetzt) { $a['minute'] = $jetzt; $a['n_minute'] = 0; }
  if ($a['n_minute'] >= $g['je_minute'] || $a['n_tag'] >= $g['je_tag_adresse']) return ['zu viele Anfragen, bitte später wieder', 429];
  $a['n_minute']++; $a['n_tag']++;
  $z['adressen'][$adresse] = $a;
  return null;
});
if ($f) antwort(['fehler' => $f[0]], $f[1]);

// Zwischenspeicher: gleiche Lage, gleiche Antwort, 30 Tage
$modell = $g['modell'] ?? 'jev-latest';
$speicher = $ordner . '/jev-lab/zwischen';
@mkdir($speicher, 0700, true);
$datei = $speicher . '/' . hash('sha256', json_encode([$modell, $l])) . '.json';
if (is_file($datei) && filemtime($datei) > time() - HALTBAR) {
  $alt = json_decode((string) file_get_contents($datei), true);
  if (is_array($alt) && isset($alt['wahrscheinlichkeiten'])) antwort($alt + ['zwischengespeichert' => true]);
}

// Kostengrenze für alle zusammen; der Aufruf wird vorher gezählt, damit gleichzeitige Fragen sie nicht überschreiten
$f = zaehlen($ordner, function (array &$z) use ($g) {
  if (($z['je_tag'] ?? 0) >= $g['je_tag'] || ($z['je_monat'] ?? 0) >= $g['je_monat']) return ['Die Tagesgrenze für jev ist erreicht. Manuelle Wahl und Regeln bleiben verfügbar.', 429];
  $z['je_tag'] = ($z['je_tag'] ?? 0) + 1; $z['je_monat'] = ($z['je_monat'] ?? 0) + 1;
  return null;
});
if ($f) antwort(['fehler' => $f[0]], $f[1]);

$fr = frage($l);
$ziel = (PHP_SAPI === 'cli-server' && getenv('ORNAMENT_JEV_URL')) ? (string) getenv('ORNAMENT_JEV_URL') : JEV_URL;   // nur für die Tests
$c = curl_init($ziel);
curl_setopt_array($c, [
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $key],
  CURLOPT_POSTFIELDS => json_encode(['model' => $modell, 'state' => $fr['zustand'], 'questions' => $fr['fragen']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CONNECTTIMEOUT => 4,
  CURLOPT_TIMEOUT => 12,
  CURLOPT_FOLLOWLOCATION => false,
  CURLOPT_PROTOCOLS => CURLPROTO_HTTPS | CURLPROTO_HTTP,
]);
$roh = curl_exec($c);
$status = (int) curl_getinfo($c, CURLINFO_HTTP_CODE);
curl_close($c);
if ($roh === false) antwort(['fehler' => 'jev nicht erreichbar'], 502);
if ($status === 401 || $status === 403) antwort(['fehler' => 'jev hat den Schlüssel abgelehnt'], 502);
if ($status === 402 || $status === 429) antwort(['fehler' => "jev: Kontingent oder Guthaben erschöpft (HTTP $status)"], 502);
if ($status < 200 || $status >= 300) antwort(['fehler' => "jev: HTTP $status"], 502);
$j = json_decode((string) $roh, true);
$p = $j['answers']['wahl']['probabilities'] ?? null;
if (!is_array($p)) antwort(['fehler' => 'jev: unerwartete Antwort'], 502);
$w = [];
foreach ($l['optionen'] as $o) $w[$o] = max(0.0, min(1.0, (float) (is_numeric($p[$o] ?? null) ? $p[$o] : 0)));
$daten = ['wahrscheinlichkeiten' => $w, 'modell' => is_string($j['model'] ?? null) ? kurz($j['model'], 60) : 'jev'];
@file_put_contents($datei, json_encode($daten, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
antwort($daten + ['zwischengespeichert' => false]);
