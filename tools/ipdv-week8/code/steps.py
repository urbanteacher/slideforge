"""Week 8's Build-it code (LDSCI6253, networks and trees), run for real.

Each STEP is the Altair a Build-it slide prints. This script runs them in
order, renders each picture, and writes

    assets/lesson/ipdv/week8/code-<id>.png   the picture the step makes
    tools/ipdv-week8/code/steps.json         the code, for the slides
    assets/lesson/ipdv/week8/*.csv           the data files the code reads

so the code on a slide is always the code that drew the picture beside it.

    uv run --with altair --with pandas --with vega_datasets --with vl-convert-python \
        python tools/ipdv-week8/code/steps.py
"""
import json
import pathlib

import altair as alt
import pandas as pd

ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = ROOT / "assets/lesson/ipdv/week8"
DATA = ROOT / "tools/ipdv-week8/data"
OUT.mkdir(parents=True, exist_ok=True)

# The data files students download, written from the lecture's own data.
tube = json.loads((DATA / "tube.json").read_text())
zone1 = {s["name"] for s in tube["stations"] if s["zone"] in ("1", "1+2")}
pd.DataFrame([{"name": s["name"], "lon": s["lon"], "lat": s["lat"], "zone": s["zone"]}
              for s in tube["stations"] if s["name"] in zone1]).to_csv(OUT / "tube_stations.csv", index=False)
boroughs = json.loads((DATA / "boroughs.json").read_text())["boroughs"]
pd.DataFrame(boroughs)[["borough", "area", "half", "population"]].to_csv(OUT / "london_boroughs.csv", index=False)

# TfL's line colours (TfL colour standard), in the order of tube.json's lines.
TFL = {"bakerloo": "#B36305", "central": "#E32017", "circle": "#FFD300", "district": "#00782A",
       "hammersmith-city": "#F3A9BB", "jubilee": "#A0A5A9", "metropolitan": "#9B0056",
       "northern": "#000000", "piccadilly": "#003688", "victoria": "#0098D4", "waterloo-city": "#95CDBA"}
# Each link carries its line's colour, so the chart can use the colours as they are (scale=None).
pd.DataFrame([{**e, "colour": TFL[e["line"]]} for e in tube["edges"] if e["source"] in zone1 and e["target"] in zone1]
             ).to_csv(OUT / "tube_links.csv", index=False)

PAIRS = '''import altair as alt
import pandas as pd

# A network is a list of pairs: one row for each edge
edges = pd.DataFrame({
    'source': ['A', 'A', 'A', 'A', 'B', 'B', 'C', 'D', 'E'],
    'target': ['B', 'C', 'G', 'H', 'C', 'F', 'D', 'E', 'F'],
})

# Where to draw each node: we chose these numbers
nodes = pd.DataFrame({
    'id': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    'x':  [2, 4, 3, 3, 5, 5, 0, 1],
    'y':  [3, 3, 2, 0, 0, 2, 4, 1],
})
'''

NODES = PAIRS + '''
dots = alt.Chart(nodes).mark_circle(size=900, opacity=1).encode(
    x=alt.X('x:Q', axis=None), y=alt.Y('y:Q', axis=None))
names = dots.mark_text(color='white', fontWeight='bold').encode(
    text='id:N')

(dots + names).configure_view(stroke=None)   # no frame round the chart
'''

LINKS = PAIRS + '''
# Give every edge the position of both of its ends
lines = (edges
    .merge(nodes, left_on='source', right_on='id')
    .merge(nodes, left_on='target', right_on='id', suffixes=('', '2')))

links = alt.Chart(lines).mark_rule(color='grey', strokeWidth=3).encode(
    x=alt.X('x:Q', axis=None), y=alt.Y('y:Q', axis=None),
    x2='x2:Q', y2='y2:Q')
dots = alt.Chart(nodes).mark_circle(size=900, opacity=1).encode(
    x='x:Q', y='y:Q')
names = dots.mark_text(color='white', fontWeight='bold').encode(
    text='id:N')

links + dots + names
'''

