"""Week 8's lab activity (LDSCI6253, networks and trees): "The Tube, three ways".

One source, two notebooks:

    lessons/08_Activity_IPDV_Tube_Networks.ipynb             the student copy: tasks, with blanks (___) to fill
    lessons/08_Activity_IPDV_Tube_Networks_Solutions.ipynb   the teacher copy: every blank filled and run, with
                                                             what each cell should show, the expected answers,
                                                             an error guide, pictures of every chart (plan B),
                                                             sample answers and a marking guide

In the code below, ⟦…⟧ marks what the student writes: the student copy shows ___ there, the
teacher copy shows what is inside. So the two copies can never disagree.

    uv run --with nbformat --with nbclient --with ipykernel --with altair --with pandas \
        --with vl-convert-python python tools/ipdv-week8/code/activity.py

It follows the Week 8 tutorial (08_Notebook_IPDV_Networks_Trees.ipynb): every move it asks for is worked
there first, and each part says which section to keep open.
"""
import ast
import base64
import os
import pathlib
import re

import nbformat as nbf
from nbclient import NotebookClient

ROOT = pathlib.Path(__file__).resolve().parents[3]
DATA = ROOT / "assets/lesson/ipdv/week8"
STUDENT = ROOT / "lessons/08_Activity_IPDV_Tube_Networks.ipynb"
TEACHER = ROOT / "lessons/08_Activity_IPDV_Tube_Networks_Solutions.ipynb"
LIVE = "https://slideforge-rpjj.onrender.com/assets/lesson/ipdv/week8/"

# Each entry: (kind, text, who); kind is 'md', 'code' or 'planb'; who is 'both', 'student' or 'teacher'.
parts = []


def md(text, who="both"):
    parts.append(("md", text.strip(), who))


def code(text, who="both"):
    parts.append(("code", text.strip(), who))


def teacher(text):
    """A note only the teacher copy carries."""
    md("> **Teacher:** " + text.strip().replace("\n", "\n> "), "teacher")


def see(text):
    """What the cell above should show, in plain words (teacher copy)."""
    md("> 👀 **You should see:** " + text.strip().replace("\n", "\n> "), "teacher")


def planb(label):
    """A picture of the chart above, for when Python will not run (teacher copy)."""
    parts.append(("planb", label, "teacher"))


def write_here(prompt):
    """An answer box in the student copy."""
    md("✏️ *" + prompt + "*", "student")


def hint(text):
    """A folded hint, in both copies."""
    md("<details><summary>💡 <b>Hint</b></summary>\n\n" + text.strip() + "\n</details>")


# ------------------------------------------------------------------ opening
md(r"""
# Week 8 activity · The Tube, three ways

**LDSCI6253 Information Presentation & Data Visualisation** · Northeastern University London

In the tutorial notebook you built networks and trees step by step. Now use the same moves on new questions
about the London Underground in Zone 1. Keep the tutorial open beside this: each part says which section to
look back at.

| Part | You will… | Tutorial | Time |
|---|---|---|---|
| Warm-up | remember three ideas | – | 2 min |
| **A** | find out what one row of the data really is | §1 | 10 min |
| **B** | count **degree** two ways | §1, §4 | 10 min |
| **C** | draw the Tube as **dots and lines**, sized by how many lines stop there | §3, §4, §6a | 15 min |
| **D** | turn the Tube into a network of **lines**, drawn as a **grid** | §5, §5b | 25 min |
| **F** | choose the right picture for three readers | top table, §6 | 10 min |
| **E** | test whether the Tube is a **tree** (if you have time, or at home) | §6c, §6 | 10 min |

**How to work, in pairs.** One of you types, the other is the checker. Before each Run, the checker says what
they expect to see; after it, compare. Swap at each new letter.

- Where you see `___`, replace it with code, then run the cell (Shift + Enter). Run cells **in order**.
- After many cells a ✅ or ❌ line tells you if you are on track.
- Stuck? Open the 💡 **Hint**, then look at the tutorial section named.
- Write your answers in the ✏️ cells (double-click to type, Shift + Enter to finish).

**If you get an error**
- `NameError: name '…' is not defined`: a cell above was not run (run the cells above, in order), **or** a
  column name is missing its quotes (`source` should be `'source'`).
- `SyntaxError`: a blank is still empty (`___`), or you typed a word that is already there (look either side of
  the blank).
- `KeyError: '…'`: a column name is misspelt. Check it against the table's `.head()`.
- A chart that is empty, or has no labels: a name inside quotes is misspelt (`'lines:Q'`, `'datum.lines'`).
""")

