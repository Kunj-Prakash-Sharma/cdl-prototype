#!/usr/bin/env bash
# Regenerates public/sample/lecture.mp4: the clip the fake video adapter plays in dev (docs/specs/video.md).
# 20 s test pattern + tone, H.264/AAC, fast-start (moov before mdat), under 2 MB. Needs a full ffmpeg with libx264.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/sample
ffmpeg -y -f lavfi -i testsrc=duration=20:size=1280x720:rate=30 -f lavfi -i sine=duration=20 \
  -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart public/sample/lecture.mp4
