"""Week 9's tutorial notebook (LDSCI6253, narrative visualisation): the lecture's Build-its, to run and change.

One Build-it per section, in the lecture's order: what the move does, the code (the code on the slide, read from
steps.json, so the notebook and the lecture never disagree), and a *Try it* with a folded model answer. The lab
challenge (activity.py) uses these moves on Brixton Road.

    uv run --with nbformat python tools/ipdv-week9/code/notebook.py

writes lessons/09_Notebook_IPDV_Narrative_Experiential.ipynb, without outputs. --run also runs it end to end (needs
nbclient, ipykernel, altair, pandas) and writes the run copy beside it, for the teacher.
"""
import json
import pathlib
import sys

import nbformat as nbf

ROOT = pathlib.Path(__file__).resolve().parents[3]
DATA = ROOT / "assets/lesson/ipdv/week9"
STEPS = {s["id"]: s["code"] for s in json.loads((ROOT / "tools/ipdv-week9/code/steps.json").read_text())["steps"]}
OUT = ROOT / "lessons/09_Notebook_IPDV_Narrative_Experiential.ipynb"
RUN = ROOT / "lessons/09_Notebook_IPDV_Narrative_Experiential_RUN.ipynb"
LIVE = "https://slideforge-rpjj.onrender.com/assets/lesson/ipdv/week9/"

cells = []
md = lambda s: cells.append(nbf.v4.new_markdown_cell(s.strip()))
code = lambda s: cells.append(nbf.v4.new_code_cell(s.strip()))


def answer(s):
    return "<details><summary><b>Stuck? Open a model answer</b></summary>\n\n```python\n" + s.strip() + "\n```\n</details>"


def step(key):
    """A slide's code, its CSV read from beside the notebook or from the course site."""
    return STEPS[key].replace("pd.read_csv('no2_london.csv')", "load('no2_london')")


md("""
# Week 9 · Who drives the story? Build it, one move at a time

**LDSCI6253 Information Presentation & Data Visualisation** · Northeastern University London

This is the lecture's code, the Build-it slides, to run and change. One chart of Marylebone Road's NO₂ grows into a
story: the finding in the title, notes where it happened, one road in colour and the rest grey, the reader's turn to
explore, a martini glass, and a guess before the answer.

| § | Build-it | The move | The advanced Altair |
|---|---|---|---|
| 1 | Start with the bare line | a correct chart that says nothing | `mark_line` |
| 2 | Say the finding in the title | **say it** | layers (`+`), `mark_rule`, `alt.Title` |
| 3 | Write on the chart where it happened | **point at it** | a notes table, `mark_rule` with `y2`, `mark_text` |
| 4 | One line in colour, the rest grey | **isolate it** | a context layer, `detail`, layer order |
| 5 | Let the reader drive | **let go** | `selection_point`, `tooltip`, a colour scale |
| 6 | A martini glass: chapters, then open | **lead, then let go** | `alt.param`, `transform_filter` |
| 7 | Guess first, then show | **make it felt** | sliders and checkboxes, `XDatum` |
| 8 | Three ways to lead, then let go | martini glass, slideshow, drill-down | a chapter parameter, a linked selection, `&` |
| 9 | Four ways to make a number land | guess, count, human scale, physical | unit charts: `transform_window`, `mark_square`, `facet` |

Run the cells **in order**: each section builds on the one before. Each ends with a **Try it**: change the code and
run it again. The lab challenge (`09_Activity_IPDV_Brixton_Road_Story.ipynb`) uses the same moves on another road.
""")

md("""
## 0 · Set up

Put `no2_london.csv` beside this notebook (it is on Canvas); if it is not there, `load` reads it from the course site.
""")
code(f"""
import pandas as pd
from pathlib import Path

LIVE = "{LIVE}"

def load(name):
    \"\"\"Read name.csv from beside this notebook, or from the course site if it is not here.\"\"\"
    here = Path(name + ".csv")
    return pd.read_csv(here if here.exists() else LIVE + name + ".csv")
""")