md(r"""
# Teacher copy: solutions, timings and marking

This is the student activity with every blank filled in and run. Under each code cell, 👀 says in plain words
what students should see, and the chart cells have a picture of the expected chart (plan B: if Python will not
run, put the pictures on screen and run C–F as a discussion). The student copy is
`08_Activity_IPDV_Tube_Networks.ipynb`; both come from `tools/ipdv-week8/code/activity.py`, so they always match.

| Part | What students do | Time | The point |
|---|---|---|---|
| Setup + warm-up | Open, run the first cell; recall degree, tree, the three questions | 5 min | Retrieval before new work |
| A | Read the two tables; drop repeated track | 10 min | A row is one *line's* track between two stations, so 130 rows are only 90 pairs |
| B | Degree two ways | 10 min | "Busiest" depends on what you count: King's Cross by edges, Oxford Circus, Green Park and Waterloo by neighbours |
| C | Node-link map sized by lines | 15 min | Position is geography here; size is data (number of lines) |
| D | Lines that share stations, as a grid | 25 min | 11 lines, 48 linked pairs, each with a weight: a grid beats dots and lines |
| F | Choose and justify | 10 min | The reader's question picks the picture |
| E | Is it a tree? (if time, or homework) | 10 min | 43 of 65 stations have more than one parent line; forcing a tree counts 139 stations for 65 |

**Learning outcomes:** read an edge list; compute degree and say what it counts; build node-link and matrix
views in Altair; recognise when data is (and is not) a tree; justify a choice of picture by the reader's task.

**Setup:** students need Python with `altair` and `pandas` (VS Code with the Jupyter extension, JupyterLab, or
Google Colab). The two CSVs should sit beside the notebook; if not, `load()` fetches them from the course site
(it can take 30 seconds to wake up the first time).

**When a student is stuck: what they will see and what to say**

| They see | It means | Say |
|---|---|---|
| `NameError: name 'served' is not defined` | A cell above was skipped | "Run the cells above, in order (or Run All Above)." |
| `NameError: name 'source' is not defined` | A column name without quotes | "Column names go in quotes: `'source'`." |
| `SyntaxError` at `___` | A blank is still empty | "Which blank is left? Open the hint." |
| `KeyError: 'line_x'` (in D1) | The merge in D1a used the wrong column | "What do two lines have in common? Merge on that column." |
| `KeyError` with a column name | A misspelt column | "Compare with `.head()` of the table." |
| A chart with no labels, or empty | A misspelt name inside quotes | "Check the spelling of the name inside the quotes." |
| `SchemaValidationError … invalid value for field` | A table or variable was given where a column name in quotes is needed | "Altair wants the column's name in quotes, like `'lines:Q'`." |
| ❌ on a check line | The cell ran, but the answer is off | "Read the ❌ message; it says what to look at." |
| Charts do not show at all | The notebook's chart renderer is not working | "Restart the kernel and Run All; or use the plan B pictures." |
""", "teacher")

md("""
## 0 · Set up

Run this cell first. It loads the two tables and gives the Tube lines their proper names.
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

def check(ok, good, hint):
    \"\"\"Print ✅ and what you found, or ❌ and what to look at.\"\"\"
    print('✅ ' + good if ok else '❌ Not yet: ' + hint)

stations = load('tube_stations')   # name, lon, lat, zone: one row per station
edges = load('tube_links')         # source, target, line, colour: one row per ...? (Part A finds out)

# Readers should see 'Hammersmith & City', not the data's code 'hammersmith-city'
NAMES = {{'bakerloo': 'Bakerloo', 'central': 'Central', 'circle': 'Circle', 'district': 'District',
         'hammersmith-city': 'Hammersmith & City', 'jubilee': 'Jubilee', 'metropolitan': 'Metropolitan',
         'northern': 'Northern', 'piccadilly': 'Piccadilly', 'victoria': 'Victoria', 'waterloo-city': 'Waterloo & City'}}
edges['line'] = edges['line'].map(NAMES)
edges.head()
""")
see("a table of five rows: two station names, a line name (e.g. Bakerloo) and a colour code such as #B36305.")

