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
import re
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
    # Every finished chart says what to see and where the data came from (the slides carry these as captions).
    if key in TITLES:
        title, source = TITLES[key]
        body = re.sub(r"\.properties\(width=(\d+), height=(\d+)\)",
                      lambda m: f".properties(width={m.group(1)}, height={m.group(2)},\n    title=alt.Title({title!r}, subtitle={source!r}))", body)
    return body


TITLES = {
    "tube": ("Zone 1 of the Tube, drawn where the stations really are", "Source: TfL Open Data"),
    "matrix": ("Sorted by name: no pattern", "Source: Knuth (1993), Les Misérables"),
    "matrix-grouped": ("Sorted by group: each group is a block on the diagonal", "Source: Knuth (1993), Les Misérables"),
    "icicle": ("Each level adds up to all of London", "Source: ONS mid-2025 population estimates"),
}


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
**Is any pair listed twice?** Real edge lists often repeat a pair. `duplicated` marks each row `True` if an
earlier row has the same values in the columns you name, and `drop_duplicates` keeps only the first of each.
The columns go in a **list of names, each in quotes**: `subset=['source', 'target']`.

Adding up `True`/`False` counts the `True`s (Python treats `True` as 1 and `False` as 0).
""")
code("""
twice = pd.concat([edges, edges.head(1)], ignore_index=True)   # A-B typed in a second time, by mistake
print(len(twice), 'rows')
print(twice.duplicated(subset=['source', 'target']).sum(), 'row repeats an earlier pair')

once = twice.drop_duplicates(subset=['source', 'target'])
print(len(once), 'rows once the repeat is dropped')
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
### Build it: size each dot by its degree

Now let the data choose the size: the busiest node gets the biggest dot. Three new pieces:

- `.rename('degree')` gives the counted column a **name**, so the chart can ask for it by name;
- `right_index=True` joins on the **row names** of `deg` (the letters A to H), because that is where the
  letters are after `value_counts`;
- `alt.Size('degree:Q')` maps the number to the dot's size, as `alt.X` maps a number to a position.
""")
code("""
deg = pd.concat([edges['source'], edges['target']]).value_counts().rename('degree')
sized = nodes.merge(deg, left_on='id', right_index=True)
print(sized)

links = alt.Chart(lines).mark_rule(color='grey', strokeWidth=3).encode(
    x=alt.X('x:Q', axis=None), y=alt.Y('y:Q', axis=None), x2='x2:Q', y2='y2:Q')
dots = alt.Chart(sized).mark_circle(opacity=1).encode(
    x='x:Q', y='y:Q', size=alt.Size('degree:Q', scale=alt.Scale(range=[300, 1500])),
    tooltip=['id:N', 'degree:Q'])
names = alt.Chart(sized).mark_text(color='white', fontWeight='bold').encode(x='x:Q', y='y:Q', text='id:N')
(links + dots + names).properties(title=alt.Title('A has the most connections', subtitle='Size = degree'))
""")
md("""
### Try it

Change the size range from `[300, 1500]` to `[100, 3000]`. Does the *data* change? Which range makes the
difference between A and H easiest to see without hiding the letters?
""")

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
2. Count the degree of each station from `edges`, as in section 1, and show the top 5. Look at King's Cross
   St. Pancras: six lines stop there, and five stations are one stop away. Does its degree match either?
""" + "\n\n" + answer("""
deg = pd.concat([edges['source'], edges['target']]).value_counts()
deg.head(5)
# King's Cross gets 10: neither its 6 lines nor its 5 neighbours. Look at what a row of edges is:
# one LINE's track between two stations. Where several lines share track, the same pair is counted once
# per line. Degree counts rows, so it depends on what a row is. Hold that thought: the activity asks why.
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
A third order: **busiest first**. `value_counts()` sorts from most to fewest, and `.index.tolist()` takes
the names in that order, ready for `sort=`. (`pairs` holds each pair both ways round, so counting column `a`
counts every character's links.)
""")
code("""
order = pairs['a'].value_counts().index.tolist()   # busiest first
alt.Chart(pairs).mark_rect().encode(
    x=alt.X('a:N', sort=order, axis=None),
    y=alt.Y('b:N', sort=order, axis=None),
    color=alt.Color('scenes:Q', scale=alt.Scale(scheme='blues')),
    tooltip=['a:N', 'b:N', 'scenes:Q'],
).properties(width=420, height=420,
    title=alt.Title('Sorted busiest first: the busy characters gather top left', subtitle='Source: Knuth (1993), Les Misérables'))
""")
md("""
### Try it

Hover the top-left square. Who is the busiest character? Who shares the most scenes with them?

### When does the grid win?

- **Weighted links.** Here each link has a number: how many scenes two characters share. A link with a
  number is a **weighted** link. A grid shows the weight as a shade (or writes it in the square); dots and
  lines would need line widths, which are hard to compare.
- **Nothing crosses.** Every pair has its own square, however many links there are.
- **Look up one thing by reading one row.** Everyone Javert meets is in Javert's row.
- **But a grid is bad at paths.** "How do I get from Fantine to Gavroche?" means hopping from row to row.
  For routes, dots and lines win (Ghoniem, Fekete & Castagliola, 2004).
""")

