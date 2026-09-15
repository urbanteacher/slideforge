# The demo's video clip

`assets/lesson/ipdv/baseline-truncation.mp4` — eleven seconds, silent, 1280×720,
about 280 KB. Five bars that do not change, on a y-axis that slides from 0 up to
55 and back. It is the video slide in the Layout bank demo, and it is a file
rather than a YouTube link so the demo plays with no network and from a `file://`
copy.

Regenerate it with:

    python3 tools/video/baseline-truncation-frames.py     # writes ./frames/*.png
    swiftc -O tools/video/frames-to-mp4.swift -o /tmp/enc
    /tmp/enc frames assets/lesson/ipdv/baseline-truncation.mp4 24

Then the poster, which is frame 0 (the honest one, axis at zero):

    python3 -c "from PIL import Image; Image.open('frames/f0000.png').convert('RGB').save('assets/lesson/ipdv/baseline-truncation-poster.jpg', quality=82, optimize=True)"

## Why Swift

There is no `ffmpeg` on the machine this was made on, and matplotlib cannot write
an MP4 without one. `AVAssetWriter` ships with macOS, so `frames-to-mp4.swift`
encodes the PNG sequence to H.264 with the Command Line Tools alone. If you have
ffmpeg, `ffmpeg -framerate 24 -i frames/f%04d.png -c:v libx264 -pix_fmt yuv420p`
does the same job.

## The 208px at the bottom

A video slide's caption is a fixed band across the bottom of the frame — roughly
208px of white-on-gradient, padded to clear the player controls rather than the
content. The plot area in the frame script stops above it on purpose. Move the
chart down and the caption lands on the axis labels.
