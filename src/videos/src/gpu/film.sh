./blender-4.2.3-linux-x64/blender -b -P kugeln.py -- --bilder 1-900 --proben 192 --aus /w/film/f > film.log 2>&1
ffmpeg -y -loglevel error -framerate 30 -start_number 1 -i /w/film/f%04d.jpg -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -movflags +faststart /w/spiegelkugeln.mp4 && echo MP4FERTIG >> film.log