md("""
## 5b · From belonging to links

Often the data does not list links at all. It lists **who belongs to what**: people in clubs, stations on
lines. Two people are linked when they **share** a club. To find every pair, merge the table **with itself**
on the shared column: pandas pairs every row with every other row that has the same club.
""")
code("""
members = pd.DataFrame({'person': ['Ana', 'Ben', 'Cal', 'Ana', 'Dev'],
                        'club':   ['Chess', 'Chess', 'Chess', 'Film', 'Film']})
both = members.merge(members, on='club')   # every two members of the same club, side by side
both
""")
md("""
Read one row: `person_x` and `person_y` are in the same `club`. Both copies of the table had a column called
`person`, so pandas adds `_x` (the left copy) and `_y` (the right copy) to tell them apart. Notice two things:
everyone is paired with **themself** (Ana–Ana), and every pair appears **both ways round** (Ana–Ben and
Ben–Ana), just like the matrix above.

Drop the self-pairs with `!=` (*is not equal to*), then count how many clubs each pair shares. `.size()`
counts the rows in each group; `reset_index(name='clubs')` turns the result back into a table with that
column name. The count is the link's **weight**.
""")
code("""
both = both[both['person_x'] != both['person_y']]
links = both.groupby(['person_x', 'person_y']).size().reset_index(name='clubs')
links
""")
md("""
To count **rows** in a chart, Altair has `count()`, just as it has `sum(population)` for adding up a
column. Use `count()` when each row is one thing (one membership, one station on one line).
""")
code("""
alt.Chart(members).mark_bar().encode(
    x=alt.X('count():Q', title='Members'),
    y=alt.Y('club:N', title=None),
).properties(title='Chess has the most members')
""")
md("""
### Try it

Add `'Film'` for Ben (a new row in `members`) and run the three cells again. Which pair now shares two clubs?
""" + "\n\n" + answer("""
members = pd.DataFrame({'person': ['Ana', 'Ben', 'Cal', 'Ana', 'Dev', 'Ben'],
                        'club':   ['Chess', 'Chess', 'Chess', 'Film', 'Film', 'Film']})
# Ana and Ben now share Chess and Film: their link has weight 2.
"""))

md("""
## 6 · One London, four drawings

A **tree** is things inside things: London → Inner or Outer London → 5 areas → 33 boroughs. Every borough
has exactly one parent, and there are no loops. The lecture drew the same tree four ways; here you build all
four from the same table, `london_boroughs.csv` (one row per borough, with its area, its half and its people).

Altair has no tree layout of its own, so for three of the four we work out the positions in pandas first,
just as we typed the A–H positions by hand in section 2.
""")

