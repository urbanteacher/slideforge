"""Week 8's lab activity (LDSCI6253, networks and trees): "The Tube, three ways".

One source, two notebooks:

    lessons/08_Activity_IPDV_Tube_Networks.ipynb             the student copy: tasks, with blanks (___) to fill
    lessons/08_Activity_IPDV_Tube_Networks_Solutions.ipynb   the teacher copy: every blank filled, run, with the
                                                             expected answers, timings and a marking guide

In the code below, ⟦…⟧ marks what the student writes: the student copy shows ___ there, the
teacher copy shows what is inside. So the two copies can never disagree.

    uv run --with nbformat --with nbclient --with ipykernel --with altair --with pandas \
        python tools/ipdv-week8/code/activity.py

It follows the Week 8 notebook (08_Notebook_IPDV_Networks_Trees.ipynb): the same moves, on data the
students have not analysed yet.
"""
import pathlib
import re

import nbformat as nbf
from nbclient import NotebookClient

ROOT = pathlib.Path(__file__).resolve().parents[3]
DATA = ROOT / "assets/lesson/ipdv/week8"
STUDENT = ROOT / "lessons/08_Activity_IPDV_Tube_Networks.ipynb"
TEACHER = ROOT / "lessons/08_Activity_IPDV_Tube_Networks_Solutions.ipynb"
LIVE = "https://slideforge-rpjj.onrender.com/assets/lesson/ipdv/week8/"

# Each entry: ('md', text, who) or ('code', text, who); who is 'both', 'student' or 'teacher'.
parts = []


def md(text, who="both"):
    parts.append(("md", text.strip(), who))


def code(text, who="both"):
    parts.append(("code", text.strip(), who))


def teacher(text):
    """A note only the teacher copy carries."""
    md("> **Teacher:** " + text.strip().replace("\n", "\n> "), "teacher")


def write_here(prompt="Write your answer here."):
    """An answer box in the student copy."""
    md("✏️ *" + prompt + "*", "student")


md(r"""
# Week 8 activity · The Tube, three ways

**LDSCI6253 Information Presentation & Data Visualisation** · Northeastern University London

In the tutorial notebook you built networks and trees step by step. Now use the same moves on new questions
about the London Underground in Zone 1. You will:

- **A.** read the data, and find out what a row really is;
- **B.** count **degree** two ways, and see that "the busiest station" depends on what you count;
- **C.** draw the Tube as **dots and lines**, sized by how many lines stop there;
- **D.** turn the Tube into a network of **lines**, and draw it as a **grid** (matrix);
- **E.** test whether the Tube is a **tree**, and see what goes wrong when you pretend it is;
- **F.** choose the right picture for three readers, and justify it.

**How to work.** Run each cell in order (Shift + Enter). Where you see `___`, replace it with code, then run
the cell. Write your answers in the ✏️ cells. Work in pairs: one types, one checks, and swap at each part.

**Time:** about 75 minutes. Parts A–D are the core; E and F if you have time (or at home).
""")

md(r"""
# Teacher copy: solutions, timings and marking

This is the student activity with every blank filled in and run, the answers students should reach, and the
mistakes to look out for. The student copy is `08_Activity_IPDV_Tube_Networks.ipynb`; both come from
`tools/ipdv-week8/code/activity.py`, so they always match.

| Part | What students do | Time | The point |
|---|---|---|---|
| A | Read the two tables; drop repeated track | 10 min | A row is one *line's* track between two stations, so 130 rows are only 90 pairs |
| B | Degree two ways | 10 min | "Busiest" depends on what you count: King's Cross by edges, Oxford Circus, Green Park and Waterloo by neighbours |
| C | Node-link map sized by lines | 15 min | Position is geography here; size is data (number of lines) |
| D | Lines that share stations, as a matrix | 20 min | 11 lines, 48 linked pairs: dense and weighted, so a grid beats dots and lines |
| E | Is it a tree? | 10 min | 43 of 65 stations have more than one parent line: not a tree; forcing it double-counts (139 vs 65) |
| F | Choose and justify | 10 min | The reader's question picks the picture |

**Learning outcomes:** read an edge list; compute degree; build node-link and matrix views in Altair;
recognise when data is (and is not) a tree; justify a choice of idiom by the reader's task.
""", "teacher")