md("""
### Warm-up (2 min, from memory, no looking)

1. What is the **degree** of a node?
2. What makes a network a **tree**?
3. Which picture answers *"is this pair linked?"* best: dots and lines, a grid, or boxes inside boxes?
""")
write_here("1: …  2: …  3: …")
teacher("""
**Expected:** (1) how many edges touch it; (2) every child has exactly one parent, no loops; (3) a grid. Take
answers from two or three pairs; don't correct yet: Part B will complicate (1).
""")

# ------------------------------------------------------------------ A
md("""
## A · What is a row? (10 min · tutorial §1)

**A1.** How many stations are there, and how many rows are in the table of edges?
""")
code("""
print(len(stations), 'stations')
print(len(⟦edges⟧), 'rows in edges')
check(len(edges) == 130, 'right: 130 rows', 'count the rows of the table called edges (no quotes: it is a table, not a column)')
""")
see("`65 stations` and `130 rows in edges`.")

md("""
**A2.** If every row were a different piece of track, each **pair of stations** would appear once. Keep only
the first row for each pair (the same `source` and the same `target`) and count again. Tutorial §1 shows how,
with `drop_duplicates`.
""")
code("""
pairs = edges.drop_duplicates(subset=[⟦'source', 'target'⟧])
print(len(pairs), 'different pairs of stations')
check(len(pairs) == 90, 'right: 90 different pairs', 'name BOTH columns, each in quotes, as in tutorial §1')
""")
hint("""
`subset=` takes a **list of column names, each in quotes**, like `subset=['col1', 'col2']`. Using only
`'source'` gives 45 with no error, but that keeps one row per *starting* station, not per pair.
""")
see("`90 different pairs of stations` and a ✅. Common slip: `subset=['source']` gives 45 (the ❌ line catches it).")

md("""
**A3.** 130 rows, but only 90 pairs. Show the rows whose pair appears more than once, sorted so the repeats sit
together. Look at the `line` column.
""")
code("""
edges[edges.duplicated(subset=[⟦'source', 'target'⟧], keep=False)].sort_values(['source', 'target']).head(6)
""")
see("six rows in twos and threes: Aldgate–Liverpool Street on Circle and Metropolitan; Baker Street–Edgware Road on Circle and Hammersmith & City; Baker Street–Great Portland Street on three lines.")
write_here("In one sentence: what does one row of `edges` stand for?")
teacher("""
**Expected:** 65 stations; 130 rows; 90 distinct pairs. A row is **one line's** track between two neighbouring
stations, so where Circle, District, Hammersmith & City and Metropolitan share track, the same pair appears once
per line.
**Sample answers.** *Full marks:* "One row is one line's stretch of track between two neighbouring stations, so a
pair served by three lines has three rows." *Low:* "One row is a connection." (true, but misses *which* connection.)
**Ask the room:** "Connections between what?"
""")