md("""
### 6a · Dots and lines: the tree as a network

Each level gets its own column (x = 0 for London, 3 for the boroughs). The boroughs are spread down the page,
one per row, and **each parent sits in the middle of its children**. Then it is the same recipe as A–H:
a table of edges, a `.merge` to give each edge both its ends, `mark_rule` for the lines.
""")
code("""
b = load('london_boroughs')   # borough, area, half, population
b = b.sort_values(['half', 'area', 'borough']).reset_index(drop=True)

# The leaves: one row per borough, spread down the page (y = 0, 1, 2, ...)
boroughs = pd.DataFrame({'name': b['borough'], 'parent': b['area'], 'half': b['half'],
                         'level': 3, 'y': b.index, 'population': b['population']})

# Each parent sits in the middle of its children, and holds all of their people
areas = (boroughs.groupby(['parent', 'half'], as_index=False)
         .agg(y=('y', 'mean'), population=('population', 'sum'))
         .rename(columns={'parent': 'name'}).assign(parent=lambda d: d['half'], level=2))
halves = (areas.groupby('half', as_index=False)
          .agg(y=('y', 'mean'), population=('population', 'sum'))
          .assign(name=lambda d: d['half'], parent='London', level=1))
london = pd.DataFrame({'name': ['London'], 'parent': [None], 'half': ['London'], 'level': [0],
                       'y': [halves['y'].mean()], 'population': [b['population'].sum()]})

tree = pd.concat([london, halves, areas, boroughs], ignore_index=True)
tree[['name', 'parent', 'level', 'population']].head(8)
""")
code("""
# An edge joins each place to its parent: the same .merge as the A-H network
lines = tree.merge(tree[['name', 'level', 'y']], left_on='parent', right_on='name', suffixes=('', '_p'))

colours = alt.Scale(domain=['Inner London', 'Outer London', 'London'], range=['#4c78a8', '#f58518', '#888888'])
where = dict(x=alt.X('level:Q', axis=None, scale=alt.Scale(domain=[0, 4])),
             y=alt.Y('y:Q', axis=None, scale=alt.Scale(reverse=True)))   # row 0 at the top

links = alt.Chart(lines).mark_rule(color='lightgrey').encode(**where, x2='level_p:Q', y2='y_p:Q')
dots = alt.Chart(tree).mark_circle(size=80, opacity=1).encode(
    **where, color=alt.Color('half:N', scale=colours, title=None),
    tooltip=['name:N', alt.Tooltip('population:Q', format=',')])
leaf_names = dots.mark_text(align='left', dx=8, fontSize=10).encode(text='name:N').transform_filter('datum.level == 3')
parent_names = dots.mark_text(dy=-12, fontWeight='bold').encode(text='name:N').transform_filter('datum.level < 3')

(links + dots + leaf_names + parent_names).properties(width=640, height=560,
    title=alt.Title('Who belongs to whom: London in four levels', subtitle='Source: ONS mid-2025 population estimates')
).configure_view(stroke=None)
""")
md("""
**How `transform_filter` reads.** `transform_filter('datum.level == 3')` keeps only the rows where `level` is
3. `datum` means *this row*, so `datum.level` is this row's `level`. The text in quotes is not pandas: it is
worked out when the chart is drawn, so write the column name exactly as it is in the table, use `==` to
compare, and `&&` for *and*, `||` for *or*. A misspelt column name gives no error: the filter just keeps
nothing, so if your labels vanish, check the spelling.
""")
md("""
#### Try it

This drawing shows **who belongs to whom** very clearly. What does it *not* show? (Look at Croydon and the
City of London.) Then size each dot by `population` and see if that fixes it.
""" + "\n\n" + answer("""
# It says nothing about size: the City of London (about 15,000 people) gets the same dot as Croydon (about 400,000).
dots = alt.Chart(tree).mark_circle(opacity=1).encode(
    **where, color=alt.Color('half:N', scale=colours, title=None),
    size=alt.Size('population:Q', legend=None),
    tooltip=['name:N', alt.Tooltip('population:Q', format=',')])
(links + dots + leaf_names + parent_names).properties(width=640, height=560).configure_view(stroke=None)
# Better, but dots are hard to compare by area. The next three drawings show size properly.
"""))

