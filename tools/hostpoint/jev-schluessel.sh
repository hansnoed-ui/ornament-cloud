#!/usr/bin/env bash
# Legt den jev-Schlüssel für ORNAMENT LAB auf den Webspace, AUSSERHALB der Website: ~/ornament-geheim/typesafe-schluessel (Ordner 700, Datei 600).
# Dort liest ihn die Zwischenstelle alpha/lab/jev/wahl.php; die Seite selbst sieht ihn nie. Läuft im Deploy-Workflow nach dem Hochladen.
# Der Schlüssel kommt aus dem GitHub-Secret TYPESAFE_API_KEY über stdin, nie über die Befehlszeile (sonst stünde er in Prozesslisten).
# Fehlt das Secret, wird die Datei gelöscht: jev live ist dann aus, und das Lab wählt wie bisher von Hand, nach Regeln und nach der Tabelle.
set -euo pipefail
: "${HOSTPOINT_HOST:?HOSTPOINT_HOST fehlt}"
: "${HOSTPOINT_USER:?HOSTPOINT_USER fehlt}"
ziel="${HOSTPOINT_USER}@${HOSTPOINT_HOST}"
ssh_opts=(-o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 -p "${HOSTPOINT_PORT:-22}")
if [[ -n "${TYPESAFE_API_KEY:-}" ]]; then
  printf '%s' "$TYPESAFE_API_KEY" | ssh "${ssh_opts[@]}" "$ziel" \
    'umask 077 && mkdir -p ~/ornament-geheim && chmod 700 ~/ornament-geheim && cat > ~/ornament-geheim/typesafe-schluessel.neu && mv -f ~/ornament-geheim/typesafe-schluessel.neu ~/ornament-geheim/typesafe-schluessel'
  echo "jev-Schlüssel liegt ausserhalb der Website (~/ornament-geheim/); jev live im Lab ist an."
else
  ssh "${ssh_opts[@]}" "$ziel" 'rm -f ~/ornament-geheim/typesafe-schluessel'
  echo "Kein Secret TYPESAFE_API_KEY: jev live im Lab ist aus."
fi
