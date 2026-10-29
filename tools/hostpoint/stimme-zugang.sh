#!/usr/bin/env bash
# Legt den Zugang für die Stimme (alpha/voice/) auf den Webspace, AUSSERHALB der Website: ~/ornament-geheim/stimme.json (Ordner 700, Datei 600).
# Dort liest ihn alpha/voice/stimme.php. Aus den GitHub-Secrets STIMME_PASSWORT (nur als Hash abgelegt, password_hash von PHP) und
# STIMME_GITHUB_TOKEN (fein abgestimmter Schlüssel nur für das private Repository mit «Actions: Read and write»), dazu die Variable
# STIMME_REPO (Standard hansnoed-ui/ornament-studio). Alles geht über stdin, nie über die Befehlszeile. Fehlt ein Secret: Datei löschen, Stimme aus.
set -euo pipefail
: "${HOSTPOINT_HOST:?HOSTPOINT_HOST fehlt}"
: "${HOSTPOINT_USER:?HOSTPOINT_USER fehlt}"
ziel="${HOSTPOINT_USER}@${HOSTPOINT_HOST}"
ssh_opts=(-o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 -p "${HOSTPOINT_PORT:-22}")
if [[ -n "${STIMME_PASSWORT:-}" && -n "${STIMME_GITHUB_TOKEN:-}" ]]; then
  json=$(STIMME_REPO="${STIMME_REPO:-hansnoed-ui/ornament-studio}" php -r '
    echo json_encode(["passwort_hash" => password_hash(getenv("STIMME_PASSWORT"), PASSWORD_DEFAULT), "github_token" => getenv("STIMME_GITHUB_TOKEN"), "repo" => getenv("STIMME_REPO")], JSON_UNESCAPED_SLASHES);')
  printf '%s' "$json" | ssh "${ssh_opts[@]}" "$ziel" \
    'umask 077 && mkdir -p ~/ornament-geheim/stimme && chmod 700 ~/ornament-geheim ~/ornament-geheim/stimme && cat > ~/ornament-geheim/stimme.json.neu && mv -f ~/ornament-geheim/stimme.json.neu ~/ornament-geheim/stimme.json'
  echo "Zugang für die Stimme liegt ausserhalb der Website (~/ornament-geheim/); alpha/voice/ ist an."
else
  ssh "${ssh_opts[@]}" "$ziel" 'rm -f ~/ornament-geheim/stimme.json'
  echo "Secrets STIMME_PASSWORT oder STIMME_GITHUB_TOKEN fehlen: die Stimme in alpha/voice/ ist aus."
fi