md("""
### 6b · A list, like folders on a laptop

The same tree as an **indented list**: each place on its own row, pushed to the right the deeper it is,
the way your laptop shows folders inside folders. A bar beside each row shows how many people live there.
The rows go in tree order: each parent, then everything inside it.
""")
code("""
# Tree order: sort by the path from the root, so children come straight after their parent
tree['path'] = tree['half'].where(tree['level'] > 0, '')
tree.loc[tree['level'] >= 2, 'path'] += '/' + tree['name'].where(tree['level'] == 2, tree['parent'])
tree.loc[tree['level'] == 3, 'path'] += '/' + tree['name']
order = tree.sort_values('path')['name'].tolist()

rows = alt.Y('name:N', sort=order, axis=None)
names = alt.Chart(tree).mark_text(align='left').encode(
    x=alt.X('level:Q', axis=None, scale=alt.Scale(domain=[0, 6])),   # deeper = further right
    y=rows, text='name:N')
names = names.transform_filter('datum.level == 3') + names.mark_text(align='left', fontWeight='bold').transform_filter('datum.level < 3')
bars = alt.Chart(tree).mark_bar().encode(
    x=alt.X('population:Q', title='People'), y=rows,
    color=alt.Color('half:N', scale=colours, title=None),
    tooltip=['name:N', alt.Tooltip('population:Q', format=',')])

alt.hconcat(names.properties(width=260, height=720), bars.properties(width=360, height=720))
""")
md("""
#### Try it

The bars for London and the two halves are so long that the boroughs' bars are hard to compare. Show the
bars for the **boroughs only** (hint: `transform_filter`). What do you gain, and what do you lose?
""" + "\n\n" + answer("""
bars = bars.transform_filter('datum.level == 3')
alt.hconcat(names.properties(width=260, height=720), bars.properties(width=360, height=720))
# The boroughs can now be compared with each other, but the bars no longer say how big each area or half is.
"""))

md("""
### 6c · Bands: an icicle from four stacked bars

Each level is one bar that adds up to all of London, cut into smaller and smaller pieces. Wider means more
people. This one needs no positions of our own: stacking does the work.
""")
code(step("icicle"))
md("""
#### Try it

1. Hover the bars. Which area of London has the most people?
2. Remove the `'3 Area'` level. What does the reader lose?
""" + "\n\n" + answer("""
b.groupby('area')['population'].sum().sort_values(ascending=False).head(3)

rows = pd.concat([
    b.assign(level='1 London',         name='London'),
    b.assign(level='2 Inner or Outer', name=b['half']),
    b.assign(level='4 Borough',        name=b['borough']),
])
# Without the areas, the reader can no longer see which boroughs belong together.
"""))

md("""
### 6d · Boxes inside boxes: a treemap

Start with one rectangle for all of London. Cut it **across** into Inner and Outer London, each as wide as
its share of the people. Cut each of those **down** into its areas, then each area **across** into its
boroughs. The bigger the box, the more people live there.

This way of cutting is called *slice and dice* (Shneiderman, 1992). The lecture's treemap uses a cleverer cut
that keeps the boxes closer to squares, but the idea is the same.
""")
code("""
def cut(part, x0, y0, x1, y1, levels, across):
    \"\"\"Cut the box (x0, y0)-(x1, y1) into one piece per group in levels[0], sized by people, then cut each piece again.\"\"\"
    if not levels:
        return []
    boxes, at, total = [], (x0 if across else y0), part['population'].sum()
    for name, inside in part.groupby(levels[0], sort=True):
        share = inside['population'].sum() / total
        if across:
            box = (at, y0, at + (x1 - x0) * share, y1); at = box[2]
        else:
            box = (x0, at, x1, at + (y1 - y0) * share); at = box[3]
        boxes.append({'name': name, 'level': 4 - len(levels), 'half': inside['half'].iloc[0],
                      'population': inside['population'].sum(),
                      'x0': box[0], 'y0': box[1], 'x1': box[2], 'y1': box[3]})
        boxes += cut(inside, *box, levels[1:], not across)
    return boxes

boxes = pd.DataFrame(cut(b, 0, 0, 1, 1, ['half', 'area', 'borough'], across=True))
boxes.head()
""")
code("""
corners = dict(x=alt.X('x0:Q', axis=None), x2='x1:Q',
               y=alt.Y('y0:Q', axis=None, scale=alt.Scale(reverse=True)), y2='y1:Q')

rects = alt.Chart(boxes).mark_rect(stroke='white', strokeWidth=1).encode(
    **corners, color=alt.Color('half:N', scale=colours, title=None),
    tooltip=['name:N', alt.Tooltip('population:Q', format=',')]).transform_filter('datum.level == 3')
area_edges = alt.Chart(boxes).mark_rect(fill=None, stroke='white', strokeWidth=4).encode(
    **corners).transform_filter('datum.level == 2')
# A name only where it fits: the box is wider (in pixels) than about 6 pixels a letter
labels = alt.Chart(boxes).mark_text(fontSize=10, color='white').encode(
    x='xm:Q', y='ym:Q', text='name:N').transform_calculate(
    xm='(datum.x0 + datum.x1) / 2', ym='(datum.y0 + datum.y1) / 2', px='(datum.x1 - datum.x0) * 640'
).transform_filter('datum.level == 3 && datum.px > length(datum.name) * 6')

(rects + area_edges + labels).properties(width=640, height=440,
    title=alt.Title('Croydon and Barnet are the biggest boxes', subtitle='Source: ONS mid-2025 population estimates')
).configure_view(stroke=None)
""")
md("""
#### Try it

1. Hover the biggest box and the smallest. Which boroughs are they?
2. Change `across=True` to `across=False` and run both cells again. Same data, same sizes: what changed?
""" + "\n\n" + answer("""
boxes[boxes['level'] == 3].sort_values('population')[['name', 'population']].iloc[[0, -1]]
# Smallest: City of London. Biggest: Croydon.
# With across=False the first cut is down instead of across: every box is still the same size,
# but the shapes change. In a treemap, size is data; the shape is a choice.
"""))

