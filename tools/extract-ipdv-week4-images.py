#!/usr/bin/env python3
"""Pull the Week 4 source pictures out of the two lecture PDFs.

    python3 tools/extract-ipdv-week4-images.py [materials-folder]

The PDFs are the 2025 Week 4 deck and Dimitris Mylonas's colour lecture. Each
picture is saved under assets/lesson/ipdv/week4/ with a name that says what it
is, so tools/build-ipdv-week4.js can embed it. Needs pypdf and Pillow.
"""
import os, sys
from pypdf import PdfReader

HOME = os.path.expanduser('~')
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HOME, 'Desktop', 'Adv Data Vis Materials ')
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'lesson', 'ipdv', 'week4')
DECK_2025 = '01_Lecture_IPDV_4 2027.pdf'
MYLONAS = '04_Lecture_IPDV_Colour.pdf'

# (pdf, page, which picture on the page by size rank, output name)
PICTURES = [
    (DECK_2025, 6, 0, 'map-ancestry.jpg'),
    (DECK_2025, 7, 0, 'map-markets.jpg'),
    (DECK_2025, 8, 0, 'chart-fly-the-nest.jpg'),
    (DECK_2025, 15, 0, 'parrots-cvd.jpg'),
    (DECK_2025, 9, 0, 'colour-wheel.jpg'),
    (DECK_2025, 10, 0, 'palette-types.jpg'),
    (DECK_2025, 30, 0, 'dw-bars.jpg'),
    (DECK_2025, 31, 0, 'dw-us-map.jpg'),
    (DECK_2025, 32, 0, 'dw-likert.jpg'),
    (DECK_2025, 33, 0, 'dw-treemap-1.jpg'),
    (DECK_2025, 34, 0, 'dw-treemap-2.jpg'),
    (DECK_2025, 17, 0, 'cvd-wheels.jpg'),
    (DECK_2025, 20, 0, 'brand-nyt.jpg'),
    (DECK_2025, 21, 0, 'brand-wheel-a.jpg'),
    (DECK_2025, 21, 1, 'brand-wheel-b.jpg'),
    (DECK_2025, 21, 2, 'brand-wheel-c.jpg'),
    (DECK_2025, 22, 0, 'netflix-hbo-lines.jpg'),
    (DECK_2025, 23, 0, 'netflix-hbo-bars.jpg'),
    (DECK_2025, 26, 0, 'colours-by-culture.jpg'),
    (DECK_2025, 27, 0, 'colour-psychology.jpg'),
    (MYLONAS, 39, 0, 'rainfall-a.jpg'),
    (MYLONAS, 39, 1, 'rainfall-b.jpg'),
    (DECK_2025, 18, 0, 'times-examples.jpg'),
    (DECK_2025, 24, 0, 'city-intelligence.jpg'),
    (DECK_2025, 37, 0, 'tool-colorbrewer.jpg'),
    (DECK_2025, 38, 0, 'tool-colorgorical.jpg'),
    (DECK_2025, 39, 0, 'tool-adobe.jpg'),
    (DECK_2025, 40, 0, 'tool-chroma.jpg'),
    (MYLONAS, 43, 0, 'tool-colour-names.jpg'),
    (DECK_2025, 13, 0, 'warm-cool.jpg'),
    (DECK_2025, 16, 0, 'brain-colour.jpg'),
    (DECK_2025, 19, 0, 'hue-family.jpg'),
    (DECK_2025, 25, 0, 'brand-psychology.jpg'),
    (MYLONAS, 5, 0, 'tiger-grey.jpg'),
    (MYLONAS, 6, 0, 'tiger-colour.jpg'),
    (MYLONAS, 7, 0, 'fruit-lightness.jpg'),
    (MYLONAS, 8, 0, 'fruit-colour-only.jpg'),
    (MYLONAS, 9, 0, 'fruit-full.jpg'),
    (MYLONAS, 25, 0, 'cubes-illusion.jpg'),
    (MYLONAS, 26, 0, 'cubes-reveal.jpg'),
]

def main():
    os.makedirs(OUT, exist_ok=True)
    readers = {}
    for pdf, page, rank, name in PICTURES:
        reader = readers.setdefault(pdf, PdfReader(os.path.join(SRC, pdf)))
        images = sorted(reader.pages[page - 1].images, key=lambda im: -(im.image.size[0] * im.image.size[1]))
        img = images[rank].image
        if img.mode in ('RGBA', 'LA', 'P'):
            # Transparent pictures (the brand wheels) go on white, not black.
            from PIL import Image
            rgba = img.convert('RGBA')
            ground = Image.new('RGB', rgba.size, 'white')
            ground.paste(rgba, mask=rgba.split()[3])
            img = ground
        else:
            img = img.convert('RGB')
        if max(img.size) > 1600:  # big screenshots are embedded several times; 1600 px is plenty
            img.thumbnail((1600, 1600))
        target = os.path.join(OUT, name)
        img.save(target, quality=88) if name.endswith('.jpg') else img.save(target, optimize=True)
        print(f'{name:24s} {img.size[0]}x{img.size[1]}  from {pdf} p{page}')

if __name__ == '__main__':
    main()
