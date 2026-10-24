#!/usr/bin/env bash
# Builds soma-pitch-30s.mp4 (1920x1080, 30 fps, 30 s) from comercial.html.
# Needs: node + playwright-core (NODE_PATH), Google Chrome, ffmpeg with libx264, python3.
set -euo pipefail
cd "$(dirname "$0")"
FFMPEG="${FFMPEG:-ffmpeg}"
export FFMPEG
python3 music.py music.wav
node render.js video-only.mp4
"$FFMPEG" -y -loglevel error -i video-only.mp4 -i music.wav -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart soma-pitch-30s.mp4
rm -f video-only.mp4 music.wav
echo "OK -> soma-pitch-30s.mp4"
