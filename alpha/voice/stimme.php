<?php
// ornament.studio – Stimme: die Zwischenstelle für die Seite alpha/voice/ auf dem Webspace bei Hostpoint (29. Oktober 2026).
// Die Seite kennt weder Passwort noch Schlüssel. Beides liegt AUSSERHALB der Website in ~/ornament-geheim/stimme.json
// ({ "passwort_hash": "...", "github_token": "...", "repo": "hansnoed-ui/ornament-studio" }); dorthin legt es der Deploy-Workflow
// aus den GitHub-Secrets STIMME_PASSWORT und STIMME_GITHUB_TOKEN (tools/hostpoint/stimme-zugang.sh). Fehlt eines, ist die Stimme aus.
// Gerechnet wird im privaten Repository (Workflow «Stimme», stimme.yml); Texte und Aufnahmen bleiben dort und hier ausserhalb der Website.
//
//   GET  stimme.php                                → { bereit, angemeldet, grund? }
//   POST stimme.php  { aktion: "anmelden", passwort } → { angemeldet: true }      (Sitzungs-Cookie, 5 Fehlversuche je Viertelstunde und Adresse)
//   POST stimme.php  { aktion: "abmelden" }
//   POST stimme.php  { aktion: "sprechen", text, stil: "b"|"g" } → { id, doppelt? }  (startet den Workflow; derselbe Text noch unterwegs → dessen id)
//   POST stimme.php  { aktion: "abbrechen", id }   → { id, status: "abgebrochen" }  (bricht den Lauf bei GitHub ab)
//   GET  stimme.php?auftrag=ID                     → { status: "wartet"|"laeuft"|"fertig"|"fehler"|"abgebrochen", dauer? }  (holt das Ergebnis beim ersten «fertig»)
//   GET  stimme.php?liste                          → { auftraege: [{ id, zeit, stil, anfang, status, dauer? }] }
//   GET  stimme.php?laden=ID&format=wav|mp3        → die Datei als Download
declare(strict_types=1);

const HERKUNFT = 'https://ornament.cloud';
const MAX_BYTES = 40000;
const MAX_TEXT = 5000;
const FEHLVERSUCHE = 5;
const SPERRE = 900;
const JE_TAG = 40;
const DOPPELT = 600;   // derselbe Text mit derselben Sprechweise innert zehn Minuten, solange er unterwegs ist: kein zweiter Lauf
const GITHUB_API = 'https://api.github.com';

$test = PHP_SAPI === 'cli-server';   // die Umgebungsvariablen gelten nur für die Tests (php -S), nie auf dem Webspace
/** der Ordner ausserhalb der Website: Heimatordner des Webhostings (…/www/ornament.cloud/alpha/voice → vier Ebenen höher) */
$geheim = ($test && getenv('ORNAMENT_GEHEIM')) ? (string)getenv('ORNAMENT_GEHEIM') : dirname(__DIR__, 4) . '/ornament-geheim';
if (!$test && !is_dir($geheim) && getenv('HOME')) $geheim = getenv('HOME') . '/ornament-geheim';
$ordner = $geheim . '/stimme';
$herkunft = ($test && getenv('ORNAMENT_HERKUNFT')) ? (string)getenv('ORNAMENT_HERKUNFT') : HERKUNFT;
$api = ($test && getenv('ORNAMENT_GITHUB_API')) ? (string)getenv('ORNAMENT_GITHUB_API') : GITHUB_API;

header('Cache-Control: no-store');
header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');   // sonst setzt mod_expires (.htaccess) zehn Minuten Zwischenspeicher
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');

function antwort(int $status, array $daten): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($daten, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function zugang(string $geheim): ?array {
  $roh = @file_get_contents($geheim . '/stimme.json');
  $z = $roh === false ? null : json_decode($roh, true);
  if (!is_array($z) || empty($z['passwort_hash']) || empty($z['github_token']) || empty($z['repo'])) return null;
  if (!preg_match('~^[\w.-]+/[\w.-]+$~', (string)$z['repo'])) return null;
  return $z;
}

function github(string $api, array $z, string $methode, string $pfad, ?array $body = null, ?string $datei = null): array {
  $ch = curl_init($api . '/repos/' . $z['repo'] . $pfad);
  $kopf = ['Accept: application/vnd.github+json', 'Authorization: Bearer ' . $z['github_token'], 'X-GitHub-Api-Version: 2022-11-28', 'User-Agent: ornament-cloud-stimme'];
  if ($body !== null) { $kopf[] = 'Content-Type: application/json'; curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE)); }
  curl_setopt_array($ch, [CURLOPT_CUSTOMREQUEST => $methode, CURLOPT_HTTPHEADER => $kopf, CURLOPT_TIMEOUT => 60, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 3]);
  // die Weiterleitung zum Artefakt geht an einen anderen Server: curl schickt den Schlüssel dorthin nicht mit (CURLOPT_UNRESTRICTED_AUTH bleibt aus)
  if ($datei !== null) { $fh = fopen($datei, 'wb'); curl_setopt($ch, CURLOPT_FILE, $fh); } else curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  $roh = curl_exec($ch);
  $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  curl_close($ch);
  if (isset($fh)) fclose($fh);
  return [$status, $datei === null && is_string($roh) ? (json_decode($roh, true) ?? []) : []];
}

