"""Week 9's Build-it code (LDSCI6253, narrative and experiential visualisation), run for real.

Each STEP is the Altair a Build-it slide prints. This script runs them in
order, renders each picture, and writes

    assets/lesson/ipdv/week9/code-<id>.png   the picture the step makes
    tools/ipdv-week9/code/steps.json         the code, for the slides
    assets/lesson/ipdv/week9/no2_london.csv  the data file the code reads

so the code on a slide is always the code that drew the picture beside it.
A chart with a slider or buttons is drawn as it first opens.

    uv run --with altair --with pandas --with vl-convert-python \
        python tools/ipdv-week9/code/steps.py
"""
import json
import os
import pathlib

import altair as alt
import pandas as pd

ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = ROOT / "assets/lesson/ipdv/week9"
OUT.mkdir(parents=True, exist_ok=True)

# The data file students download: one row per monitor per year (London Air Quality Network).
air = json.loads((ROOT / "tools/ipdv-week9/data/no2.json").read_text())
rows = []
for s in air["sites"]:
    borough, _, site = s["name"].partition(" - ")
    for year, v in s["no2"].items():
        rows.append({"code": s["code"], "site": site or borough, "borough": borough, "type": s["type"],
                     "year": int(year), "no2": v})
pd.DataFrame(rows).sort_values(["code", "year"]).to_csv(OUT / "no2_london.csv", index=False)

SETUP = '''import altair as alt
import pandas as pd

air = pd.read_csv('no2_london.csv')
road = air[air['type'].isin(['Roadside', 'Kerbside'])]
my1 = air[air['code'] == 'MY1']      # Marylebone Road
'''

BARE = SETUP + '''
alt.Chart(my1).mark_line(point=True).encode(
    x=alt.X('year:O', title=None),
    y=alt.Y('no2:Q', title='NO₂ (µg/m³)'),
).properties(width=560, height=300)
'''

HEADLINE = SETUP + '''
line = alt.Chart(my1).mark_line(strokeWidth=3, color='#c8102e').encode(
    x=alt.X('year:O', title=None),
    y=alt.Y('no2:Q', title='NO₂ (µg/m³)'),
)
limit = alt.Chart().mark_rule(strokeDash=[6, 4]).encode(y=alt.datum(40))

finding = 'Marylebone Road’s air has a third of the NO₂ it had in 2010'
how = 'Yearly average; the dashed line is the legal limit, 40 µg/m³'

(line + limit).properties(
    width=560, height=300,
    title=alt.Title(finding, subtitle=how),
)
'''

ANNOTATE = SETUP + '''
finding = 'Marylebone Road’s air has a third of the NO₂ it had in 2010'
line = alt.Chart(my1).mark_line(strokeWidth=3, color='#c8102e').encode(
    x=alt.X('year:O', title=None),
    y=alt.Y('no2:Q', title='NO₂ (µg/m³)'),
)
notes = pd.DataFrame({
    'year': [2019, 2020, 2023],
    'at':   [30, 20, 10],                 # how high each note sits
    'text': ['ULEZ starts in central London',
             'Lockdown',
             'ULEZ covers all London'],
})
rules = alt.Chart(notes).mark_rule(color='grey').encode(x='year:O')
words = alt.Chart(notes).mark_text(align='right', dx=-5).encode(
    x='year:O', y='at:Q', text='text:N',
)

(line + rules + words).properties(
    width=560, height=300, title=finding)
'''

HIGHLIGHT = SETUP + '''
alt.Chart(road).mark_line().encode(
    x=alt.X('year:O', title=None),
    y=alt.Y('no2:Q', title='NO₂ (µg/m³)'),
    detail='code:N',
    color=alt.when(alt.datum.code == 'MY1')
             .then(alt.value('#c8102e'))
             .otherwise(alt.value('#d3d3d3')),
    strokeWidth=alt.when(alt.datum.code == 'MY1')
             .then(alt.value(4)).otherwise(alt.value(1)),
    order=alt.Order('is_my1:Q'),
).transform_calculate(
    is_my1="datum.code == 'MY1' ? 1 : 0"
).properties(width=560, height=300,
    title='Marylebone Road fell with every other London road')
'''

EXPLORE = SETUP + '''
pick = alt.selection_point(fields=['type'], bind='legend')

alt.Chart(air).mark_line(point=True).encode(
    x=alt.X('year:O', title=None),
    y=alt.Y('no2:Q', title='NO₂ (µg/m³)'),
    detail='code:N',
    color=alt.Color('type:N', title='Monitor'),
    opacity=alt.when(pick).then(alt.value(0.9))
                          .otherwise(alt.value(0.05)),
    tooltip=['site:N', 'borough:N', 'type:N', 'year:O', 'no2:Q'],
).add_params(pick).properties(width=560, height=300)
'''