md("""
### When does a tree lie?

Every drawing in this section works because **each borough is inside exactly one area**, and each area inside
one half. If a child had **two parents** (a station on two Tube lines, a person in two clubs), it would be drawn
twice: once under each parent. The boxes would then add up to more than there really is, and the picture would
overstate the data. Before you draw a tree, check that every child has one parent.
""")

md("""
## 7 · Other tools, beside Altair

Altair draws; it does not lay out networks or measure them. Three other libraries do the jobs it leaves out.
You keep Altair for the picture you hand in, and use these for what they are best at.

| Tool | Use it to… | In this section |
|---|---|---|
| **networkx** | lay out a network, measure it (degree), find routes | 7a: layout and a route, drawn in Altair |
| **plotly express** | a treemap, sunburst or icicle in one line | 7b |
| **pyvis** | a network you can drag about in the browser | 7c |
| **Gephi** (a desktop app, not Python) | big networks, thousands of nodes | 7d |
""")

md("""
### 7a · networkx: the layout and the route, then Altair draws

networkx turns an edge list into a **graph** object `G` that knows its nodes and edges. Then it can do the
work we did by hand: count degree, place the nodes (a *spring layout*: linked nodes pull together, every pair
pushes apart, as in the lecture), and find the **shortest path** between two nodes.
""")
code("""
import networkx as nx
from vega_datasets import data

people, scenes = data.miserables()
name = people['name']
mis = pd.DataFrame({'a': name[scenes['source']].values, 'b': name[scenes['target']].values,
                    'scenes': scenes['value']})

G = nx.from_pandas_edgelist(mis, 'a', 'b', edge_attr='scenes')   # the edge list becomes a graph
print(G.number_of_nodes(), 'characters,', G.number_of_edges(), 'links')

# Degree in one line: the same numbers as stacking the two columns (section 1)
pd.Series(dict(G.degree()), name='degree').sort_values(ascending=False).head(5)
""")
md("""
Now let networkx choose the positions, and draw them with the **same Altair recipe as section 3**: dots, and a
`.merge` to give each line both its ends. `seed=3` makes the layout the same every time you run it.
""")
code("""
at = nx.spring_layout(G, seed=3)                       # {name: (x, y)}
spots = pd.DataFrame([{'name': k, 'x': x, 'y': y} for k, (x, y) in at.items()]).merge(
    people[['name', 'group']], on='name')

lines = (mis.merge(spots, left_on='a', right_on='name')
            .merge(spots, left_on='b', right_on='name', suffixes=('', '2')))
place = dict(x=alt.X('x:Q', axis=None), y=alt.Y('y:Q', axis=None))

web = alt.Chart(lines).mark_rule(color='lightgrey').encode(**place, x2='x2:Q', y2='y2:Q')
dots = alt.Chart(spots).mark_circle(size=70, opacity=1).encode(
    **place, color=alt.Color('group:N', legend=None), tooltip=['name:N', 'group:N'])
(web + dots).properties(width=560, height=440,
    title=alt.Title('Positions chosen by networkx, drawn by Altair', subtitle='Source: Knuth (1993), Les Misérables')
).configure_view(stroke=None)
""")
md("""
**A route.** `nx.shortest_path` hops from node to node along links, fewest hops first. Draw the route on top in
red: the legs are pairs of neighbouring names in the route, joined to their positions exactly like the lines.
""")
code("""
route = nx.shortest_path(G, 'Fantine', 'Gavroche')
print(' → '.join(route))

legs = (pd.DataFrame({'a': route[:-1], 'b': route[1:]})
          .merge(spots, left_on='a', right_on='name')
          .merge(spots, left_on='b', right_on='name', suffixes=('', '2')))
path = alt.Chart(legs).mark_rule(color='#c8102e', strokeWidth=5).encode(**place, x2='x2:Q', y2='y2:Q')
ends = alt.Chart(spots[spots['name'].isin(route)]).mark_text(dy=-12, fontWeight='bold').encode(**place, text='name:N')
(web + dots + path + ends).properties(width=560, height=440,
    title=alt.Title('Fantine reaches Gavroche in two hops', subtitle='Source: Knuth (1993), Les Misérables')
).configure_view(stroke=None)
""")
md("""
#### Try it

Find the route from `'Javert'` to `'Cosette'`. How many hops? This is the job the lecture said a grid is bad at.
""" + "\n\n" + answer("""
route = nx.shortest_path(G, 'Javert', 'Cosette')
print(len(route) - 1, 'hops:', ' → '.join(route))
"""))