md("""
## 0 · Set up

The two data files (`tube_stations.csv`, `tube_links.csv`) should sit beside this notebook. If they are not
there, `load()` fetches them from the course site.
""")
code(f"""
import altair as alt
import pandas as pd
from pathlib import Path

LIVE = "{LIVE}"

def load(name):
    \"\"\"Read name.csv from beside this notebook, or from the course site if it is not here.\"\"\"
    here = Path(name + ".csv")
    return pd.read_csv(here if here.exists() else LIVE + name + ".csv")

stations = load('tube_stations')   # name, lon, lat, zone: one row per station
links = load('tube_links')         # source, target, line, colour: one row per ...?
""")

# ------------------------------------------------------------------ A
md("""
## A · What is a row? (10 min)

**A1.** How many stations are there, and how many rows are in `links`? Look at the first rows of `links`.
""")
code("""
print(len(stations), 'stations')
print(len(⟦links⟧), 'rows in links')
links.head(8)
""")
md("""
**A2.** If every row were a different piece of track, there would be one row per pair of neighbouring
stations. Keep only the first row for each `source`–`target` pair and count again.
""")
code("""
pairs = links.drop_duplicates(subset=[⟦'source', 'target'⟧])
len(pairs)
""")
md("""
**A3.** The two numbers differ. Find a pair of stations that appears more than once, and say why.
*Hint:* `links[links.duplicated(subset=['source', 'target'], keep=False)].head(6)`
""")
code("""
⟦links[links.duplicated(subset=['source', 'target'], keep=False)].sort_values(['source', 'target']).head(6)⟧
""")
write_here("In one sentence: what does one row of `links` stand for?")
teacher("""
**Expected:** 65 stations; 130 rows; 90 distinct pairs. A row is **one line's** track between two
neighbouring stations, so where the Circle, District, Hammersmith & City and Metropolitan lines share track
(Baker Street to Great Portland Street, Embankment to Westminster…) the same pair appears once per line.
**Common mistake:** treating `len(links)` as the number of connections. Ask "connections between what?"
""")

# ------------------------------------------------------------------ B
md("""
## B · Degree, two ways (10 min)

In the tutorial, **degree** was how many edges a node has. On the Tube we can count two different things:

- **edges**: every row in `links` that touches the station (so shared track counts once per line);
- **neighbours**: how many *different* stations you can reach in one stop (count in `pairs`).

**B1.** Count both, put them side by side, and sort by neighbours.
""")
code("""
by_edges = pd.concat([links['source'], links['target']]).value_counts()
by_neighbours = pd.concat([⟦pairs['source'], pairs['target']⟧]).value_counts()

degree = pd.DataFrame({'edges': by_edges, 'neighbours': by_neighbours})
degree.sort_values(⟦'neighbours'⟧, ascending=False).head(8)
""")
md("""
**B2.** Now sort by `edges` instead. Is the "busiest" station the same?
""")
code("""
degree.sort_values(⟦'edges'⟧, ascending=False).head(8)
""")
write_here("Which station is busiest by edges, and which by neighbours? Why do the answers differ?")
teacher("""
**Expected:** by edges, **King's Cross St. Pancras** (10) leads, then Embankment, Baker Street and Moorgate (8).
By neighbours, **Oxford Circus, Green Park and Waterloo** (6) lead; King's Cross has 5. King's Cross is served by
six lines but several run on the same track to the same neighbours, so edges count it many times over.
**The point:** a network measure answers the question you counted for. Edges ≈ "how many trains pass";
neighbours ≈ "how many places one stop away".
""")