SECTIONS = [
    ("bare", "1 · Start with the bare line",
     "Correct, but silent: what should a reader see? The first lines are the setup every later section uses.",
     "Change `my1` to Brixton Road (code `'LB4'`): `air[air['code'] == 'LB4']`. What is the same, and what does the chart still not say?",
     "brixton = air[air['code'] == 'LB4']\nalt.Chart(brixton).mark_line(point=True).encode(\n    x=alt.X('year:O', title=None),\n    y=alt.Y('no2:Q', title='NO₂ (µg/m³)'),\n).properties(width=560, height=300)"),
    ("headline", "2 · Say the finding in the title",
     "**Say it.** A title that is a finding, a subtitle that says how to read it, and the legal limit as a second layer: `line + limit` draws one chart on top of the other.",
     "Add the WHO guideline (10 µg/m³) as a dotted third layer: `alt.Chart().mark_rule(strokeDash=[2, 3]).encode(y=alt.datum(10))`.",
     "who = alt.Chart().mark_rule(strokeDash=[2, 3]).encode(y=alt.datum(10))\n(line + limit + who).properties(width=560, height=300,\n    title=alt.Title(finding, subtitle=how))"),
    ("annotate", "3 · Write on the chart where it happened",
     "**Point at it.** A small table of notes: each note is a year, a height and its words. A rule drops from each note to the axis; the words sit beside it.",
     "Add a fifth note: 2010, height 110, 'Start of the record'. Add a row to each list in `notes`, then run the cell again.",
     "notes = pd.DataFrame({\n    'year': [2010, 2019, 2020, 2021, 2023],\n    'at':   [110, 172, 157, 142, 127],\n    'text': ['Start of the record', 'Central ULEZ', 'Lockdown',\n             'ULEZ reaches here', 'London-wide'],\n})\n# then run the rules, words and chart lines of this section again"),
    ("highlight", "4 · One line in colour, the rest grey",
     "**Isolate it.** Every other roadside monitor as thin grey lines (`detail` draws one line per monitor, all the same colour), then Marylebone Road on top in red. The layer added last is drawn on top.",
     "Put `others` last instead of first: `(line + limit + rules + words + others)`. What happens to the red line, and why?",
     "(line + limit + rules + words + others).properties(width=560, height=300,\n    title=alt.Title(finding, subtitle=how))\n# The grey lines are drawn over the red one: the story is buried. Order is meaning."),
    ("explore", "5 · Let the reader drive: tooltip and legend",
     "**Let go.** Every monitor, coloured by type; click a type in the legend to keep it bright; point at a line for its site and value. The reader finds their own road, but nothing tells them the finding.",
     "Add `'code:N'` to the tooltip list, then find Brixton Road (LB4) by pointing at the lines.",
     "# in the encode(...) of this section:\ntooltip=['site:N', 'borough:N', 'type:N', 'code:N',\n         'year:O', 'no2:Q'],"),
    ("stepper", "6 · A martini glass: chapters, then open",
     "**Lead, then let go.** A parameter bound to three buttons is the chapter. Chapter 1 is the finding alone; 2 adds the notes (the stem); 3 opens the bowl: every road, to explore. The axis stays still, so nothing jumps between chapters.",
     "Make it open on chapter 3, the bowl, by changing `value=1` to `value=3`. Which do you think a hurried reader should see first, and why?",
     "chapter = alt.param(value=3, bind=alt.binding_radio(\n    options=[1, 2, 3], name='Chapter '))\n# A hurried reader should get chapter 1: the finding first, then the bowl."),
    ("guess", "7 · Guess first, then show",
     "**Make it felt.** The reader moves a slider to guess 2025, then ticks *Show me*. Guessing first makes the answer stick (the lecture's *You Draw It*).",
     "Start the slider at 30 instead of 60 (`value=30`). Does a different starting guess change what people guess? (It does: the anchor.)",
     "guess = alt.param(value=30, bind=alt.binding_range(\n    min=0, max=100, step=1, name='Your guess for 2025 '))"),
]

for key, title, what, task, model in SECTIONS:
    md(f"## {title}\n\n{what}")
    code(step(key))
    md(f"**Try it.** {task}\n\n" + answer(model))

# ------------------------------------------------------------------ 8 and 9: the lecture's two families, in code
md("""
## 8 · Three ways to lead, then let go

The lecture's slide *Three ways to lead, then let go* (Segel and Heer, 2010) names three shapes for a story that
starts with the author and ends with the reader:

| Shape | The author leads by… | then the reader… | Here |
|---|---|---|---|
| **Martini glass** | a short story in order (the stem) | explores everything (the bowl) | §6 |
| **Interactive slideshow** | chapters in order | explores inside each chapter | 8a |
| **Drill-down story** | one overview | picks which story to open, and the author tells it | 8b |
""")

