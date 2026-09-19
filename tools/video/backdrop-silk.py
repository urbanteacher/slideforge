#!/usr/bin/env python3
"""Generate a restrained, seamless silk-light backdrop and its poster.

Usage: python3 backdrop-silk.py FRAME_DIR POSTER_PATH
Encode at 24 fps. All time-varying terms use integer harmonics of one turn.
"""
import math
import os
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops

W, H = 1280, 720
SW, SH = 320, 180
FRAMES = 288


def base_layers():
    ground = Image.new('RGB', (SW, SH))
    shade = Image.new('L', (SW, SH))
    for y in range(SH):
        for x in range(SW):
            # Deep navy ground; quiet lower third for a white caption.
            glow = math.exp(-(((x / SW - .52) / .65) ** 2 + ((y / SH - .30) / .52) ** 2))
            ground.putpixel((x, y), (int(7 + 6 * glow), int(12 + 11 * glow), int(24 + 18 * glow)))
            edge = min(1, ((x / SW - .5) / .72) ** 2 + ((y / SH - .4) / .9) ** 2)
            caption = max(0, min(1, (y / SH - .58) / .30))
            caption = caption * caption * (3 - 2 * caption)
            shade.putpixel((x, y), int(255 * min(.84, .27 * edge + .66 * caption)))
    return ground, shade


def frame_at(index, ground, shade):
    turn = 2 * math.pi * index / FRAMES
    light = Image.new('RGB', (SW, SH))
    for colour, phase, radius in [((25, 86, 112), 0, 83), ((47, 34, 108), 2.1, 71), ((15, 77, 69), 4.2, 64)]:
        layer = Image.new('RGB', (SW, SH))
        draw = ImageDraw.Draw(layer)
        a = turn + phase
        cx = SW * (.50 + .25 * math.cos(a))
        cy = SH * (.31 + .13 * math.sin(a))
        r = radius * (1 + .035 * math.sin(a * 2))
        draw.ellipse((cx-r, cy-r*.52, cx+r, cy+r*.52), fill=colour)
        light = ImageChops.screen(light, layer.filter(ImageFilter.GaussianBlur(28)))
    # Two softly lit ribbons travel with different phases, adding depth.
    ribbons = Image.new('RGB', (SW, SH))
    draw = ImageDraw.Draw(ribbons)
    for ribbon in range(2):
        points = []
        for x in range(-20, SW + 21, 2):
            y = SH * (.31 + ribbon*.15) + 15*math.sin(x/SW*math.pi*1.5 + turn + ribbon*2) + 5*math.cos(turn*2 + x/SW*3)
            points.append((x, y))
        draw.line(points, fill=(22, 50, 64) if ribbon == 0 else (35, 24, 59), width=8)
    light = ImageChops.screen(light, ribbons.filter(ImageFilter.GaussianBlur(8)))
    result = ImageChops.screen(ground, light)
    result = Image.composite(Image.new('RGB', (SW, SH), (5, 9, 18)), result, shade)
    return result.resize((W, H), Image.Resampling.BICUBIC)


def main():
    out, poster = sys.argv[1:3]
    os.makedirs(out, exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(poster)), exist_ok=True)
    ground, shade = base_layers()
    for index in range(FRAMES):
        image = frame_at(index, ground, shade)
        image.save(os.path.join(out, 'f%04d.png' % index))
        if index == 0:
            image.save(poster, quality=90, optimize=True)
    print('Generated 288 frames: 12 seconds at 24 fps; poster saved.')


if __name__ == '__main__':
    main()