function adresse(): string { return hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . gmdate('Y-m-d')); }

function lesen(string $f): array { $r = @file_get_contents($f); $d = $r === false ? null : json_decode($r, true); return is_array($d) ? $d : []; }
function schreiben(string $f, array $d): void { file_put_contents($f . '.neu', json_encode($d, JSON_UNESCAPED_UNICODE)); rename($f . '.neu', $f); }

function auftragsdatei(string $ordner, string $id): string {
  if (!preg_match('/^[a-f0-9]{16}$/', $id)) antwort(400, ['fehler' => 'Unbekannter Auftrag']);
  return "$ordner/auftraege/$id.json";
}

/** der Workflow-Lauf zu einem Auftrag (run-name «Stimme <id>»), null solange GitHub ihn noch nicht zeigt */
function lauf(string $api, array $z, string $id): ?array {
  [$s, $runs] = github($api, $z, 'GET', '/actions/workflows/stimme.yml/runs?event=workflow_dispatch&per_page=30');
  if ($s !== 200) return null;
  foreach ($runs['workflow_runs'] ?? [] as $r) if (($r['display_title'] ?? '') === "Stimme $id") return $r;
  return null;
}

/** Lauf bei GitHub abbrechen; true, wenn er abgebrochen ist oder nichts mehr zu tun bleibt */
function abbrechen(string $api, array $z, array $lauf): bool {
  if (($lauf['status'] ?? '') === 'completed') return true;
  [$s] = github($api, $z, 'POST', '/actions/runs/' . (int)$lauf['id'] . '/cancel');
  return $s === 202 || $s === 409;
}

/** Stand eines Auftrags: erst die eigene Notiz, dann der Workflow-Lauf; beim ersten Erfolg Artefakt laden und auspacken */
function stand(string $ordner, string $api, array $z, string $id): array {
  $f = auftragsdatei($ordner, $id);
  $a = lesen($f);
  if (!$a) antwort(404, ['fehler' => 'Unbekannter Auftrag']);
  if (($a['status'] ?? '') === 'abgebrochen' && !empty($a['abbruch_offen'])) {
    // beim Abbrechen war der Lauf noch nicht sichtbar: jetzt nachholen
    $lauf = lauf($api, $z, $id);
    if ($lauf && abbrechen($api, $z, $lauf)) { unset($a['abbruch_offen']); schreiben($f, $a); }
  }
  if (in_array($a['status'] ?? '', ['fertig', 'fehler', 'abgebrochen'], true)) return $a;
  $lauf = lauf($api, $z, $id);
  if (!$lauf) return $a;
  if (($lauf['status'] ?? '') !== 'completed') { $a['status'] = $lauf['status'] === 'in_progress' ? 'laeuft' : 'wartet'; schreiben($f, $a); return $a; }
  if (($lauf['conclusion'] ?? '') === 'cancelled') { $a['status'] = 'abgebrochen'; schreiben($f, $a); return $a; }
  if (($lauf['conclusion'] ?? '') !== 'success') { $a['status'] = 'fehler'; schreiben($f, $a); return $a; }
  [$s, $arts] = github($api, $z, 'GET', '/actions/runs/' . (int)$lauf['id'] . '/artifacts');
  $art = null;
  foreach ($arts['artifacts'] ?? [] as $x) if (($x['name'] ?? '') === "stimme-$id") $art = $x;
  if ($s !== 200 || !$art) return $a;
  $zip = "$ordner/fertig/$id.zip";
  [$s] = github($api, $z, 'GET', '/actions/artifacts/' . (int)$art['id'] . '/zip', null, $zip);
  $za = new ZipArchive();
  if ($s !== 200 || $za->open($zip) !== true) { @unlink($zip); return $a; }
  @mkdir("$ordner/fertig/$id", 0700, true);
  foreach (['stimme.wav', 'stimme.mp3', 'info.json'] as $name) {
    $inhalt = $za->getFromName($name);
    if ($inhalt !== false) file_put_contents("$ordner/fertig/$id/$name", $inhalt);
  }
  $za->close(); @unlink($zip);
  if (!is_file("$ordner/fertig/$id/stimme.wav")) return $a;
  $info = lesen("$ordner/fertig/$id/info.json");
  $a['status'] = 'fertig';
  if (isset($info['dauer'])) $a['dauer'] = (float)$info['dauer'];
  schreiben($f, $a);
  return $a;
}