md("""
### 7b · plotly express: tree pictures in one line

plotly draws a treemap, a sunburst (rings) or an icicle from the boroughs table in **one line each**: you name
the levels from the root down (`path=`) and the size (`values=`). Hover any box. The catch: plotly decides how
to cut the boxes, so you cannot see or change it, which is why section 6 built them by hand first.
""")
code("""
import plotly.express as px

b = load('london_boroughs')
levels = [px.Constant('London'), 'half', 'area', 'borough']
colours = {'Inner London': '#4c78a8', 'Outer London': '#f58518', '(?)': '#888888'}

px.treemap(b, path=levels, values='population', color='half', color_discrete_map=colours,
           title='London by population: a treemap (plotly)')
""")
code("""
px.sunburst(b, path=levels, values='population', color='half', color_discrete_map=colours,
            title='The same tree as rings: a sunburst (plotly)')
""")
md("""
#### Try it

Change `px.sunburst` to `px.icicle`. Compare it with your Altair icicle in 6c: which is easier to read, and which
one could you change?
""")

md("""
### 7c · pyvis: a network you can drag

pyvis draws `G` with a physics engine you can play with: drag a character and the others follow; scroll to zoom.
It is great for exploring and for showing a class, but not for a report: the picture moves every time.
""")
code("""
from pyvis.network import Network
from IPython.display import HTML
import html

net = Network(height='480px', width='100%', cdn_resources='in_line')
net.from_nx(G)
for node in net.nodes:                      # colour each character by its group, as in the grid
    node['group'] = int(people.loc[people['name'] == node['id'], 'group'].iloc[0])
net.write_html('miserables_network.html')   # also saved as a file: open it in your browser
HTML(f'<iframe srcdoc="{html.escape(net.generate_html())}" width="100%" height="500" style="border:0"></iframe>')
""")

md("""
### 7d · Gephi: when the network is big

For networks with thousands of nodes (a whole social network, every Tube and rail station in Britain) data
designers often leave code and use **Gephi** (gephi.org, free). You load an edge list CSV like ours, choose a
layout, colour by group, size by degree, and export a picture. networkx can write a file Gephi opens:
`nx.write_gexf(G, 'miserables.gexf')`.

**Which tool when?** Explore with pyvis or Gephi; measure and find routes with networkx; draw the picture you
explain, with a title and a source, in Altair.
""")

md("""
## 8 · Your turn: your own network

Make an edge list of **six to ten people** you know (first names or initials only), one row per pair who
know each other. Then:

1. Draw it as dots and lines (sections 2 and 3). Choose positions that keep friends close, or let networkx choose them (7a).
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
    import shutil, tempfile
    work = tempfile.mkdtemp()
    for f in (ROOT / "assets/lesson/ipdv/week8").glob("*.csv"):
        shutil.copy(f, work)
    NotebookClient(ran, timeout=180, kernel_name="python3", resources={"metadata": {"path": work}}).execute()
    errors = [o for c in ran.cells if c.cell_type == "code" for o in c.get("outputs", []) if o.get("output_type") == "error"]
    print("ran", sum(c.cell_type == "code" for c in ran.cells), "code cells,", len(errors), "errors")
    if len(sys.argv) > 2:
        nbf.write(ran, sys.argv[-1])

nbf.write(nb, OUT)
print("wrote", OUT.relative_to(ROOT))