# ------------------------------------------------------------------ B
md("""
## B · Degree, two ways (10 min · tutorial §1, §4)

In the tutorial's §4 Try it, King's Cross St. Pancras came out with degree 10. But only six lines stop there,
and only five stations are one stop away. So what was counted? Count two different things:

- **edges**: every row of `edges` that touches the station (so shared track counts once per line);
- **neighbours**: how many *different* stations are one stop away (count in `pairs`, from A2).

**B1.** Count both, the same way as tutorial §1, and put them side by side.
""")
code("""
by_edges = pd.concat([edges['source'], edges['target']]).value_counts()
by_neighbours = pd.concat([⟦pairs['source'], pairs['target']⟧]).value_counts()

degree = pd.DataFrame({'edges': by_edges, 'neighbours': by_neighbours})
check(degree.loc["King's Cross St. Pancras", 'neighbours'] == 5, "right: King's Cross has 5 neighbours",
      "stack BOTH columns of pairs, the way by_edges stacks both columns of edges")
degree.sort_values('neighbours', ascending=False).head(8)
""")
hint("""
Copy the `by_edges` line and change the table: `pairs['source'], pairs['target']`. Both columns, because a station
can be either end of a pair.
""")
see("✅, then a table of 8 stations: Oxford Circus, Green Park and Waterloo with 6 neighbours at the top; King's Cross with 10 edges but 5 neighbours.")

md("""
**B2.** How many *extra* edges does each station get from shared track? Subtract one column from the other.
""")
code("""
degree['extra'] = ⟦degree['edges'] - degree['neighbours']⟧
degree.sort_values('extra', ascending=False).head(5)
""")
see("King's Cross St. Pancras on top with 5 extra, then stations on the shared Circle / Hammersmith & City / Metropolitan track (Baker Street, Moorgate…).")
write_here("Which station is busiest by edges, and which by neighbours? Why do the answers differ? Use A3.")
teacher("""
**Expected:** by edges, **King's Cross St. Pancras** (10) leads, then Embankment, Baker Street and Moorgate (8).
By neighbours, **Oxford Circus, Green Park and Waterloo** (6) lead; King's Cross has 5. King's Cross is served by
several lines running on the same track to the same neighbours, so edges count it many times over.
**The point:** a network measure answers the question you counted for. Edges ≈ "how many trains pass";
neighbours ≈ "how many places one stop away".
**Sample answers.** *Full marks:* "King's Cross by edges, Oxford Circus/Green Park/Waterloo by neighbours: edges
counts a shared piece of track once for every line on it, neighbours counts each place once." *Low:* "King's
Cross, because it's the biggest station."
""")

# ------------------------------------------------------------------ C
md("""
## C · Dots and lines: where the lines meet (15 min · tutorial §3, §4, §6a)

**C1.** Make a table of which lines serve each station (one row per station and line), then count the lines at
each station. This is like stacking `source` and `target` for degree, but keeping the line beside each name.
""")
code("""
served = pd.concat([
    edges[['source', 'line', 'colour']].rename(columns={'source': 'station'}),
    edges[['target', 'line', 'colour']].rename(columns={'target': 'station'}),
]).drop_duplicates()

# Count the rows (lines) for each station. It is named 'lines': the chart in C2 uses that name.
lines_at = served.groupby('station')['line'].⟦count⟧().rename('lines')
check(lines_at.max() == 6, "right: the busiest station has 6 lines", "count the lines in each station's group")
lines_at.sort_values(ascending=False).head(6)
""")
see("✅, then King's Cross St. Pancras 6, Baker Street 5, then stations with 4 (Embankment, Edgware Road, Liverpool Street…).")