$z = zugang($geheim);
session_name('ornament_stimme');
session_set_cookie_params(['lifetime' => 0, 'path' => '/alpha/voice/', 'secure' => strncmp($herkunft, 'https://', 8) === 0, 'httponly' => true, 'samesite' => 'Strict']);
session_start();
$angemeldet = $z !== null && ($_SESSION['stimme'] ?? '') === hash('sha256', $z['passwort_hash']);
$methode = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($methode === 'GET') {
  if (!isset($_GET['auftrag']) && !isset($_GET['liste']) && !isset($_GET['laden'])) {
    antwort(200, $z ? ['bereit' => true, 'angemeldet' => $angemeldet] : ['bereit' => false, 'angemeldet' => false, 'grund' => 'Kein Zugang hinterlegt']);
  }
  if (!$z) antwort(503, ['fehler' => 'Kein Zugang hinterlegt']);
  if (!$angemeldet) antwort(401, ['fehler' => 'Bitte anmelden']);
  session_write_close();
  if (isset($_GET['auftrag'])) {
    $a = stand($ordner, $api, $z, (string)$_GET['auftrag']);
    antwort(200, array_intersect_key($a, array_flip(['id', 'status', 'dauer'])));
  }
  if (isset($_GET['liste'])) {
    $liste = [];
    foreach (glob("$ordner/auftraege/*.json") ?: [] as $f) $liste[] = lesen($f);
    usort($liste, fn($x, $y) => ($y['zeit'] ?? 0) <=> ($x['zeit'] ?? 0));
    $liste = array_map(fn($a) => ['id' => $a['id'] ?? '', 'zeit' => $a['zeit'] ?? 0, 'stil' => $a['stil'] ?? 'b', 'anfang' => mb_substr($a['text'] ?? '', 0, 80), 'status' => $a['status'] ?? 'wartet'] + (isset($a['dauer']) ? ['dauer' => $a['dauer']] : []), array_slice($liste, 0, 30));
    antwort(200, ['auftraege' => $liste]);
  }
  $id = (string)$_GET['laden'];
  auftragsdatei($ordner, $id);
  $format = ($_GET['format'] ?? 'wav') === 'mp3' ? 'mp3' : 'wav';
  $datei = "$ordner/fertig/$id/stimme.$format";
  if (!is_file($datei)) antwort(404, ['fehler' => 'Noch nicht fertig']);
  header('Content-Type: ' . ($format === 'mp3' ? 'audio/mpeg' : 'audio/wav'));
  header('Content-Length: ' . filesize($datei));
  header('Content-Disposition: ' . (isset($_GET['hoeren']) ? 'inline' : 'attachment') . '; filename="stimme-' . gmdate('Y-m-d', (int)(lesen("$ordner/auftraege/$id.json")['zeit'] ?? time())) . "-$id.$format\"");
  readfile($datei);
  exit;
}

