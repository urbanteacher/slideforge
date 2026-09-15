# Frames for the demo's video slide: what cutting the baseline does to a bar chart.
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import MultipleLocator
import numpy as np, os

BG, INK, DIM, RED = '#fbfaf8', '#14181f', '#5a6572', '#c8102e'
LABELS = ['A', 'B', 'C', 'D', 'E']
VALS   = [61, 63, 66, 68, 71]
W, H, DPI, FPS = 1280, 720, 100, 24

def ease(t):                      # smootherstep, so the move has no hard edges
    t = min(1.0, max(0.0, t))
    return t * t * t * (t * (t * 6 - 15) + 10)

# 0-2s hold at zero · 2-5s rise to 55 · 5-8s hold · 8-10s back · 10-11s hold
def ymin_at(sec):
    if sec < 2:   return 0.0
    if sec < 5:   return 55.0 * ease((sec - 2) / 3)
    if sec < 8:   return 55.0
    if sec < 10:  return 55.0 * (1 - ease((sec - 8) / 2))
    return 0.0

out = 'frames'
os.makedirs(out, exist_ok=True)
total = int(11 * FPS)
for i in range(total):
    sec = i / FPS
    lo = ymin_at(sec)
    fig = plt.figure(figsize=(W / DPI, H / DPI), dpi=DPI, facecolor=BG)
    ax = fig.add_axes([0.09, 0.38, 0.86, 0.44])
    ax.set_facecolor(BG)
    ax.bar(LABELS, VALS, color=RED, width=0.58, zorder=3)
    ax.set_ylim(lo, 75)
    ax.set_yticks(np.arange(np.ceil(lo / 5) * 5, 76, 5))
    ax.yaxis.set_minor_locator(MultipleLocator(1))
    ax.grid(axis='y', color='#e3e0da', lw=1, zorder=0)
    for s in ('top', 'right'):
        ax.spines[s].set_visible(False)
    ax.spines['left'].set_color('#d7d3cc')
    ax.spines['bottom'].set_color(INK)
    ax.spines['bottom'].set_linewidth(2 if lo == 0 else 1)
    ax.tick_params(colors=DIM, labelsize=17, length=0)
    for t in ax.get_xticklabels():
        t.set_color(INK); t.set_fontsize(21); t.set_fontweight('semibold')

    note = 'The axis starts at 0' if lo < 0.5 else ('The axis starts at %d' % round(lo))
    ax.text(0.0, 1.12, note, transform=ax.transAxes, color=INK if lo < 0.5 else RED,
            fontsize=27, fontweight='semibold', va='bottom')
    ax.text(0.0, 1.03, 'The same five numbers throughout', transform=ax.transAxes,
            color=DIM, fontsize=18, va='bottom')
    fig.savefig(os.path.join(out, 'f%04d.png' % i), facecolor=BG)
    plt.close(fig)
print('frames', total)
