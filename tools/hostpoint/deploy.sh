#!/usr/bin/env bash
# Lädt die Website per rsync über SSH auf den Webspace bei Hostpoint (seit 20. Oktober 2026, Umzug von GitHub Pages; docs/hostpoint-umzug.md).
# Läuft in GitHub Actions (.github/workflows/hostpoint.yml) nach jedem Push auf main – oder von Hand, wo ein SSH-Schlüssel für den Account liegt.
#
#   HOSTPOINT_HOST=konto.ssh.cloud.hostpoint.ch HOSTPOINT_USER=konto HOSTPOINT_PFAD=www/ornament.cloud tools/hostpoint/deploy.sh
#   PROBE=1 …   zeigt nur, was sich ändern würde (rsync --dry-run)
#
# Vergleich über Prüfsummen (--checksum), nicht über Zeitstempel: Git setzt beim Auschecken neue Zeiten, sonst würde jedes Mal alles übertragen
# und jede Datei bekäme ein neues Last-Modified. Ohne -t behalten unveränderte Dateien ihre Zeit auf dem Server; geänderte bekommen die Uploadzeit.
# --delete entfernt auf dem Server, was im Repository nicht mehr ist; Ausgeschlossenes (tools/hostpoint/ausschluss.txt) bleibt unberührt.
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${HOSTPOINT_HOST:?HOSTPOINT_HOST fehlt (z. B. konto.ssh.cloud.hostpoint.ch)}"
: "${HOSTPOINT_USER:?HOSTPOINT_USER fehlt (der Benutzername des Webhostings, nicht die Hostpoint-ID)}"
: "${HOSTPOINT_PFAD:?HOSTPOINT_PFAD fehlt (Document Root der Website, z. B. www/ornament.cloud)}"
ziel="${HOSTPOINT_USER}@${HOSTPOINT_HOST}:${HOSTPOINT_PFAD%/}/"
ssh_opts=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 -p "${HOSTPOINT_PORT:-22}")
rsync_opts=(--recursive --links --compress --checksum --omit-dir-times --delete --chmod=D755,F644 --exclude-from=tools/hostpoint/ausschluss.txt --itemize-changes --human-readable --stats)
[[ "${PROBE:-}" ]] && rsync_opts+=(--dry-run)
echo "→ ${ziel}${PROBE:+ (Probelauf)}"
rsync "${rsync_opts[@]}" -e "ssh ${ssh_opts[*]}" ./ "$ziel"
