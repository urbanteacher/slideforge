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

SETUP = """import altair as alt
import pandas as pd

air = pd.read_csv('no2_london.csv')
road = air[air['type'].isin(['Roadside', 'Kerbside'])]
my1 = air[air['code'] == 'MY1']      # Marylebone Road
"""

# Every line a slide prints is kept to about 60 characters, so the code can be printed large.
BARE = SETUP + """
alt.Chart(my1).mark_line(point=True).encode(
    x=alt.X('year:O', title=None),
    y=alt.Y('no2:Q', title='NO₂ (µg/m³)'),
).properties(width=560, height=300)
"""

# Slides 19 to 21 and the martini glass grow one chart: each prints only its new lines.
# A step's "code" is what its slide prints; "run" is what runs (the setup and the steps it grows from first);
# a *_KEEP part is what the next step builds on.
HEADLINE_KEEP = """red = '#c8102e'
line = alt.Chart(my1).mark_line(strokeWidth=3, color=red).encode(
    x=alt.X('year:O', title=None),
    y=alt.Y('no2:Q', title='NO₂ (µg/m³)'),
)
limit = alt.Chart().mark_rule(strokeDash=[6, 4]).encode(
    y=alt.datum(40))

finding = ('Marylebone Road’s air has a third'
           ' of the NO₂ it had in 2010')
how = 'Yearly average; dashed: the legal limit, 40 µg/m³'
"""
HEADLINE = HEADLINE_KEEP + """
(line + limit).properties(
    width=560, height=300,
    title=alt.Title(finding, subtitle=how),
)
"""

ANNOTATE_KEEP = """notes = pd.DataFrame({
    'year': [2019, 2020, 2021, 2023],
    'at':   [172, 157, 142, 127],     # how high each sits
    'text': ['Central ULEZ', 'Lockdown',
             'ULEZ reaches here', 'ULEZ: all London'],
})
rules = alt.Chart(notes).mark_rule(color='grey').encode(
    x='year:O', y='at:Q', y2=alt.datum(0))  # up to its note
words = alt.Chart(notes).mark_text(align='left', dx=5).encode(
    x='year:O', y='at:Q', text='text:N')
"""
ANNOTATE = "# line, limit, finding, how: as on the last slide\n" + ANNOTATE_KEEP + """
(line + limit + rules + words).properties(
    width=560, height=300,
    title=alt.Title(finding, subtitle=how),
)
"""

HIGHLIGHT_KEEP = """grey = '#a6a6a6'
others = alt.Chart(road).mark_line(color=grey, strokeWidth=1)
others = others.encode(
    x='year:O', y='no2:Q',
    detail='code:N',                 # one line per monitor
)
"""
HIGHLIGHT = "# line, limit, notes, finding, how: as before\n" + HIGHLIGHT_KEEP + """
# the layer added last is drawn on top: grey, then red
(others + line + limit + rules + words).properties(
    width=560, height=300,
    title=alt.Title(finding, subtitle=how),
)
"""

EXPLORE = """# after the setup: air, road and my1
pick = alt.selection_point(fields=['type'], bind='legend')
# colours a colour-blind reader can tell apart (Okabe-Ito)
types = ['Kerbside', 'Roadside', 'Urban Background',
         'Suburban', 'Industrial']
colours = ['#d55e00', '#e69f00', '#0072b2',
           '#56b4e9', '#8c8c8c']

alt.Chart(air).mark_line(point=True).encode(
    x=alt.X('year:O', title=None),
    y=alt.Y('no2:Q', title='NO₂ (µg/m³)'),
    detail='code:N',
    color=alt.Color('type:N', title='Monitor',
        scale=alt.Scale(domain=types, range=colours)),
    opacity=alt.when(pick).then(alt.value(0.9))
                          .otherwise(alt.value(0.05)),
    tooltip=['site:N', 'borough:N', 'type:N',
             'year:O', 'no2:Q'],
).add_params(pick).properties(width=560, height=300)
"""

STEPPER = """# line, limit, rules, words, others, finding, how: as before
chapter = alt.param(value=1, bind=alt.binding_radio(
    options=[1, 2, 3], name='Chapter '))

told = (rules.transform_filter(chapter >= 2)   # the stem
        + words.transform_filter(chapter >= 2))
dots = alt.OverlayMarkDef(color=grey, size=15)
bowl = others.mark_line(color=grey, point=dots).encode(
    tooltip=['site:N', 'borough:N', 'year:O', 'no2:Q'],
).transform_filter(chapter >= 3)               # the bowl

still = alt.Scale(domain=[0, 180])    # the axis stays still
hero = line.encode(y=alt.Y('no2:Q', scale=still,
                           title='NO₂ (µg/m³)'))

(bowl + hero + limit + told).add_params(chapter).properties(
    width=560, height=300,
    title=alt.Title(finding, subtitle=how),
)
"""