md("""
### 8a · An interactive slideshow

The author picks the chapters: three years, each with its own caption. Inside a chapter the reader can point at any
monitor. The captions are worked out from the data, so they can never say a number the chart does not show.
""")
code("""
# after §5: air, types and colours
picked = [2010, 2019, 2025]                       # the author's chapters
said = []
for y in picked:
    that = air[air['year'] == y]
    said.append(f"{y}: {(that['no2'] > 40).sum()} of {len(that)} monitors over the limit")
captions = pd.DataFrame({'year': picked, 'say': said})

year = alt.param(value=2010, bind=alt.binding_radio(options=picked, name='Chapter '))

dots = alt.Chart(air).mark_circle(size=90, opacity=0.8).encode(
    x=alt.X('no2:Q', title='NO₂ (µg/m³), yearly average', scale=alt.Scale(domain=[0, 180])),
    y=alt.Y('type:N', title=None, sort=types),
    color=alt.Color('type:N', scale=alt.Scale(domain=types, range=colours), legend=None),
    tooltip=['site:N', 'borough:N', 'no2:Q'],      # the reader explores inside the chapter
).transform_filter(alt.datum.year == year)
caption = alt.Chart(captions).mark_text(align='left', fontSize=16, fontWeight='bold').encode(
    x=alt.value(0), y=alt.value(-12), text='say:N').transform_filter(alt.datum.year == year)
limit_x = alt.Chart().mark_rule(strokeDash=[6, 4]).encode(x=alt.datum(40))

(dots + limit_x + caption).add_params(year).properties(width=560, height=240)
""")
md("""**Try it.** Add a fourth chapter, 2021, to `picked` and to the buttons. What does its caption say?

""" + answer("""picked = [2010, 2019, 2021, 2025]
# then run the cell again: the captions and the buttons both come from picked"""))

md("""
### 8b · A drill-down story

One overview: the median NO₂ for each type of monitor, year by year. **Click a line** to open its story below: every
monitor of that type, to point at. The author still leads: the overview is drawn first, and the reader opens one
story at a time.
""")
code("""
# after §5: air, types and colours
opened = alt.selection_point(fields=['type'], value='Kerbside')   # opens on the kerbside story

overview = alt.Chart(air).mark_line(strokeWidth=4, point=True).encode(
    x=alt.X('year:O', title=None),
    y=alt.Y('median(no2):Q', title='Median NO₂ (µg/m³)'),
    color=alt.Color('type:N', scale=alt.Scale(domain=types, range=colours), title='Monitor (click one)'),
    opacity=alt.when(opened).then(alt.value(1)).otherwise(alt.value(0.25)),
).add_params(opened).properties(width=560, height=200, title='Every type of monitor fell')

story = alt.Chart(air).mark_line(color='#0c3354', strokeWidth=1.5).encode(
    x=alt.X('year:O', title=None),
    y=alt.Y('no2:Q', title='NO₂ (µg/m³)'),
    detail='code:N',
    tooltip=['site:N', 'borough:N', 'year:O', 'no2:Q'],
).transform_filter(opened).properties(width=560, height=200, title='The type you opened, monitor by monitor')

overview & story                                  # & puts one chart above the other
""")
md("""**Try it.** Make the drill-down open on Urban Background instead: change `value='Kerbside'`. Which type's story
would you tell a resident who lives on a quiet street?

""" + answer("""opened = alt.selection_point(fields=['type'], value='Urban Background')
# A quiet street is nearer an urban background monitor than a kerbside one."""))

md("""
## 9 · Four ways to make a number land

The lecture's slide *Four ways to make a number land*. A number is read; these make it **felt** (Kennedy and Hill,
2018).

| Way | How | Here |
|---|---|---|
| **Guess first** | the reader guesses, then the truth appears beside the guess | §7 |
| **Count it out** | one square per thing | 9a |
| **Human scale** | in units people know | 9b |
| **Make it physical** | stack it, print it, build it | 9c |
""")

