# Gemietete Grafikkarte (Runpod)

Seit 28. November 2026. Christian: «Ok lass uns mal etwas GPU mieten für dieses Projekt, zum Ausprobieren.»

- **Zugang:** Der Runpod-Schlüssel liegt als Netzwerk-Geheimnis in der Cloud-Umgebung (Host `mcp.runpod.io`); der Proxy setzt
  ihn ein. Er steht nie im Repo und nie im Chat. Die Skripte hier sprechen den Runpod-MCP-Server direkt über HTTPS an.
- **Ablauf:** Pod mieten (RTX 4090, Community, rund 0,34 Dollar pro Stunde; `create-pod`), die Pod-ID in `pod.id` schreiben
  (nicht einchecken) oder als `POD=` setzen, Dateien mit `hoch.py` hinauf, Befehle über `exec-pod` (`rpmod.ex`), Ergebnisse mit
  `runter.py` zurück. **Danach den Pod sofort löschen** (`delete-pod`), sonst läuft die Rechnung weiter.
- Auf dem Pod: `nvidia/cuda:12.4.1-base-ubuntu22.04`, `NVIDIA_DRIVER_CAPABILITIES=all` (OptiX), Blender 4.2.3 LTS von
  download.blender.org, Stoffe direkt von Poly Haven.

## Werke

- `kugeln.py`: Spiegelkugeln auf Stein (Blender Cycles, OptiX). Fünf Kugeln rollen auf einer Acht über den gravierten Hauptsatz,
  in der Rotunde (HDRI). 900 Bilder, 4:5, 30 s, rund 1,6 s pro Bild auf der RTX 4090 (192 Proben, OptiX-Entrauschung).
  Gravur: `gravur.mjs` (Marcellus, Keilschnitt) → `gravur.png`. Film: `film.sh`.
