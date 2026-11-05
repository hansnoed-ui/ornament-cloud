<?php
// Animationen – gesicherte Werke: die Ablage auf dem Webspace bei Hostpoint (4. November 2026, Wunsch: «werke können gesichert werden und
// werden abgelegt mit ersteller name (und sehr nice präsentiert auf der seite)»). Ein Werk ist ein Bild (JPEG, höchstens 1600 px) und
// seine Mischung (Grund, bis zu drei Ebenen, Schalter), dazu Titel, Name und Zeit. Alles liegt in animations/werke/ neben dieser Datei;
// der Ordner ist vom Deploy ausgenommen (tools/hostpoint/ausschluss.txt), damit rsync --delete ihn nicht leert.
//
//   GET  werke.php?liste                → { werke: [{ id, titel, name, zeit, bild, breite, hoehe, stapel }], anzahl }   (neueste zuerst)
//   GET  werke.php?id=ID                → ein Werk
//   POST werke.php  (multipart: bild, titel, name, stapel (JSON), schutz (leer))  → { id, schluessel }   (den Schlüssel behält der Browser des Erstellers)
//   POST werke.php  { aktion: "loeschen", id, schluessel }  → { geloescht: true }
//
// Grenzen: nur POST von https://ornament.cloud (Origin), Bild bis 2 MB und 2000 px (wird mit GD neu als JPEG geschrieben, ohne Metadaten),
// Name 1–40 Zeichen, Titel bis 60, Mischung nur aus bekannten Feldern; je Adresse 12 Werke in der Stunde, insgesamt höchstens 2000.
// Adressen werden nur als Prüfsumme gezählt und nach einer Stunde vergessen. Tests: tests/animations-php.test.mjs (php -S).
declare(strict_types=1);

const HERKUNFT = 'https://ornament.cloud';
const MAX_BILD = 2_000_000;
const MAX_SEITE = 2000;
const MAX_NAME = 40;
const MAX_TITEL = 60;
const MAX_STAPEL = 6000;
const MAX_WERKE = 2000;
const JE_STUNDE = 12;
const MODI = ['normal', 'multiplizieren', 'differenz', 'bildschirm', 'ueberlagern'];
const LAENGEN = [12, 30, 60];
const FORMATE = ['4x5', '1x1', '16x9'];