STEPPER = SETUP + '''
chapter = alt.param(value=4, bind=alt.binding_radio(
    options=[1, 2, 3, 4], name='Chapter '))

notes = pd.DataFrame({
    'year': [2010, 2019, 2023],
    'chapter': [1, 2, 3],
    'text': ['98: over twice the limit',
             'ULEZ starts',
             'ULEZ: all London'],
})
others = alt.Chart(road).mark_line(color='#d3d3d3').encode(
    x=alt.X('year:O', title=None), y=alt.Y('no2:Q', title='NO₂ (µg/m³)'),
    detail='code:N', tooltip=['site:N', 'year:O', 'no2:Q'],
).transform_filter(chapter >= 4)        # the bowl: every monitor
hero = alt.Chart(my1).mark_line(strokeWidth=3, color='#c8102e').encode(
    x='year:O', y='no2:Q')
told = alt.Chart(notes).mark_text(align='left', dx=6, dy=-14).encode(
    x='year:O', y=alt.value(20), text='text:N',
).transform_filter(alt.datum.chapter <= chapter)   # the stem

(others + hero + told).add_params(chapter).properties(width=560, height=300)
'''

GUESS = SETUP + '''
guess = alt.param(value=60, bind=alt.binding_range(
    min=0, max=100, step=1, name='Your guess for 2025 '))
show = alt.param(value=False, bind=alt.binding_checkbox(name='Show me '))

years = list(range(2010, 2026))     # keep room for the years to guess
base = alt.Chart(my1).encode(
    x=alt.X('year:O', title=None, scale=alt.Scale(domain=years)),
    y=alt.Y('no2:Q', title='NO₂ (µg/m³)', scale=alt.Scale(domain=[0, 100])))
known = base.mark_line(strokeWidth=3, color='#0c3354').transform_filter(
    alt.datum.year <= 2016)
truth = base.mark_line(strokeWidth=3, color='#c8102e').transform_filter(
    (alt.datum.year >= 2016) & show)
yours = alt.Chart().mark_rule(strokeDash=[6, 4], size=3).encode(
    y=alt.YDatum(guess, type='quantitative'))

(known + truth + yours).add_params(guess, show).properties(
    width=560, height=300, title='Marylebone Road, 2016: 89. Guess 2025.')
'''

STEPS = [
    {"id": "bare", "code": BARE, "new": ["mark_line", "x=alt.X", "y=alt.Y"]},
    {"id": "headline", "code": HEADLINE, "new": ["alt.Title", "finding =", "how =", "limit", "alt.datum(40)", "(line + limit)"]},
    {"id": "annotate", "code": ANNOTATE, "new": ["notes", "'year': [", "'text': [", "rules", "words", "mark_text", "'at':", "text='text:N'", "(line + rules + words)"]},
    {"id": "highlight", "code": HIGHLIGHT, "new": ["alt.when", ".then(", ".otherwise(", "detail=", "strokeWidth"]},
    {"id": "explore", "code": EXPLORE, "new": ["selection_point", "bind='legend'", "tooltip=", "add_params", "opacity=alt.when(pick)"]},
    {"id": "stepper", "code": STEPPER, "new": ["chapter = alt.param", "binding_radio", "options=", "chapter >= 4", "alt.datum.chapter <= chapter", "add_params(chapter)"]},
    {"id": "guess", "code": GUESS, "new": ["guess = alt.param", "binding_range", "show = alt.param", "binding_checkbox", "& show", "alt.YDatum(guess", "add_params(guess, show)"]},
]

os.chdir(OUT)  # the code reads its CSV from beside the pictures, as a student's notebook would
for step in STEPS:
    scope = {}
    body = step["code"].rstrip().split("\n")
    # The last statement is the chart, as a notebook cell shows it: it starts at the last unindented line.
    last = max(i for i, l in enumerate(body) if l and not l[0].isspace() and not l.startswith(")"))
    exec("\n".join(body[:last]), scope)
    chart = eval("\n".join(body[last:]), scope)
    chart.save(str(OUT / f"code-{step['id']}.png"), scale_factor=2)
    print("rendered", step["id"])

(ROOT / "tools/ipdv-week9/code/steps.json").write_text(json.dumps({"steps": STEPS}, indent=1, ensure_ascii=False))