md("""
**C2.** Draw the Tube as in tutorial §4, but **size each station by how many lines stop there**, and name the
stations with **five or more** lines (more names would pile up in the middle). The colours now have a key.
""")
code("""
dots_table = stations.merge(lines_at, left_on='name', right_index=True)   # as in tutorial §3

# The same join as the tutorial: each edge gets both of its ends
track = (edges
    .merge(stations, left_on='source', right_on='name')
    .merge(stations, left_on='target', right_on='name', suffixes=('', '2')))

where = dict(x=alt.X('lon:Q', scale=alt.Scale(zero=False), axis=None),
             y=alt.Y('lat:Q', scale=alt.Scale(zero=False), axis=None))

# TfL's own colour for each line, with a key (scale=None would use the colours but give no key)
key = edges[['line', 'colour']].drop_duplicates()
line_colours = alt.Scale(domain=key['line'].tolist(), range=key['colour'].tolist())

rails = alt.Chart(track).mark_rule(strokeWidth=3).encode(
    **where, x2='lon2:Q', y2='lat2:Q', color=alt.Color('line:N', scale=line_colours, title='Line'))
dots = alt.Chart(dots_table).mark_circle(color='white', stroke='black', opacity=1).encode(
    **where, size=alt.Size(⟦'lines:Q'⟧, title='Lines stopping here', scale=alt.Scale(domain=[1, 6]),
                           legend=alt.Legend(values=[1, 2, 3, 4, 5, 6])),
    tooltip=['name:N', 'lines:Q'])
names = alt.Chart(dots_table).mark_text(dy=-14, fontWeight='bold', fontSize=11).encode(
    **where, text='name:N').transform_filter(⟦'datum.lines >= 5'⟧)

(rails + dots + names).properties(
    width=640, height=440,
    title=alt.Title("King's Cross and Baker Street are where most lines meet", subtitle='Source: TfL Open Data')
).configure_view(stroke=None)
""")
hint("""
- Size, as in tutorial §3's *size each dot by its degree*: the column's **name in quotes** with its type. Here the
  column is called `lines` (from C1), not `degree`: `'degree:Q'` makes every dot vanish.
- The filter, as in tutorial §6a: `'datum.lines >= 5'`. `datum` means *this row*. Not `dots_table['lines'] >= 5`
  (that is pandas, not a chart filter), and not `'lines >= 5'` (it needs `datum.`).
""")
see("the Tube map in TfL colours with a Line key, white station dots sized 1 to 6, and only King's Cross St. Pancras and Baker Street named.")
planb("C2")
write_here("What does position mean in this picture? What does size mean? Name one thing this picture is bad at showing.")
teacher("""
**Expected:** position is **geography** (longitude, latitude), not a computed layout; size is the **number of
lines** (King's Cross 6, Baker Street 5). It is bad at showing how strongly lines share stations (shared track is
drawn on top of itself, so one line hides another), and labels crowd in the centre.
**Sample answers.** *Full marks:* "Position is where the station really is; size is how many lines stop; you
can't see which lines run on the same track, because they're drawn on top of each other." *Low:* "It shows the
Tube."
""")

# ------------------------------------------------------------------ D
md("""
## D · A network of lines, as a grid (25 min · tutorial §5, §5b)

Turn the question round: now the **nodes are the 11 lines**, and two lines are linked when they **share a
station**. The more stations they share, the stronger the link: its **weight**. This is exactly tutorial §5b,
with lines instead of people and stations instead of clubs.

**D1a.** Merge `served` with itself on the column two lines have in common, and look at the first rows.
""")
code("""
both = served.merge(served, on=⟦'station'⟧)
check('line_x' in both.columns and (both['station'] == "King's Cross St. Pancras").sum() == 36,
      'right: every pair of lines at each station', 'merge on the column two LINES share (tutorial §5b merged on club)')
both.head(8)
""")
hint("""
In tutorial §5b, people were linked when they shared a **club**, so the merge was `on='club'`. Here lines are
linked when they share a … ? Merging on `'line'` instead pairs each station with every other station on the
same line: a different network.
""")
see("✅, then rows like `Aldgate | Circle | … | Circle` and `Aldgate | Circle | … | Metropolitan`: one station with two lines that stop there, `line_x` and `line_y`.")
write_here("What does one row of `both` mean now?")

md("""
**D1b.** Drop each line paired with itself, then count the stations each pair of lines shares.
""")
code("""
different = both[both['line_x'] ⟦!=⟧ both['line_y']]
shared = different.groupby(['line_x', 'line_y']).size().reset_index(name='stations')
check(shared['stations'].max() == 18, 'right: the most shared is 18 stations', "keep the rows where the two lines are NOT the same")
shared.sort_values('stations', ascending=False).head(6)
""")
see("✅, then Circle–District 18 (twice, once each way round), then Circle–Hammersmith & City 10, Circle–Metropolitan 9.")

