"""Week 8's student notebook (LDSCI6253, networks and trees).

The lecture's Build-it code, one stage per cell, with the picture each stage
makes under it and a try-it task after it. The code cells are the code on the
slides, read from steps.json, so the notebook and the lecture never disagree.

    uv run --with nbformat python tools/ipdv-week8/code/notebook.py

writes lessons/08_Notebook_IPDV_Networks_Trees.ipynb, without outputs: students
run it themselves. To check it runs end to end:

    uv run --with nbformat --with nbclient --with ipykernel --with altair --with pandas \
        --with vega_datasets python tools/ipdv-week8/code/notebook.py --run
"""
import json
import pathlib
import sys

import nbformat as nbf

ROOT = pathlib.Path(__file__).resolve().parents[3]
STEPS = {s["id"]: s["code"] for s in json.loads((ROOT / "tools/ipdv-week8/code/steps.json").read_text())["steps"]}
OUT = ROOT / "lessons/08_Notebook_IPDV_Networks_Trees.ipynb"
LIVE = "https://slideforge-rpjj.onrender.com/assets/lesson/ipdv/week8/"

cells = []
md = lambda s: cells.append(nbf.v4.new_markdown_cell(s.strip()))
code = lambda s: cells.append(nbf.v4.new_code_cell(s.strip()))


def answer(s):
    """A model answer, folded away until the student opens it."""
    return "<details><summary><b>Stuck? Open a model answer</b></summary>\n\n```python\n" + s.strip() + "\n```\n</details>"


def step(key):
    """A slide's code, with the read_csv calls pointed at the files loaded in the setup cell."""
    body = STEPS[key]
    for f in ("tube_stations", "tube_links", "london_boroughs"):
        body = body.replace(f"pd.read_csv('{f}.csv')", f"load('{f}')")
    return body


md(r"""
# Week 8 · Who's connected to whom?

**LDSCI6253 Information Presentation & Data Visualisation** · Northeastern University London

This notebook goes with the Week 8 lecture, *Networks and trees*. It builds every picture from the lecture's
**Build it** slides, one small step at a time. Run each cell in order (Shift + Enter), look at what it draws,
then do the **Try it** task under it.

**Three questions pick the picture** (from the lecture):

| Your reader asks… | Draw… |
|---|---|
| Who is linked to whom? How do I get from A to B? | **dots and lines** (node-link) |
| Is *this* pair linked? Which groups stick together? | **a grid** (matrix) |
| What sits inside what, and how big is each part? | **boxes or bars inside each other** (a tree: icicle, treemap) |

**Words you need**

- **node**: one thing (a person, a station, a borough). Drawn as a dot.
- **edge** (or link): two things are connected. Drawn as a line.
- **edge list**: a table with one row per edge: `source`, `target`.
- **degree**: how many edges a node has. *Valjean has many; most characters have few.*
- **tree**: a network with no loops, where every child has one parent (London → Inner London → Camden).
""")

md("""
## 0 · Set up

Altair draws the charts; pandas holds the tables. The data files sit beside this notebook. If they are not
there, `load()` fetches the same files from the course site.
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

print(alt.__version__, pd.__version__)
""")

md("""
## 1 · A network is a list of pairs

Before any drawing: a network fits in an ordinary table. Each row says *these two are connected*. This is
the lecture's eight-node example, A to H (from Dimitris's slides).
""")
code("""
edges = pd.DataFrame({
    'source': ['A', 'A', 'A', 'A', 'B', 'B', 'C', 'D', 'E'],
    'target': ['B', 'C', 'G', 'H', 'C', 'F', 'D', 'E', 'F'],
})
edges
""")
md("""
**Degree** is how many rows a node appears in, on either side. Stack the two columns into one and count.
""")
code("""
degree = pd.concat([edges['source'], edges['target']]).value_counts()
degree
""")
md("""
### Try it

1. Which node has the highest degree? Which nodes have degree 1? What would you call those in a friendship network?
2. Add an edge from **G** to **H** to `edges` and run the two cells again. What changes?
""" + "\n\n" + answer("""
edges = pd.concat([edges, pd.DataFrame({'source': ['G'], 'target': ['H']})], ignore_index=True)
pd.concat([edges['source'], edges['target']]).value_counts()
# A has degree 4, the most. Before the new edge, G and H had degree 1: they hang off A,
# like a friend who knows only one person in the group. Now each has degree 2.
"""))

md("""
## 2 · Build it: the nodes

A network has no x and no y of its own. **We** choose where each dot goes. Here the positions are numbers we
typed, so they mean nothing beyond *this is where we put it*.
""")
code(step("nodes"))
md("""
### Try it

Move **G** to the far right (change its `x` from 0 to 6) and run the cell. Has the *data* changed? Has the
*picture*? This is the lecture's point: in a network picture, position is a choice, not a measurement.
""")