# ------------------------------------------------------------------ C
md("""
## C · Dots and lines: where the lines meet (15 min)

**C1.** Make a table of which lines serve each station (one row per station and line), then count the lines
at each station.
""")
code("""
served = pd.concat([
    links[['source', 'line', 'colour']].rename(columns={'source': 'station'}),
    links[['target', 'line', 'colour']].rename(columns={'target': 'station'}),
]).drop_duplicates()

lines_at = served.groupby('station')['line'].count().rename(⟦'lines'⟧)
lines_at.sort_values(ascending=False).head(6)
""")
md("""
**C2.** Draw the Tube as in the tutorial (section 4), but **size each station by how many lines stop there**,
and name the stations with five or more lines (more names would pile up in the centre). Give the chart a title and a source.
""")
code("""
dots_table = stations.merge(lines_at, left_on='name', right_index=True)

# The same join as the tutorial: each edge gets both of its ends
track = (links
    .merge(stations, left_on='source', right_on='name')
    .merge(stations, left_on='target', right_on='name', suffixes=('', '2')))

where = dict(x=alt.X('lon:Q', scale=alt.Scale(zero=False), axis=None),
             y=alt.Y('lat:Q', scale=alt.Scale(zero=False), axis=None))

rails = alt.Chart(track).mark_rule(strokeWidth=3).encode(
    **where, x2='lon2:Q', y2='lat2:Q', color=alt.Color('colour:N', scale=None))
dots = alt.Chart(dots_table).mark_circle(color='white', stroke='black', opacity=1).encode(
    **where, size=alt.Size(⟦'lines:Q'⟧, title='Lines stopping here', scale=alt.Scale(domain=[1, 6]),
                  legend=alt.Legend(values=[1, 2, 3, 4, 5, 6])),
    tooltip=['name:N', 'lines:Q'])
names = alt.Chart(dots_table).mark_text(dy=-14, fontWeight='bold', fontSize=11).encode(
    **where, text='name:N').transform_filter(⟦'datum.lines >= 5'⟧)

(rails + dots + names).properties(
    width=680, height=440,
    title=alt.Title('Zone 1: where the Tube lines meet', subtitle='Source: TfL Open Data')
).configure_view(stroke=None)
""")
write_here("What does position mean in this picture? What does size mean? Name one thing this picture is bad at showing.")
teacher("""
**Expected:** position is **geography** (longitude, latitude), not a computed layout; size is the **number of
lines** (King's Cross 6, Baker Street 5, then six stations with 4). It is bad at showing how strongly lines
share stations (all the shared track is drawn on top of itself) and the labels crowd in the centre.
**Watch for:** `size=` on a nominal field (`:N`); forgetting `scale=None`, which recolours TfL's lines.
""")

# ------------------------------------------------------------------ D
md("""
## D · A network of lines, as a grid (20 min)

Turn the question round: the **nodes are now the 11 lines**, and two lines are linked when they share a
station. The more stations they share, the stronger the link.

**D1.** Pair every line at a station with every other line at that station, then count the stations each pair
of lines shares.
""")
code("""
both = served.merge(served, on=⟦'station'⟧)      # every pair of lines that meet at a station
both = both[both['line_x'] != both['line_y']]      # a line does not link to itself

shared = both.groupby(['line_x', 'line_y']).size().reset_index(name='stations')
shared.sort_values('stations', ascending=False).head(6)
""")
md("""
**D2.** Draw it as a **matrix**: one row and one column per line, the colour of a square for how many stations
they share, and the number written in it. Order the rows from the line with the most stations to the fewest.
""")
code("""
order = served['line'].value_counts().index.tolist()   # most stations first

cells = alt.Chart(shared).encode(
    x=alt.X('line_x:N', sort=order, title=None, axis=alt.Axis(labelAngle=-45)),
    y=alt.Y('line_y:N', sort=order, title=None))
squares = cells.mark_rect().encode(
    color=alt.Color(⟦'stations:Q'⟧, scale=alt.Scale(scheme='blues'), title='Stations shared'),
    tooltip=['line_x:N', 'line_y:N', 'stations:Q'])
numbers = cells.mark_text(fontSize=11).encode(
    text='stations:Q',
    color=alt.condition('datum.stations > 8', alt.value('white'), alt.value('black')))   # light on dark

(squares + numbers).properties(
    width=400, height=400,
    title=alt.Title('Which Tube lines share stations in Zone 1?', subtitle='Source: TfL Open Data')
).configure_view(stroke=None)
""")
write_here("Which two lines share the most stations? Why is a grid a better picture than dots and lines for this network?")
teacher("""
**Expected:** **Circle and District** share 18 stations; then Circle–Hammersmith & City (10), Circle–Metropolitan
(9) and Hammersmith & City–Metropolitan (8). There are 48 linked pairs among 11 lines: almost every line meets
almost every other, and every link has a **weight**. As dots and lines that is a tangle of 48 crossing lines with
widths to compare; as a grid each pair is one square with its number, and nothing crosses.
**Watch for:** forgetting to drop `line_x == line_y` (the diagonal then shows each line's own station count;
fine if they notice and can explain it). The grid is symmetric: each pair appears twice, as in the lecture.
""")