md("""
**D2.** Draw it as a **grid**, as in tutorial §5: one row and one column per line, the square's shade for how
many stations they share, and the number written in it. Rows go from the line with the most stations to the
fewest.
""")
code("""
order = served['line'].value_counts().index.tolist()   # most stations first, as in tutorial §5

cells = alt.Chart(shared).encode(
    x=alt.X('line_x:N', sort=order, title=None, axis=alt.Axis(labelAngle=-45)),
    y=alt.Y('line_y:N', sort=order, title=None))
squares = cells.mark_rect().encode(
    color=alt.Color(⟦'stations:Q'⟧, scale=alt.Scale(scheme='blues'), title='Stations shared'),
    tooltip=['line_x:N', 'line_y:N', 'stations:Q'])
numbers = cells.mark_text(fontSize=11).encode(
    text='stations:Q',
    color=alt.condition('datum.stations > 8', alt.value('white'), alt.value('black')))   # light text on dark squares

(squares + numbers).properties(
    width=400, height=400,
    title=alt.Title('Circle and District share the most stations', subtitle='Source: TfL Open Data')
).configure_view(stroke=None)
""")
hint("""
As `'scenes:Q'` in tutorial §5: the weight column's name, with `:Q` because it is a number. `'stations:N'` also
draws, but as separate colours with no order.
""")
see("an 11 × 11 grid of blue squares with numbers, darkest at Circle–District (18); the diagonal is empty; each number appears twice, mirrored.")
planb("D2")
md("""
To compare, here is the same network as **dots and lines**: the 11 lines on a circle, joined when they share a
station, thicker for more. (Just run it.)
""")
code("""
import math
ring = pd.DataFrame({'line': order})
ring['x'] = [math.cos(2 * math.pi * i / len(order)) for i in range(len(order))]
ring['y'] = [math.sin(2 * math.pi * i / len(order)) for i in range(len(order))]
spokes = (shared[shared['line_x'] < shared['line_y']]   # each pair once
    .merge(ring, left_on='line_x', right_on='line')
    .merge(ring, left_on='line_y', right_on='line', suffixes=('', '2')))
at = dict(x=alt.X('x:Q', axis=None, scale=alt.Scale(domain=[-1.4, 1.4])),
          y=alt.Y('y:Q', axis=None, scale=alt.Scale(domain=[-1.25, 1.25])))
alt.layer(
    alt.Chart(spokes).mark_rule(color='steelblue', opacity=0.6).encode(
        **at, x2='x2:Q', y2='y2:Q', strokeWidth=alt.StrokeWidth('stations:Q', title='Stations shared', scale=alt.Scale(range=[1, 10]))),
    alt.Chart(ring).mark_circle(size=200, color='black', opacity=1).encode(**at),
    alt.Chart(ring).mark_text(dy=-16, fontWeight='bold').encode(**at, text='line:N'),
).properties(width=460, height=420, title='The same network as dots and lines').configure_view(stroke=None)
""")
see("11 line names round a circle, joined by 48 crossing blue lines of different widths.")
planb("D2b")
write_here("Which two lines share the most stations? Which picture lets you read the Circle line's links more easily, and why?")
teacher("""
**Expected:** **Circle and District** share 18 stations; then Circle–Hammersmith & City (10), Circle–Metropolitan
(9), Hammersmith & City–Metropolitan (8). There are 48 linked pairs among 11 lines, each with a **weight**: as dots
and lines that is 48 crossing lines whose widths must be compared; in the grid each pair is one square with its
number, and the Circle line's links are one row.
**Sample answers.** *Full marks:* "Circle and District, 18. The grid: I read across the Circle row and every
number is there, while in the circle picture the lines cross and widths are hard to compare." *Low:* "The grid
looks neater."
**Watch for:** D1a merged `on='line'` (pairs stations, not lines; D1b then fails with `KeyError: 'line_x'`).
""")