md("""
## 3 · Build it: the edges

A line needs **both** ends. `edges` only says `A → B`; it does not say where A and B are. So we **merge**
(join) the node positions on twice: once for the source end, once for the target end.
""")
code(step("links"))
md("""
Look at the joined table the lines are drawn from: every row now carries `x, y` (the source end) and
`x2, y2` (the target end). `mark_rule` draws a straight line from one to the other.
""")
code("""
lines[['source', 'target', 'x', 'y', 'x2', 'y2']]
""")
md("""
### Try it

Size each dot by its **degree**, so the busiest node is the biggest. Hint: merge `degree` onto `nodes`, then
use `size=` in the encoding instead of a fixed `size=900`.
""" + "\n\n" + answer("""
deg = pd.concat([edges['source'], edges['target']]).value_counts().rename('degree')
sized = nodes.merge(deg, left_on='id', right_index=True)

links = alt.Chart(lines).mark_rule(color='grey', strokeWidth=3).encode(
    x=alt.X('x:Q', axis=None), y=alt.Y('y:Q', axis=None), x2='x2:Q', y2='y2:Q')
dots = alt.Chart(sized).mark_circle(opacity=1).encode(
    x='x:Q', y='y:Q', size=alt.Size('degree:Q', scale=alt.Scale(range=[300, 1500])),
    tooltip=['id:N', 'degree:Q'])
names = alt.Chart(sized).mark_text(color='white', fontWeight='bold').encode(x='x:Q', y='y:Q', text='id:N')
links + dots + names
"""))

md("""
## 4 · Build it: the Tube, with the same three layers

Same recipe, real data: TfL's Zone 1 stations and the track between them. Now position **is** data
(longitude and latitude), and colour comes straight from the `colour` column, TfL's own line colours
(`scale=None` means *use these colours as they are*).
""")
code(step("tube"))
md("""
### Try it

1. Hover a station: the tooltip shows its name. Add `'zone:N'` to the tooltip.
2. Which stations have the most lines through them? Count the degree of each station from `edges`, as in
   section 1, and show the top 5.
""" + "\n\n" + answer("""
deg = pd.concat([edges['source'], edges['target']]).value_counts()
deg.head(5)
# A station's degree counts track to its neighbours. Interchanges such as King's Cross St. Pancras
# and Baker Street come out on top.
"""))

md("""
## 5 · Build it: a matrix in one chart

When there are too many lines (the lecture's *hairball*), draw a **grid** instead. Every character gets a
row and a column; a filled square means those two share a scene; darker means more scenes together.

Data: *Les Misérables*, who appears in a scene with whom (Knuth, 1993), from `vega_datasets`.
""")
code(step("matrix"))
md("""
Sorted by name, the grid looks like noise. The order of the rows is a choice, like where you put the dots.
**One word changes the order**: sort by group, and the groups appear as blocks along the diagonal.
""")
code(step("matrix-grouped"))
md("""
### Try it

Sort the rows by **degree** (busiest character first) instead of by group. Where do the busy characters end up?
""" + "\n\n" + answer("""
busy = pd.concat([pairs['a']]).value_counts()          # pairs holds each edge both ways round
order = busy.index.tolist()                            # busiest first
alt.Chart(pairs).mark_rect().encode(
    x=alt.X('a:N', sort=order, axis=None),
    y=alt.Y('b:N', sort=order, axis=None),
    color=alt.Color('scenes:Q', scale=alt.Scale(scheme='blues')),
    tooltip=['a:N', 'b:N', 'scenes:Q'],
).properties(width=420, height=420)
# The busy characters (Valjean first) gather in the top-left corner.
"""))

md("""
## 6 · Build it: an icicle from four stacked bars

A **tree** is things inside things: London → Inner or Outer London → area → borough. An icicle draws each
level as one bar that adds up to all of London, split into its parts. Wider means more people.
""")
code(step("icicle"))
md("""
### Try it

1. Hover the bars. Which area of London has the most people?
2. Remove the `'3 Area'` level. What does the reader lose?
""" + "\n\n" + answer("""
b.groupby('area')['population'].sum().sort_values(ascending=False).head(3)

rows = pd.concat([
    b.assign(level='1 London', name='London'),
    b.assign(level='2 Inner or Outer', name=b['half']),
    b.assign(level='4 Borough', name=b['borough']),
])
# Without the areas, the reader can no longer see which boroughs belong together.
"""))

md("""
## 7 · Your turn: your own network

Make an edge list of **six to ten people** you know (first names or initials only), one row per pair who
know each other. Then:

1. Draw it as dots and lines (sections 2 and 3). Choose positions that keep friends close.
2. Find the person with the highest degree.
3. Write one sentence: *which of the three questions does your picture answer best, and why?*
""")
code("""
mine = pd.DataFrame({
    'source': [],
    'target': [],
})
mine
""")

md("""
---
*Data:* TfL Open Data (Zone 1 stations and lines); ONS mid-2025 population estimates (London boroughs);
Knuth, *The Stanford GraphBase* (1993), via `vega_datasets` (Les Misérables).
""")

nb = nbf.v4.new_notebook()
nb["cells"] = cells
nb["metadata"] = {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                  "language_info": {"name": "python"}}

if "--run" in sys.argv:
    from nbclient import NotebookClient
    import copy
    ran = copy.deepcopy(nb)
    NotebookClient(ran, timeout=120, kernel_name="python3",
                   resources={"metadata": {"path": str(ROOT / "assets/lesson/ipdv/week8")}}).execute()
    errors = [o for c in ran.cells if c.cell_type == "code" for o in c.get("outputs", []) if o.get("output_type") == "error"]
    print("ran", sum(c.cell_type == "code" for c in ran.cells), "code cells,", len(errors), "errors")
    if len(sys.argv) > 2:
        nbf.write(ran, sys.argv[-1])

nbf.write(nb, OUT)
print("wrote", OUT.relative_to(ROOT))
