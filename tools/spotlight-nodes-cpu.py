"""One picture per CPU part from the Nodes Plan view (assets/lesson/nodes/cpu-plan.png): the part lit,
everything else dimmed, ringed in Nodes blue (U, #0072b2). Boxes are in the capture's pixels (2x)."""
from PIL import Image, ImageDraw, ImageEnhance
SRC = 'assets/lesson/nodes/cpu-plan.png'
PARTS = {
    'control-unit': (192, 177, 372, 324), 'alu': (192, 368, 372, 526), 'registers': (399, 309, 557, 532),
    'pc': (399, 309, 557, 353), 'cache': (398, 180, 557, 291), 'clock': (40, 482, 132, 558),
    'buses': (598, 218, 908, 474), 'memory': (905, 80, 1082, 594),
}
base = Image.open(SRC).convert('RGB')
dim = ImageEnhance.Brightness(ImageEnhance.Color(base).enhance(0.25)).enhance(0.55)
for name, (x0, y0, x1, y1) in PARTS.items():
    out = dim.copy()
    out.paste(base.crop((x0, y0, x1, y1)), (x0, y0))
    d = ImageDraw.Draw(out)
    pad = 8
    d.rounded_rectangle((x0 - pad, y0 - pad, x1 + pad, y1 + pad), radius=10, outline=(0, 114, 178), width=6)
    out.save(f'assets/lesson/nodes/cpu-{name}.png')
print('wrote', len(PARTS))