# ------------------------------------------------------------------ F (before E: it is the outcome)
md("""
## F · Choose and justify (10 min · the tutorial's three-questions table at the top, and §6)

For each reader, choose **dots and lines**, **a grid**, or **boxes / bars inside each other**. Give one reason,
and say why **not** one of the other two. Use the pictures you made (the council's question is about tutorial §6).

1. A visitor at Paddington asks: *"Can I get to Bank, and where do I change?"*
2. TfL planners ask: *"Which line shares the most stations with the Circle line?"*
3. A council asks: *"Which areas of London have the most people, and which boroughs make them up?"*
""")
write_here("1: … because … , not … because …  2: …  3: …")
md("""
**F2 (extension).** Improve one of your pictures for the visitor or the planner and explain your change in one
sentence. A starter, which draws the Central line thick on top of the map from C2, is below.
""", "student")
code("""
central = track[track['line'] == 'Central']
thick = alt.Chart(central).mark_rule(strokeWidth=8, color='#E32017').encode(**where, x2='lon2:Q', y2='lat2:Q')
(rails + thick + dots + names).properties(width=640, height=440, title='Change your title to say what to see')
""", "student")
teacher("""
**Expected:** (1) **dots and lines**: a route is a path to follow by eye, which a grid is bad at (Ghoniem et al.,
2004) and boxes cannot show; a schematic Tube map is also node-link, so accept it. (2) **a grid**: read the Circle
row; District shares 18. Accept dots and lines if the student argues from line widths, but ask them to read the
number. (3) **boxes or bars inside each other**: boroughs sit inside one area each, so it is a tree and size is the
question; the indented list with bars (tutorial §6b) is equally good for ranking areas.
**Sample answer (full marks):** "1: dots and lines, because she needs to follow a route; not a grid, which
shows pairs but not paths." **Low:** "1: dots and lines." (choice, no reason.)
""")

# ------------------------------------------------------------------ E
md("""
## E · Is the Tube a tree? (10 min · tutorial §6c and *When does a tree lie?*) · if you have time, or at home

A **tree** needs every child to have exactly **one** parent. Suppose we try Tube → line → station.

**E1.** How many stations have more than one line? (Use `lines_at` from C1. Tutorial §1: adding up `True`s counts them.)
""")
code("""
many = (lines_at ⟦> 1⟧).sum()
print(many, 'of', len(lines_at), 'stations are on more than one line')
check(many == 43, 'right: 43 stations', "'more than one' is > 1")
lines_at.value_counts().sort_index().rename('stations')   # how many stations have 1, 2, 3 ... lines
""")
see("`43 of 65 stations are on more than one line`, then a small table: 22 stations with 1 line, 23 with 2, 12 with 3, 6 with 4, 1 with 5, 1 with 6.")

md("""
**E2.** Pretend it is a tree anyway, and draw an icicle as in tutorial §6c: one bar per level, **counting**
stations (tutorial §5b showed how to count rows in a chart). The red line marks how many stations there really are.
""")
code("""
rows = pd.concat([
    served.assign(level='1 Tube', name='Tube', colour='#888888'),
    served.assign(level='2 Line', name=served['line']),
    served.assign(level='3 Station', name=served['station']),
])
rows['path'] = rows['line'] + rows['station']   # keep stations under their line, as in tutorial §6c

bars = alt.Chart(rows).mark_bar(stroke='white').encode(
    y=alt.Y('level:O', title=None),
    x=alt.X(⟦'count():Q'⟧, title='Stations counted'),
    detail='name:N',
    order=alt.Order('min(path):N'),
    color=alt.Color('colour:N', scale=None),
    tooltip=['name:N'])
real = alt.Chart(pd.DataFrame({'n': [len(stations)]}))
truth = real.mark_rule(color='red', strokeWidth=3).encode(x='n:Q') + real.mark_text(
    color='red', align='left', dx=4, dy=-62, fontWeight='bold').encode(x='n:Q', text=alt.value('65 real stations'))

(bars + truth).properties(
    width=640, height=180,
    title=alt.Title('The Tube forced into a tree counts 139 stations', subtitle='Source: TfL Open Data'))
""")
hint("""
`'count():Q'` counts rows, as in tutorial §5b. `'sum(...)'` adds up a column, and `'station:Q'` treats names as
numbers: both draw an empty chart with no error.
""")
see("three bars, each 139 long: a grey Tube bar, the Line bar in TfL colours, the Station bar in thin slices; a red line at 65 marked '65 real stations'.")
planb("E2")
write_here("Is the Tube a tree? What goes wrong in the icicle when we pretend it is?")
teacher("""
**Expected:** **43 of 65** stations are on more than one line, so a station has several "parents": it is a
network, not a tree. The icicle draws **139** station boxes for **65** stations (King's Cross appears six times),
so it overstates the network by more than double.
**Sample answers.** *Full marks:* "No: 43 stations have more than one parent line, so the icicle draws them
several times and counts 139 instead of 65." *Low:* "No, because the bars are wrong."
""")

