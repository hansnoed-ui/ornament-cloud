#!/usr/bin/env bash
# Bereitet ein Video aus der Praxis für die flache Ansicht der Seite «Kunst» auf ornament.cloud/gamma/ auf.
# Aufruf: bash tools/gamma/kunst_video.sh video.mp4 [name]
# Schreibt gamma/bilder/<name>-video.mp4 (H.264, ohne Ton, 1280 px breit) und gamma/bilder/<name>-video.webp (erstes Bild, Platzhalter).
# Bearbeitung wie bei den Fotos (Christian, 30. Oktober 2026: jedes Bild für diese Seite zuerst sauber bearbeiten):
# flüssig (Handyvideos haben oft nur etwa 10 echte Bilder pro Sekunde, unregelmässig verdoppelt; das ruckelt. Die Doppel fallen weg,
# Zwischenbilder werden aus der Bewegung gerechnet, Christian, 1. November 2026: «Das Video ruckelt»), ruhig geführt (Wackeln geglättet, leicht eingezoomt), Rauschen leicht gemindert, Schatten etwas gehoben, gelbe Flächen etwas ruhiger,
# zuletzt etwas wärmer, beim Verkleinern leicht nachgeschärft. Das Ende geht in einer Sekunde weich in den Anfang über: so läuft die Schlaufe ohne Sprung.
set -euo pipefail
ein="$1"; name="${2:-kunst}"
wurzel="$(cd "$(dirname "$0")/../.." && pwd)"; aus="$wurzel/gamma/bilder"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
B=1280; UEBER=1     # Breite, Dauer des Übergangs in Sekunden

# 0. Flüssig: doppelte Bilder weg, dann 30 Bilder je Sekunde aus der Bewegung (dauert einige Minuten)
ffmpeg -v error -y -i "$ein" -an -vf "mpdecimate,minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=none" \
  -c:v libx264 -crf 12 -preset fast "$tmp/fliessend.mp4"
# 1. Bewegung messen, 2. glätten, bearbeiten und verkleinern (Zwischenstufen fast verlustfrei)
ffmpeg -v error -y -i "$tmp/fliessend.mp4" -vf "vidstabdetect=shakiness=6:accuracy=15:result=$tmp/bewegung.trf" -f null -
ffmpeg -v error -y -i "$tmp/fliessend.mp4" -an -vf "\
vidstabtransform=input=$tmp/bewegung.trf:smoothing=24:optzoom=1:zoomspeed=.2:interpol=bicubic,\
hqdn3d=1.2:1.2:3:3,\
curves=all='0/0 .2/.215 .5/.51 1/1',\
hue=s=.97,\
colorbalance=rm=.02:bm=-.025:rh=.012:bh=-.018,\
scale=$B:-2:flags=lanczos,unsharp=5:5:.45:5:5:0,fps=30,format=yuv420p" \
  -c:v libx264 -crf 12 -preset fast "$tmp/bearbeitet.mp4"

# 3. Schlaufe: der Film beginnt eine Sekunde später, und seine letzte Sekunde blendet in diese erste über
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$tmp/bearbeitet.mp4")
ab=$(python3 -c "print(round($d - 2 * $UEBER, 3))")
ffmpeg -v error -y -i "$tmp/bearbeitet.mp4" -filter_complex "\
[0:v]split[a][b];[a]trim=start=$UEBER,setpts=PTS-STARTPTS[haupt];[b]trim=end=$UEBER,setpts=PTS-STARTPTS[anfang];\
[haupt][anfang]xfade=transition=fade:duration=$UEBER:offset=$ab,format=yuv420p[v]" -map "[v]" \
  -c:v libx264 -crf 25 -preset slow -profile:v high -level 4.0 -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -movflags +faststart "$aus/$name-video.mp4"

# 4. Platzhalter: das erste Bild
ffmpeg -v error -y -i "$aus/$name-video.mp4" -frames:v 1 -c:v libwebp -quality 78 "$aus/$name-video.webp"
ls -l "$aus/$name-video.mp4" "$aus/$name-video.webp"