$test = PHP_SAPI === 'cli-server';   // php -S in den Tests: Herkunft und Ordner aus der Umgebung, nie auf dem Webspace
$herkunft = ($test && getenv('ANIMATIONEN_HERKUNFT')) ? (string)getenv('ANIMATIONEN_HERKUNFT') : HERKUNFT;
$ordner = ($test && getenv('ANIMATIONEN_WERKE')) ? (string)getenv('ANIMATIONEN_WERKE') : __DIR__ . '/werke';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function antwort(int $status, array $daten): never {
  http_response_code($status);
  echo json_encode($daten, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function fehler(int $status, string $text): never { antwort($status, ['fehler' => $text]); }

/** Text ohne Steuerzeichen, Ränder getrimmt, höchstens $max Zeichen */
function text(mixed $v, int $max): string {
  if (!is_string($v)) return '';
  $v = preg_replace('/[\x00-\x1f\x7f]+/u', ' ', $v) ?? '';
  $v = trim(preg_replace('/\s+/u', ' ', $v) ?? '');
  return mb_substr($v, 0, $max);
}
function zahl(mixed $v, float $min, float $max): ?float {
  if (!is_int($v) && !is_float($v)) return null;
  return max($min, min($max, (float)$v));
}
/** die Mischung: nur bekannte Felder in erlaubten Bereichen, sonst null */
function stapelPruefen(mixed $s): ?array {
  if (!is_array($s) || !isset($s['ebenen']) || !is_array($s['ebenen']) || count($s['ebenen']) < 1 || count($s['ebenen']) > 3) return null;
  $out = ['grund' => ($s['grund'] ?? 'schwarz') === 'weiss' ? 'weiss' : 'schwarz', 'ebenen' => []];
  foreach ($s['ebenen'] as $e) {
    if (!is_array($e)) return null;
    $effekt = $e['effekt'] ?? '';
    if ($effekt === '') continue;   // eine leere Ebene («— keine —») zählt nicht
    if (!is_string($effekt) || !preg_match('/^[a-z]{1,24}$/', $effekt)) return null;
    $werte = [];
    foreach ((array)($e['werte'] ?? []) as $w) { $z = zahl($w, 0, 1); if ($z === null) return null; $werte[] = round($z, 3); if (count($werte) > 6) return null; }
    $deck = zahl($e['deckkraft'] ?? 1, 0, 1);
    if ($deck === null) return null;
    $seed = zahl($e['seed'] ?? 0, 0, 999);
    $out['ebenen'][] = [
      'effekt' => $effekt, 'werte' => $werte, 'modus' => in_array($e['modus'] ?? 'normal', MODI, true) ? $e['modus'] : 'normal',
      'deckkraft' => round($deck, 3), 'quelle' => ($e['quelle'] ?? 'bild') === 'unten' ? 'unten' : 'bild', 'seed' => (int)($seed ?? 0),
      'aus' => !empty($e['aus']),
    ];
  }
  if (!$out['ebenen']) return null;
  if (!empty($s['ohneBild'])) $out['ohneBild'] = true;
  if (!empty($s['durchlauf'])) $out['durchlauf'] = true;
  if (isset($s['dauer']) && in_array($s['dauer'], LAENGEN, true)) $out['dauer'] = (int)$s['dauer'];
  if (isset($s['format']) && in_array($s['format'], FORMATE, true)) $out['format'] = $s['format'];
  return $out;
}
function werkLesen(string $ordner, string $id): ?array {
  if (!preg_match('/^[a-f0-9]{10}$/', $id)) return null;
  $roh = @file_get_contents("$ordner/$id.json");
  if ($roh === false) return null;
  $w = json_decode($roh, true);
  if (!is_array($w)) return null;
  unset($w['schluessel_hash'], $w['adresse']);
  $w['bild'] = "werke/$id.jpg";
  return $w;
}
/** die Liste neu aus den Dateien bauen (neueste zuerst) und als index.json ablegen */
function listeBauen(string $ordner): array {
  $werke = [];
  foreach (glob("$ordner/*.json") ?: [] as $datei) {
    $id = basename($datei, '.json');
    if ($id === 'index' || $id[0] === '.') continue;
    $w = werkLesen($ordner, $id);
    if ($w) $werke[] = $w;
  }
  usort($werke, fn($a, $b) => strcmp($b['zeit'], $a['zeit']));
  @file_put_contents("$ordner/index.json", json_encode($werke, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
  return $werke;
}
function liste(string $ordner): array {
  $roh = @file_get_contents("$ordner/index.json");
  $werke = $roh === false ? null : json_decode($roh, true);
  return is_array($werke) ? $werke : listeBauen($ordner);
}
/** je Adresse höchstens JE_STUNDE Werke in der Stunde; die Adresse wird nur als Prüfsumme gezählt */
function zaehlen(string $ordner, string $adresse): bool {
  $h = @fopen("$ordner/.adressen.json", 'c+');
  if (!$h) return true;
  flock($h, LOCK_EX);
  $alle = json_decode((string)stream_get_contents($h), true);
  if (!is_array($alle)) $alle = [];
  $jetzt = time();
  foreach ($alle as $k => $zeiten) { $alle[$k] = array_values(array_filter((array)$zeiten, fn($t) => is_int($t) && $t > $jetzt - 3600)); if (!$alle[$k]) unset($alle[$k]); }
  $schluessel = hash('sha256', 'animationen|' . $adresse . '|' . date('Y-m-d'));
  $ok = count($alle[$schluessel] ?? []) < JE_STUNDE;
  if ($ok) $alle[$schluessel][] = $jetzt;
  ftruncate($h, 0); rewind($h); fwrite($h, json_encode($alle)); fflush($h);
  flock($h, LOCK_UN); fclose($h);
  return $ok;
}

$methode = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!is_dir($ordner)) @mkdir($ordner, 0755, true);
if (!is_dir($ordner)) fehler(500, 'Die Ablage für die Werke fehlt.');

if ($methode === 'GET') {
  if (isset($_GET['id'])) { $w = werkLesen($ordner, (string)$_GET['id']); $w ? antwort(200, $w) : fehler(404, 'Dieses Werk gibt es nicht.'); }
  $werke = liste($ordner);
  antwort(200, ['werke' => $werke, 'anzahl' => count($werke)]);
}
if ($methode !== 'POST') fehler(405, 'Nur GET und POST.');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== $herkunft) fehler(403, 'Nur von ornament.cloud.');

$typ = $_SERVER['CONTENT_TYPE'] ?? '';
if (str_starts_with($typ, 'application/json')) {
  $roh = file_get_contents('php://input') ?: '';
  if (strlen($roh) > 2000) fehler(413, 'Zu viel.');
  $d = json_decode($roh, true);
  if (!is_array($d) || ($d['aktion'] ?? '') !== 'loeschen') fehler(400, 'Unbekannte Aktion.');
  $id = (string)($d['id'] ?? ''); $schluessel = (string)($d['schluessel'] ?? '');
  if (!preg_match('/^[a-f0-9]{10}$/', $id) || !preg_match('/^[a-f0-9]{32}$/', $schluessel)) fehler(400, 'Kennung oder Schlüssel fehlen.');
  $roh = @file_get_contents("$ordner/$id.json");
  $w = $roh === false ? null : json_decode($roh, true);
  if (!is_array($w)) fehler(404, 'Dieses Werk gibt es nicht.');
  if (!hash_equals((string)($w['schluessel_hash'] ?? ''), hash('sha256', $schluessel))) fehler(403, 'Der Schlüssel passt nicht.');
  @unlink("$ordner/$id.json"); @unlink("$ordner/$id.jpg");
  listeBauen($ordner);
  antwort(200, ['geloescht' => true, 'id' => $id]);
}

// ——— sichern ———
if (!str_starts_with($typ, 'multipart/form-data')) fehler(400, 'Bild und Mischung als Formular senden.');
if (text($_POST['schutz'] ?? '', 10) !== '') fehler(400, 'Nein.');
$name = text($_POST['name'] ?? '', MAX_NAME);
$titel = text($_POST['titel'] ?? '', MAX_TITEL);
if (mb_strlen($name) < 1) fehler(400, 'Bitte einen Namen angeben.');
$stapelRoh = (string)($_POST['stapel'] ?? '');
if (strlen($stapelRoh) > MAX_STAPEL) fehler(413, 'Die Mischung ist zu gross.');
$stapel = stapelPruefen(json_decode($stapelRoh, true));
if (!$stapel) fehler(400, 'Die Mischung ist nicht lesbar.');
$datei = $_FILES['bild'] ?? null;
if (!$datei || ($datei['error'] ?? 1) !== UPLOAD_ERR_OK) fehler(400, 'Das Bild fehlt.');
if ((int)$datei['size'] > MAX_BILD) fehler(413, 'Das Bild ist grösser als 2 MB.');
$mass = @getimagesize((string)$datei['tmp_name']);
if (!$mass || !in_array($mass['mime'], ['image/jpeg', 'image/png', 'image/webp'], true)) fehler(400, 'Nur JPEG, PNG oder WebP.');
if ($mass[0] > MAX_SEITE || $mass[1] > MAX_SEITE || $mass[0] < 16 || $mass[1] < 16) fehler(400, 'Das Bild muss zwischen 16 und 2000 px haben.');
if (count(liste($ordner)) >= MAX_WERKE) fehler(507, 'Die Ablage ist voll.');
$adresse = $_SERVER['REMOTE_ADDR'] ?? '';
if (!zaehlen($ordner, $adresse)) fehler(429, 'Mehr als zwölf Werke in der Stunde: bitte später noch einmal.');

$id = bin2hex(random_bytes(5));
$schluessel = bin2hex(random_bytes(16));
$ziel = "$ordner/$id.jpg";
if (function_exists('imagecreatefromstring')) {
  // neu schreiben: keine Metadaten, kein Alpha, immer JPEG
  $im = @imagecreatefromstring((string)file_get_contents((string)$datei['tmp_name']));
  if (!$im) fehler(400, 'Das Bild liess sich nicht lesen.');
  $flach = imagecreatetruecolor(imagesx($im), imagesy($im));
  imagefill($flach, 0, 0, imagecolorallocate($flach, 0, 0, 0));
  imagecopy($flach, $im, 0, 0, 0, 0, imagesx($im), imagesy($im));
  if (!imagejpeg($flach, $ziel, 88)) fehler(500, 'Das Bild liess sich nicht ablegen.');
  imagedestroy($im); imagedestroy($flach);
} else {
  if ($mass['mime'] !== 'image/jpeg') fehler(400, 'Ohne GD nur JPEG.');
  if (!move_uploaded_file((string)$datei['tmp_name'], $ziel) && !copy((string)$datei['tmp_name'], $ziel)) fehler(500, 'Das Bild liess sich nicht ablegen.');
}
@chmod($ziel, 0644);
$werk = [
  'id' => $id, 'titel' => $titel, 'name' => $name, 'zeit' => gmdate('c'), 'breite' => $mass[0], 'hoehe' => $mass[1], 'stapel' => $stapel,
  'schluessel_hash' => hash('sha256', $schluessel),
];
if (@file_put_contents("$ordner/$id.json", json_encode($werk, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX) === false) { @unlink($ziel); fehler(500, 'Das Werk liess sich nicht ablegen.'); }
listeBauen($ordner);
antwort(201, ['id' => $id, 'schluessel' => $schluessel, 'werk' => werkLesen($ordner, $id)]);