md("""
**Marking guide** (if the activity is assessed; 12 marks)

| | 3 (secure) | 2 | 1 | 0 |
|---|---|---|---|---|
| **Reading the data** (A, B) | Explains a row as one line's track and why degree differs by what is counted | Correct numbers, partial reason | Numbers only | Missing |
| **Building** (C, D) | Both charts run, correctly encoded, titled with a source | Both run, minor encoding slip | One chart | None |
| **Choosing** (F) | Three choices, each justified by the reader's task and a "why not" | Three choices, thin reasons | One or two | Missing |
| **Trees** (E) | Says why it is not a tree and what the icicle overstates | One of the two | Number only | Missing |

**If students finish early:** in D2, keep only one half of the grid (`shared[shared['line_x'] < shared['line_y']]`)
and discuss whether it reads better; or in C2, name Paddington and Bank too (`|| datum.name == 'Bank'`).
""", "teacher")


def build(who):
    nb = nbf.v4.new_notebook()
    for kind, text, owner in parts:
        if owner not in ("both", who):
            continue
        if kind == "planb":
            nb.cells.append(nbf.v4.new_markdown_cell(f"> 🖼️ **Plan B: the chart, as a picture**\n>\n> ![{text}](attachment:{text}.png)"))
            nb.cells[-1]["metadata"]["planb"] = text
            continue
        text = re.sub(r"⟦(.*?)⟧", (lambda m: "___") if who == "student" else (lambda m: m.group(1)), text, flags=re.S)
        nb.cells.append(nbf.v4.new_markdown_cell(text) if kind == "md" else nbf.v4.new_code_cell(text))
    nb.metadata = {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                   "language_info": {"name": "python"}}
    return nb


def pictures(nb):
    """Run the teacher's code cells here and keep a PNG of each chart a plan-B cell follows."""
    import altair as alt
    import vl_convert as vlc
    here = os.getcwd()
    os.chdir(DATA)
    scope, last_chart, shots = {}, None, {}
    try:
        for cell in nb.cells:
            if cell.cell_type == "code":
                tree = ast.parse(cell.source)
                tail = tree.body[-1]
                lead = tree.body[:-1] if isinstance(tail, ast.Expr) else tree.body
                exec(compile(ast.Module(lead, []), "cell", "exec"), scope)
                value = eval(compile(ast.Expression(tail.value), "cell", "eval"), scope) if isinstance(tail, ast.Expr) else None
                last_chart = value if isinstance(value, alt.TopLevelMixin) else None
            elif cell.metadata.get("planb"):
                shots[cell.metadata["planb"]] = vlc.vegalite_to_png(last_chart.to_json(), scale=1.5)
    finally:
        os.chdir(here)
    for cell in nb.cells:
        label = cell.metadata.pop("planb", None)
        if label:
            cell["attachments"] = {f"{label}.png": {"image/png": base64.b64encode(shots[label]).decode()}}
    return shots


if __name__ == "__main__":
    student, solutions = build("student"), build("teacher")
    shots = pictures(solutions)
    NotebookClient(solutions, timeout=180, kernel_name="python3",
                   resources={"metadata": {"path": str(DATA)}}).execute()
    nbf.write(student, STUDENT)
    nbf.write(solutions, TEACHER)
    import sys
    if len(sys.argv) > 1:   # a folder to drop the plan-B pictures in, for looking at them
        for label, png in shots.items():
            pathlib.Path(sys.argv[1], f"planb-{label}.png").write_bytes(png)
    print("wrote", STUDENT.relative_to(ROOT), "and", TEACHER.relative_to(ROOT), "(run, no errors)")