TUBE = '''import altair as alt
import pandas as pd

stations = pd.read_csv('tube_stations.csv')   # name, lon, lat
edges = pd.read_csv('tube_links.csv')         # source, target, line, colour

# The same join as before: each edge gets both of its ends
lines = (edges
    .merge(stations, left_on='source', right_on='name')
    .merge(stations, left_on='target', right_on='name', suffixes=('', '2')))

where = dict(x=alt.X('lon:Q', scale=alt.Scale(zero=False), axis=None),
             y=alt.Y('lat:Q', scale=alt.Scale(zero=False), axis=None))

# TfL's own colours, straight from the data: colour is the line
links = alt.Chart(lines).mark_rule(strokeWidth=4).encode(
    **where, x2='lon2:Q', y2='lat2:Q',
    color=alt.Color('colour:N', scale=None))
dots = alt.Chart(stations).mark_circle(size=60, color='white',
    stroke='black', opacity=1).encode(**where, tooltip='name:N')

(links + dots).properties(width=640, height=420).configure_view(stroke=None)
'''

MATRIX = '''import altair as alt
import pandas as pd
from vega_datasets import data

# Les Miserables: who appears in a scene with whom (Knuth, 1993)
nodes, links = data.miserables()
name = nodes['name']
pairs = pd.DataFrame({'a': name[links['source']].values,
                      'b': name[links['target']].values,
                      'scenes': links['value']})
# A matrix shows each pair twice: row a, column b and row b, column a
pairs = pd.concat([pairs, pairs.rename(columns={'a': 'b', 'b': 'a'})])

order = sorted(name)
alt.Chart(pairs).mark_rect().encode(
    x=alt.X('a:N', sort=order, axis=None),
    y=alt.Y('b:N', sort=order, axis=None),
    color=alt.Color('scenes:Q', scale=alt.Scale(scheme='blues')),
    tooltip=['a:N', 'b:N', 'scenes:Q'],
).properties(width=420, height=420)
'''

MATRIX_GROUPED = MATRIX.replace(
    "order = sorted(name)",
    "# The only change: sort by group (who belongs together), not by name\norder = nodes.sort_values(['group', 'name'])['name'].tolist()")

ICICLE = '''import altair as alt
import pandas as pd

b = pd.read_csv('london_boroughs.csv')   # borough, area, half, population

# Four levels of one tree. Each level is the same 33 boroughs,
# grouped differently, so every level adds up to all of London.
rows = pd.concat([
    b.assign(level='1 London',         name='London'),
    b.assign(level='2 Inner or Outer', name=b['half']),
    b.assign(level='3 Area',           name=b['area']),
    b.assign(level='4 Borough',        name=b['borough']),
])
# Keep children under their parents: sort by the path from the root
rows['path'] = rows['half'] + rows['area'] + rows['borough']

alt.Chart(rows).mark_bar(stroke='white').encode(
    y=alt.Y('level:O', title=None),
    x=alt.X('sum(population):Q', title='People'),
    detail='name:N',
    order=alt.Order('min(path):N'),
    color=alt.Color('half:N', title=None),
    tooltip=['name:N', alt.Tooltip('sum(population):Q', format=',')],
).properties(width=640, height=260)
'''

STEPS = [
    {"id": "nodes", "code": NODES, "new": ["mark_circle", "mark_text"]},
    {"id": "links", "code": LINKS, "new": [".merge(", "mark_rule", "x2=", "links +"]},
    {"id": "tube", "code": TUBE, "new": ["read_csv", "scale=None"]},
    {"id": "matrix", "code": MATRIX, "new": ["mark_rect", "pd.concat", "x=alt.X('a:N'", "y=alt.Y('b:N'"]},
    {"id": "matrix-grouped", "code": MATRIX_GROUPED, "new": ["sort_values"]},
    {"id": "icicle", "code": ICICLE, "new": ["pd.concat", "assign", "sum(population)", "alt.Order"]},
]

import os
os.chdir(OUT)  # the code reads its CSVs from beside the pictures, as a student's notebook would
for step in STEPS:
    scope = {}
    body = step["code"].rstrip().split("\n")
    # The last statement is the chart, as a notebook cell shows it: it starts at the last unindented line.
    last = max(i for i, l in enumerate(body) if l and not l[0].isspace() and not l.startswith(")"))
    exec("\n".join(body[:last]), scope)
    chart = eval("\n".join(body[last:]), scope)
    if step["id"] in ("nodes", "links"):
        chart = chart.properties(width=420, height=320, padding=24)
    chart.save(str(OUT / f"code-{step['id']}.png"), scale_factor=2)
    print("rendered", step["id"])

(ROOT / "tools/ipdv-week8/code/steps.json").write_text(json.dumps({"steps": STEPS}, indent=1))
