"""The faint red leader lines the Nodes canvas draws to its (hidden) confusion pins, painted out:
each reddish pixel in the two line regions takes the colour of the nearest clean pixel above or below."""
from PIL import Image
P = 'assets/lesson/nodes/cpu-plan.png'
im = Image.open(P).convert('RGB'); px = im.load(); W, H = im.size
reddish = lambda c: c[0] - c[1] > 12 and abs(c[1] - c[2]) < 25 and c[0] > 120
n = 0
for (x0, y0, x1, y1) in [(700, 215, 880, 265), (505, 450, 600, 480)]:
    for x in range(x0, x1):
        for y in range(y0, y1):
            if not reddish(px[x, y]): continue
            for d in range(1, 12):
                for yy in (y - d, y + d):
                    if 0 <= yy < H and not reddish(px[x, yy]):
                        px[x, y] = px[x, yy]; n += 1; break
                else: continue
                break
# Where the line crosses the gold address bus it blends to a redder gold: put the bus colour back.
gold = px[650, 256]
for x in range(700, 880):
    for y in range(240, 270):
        c = px[x, y]
        if abs(c[0] - gold[0]) < 12 and abs(c[2] - gold[2]) < 20 and gold[1] - c[1] > 6:
            px[x, y] = gold; n += 1
# The bus's top edge, where the line meets it.
for x in range(700, 880):
    for y in range(240, 252):
        c = px[x, y]
        if c[0] > 150 and c[0] - c[1] > 40 and c[2] < 110: px[x, y] = px[x, y + 4] if y + 4 < H else gold; n += 1
im.save(P); print('painted', n)