md("""
### 9a · Count it out

A concentration is not a count, so count something that is: **monitors**. One square each, red if it was over the
legal limit that year. `transform_window` numbers the squares; `transform_calculate` lays them out in rows of ten.
""")
code("""
# after §2: red
counted = air[air['year'].isin([2010, 2025])].copy()
counted['over'] = counted['no2'] > 40

squares = alt.Chart(counted).transform_window(
    i='row_number()', groupby=['year'], sort=[alt.SortField('no2', order='descending')]
).transform_calculate(
    col='(datum.i - 1) % 10', row='floor((datum.i - 1) / 10)'
).mark_square(size=260).encode(
    x=alt.X('col:O', axis=None),
    y=alt.Y('row:O', axis=None),
    color=alt.when(alt.datum.over).then(alt.value(red)).otherwise(alt.value('#c9d3dd')),
    tooltip=['site:N', 'no2:Q'],
).properties(width=200, height=200)

squares.facet(column=alt.Column('year:O', title=None)).properties(
    title='Red: a monitor over the legal limit. One square per monitor.')
""")
md("""**Try it.** Count 2019 as well: add it to the list in the first line. How many squares are red?

""" + answer("""counted = air[air['year'].isin([2010, 2019, 2025])].copy()
counted['over'] = counted['no2'] > 40
# then run the rest of the cell again"""))

md("""
### 9b · Human scale

"98 µg/m³" means little to most readers. The WHO's guideline for NO₂ (a yearly average of 10 µg/m³, 2021) is a
unit: **one block, one guideline's worth**. Marylebone Road's air held about ten in 2010, and about three now.
""")
code("""
who = 10                                          # the WHO guideline, µg/m³
pair = air[(air['code'] == 'MY1') & air['year'].isin([2010, 2025])]
blocks = pd.DataFrame([{'year': r.year, 'block': k}
                       for r in pair.itertuples() for k in range(round(r.no2 / who))])

alt.Chart(blocks).mark_square(size=600, color='#0c3354').encode(
    x=alt.X('block:O', axis=None),
    y=alt.Y('year:O', title=None, sort='descending'),
).properties(width=420, height=120,
             title='Marylebone Road: one block is the WHO guideline (10 µg/m³)')
""")
md("""**Try it.** Use the legal limit (40) as the unit instead. How many blocks now, and which unit tells a reader more?

""" + answer("""who = 40
# 2010: about 2 blocks; 2025: about 1. The legal limit makes 2025 look fine;
# the WHO unit shows the air is still three times what is thought safe."""))

md("""
### 9c · Make it physical

The same blocks, stacked into towers, to print, cut out and stand on a desk: a thing you can hold or walk around
(Jansen et al., 2015, call this *data physicalisation*). Save the chart as a file and print it.
""")
code("""
tower = alt.Chart(blocks).mark_square(size=900, color=red, stroke='white', strokeWidth=3).encode(
    x=alt.X('year:O', title=None, axis=alt.Axis(labelAngle=0)),
    y=alt.Y('block:O', axis=None, sort='descending'),
).properties(width=200, height=360, title='Stack them: 2010 against 2025')
# tower.save('marylebone_tower.html')             # open it in a browser and print it
tower
""")
md("""**Try it.** Build the tower for Brixton Road (code `'LB4'`) next to Marylebone Road's. Which would you rather
live on?

""" + answer("""pair = air[air['code'].isin(['MY1', 'LB4']) & air['year'].isin([2010, 2025])]
blocks = pd.DataFrame([{'road': r.site, 'year': r.year, 'block': k}
                       for r in pair.itertuples() for k in range(round(r.no2 / who))])
alt.Chart(blocks).mark_square(size=500, color=red, stroke='white', strokeWidth=3).encode(
    x=alt.X('year:O', title=None), y=alt.Y('block:O', axis=None, sort='descending'),
).facet(column='road:N')"""))

md("""
## Next: the lab

Open `09_Activity_IPDV_Brixton_Road_Story.ipynb`. Brixton Road's story is harder: it fell by about 72%, and it is
still London's worst road. You will need §4's move, isolating it from every other road, and two new ones: a shaded
band, and one chart whose colour changes by a condition (`alt.when`).
""")

nb = nbf.v4.new_notebook(cells=cells)
nb.metadata = {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"}, "language_info": {"name": "python"}}
nbf.write(nb, OUT)
print("wrote", OUT.relative_to(ROOT))

if "--run" in sys.argv:
    from nbclient import NotebookClient
    ran = nbf.read(OUT, as_version=4)
    NotebookClient(ran, timeout=180, kernel_name="python3", resources={"metadata": {"path": str(DATA)}}).execute()
    for c in ran.cells:
        for o in c.get("outputs", []):
            assert o.get("output_type") != "error", (c.source[:80], o.get("evalue"))
    nbf.write(ran, RUN)
    print("ran it end to end, no errors:", RUN.relative_to(ROOT))