if ($methode !== 'POST') antwort(405, ['fehler' => 'Nur GET und POST']);
if (($_SERVER['HTTP_ORIGIN'] ?? '') !== $herkunft || ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? 'same-origin') === 'cross-site') antwort(403, ['fehler' => 'Fremde Herkunft']);
if (strncmp(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json', 16) !== 0) antwort(415, ['fehler' => 'Nur JSON']);
$roh = file_get_contents('php://input', false, null, 0, MAX_BYTES + 1);
if (strlen((string)$roh) > MAX_BYTES) antwort(413, ['fehler' => 'Zu gross']);
$b = json_decode((string)$roh, true);
if (!is_array($b)) antwort(400, ['fehler' => 'Kein gültiges JSON']);
if (!$z) antwort(503, ['fehler' => 'Kein Zugang hinterlegt']);
@mkdir("$ordner/auftraege", 0700, true);
@mkdir("$ordner/fertig", 0700, true);

switch ($b['aktion'] ?? '') {
  case 'anmelden':
    $sperre = "$ordner/sperre.json";
    $s = lesen($sperre);
    $ich = adresse();
    $versuche = array_values(array_filter($s[$ich] ?? [], fn($t) => $t > time() - SPERRE));
    if (count($versuche) >= FEHLVERSUCHE) antwort(429, ['fehler' => 'Zu viele Versuche, bitte in einer Viertelstunde wieder']);
    if (!is_string($b['passwort'] ?? null) || !password_verify($b['passwort'], $z['passwort_hash'])) {
      $versuche[] = time(); $s[$ich] = $versuche; schreiben($sperre, $s);
      antwort(401, ['fehler' => 'Passwort stimmt nicht']);
    }
    session_regenerate_id(true);
    $_SESSION['stimme'] = hash('sha256', $z['passwort_hash']);
    antwort(200, ['angemeldet' => true]);
  case 'abmelden':
    $_SESSION = []; session_destroy();
    antwort(200, ['angemeldet' => false]);
  case 'sprechen':
    if (!$angemeldet) antwort(401, ['fehler' => 'Bitte anmelden']);
    session_write_close();
    $text = trim(str_replace("\r\n", "\n", (string)($b['text'] ?? '')));
    $stil = (string)($b['stil'] ?? 'b');
    if ($text === '') antwort(400, ['fehler' => 'Kein Text']);
    if (mb_strlen($text) > MAX_TEXT) antwort(400, ['fehler' => 'Höchstens ' . MAX_TEXT . ' Zeichen']);
    if (!in_array($stil, ['b', 'g'], true)) antwort(400, ['fehler' => 'Stil b oder g']);
    foreach (glob("$ordner/auftraege/*.json") ?: [] as $f) {
      $alt = lesen($f);
      if (($alt['text'] ?? '') === $text && ($alt['stil'] ?? '') === $stil && ($alt['zeit'] ?? 0) > time() - DOPPELT && in_array($alt['status'] ?? '', ['wartet', 'laeuft'], true))
        antwort(200, ['id' => $alt['id'], 'doppelt' => true]);
    }
    $heute = array_filter(glob("$ordner/auftraege/*.json") ?: [], fn($f) => filemtime($f) > time() - 86400);
    if (count($heute) >= JE_TAG) antwort(429, ['fehler' => 'Für heute sind es genug Aufträge']);
    $id = bin2hex(random_bytes(8));
    [$s] = github($api, $z, 'POST', '/actions/workflows/stimme.yml/dispatches', ['ref' => 'main', 'inputs' => ['id' => $id, 'text' => $text, 'stil' => $stil]]);
    if ($s !== 204) antwort(502, ['fehler' => "GitHub nimmt den Auftrag nicht an ($s)"]);
    schreiben("$ordner/auftraege/$id.json", ['id' => $id, 'zeit' => time(), 'stil' => $stil, 'text' => $text, 'status' => 'wartet']);
    antwort(200, ['id' => $id]);
  case 'abbrechen':
    if (!$angemeldet) antwort(401, ['fehler' => 'Bitte anmelden']);
    session_write_close();
    $id = (string)($b['id'] ?? '');
    $f = auftragsdatei($ordner, $id);
    $a = lesen($f);
    if (!$a) antwort(404, ['fehler' => 'Unbekannter Auftrag']);
    if (!in_array($a['status'] ?? '', ['wartet', 'laeuft'], true)) antwort(409, ['fehler' => 'Der Auftrag läuft nicht mehr', 'status' => $a['status'] ?? '']);
    $lauf = lauf($api, $z, $id);
    if ($lauf && ($lauf['status'] ?? '') === 'completed' && ($lauf['conclusion'] ?? '') === 'success') antwort(409, ['fehler' => 'Schon fertig', 'status' => 'fertig']);
    if ($lauf && !abbrechen($api, $z, $lauf)) antwort(502, ['fehler' => 'GitHub bricht den Lauf nicht ab']);
    $a['status'] = 'abgebrochen';
    if (!$lauf) $a['abbruch_offen'] = true;
    schreiben($f, $a);
    antwort(200, ['id' => $id, 'status' => 'abgebrochen']);
  default:
    antwort(400, ['fehler' => 'Unbekannte Aktion']);
}
