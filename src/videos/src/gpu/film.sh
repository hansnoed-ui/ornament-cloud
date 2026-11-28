# Film auf dem Pod rechnen und kodieren: sh film.sh <skript.py> <name> [proben]
S=$1; N=$2; P=${3:-160}
mkdir -p /w/$N
./blender-4.2.3-linux-x64/blender -b -P $S -- --bilder 1-900 --proben $P --aus /w/$N/f > $N.log 2>&1
ffmpeg -y -loglevel error -framerate 30 -start_number 1 -i /w/$N/f%04d.jpg -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -movflags +faststart /w/$N.mp4 && echo MP4FERTIG >> $N.log