GUESS = """# after the setup: air, road and my1
guess = alt.param(value=60, bind=alt.binding_range(
    min=0, max=100, step=1, name='Your guess for 2025 '))
show = alt.param(value=False,
                 bind=alt.binding_checkbox(name='Show me '))

years = list(range(2010, 2026))   # room for the years to guess
base = alt.Chart(my1).encode(
    x=alt.X('year:O', title=None,
            scale=alt.Scale(domain=years)),
    y=alt.Y('no2:Q', title='NO₂ (µg/m³)',
            scale=alt.Scale(domain=[0, 100])))
known = base.mark_line(strokeWidth=3, color='#0c3354')
known = known.transform_filter(alt.datum.year <= 2016)
truth = base.mark_line(strokeWidth=6, color='#c8102e')
truth = truth.transform_filter(
    (alt.datum.year >= 2016) & show)
yours = alt.Chart().mark_point(size=260, filled=True,
                               color='#0c3354').encode(
    x=alt.XDatum(2025, type='ordinal'),
    y=alt.YDatum(guess, type='quantitative'))

(known + truth + yours).add_params(guess, show).properties(
    width=560, height=300,
    title='Marylebone Road, 2016: 89. Guess 2025.')
"""

STEPS = [
    {"id": "bare", "code": BARE, "run": BARE, "new": ["mark_line", "x=alt.X", "y=alt.Y"]},
    {"id": "headline", "code": HEADLINE, "run": SETUP + HEADLINE, "new": ["alt.Title", "finding =", "' of the NO", "how =", "limit", "alt.datum(40)", "(line + limit)"]},
    {"id": "annotate", "code": ANNOTATE, "run": SETUP + HEADLINE_KEEP + ANNOTATE, "new": ["notes", "'year': [", "'text': [", "'ULEZ reaches", "'at':", "rules", "words", "mark_text", "text='text:N'", "(line + limit + rules + words)"]},
    {"id": "highlight", "code": HIGHLIGHT, "run": SETUP + HEADLINE_KEEP + ANNOTATE_KEEP + HIGHLIGHT, "new": ["others", "grey =", "detail=", "(others + line"]},
    {"id": "explore", "code": EXPLORE, "run": SETUP + EXPLORE, "new": ["selection_point", "bind='legend'", "tooltip=", "'year:O', 'no2:Q'],", "add_params", "scale=alt.Scale", "types =", "'Suburban', 'Industrial'", "colours =", "'#56b4e9'"]},
    {"id": "stepper", "code": STEPPER, "run": SETUP + HEADLINE_KEEP + ANNOTATE_KEEP + HIGHLIGHT_KEEP + STEPPER, "new": ["chapter = alt.param", "binding_radio", "options=", "chapter >= 2", "chapter >= 3", "dots", "point=dots", "still", "scale=still", "add_params(chapter)"]},
    {"id": "guess", "code": GUESS, "run": SETUP + GUESS, "new": ["guess = alt.param", "binding_range", "show = alt.param", "binding_checkbox", "& show", "mark_point", "XDatum", "alt.YDatum(guess", "add_params(guess, show)", "strokeWidth=6"]},
]

os.chdir(OUT)  # the code reads its CSV from beside the pictures, as a student's notebook would
for step in STEPS:
    scope = {}
    body = step["run"].rstrip().split("\n")
    # The last statement is the chart, as a notebook cell shows it: it starts at the last unindented line.
    last = max(i for i, l in enumerate(body) if l and not l[0].isspace() and not l.startswith(")"))
    exec("\n".join(body[:last]), scope)
    chart = eval("\n".join(body[last:]), scope)
    # Larger text and level year labels for the slide; the chart itself is what the code makes.
    chart = (chart.configure_axis(labelFontSize=22, titleFontSize=20)
             .configure_axisX(labelAngle=0, labelExpr="datum.value % 5 === 0 ? datum.label : ''")
             .configure_title(fontSize=24, subtitleFontSize=19)
             .configure_legend(labelFontSize=20, titleFontSize=20, symbolSize=200)
             .configure_text(fontSize=17))
    chart.save(str(OUT / f"code-{step['id']}.png"), scale_factor=2)
    print("rendered", step["id"])

# Every Build-it as one file students can run: each part starts from the setup and the parts before it.
TITLES = {"bare": "Start with the bare line", "headline": "Say the finding in the title",
          "annotate": "Write on the chart where it happened", "highlight": "One line in colour, the rest grey",
          "explore": "Let the reader drive: tooltip and legend", "stepper": "A martini glass: chapters, then open",
          "guess": "Guess first, then show"}
script = ['# LDSCI6253 Week 9 · Who drives the story? Every Build-it, ready to run.',
          '# Put no2_london.csv beside this file. In a notebook, paste one part per cell, in order:',
          '# each part shows its chart as the last line of the cell.', '', SETUP.rstrip()]
body = {"headline": HEADLINE, "annotate": ANNOTATE_KEEP + ANNOTATE.split(ANNOTATE_KEEP)[1],
        "highlight": HIGHLIGHT_KEEP + HIGHLIGHT.split(HIGHLIGHT_KEEP)[1], "explore": EXPLORE.split("\n", 1)[1],
        "stepper": STEPPER.split("\n", 1)[1], "guess": GUESS.split("\n", 1)[1],
        "bare": BARE[len(SETUP):]}
for i, step in enumerate(STEPS, 1):
    script += ['', '', f'# %% {i}. {TITLES[step["id"]]}', body[step["id"]].strip()]
(OUT / "week9_build_its.py").write_text("\n".join(script) + "\n")

(ROOT / "tools/ipdv-week9/code/steps.json").write_text(json.dumps({"steps": STEPS}, indent=1, ensure_ascii=False))