# ------------------------------------------------------------------ E
md("""
## E · Is the Tube a tree? (10 min)

A **tree** needs every child to have exactly **one** parent. Suppose we try Tube → line → station.

**E1.** How many stations have more than one line? (Use `lines_at` from C1.)
""")
code("""
print((lines_at ⟦> 1⟧).sum(), 'of', len(lines_at), 'stations are on more than one line')
lines_at.value_counts().sort_index().rename('stations')   # how many stations have 1, 2, 3 ... lines
""")
md("""
**E2.** Pretend it is a tree anyway, and draw an icicle as in the tutorial (section 6c): one bar per level,
counting stations. Compare the length of the Station bar with the number of stations.
""")
code("""
rows = pd.concat([
    served.assign(level='1 Tube', name='Tube', colour='#888888'),
    served.assign(level='2 Line', name=served['line']),
    served.assign(level='3 Station', name=served['station']),
])

alt.Chart(rows).mark_bar(stroke='white').encode(
    y=alt.Y('level:O', title=None),
    x=alt.X(⟦'count():Q'⟧, title='Stations counted'),
    detail='name:N',
    color=alt.Color('colour:N', scale=None),
    tooltip=['name:N', 'count():Q'],
).properties(width=640, height=180, title='The Tube forced into a tree')
""")
code("""
print(len(rows[rows['level'] == '3 Station']), 'station boxes, but only', len(stations), 'stations')
""")
write_here("Is the Tube a tree? What goes wrong in the icicle when we pretend it is?")
teacher("""
**Expected:** **43 of 65** stations are on more than one line, so a station has several "parents": it is a
network, not a tree. The icicle draws **139** station boxes for **65** stations: King's Cross appears six
times, so the bars overstate the network by more than double. **The point:** an icicle or treemap is only
honest when each thing sits in exactly one place. Boroughs inside areas (the tutorial) is a tree; stations on
lines is not.
""")

# ------------------------------------------------------------------ F
md("""
## F · Choose and justify (10 min)

For each reader, choose **dots and lines**, **a grid**, or **boxes / bars inside each other**, and give one
reason. Use the pictures you made.

1. A tourist asks: *"How do I get from Paddington to Bank?"*
2. TfL planners ask: *"If the Circle line closes, which other lines lose the most interchanges?"*
3. A council asks: *"Which areas of London have the most people, and which boroughs make them up?"*
""")
write_here("1: … because …  2: … because …  3: … because …")
md("""
**F2 (extension).** Pick one of your pictures and improve it for the tourist or the planner: a clearer title
that says what to see, a key, fewer labels, or a highlighted route. Explain your change in one sentence.
""", "student")
code("""
# Your improved picture here
""", "student")
teacher("""
**Expected:** (1) **dots and lines**: a route is a path to follow by eye, and that is the one task node-link
does best (Ghoniem et al., 2004). (2) **a grid**: the planner reads one row (Circle) across all lines, with the
number of shared stations in each square; District loses most (18). (3) **boxes inside each other** (treemap or
icicle): the boroughs really do sit inside one area each, so it is a tree, and size is the question.
""")
md("""
**Marking guide** (if the activity is assessed; 12 marks)

| | 3 (secure) | 2 | 1 | 0 |
|---|---|---|---|---|
| **Reading the data** (A, B) | Explains a row as one line's track and why degree differs by what is counted | Correct numbers, partial reason | Numbers only | Missing |
| **Building** (C, D) | Both charts run, correctly encoded, titled with a source | Both run, minor encoding slip | One chart | None |
| **Trees** (E) | Says why it is not a tree and what the icicle overstates | One of the two | Number only | Missing |
| **Choosing** (F) | Three choices, each justified by the reader's task | Three choices, thin reasons | One or two | Missing |

**If students finish early:** in D, set the diagonal to each line's own station count and discuss whether it
helps; or in C, draw only the six biggest interchanges and the lines between them.
""", "teacher")


def build(who):
    nb = nbf.v4.new_notebook()
    for kind, text, owner in parts:
        if owner not in ("both", who):
            continue
        text = re.sub(r"⟦(.*?)⟧", (lambda m: "___") if who == "student" else (lambda m: m.group(1)), text, flags=re.S)
        nb.cells.append(nbf.v4.new_markdown_cell(text) if kind == "md" else nbf.v4.new_code_cell(text))
    nb.metadata = {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                   "language_info": {"name": "python"}}
    return nb


student, solutions = build("student"), build("teacher")
NotebookClient(solutions, timeout=120, kernel_name="python3",
               resources={"metadata": {"path": str(DATA)}}).execute()
nbf.write(student, STUDENT)
nbf.write(solutions, TEACHER)
print("wrote", STUDENT.relative_to(ROOT), "and", TEACHER.relative_to(ROOT), "(run, no errors)")
