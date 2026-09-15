#!/usr/bin/env python3
"""Frames for a seamless background loop — writes ./frames/f####.png.

A background clip has one job: move enough to look alive and little enough that
nobody reads it instead of the slide. So this is slow, dark, and smooth — three
soft blobs drifting on closed paths over a faint grid that travels exactly one
cell per loop. Every motion is periodic in the frame count, so the last frame
leads back into the first with no cut.

Smooth and dark is also what makes it small: H.264 spends its bits on edges and
grain, and there are none here. Eight seconds at 24fps comes out around 200 KB
— a background that costs less than a photograph of one.

    python3 tools/video/backdrop-frames.py
    swiftc -O tools/video/frames-to-mp4.swift -o /tmp/enc
    /tmp/enc frames assets/backdrop/ink-drift.mp4 24

Then the poster, for the editor and for a browser that will not autoplay:

    python3 -c "from PIL import Image; \
      Image.open('frames/f0000.png').convert('RGB').save(
        'assets/backdrop/ink-drift-poster.jpg', quality=82, optimize=True)"
"""
import math
import os
from PIL import Image, ImageDraw, ImageFilter

W, H = 1280, 720
FRAMES = 192          # 8 seconds at 24fps
GRID = 80             # px between gridlines; the grid travels one cell a loop
OUT = "frames"

INK_TOP = (10, 17, 32)
INK_BOTTOM = (20, 33, 56)
GRID_INK = (255, 255, 255, 16)

# Three blobs: colour, radius, and the closed path each one walks. The phases
# are chosen so they never all bunch in one corner.
BLOBS = [
    ((64, 140, 200), 380, 0.00, 1),
    ((32, 110, 90), 300, 0.38, 1),
    ((120, 70, 150), 260, 0.71, -1),
]


def ground():
    """The vertical gradient, drawn once and reused — it never moves."""
    base = Image.new("RGB", (1, H))
    px = base.load()
    for y in range(H):
        t = y / (H - 1)
        px[0, y] = tuple(
            round(INK_TOP[i] + (INK_BOTTOM[i] - INK_TOP[i]) * t) for i in range(3)
        )
    return base.resize((W, H), Image.BILINEAR)


def grid_layer(offset):
    """Faint gridlines, offset by `offset` px on both axes."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    start = -GRID + (offset % GRID)
    for x in range(start, W + GRID, GRID):
        draw.line([(x, 0), (x, H)], fill=GRID_INK, width=1)
    for y in range(start, H + GRID, GRID):
        draw.line([(0, y), (W, y)], fill=GRID_INK, width=1)
    return layer


def blob_layer(frame):
    """The three drifting blobs, on a canvas a quarter the size.

    Drawn small and scaled up: a blur wide enough to be soft at 1280px costs
    real time per frame, and a 320px blur upscaled is indistinguishable once
    it is this diffuse.
    """
    sw, sh = W // 4, H // 4
    layer = Image.new("RGB", (sw, sh), (0, 0, 0))
    draw = ImageDraw.Draw(layer)
    turn = frame / FRAMES * 2 * math.pi
    for colour, radius, phase, spin in BLOBS:
        a = turn * spin + phase * 2 * math.pi
        cx = sw * (0.5 + 0.30 * math.cos(a))
        cy = sh * (0.5 + 0.22 * math.sin(a * 2))     # a figure of eight
        r = (radius / 4) * (1 + 0.06 * math.sin(a * 3))
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=colour)
    layer = layer.filter(ImageFilter.GaussianBlur(sw / 9))
    return layer.resize((W, H), Image.BILINEAR)


def main():
    os.makedirs(OUT, exist_ok=True)
    base = ground()
    for frame in range(FRAMES):
        img = base.copy()
        # Screen-blend the blobs by hand: lighten only, so the ground stays ink.
        blobs = blob_layer(frame)
        img = Image.blend(img, Image.new("RGB", (W, H), (0, 0, 0)), 0.0)
        img = Image.composite(
            Image.blend(img, blobs, 0.55), img,
            blobs.convert("L").point(lambda v: min(255, v * 3)),
        )
        img = Image.alpha_composite(
            img.convert("RGBA"),
            grid_layer(round(frame / FRAMES * GRID)),
        ).convert("RGB")
        img.save(os.path.join(OUT, "f%04d.png" % frame), optimize=False)
    print("wrote %d frames to %s/" % (FRAMES, OUT))


if __name__ == "__main__":
    main()
