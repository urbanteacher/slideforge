# Week 8 · Who's connected to whom? Networks and trees: lesson plan

A plan for the Week 8 lecture of LDSCI6253 Advanced Information Presentation & Visualisation, before anything is
built. It merges two sources:

- **The 2025 networks deck** (`01_Lecture_IPDV_7.pptx`, 27 slides, titled "Week 7: Networks and Trees"): definitions
  of networks and trees, directed, undirected and weighted edges, and links out (visualgo, TouchGraph, the datavizcatalogue,
  Liveplasma). Most slides are text or a screenshot with no source.
- **Dimitris Mylonas's LDSCI5209 deck** (`09_Lecture_IPDV_Networks_Trees.pdf`): terminology, centrality, edge types,
  the adjacency list and matrix on one eight-node graph (A–H), Euler paths, nine "networks in…" cases, and tree terms
  and types.

There is no Altair guide for this week (the guides stop at Week 7's maps), so the Build-it code is new and is checked
by running it.

The proposed lesson key is `ipdv-net-w8`. It is built in the `northeastern` theme by its own script,
`tools/build-ipdv-week8.js`, which reuses the Week 5 builder's helpers. Nothing in `tools/ipdv-week5/` changes.

**Status:** built (31 Oct 2026): 51 slides, 48 in the student copy, from `node tools/build-ipdv-week8.js`, key `ipdv-net-w8`. The decisions in §9 went as recommended, except D2: the layouts are worked out by the builder itself (`tools/ipdv-week8/layouts.js`), so nothing was installed. See the change log.

---

## 1. The journey in one line

> Students walk in thinking **a network chart is a hairball of dots and lines**. They walk out able to say, for any
> connected data, **whether it is a network or a tree, which of three ways to draw it (link, matrix or nest) suits
> the question, and what each one hides**, and to build the first two in Altair.

The spine is Munzner chapter 9 (*Arrange Networks and Trees*), which this week's reading already names. It sorts
every network picture into three families:

| Family | The idea | Draws a link as… | Good for | Breaks when… |
|---|---|---|---|---|
| **Connect** (node-link) | Dots joined by lines | A line | Paths, "how do I get from A to B?", small networks | It gets dense: the hairball |
| **Matrix** | A grid with a row and a column per node | A filled cell | Dense networks, "who links to whom?", clusters | You need to follow a path |
| **Nest** (containment, for trees only) | Boxes inside boxes | Being inside | Sizes within a hierarchy (treemap) | You need to see the structure's depth |

Every technique runs the Week 5 rule: **See it** (a real, published case) → **Name it** (the family, and what it
shows and hides) → **Build it** (Altair, one line lit at a time, beside the chart it makes).

**The data spine is London.** The room lives here, and Week 7 ended on a London map:
- **Networks: the Tube.** Stations are nodes, the track between neighbouring stations is an edge, and the line is
  the edge's colour. One network gives every idea in this lecture: degree (which station has the most lines?), paths
  (the fewest stops from King's Cross to Bank), a graph on a map, and Harry Beck's 1933 diagram, which is the most
  famous decision in the history of network drawing: he threw away geography to show connection.
- **Trees: London's boroughs.** London → Inner and Outer London → 33 boroughs, sized by population. It is the same
  geography as Week 7's map, now drawn as a hierarchy, so students see one dataset as a map, a tree and a treemap.

## 2. What carries over, so we don't repeat it

| Already taught | Where | Week 8 builds on it by… |
|---|---|---|
| Munzner's What / Why / How | Week 3 | Networks and trees are a new **What** (dataset type), and link, matrix and nest are three **How**s |
| Position is the strongest channel | Week 2 | A node-link layout spends position on **nothing**: it is invented by the computer, so distance means nothing. Students find this surprising, and it's the hook |
| Colour as data; navy, red and warm white otherwise | Week 4 | Tube line colours are the only other colours on screen. They are TfL's, and they are data (which line) |
| Hover, select and highlight | Week 5 | Highlighting a node's neighbours is a Week 5 selection: input → parameter → predicate → response |
| Maps and projections | Week 7 | "Graphs on maps": the Tube drawn on true geography, then Beck's diagram, which bends geography as a projection does |

## 3. The student journey

### 3.1 Six stops, one question each

| Stop | Min | The question they carry | See it (real world) | Build it (Altair) | Card earned |
|---|---|---|---|---|---|
| Hook | 0–6 | What does this picture leave out? | The Tube map (Beck's diagram) beside the same stations on true geography | — | — |
| ① Name | 6–18 | Is it a network or a tree? | Königsberg's seven bridges (Euler, 1736), the start of graph theory; a family tree; a company org chart | — | **A tree is a network with no loops and one root** |
| ② Store | 18–30 | How does a computer hold a network? | Dimitris's eight-node graph as an edge list, an adjacency list and a matrix | A pandas edge list (`source`, `target`) | **Every network is a list of pairs** |
| ③ Connect | 30–50 | How do you draw the links? | The Tube; the NYT campaign-staff network (seen in Week 5); a hairball | Nodes (`mark_circle`) and edges (`mark_rule` with `x2`, `y2`), layered | **In a node-link chart, position is made up, so only the links mean anything** |
| ④ Matrix | 50–65 | What do you do when it's too dense? | Les Misérables co-occurrence matrix (Bostock's version of Knuth's data) | `mark_rect` with `x='source'`, `y='target'`: one line of Altair | **When the lines tangle, use a grid** |
| ⑤ Nest | 65–82 | How do you draw a hierarchy? | London as a tree, an icicle and a treemap; the Tree of Life (OneZoom) | An indented tree and an icicle with `mark_rect` (positions from pandas) | **Nesting shows size, links show structure** |
| Arriving | 82–90 | Can you choose the drawing from the question? | Four questions about the Tube and the boroughs; hands up for Connect, Matrix or Nest | Lab hook | All five cards, read as one sentence |

### 3.2 Words arrive after the experience

As in Week 5, each term appears after the room has used it: they find the busiest station before they hear "degree";
they trace a route before they hear "path"; they see the hairball before they hear "density". The terms slide
(node, edge, degree, path, cluster, root, parent, child, leaf) comes at the end of ② as a summary, not at the start.

### 3.3 Learning outcomes

By the end, students can:
1. Tell a network from a tree, and name nodes, edges, degree, paths, roots and leaves on a real example.
2. Store a small network as an edge list, and read the same network as an adjacency matrix.
3. Choose between node-link, matrix and nesting by the reader's question, and say what each one hides.
4. Build a node-link chart and an adjacency matrix in Altair from an edge list.
5. Explain why Beck's Tube map is a better network picture than a geographically accurate one.

## 4. Running order (90 minutes)

- **Hook (0–6).** Two pictures, no labels: the Tube on true geography (stations as dots, lines as their colours) and
  Beck's diagram. ASK: "Which would you use to get from Brixton to Euston? Which would you use to walk it?" Then the
  route slide with Week 8 marked.
- **① Name (6–18).** Königsberg's bridges as a live figure. The room tries to cross every bridge once; nobody can.
  Then Euler's move: the city becomes four dots and seven lines, and the answer depends only on how many lines meet
  at each dot. A tree is the special case: one root, no loops, N − 1 edges. Network or tree? Six quick cases: the
  Tube, a family tree, a folder on your laptop, Instagram follows, a football league's fixtures, a company org chart.
- **② Store (18–30).** One small graph, three ways: a picture, an edge list (two columns) and a matrix (a grid of 0s
  and 1s). A live figure links them: point at an edge and its row and its two cells light up. Then the terms summary.
- **③ Connect (30–50).** See it: the Tube, the campaign-staff network, and a hairball of a few hundred nodes. Name it:
  the layout is computed (forces pull linked nodes together and push the rest apart), so position carries no data.
  A live force layout: drag a station and the network follows. Highlighting a station's neighbours is Week 5's
  selection. Build it: nodes and edges as two layers, positions from a small layout step in Python.
- **④ Matrix (50–65).** See it: Les Misérables as a node-link hairball, then as a matrix, then the matrix reordered
  so the clusters show as blocks. A live figure reorders the same matrix by name, by degree and by cluster. Build it:
  one `mark_rect`. Name what it hides: you can't trace a path across a matrix.
- **⑤ Nest (65–82).** London's boroughs as a node-link tree, then an indented list (like a file explorer), then an
  icicle, then a treemap. A live figure morphs the same hierarchy through all four. The treemap is Shneiderman's
  (1992), made to find what was filling up a hard disk. Build it: the indented tree and the icicle, positions from
  pandas.
- **Arriving (82–90).** Four questions, hands up for Connect, Matrix or Nest. The five cards as one sentence. The lab.

## 5. Set pieces: live figures

The figure system (`src/figures/`) already runs Weeks 5 and 7. This week needs three new figure kinds:

| Figure | What the room does | Steps |
|---|---|---|
| `bridges` | Watches a walk over Königsberg try to cross all seven bridges once; then the city collapses into four dots and seven lines, and each dot shows its degree | city → a failed walk → the graph → odd degrees lit |
| `network` | Drags nodes (the layout follows); hovers a node to light its neighbours; switches the same network between node-link and matrix, and reorders the matrix | picture ↔ edge list ↔ matrix; Tube on geography → Beck-style schematic; hairball → matrix → reordered matrix |
| `tree` | Steps the same hierarchy through node-link, indented, icicle and treemap; hovers a borough to see its population and its path to the root | four layouts, morphing |

Each step has an `explain` (the "Why?" overlay) in plain words, and each figure's last step is the still that goes
into the student copy and exports.

## 6. Build plan

1. **Data, at build time.** Tube stations and links from TfL's open data, cut to Zones 1–2 so it reads on a slide;
   London borough populations from the ONS mid-year estimates, as in Week 7. Both are checked by hand against the
   source, and the sources go in the notes.
2. **Layouts, at build time.** Force layout and tree layouts computed once in the builder (dev-only `d3-force` and
   `d3-hierarchy`), so the browser loads no new library. The `network` figure only relaxes the layout locally while a
   node is dragged.
3. **The three figure kinds** in `src/figures/`, then `npm run build`. Run `git status src/` first.
4. **Altair**, written and run in a notebook (`tools/ipdv-week8/code/`), and the pictures made from that run, so the
   code on every slide is the code that drew the chart beside it.
5. **Slides**, in the running order, in batches, each checked in the browser.
6. **Student copy, slide list and tests**: `tests/week8.test.js` (slide count; every Build-it slide has a picture
   beside its code; no `foreignObject` and no bare `&` in SVG; every figure step has an `explain`).

Outputs: `lessons/08_Lecture_IPDV_Networks_Trees.sfbundle.json` and `_STUDENT`, `js/lessons-ipdv-week8.js` seeded
into the Northeastern folder, assets in `assets/lesson/ipdv/week8/`. The route drawing gains Week 8.

## 7. Corrections to carry over from the source decks

Each fix is recorded in the slide's speaker notes.

1. The 2025 deck says "Week 7" and "Lecture 7" on every slide.
2. Its slide 3, "Lesson Recap", recaps maps but sits under the networks title. It becomes a real Week 7 recap.
3. Its slide 6 says "Analysis Farmwork"; it should be "Framework".
4. Dimitris's deck says a graph has an Euler path "if and only if there are exactly two vertices with odd degree".
   A connected graph has one if it has **zero or two** odd vertices. With zero, the path is a circuit that ends where
   it started.
5. Liveplasma's slide says "mapping and data source unclear". It's dropped, not repeated.
6. Dimitris's deck is LDSCI5209 and carries his name. Credit him for the eight-node example.

## 8. Cautions

- **The Tube map's design is TfL's and is protected.** The lecture redraws the network from TfL's open data in the
  deck's own style rather than showing TfL's diagram file, and links to TfL's PDF. The line colours are TfL's
  published hexes.
- **The Les Misérables data** (Knuth, *The Stanford GraphBase*, 1993) ships in `vega_datasets` as `miserables`, so
  students can run the matrix code as written.
- **Altair has no network or tree layout.** The plan computes positions in Python and lets Altair draw them. Saying
  so plainly is part of the lesson: a layout is a choice someone makes.

## 9. Decisions before building

| # | Decision | Recommendation |
|---|---|---|
| D1 | The data spine: the Tube and London's boroughs, or keep last year's generic examples? | **London.** It's the room's city, it continues Week 7, and Beck's map is the best story in network drawing |
| D2 | Install the dev-only `d3-force` and `d3-hierarchy` for the build? | Yes. Build-time only, like Week 7's `d3-geo` |
| D3 | Three new figure kinds (`bridges`, `network`, `tree`) in `src/figures/` | Build them. Later weeks (storytelling, the web-app week) can reuse `network` and `tree` |
| D4 | The Build-it code: positions computed with `networkx` (one more library for students), or with plain pandas for the tree and a small precomputed layout file for the Tube? | **Plain pandas and a layout file.** Fewer installs for a nervous room; `networkx` goes in the notes as the next step |
| D5 | A lab notebook for this week? | Not in this build. The lecture ends on a lab hook. Say if you want a `Week8_Networks_Lab` notebook too |

## 10. References (to be checked before they go on slides)

- Munzner, T. (2014). *Visualization Analysis and Design*, ch. 9 *Arrange Networks and Trees*. CRC Press.
- Euler, L. (1736). Solutio problematis ad geometriam situs pertinentis.
- Garland, K. (1994). *Mr Beck's Underground Map*. Capital Transport.
- Ghoniem, M., Fekete, J.-D., & Castagliola, P. (2004). A comparison of the readability of graphs using node-link
  and matrix-based representations. *IEEE InfoVis*.
- Shneiderman, B. (1992). Tree visualization with tree-maps: a 2-d space-filling approach. *ACM Transactions on
  Graphics*, 11(1).
- Bostock, M. *Les Misérables co-occurrence* (bost.ocks.org/mike/miserables).
- TfL open data (tfl.gov.uk/info-for/open-data-users); ONS mid-year population estimates.

## Change log

- **31 October 2026:** first draft.
- **31 October 2026, built.** 51 slides, built by `tools/build-ipdv-week8.js` from `tools/ipdv-week8/`, seeded into the Northeastern folder by `js/lessons-ipdv-week8.js`; tests in `tests/week8.test.js`.
  - **Data:** the Tube from TfL Open Data (`fetch-tube.mjs`, 269 stations, Zone 1 drawn: 65 stations, 130 links); the 33 boroughs from the ONS mid-2025 estimates through Nomis, grouped by ITL2 area; Les Misérables from `vega-datasets`.
  - **Figures:** `bridges` (Königsberg, walkable), `network` (dots and lines you can drag, a grid that reorders, and the picture, list and grid side by side) and `tree` (one hierarchy as links, an indented list, an icicle and a treemap). `kit.js` gained `keyRow` (a "How to read it" key) and captions that wrap to two lines. `lab-app/` rebuilt so the Lesson studio shows them.
  - **Build it:** the Altair runs for real (`code/steps.py` through `uv`), and every code slide shows the picture it drew and what each new part does.
  - **Beck's step is a fisheye**, not an even spacing: an even spacing came out as a round blob. A true Beck layout (straight lines at 45°) is not attempted; the notes say to show TfL's map beside it.
  - **Plain English for a room new to this:** every live slide has a "How to read it" key, captions that define each word as it arrives, and ends on its clearest picture, because thumbnails, PDFs and the student copy show the last step.
  - **From the 2025 deck:** Munzner's What, the royal family tree, TouchGraph's book network, Munich's network on its map, and the Gupta network (its source still to be confirmed, so it is hidden in the student copy). The tree terms and edge types are redrawn.
  - **Not done:** a lab notebook (D5), and the Lesson-studio copy (`tools/build-lab-lessons.mjs`): `js/lab-lessons.js` has another session's unfinished edits. Until it is built, the browser converts the lesson on opening, which works.
- **31 October 2026, reworked to the Nodes routine.** 56 slides (53 in the student copy).
  - **Recall first:** last week's recap is now three questions on cards, asked before each answer is shown.
  - **Define before use:** "Six words for today" (node, edge, degree, path, root, leaf, each with an example) comes straight after the Tube hook. Part 2's word table is now "The words again, plus three more".
  - **Join it up:** for "Why a grid for Les Misérables?", a point → because → so → in this case chain, then three answers (weak, stable, excellent) to vote on, then what each one has and lacks.
  - **Missing-link ladder** after the hands-up quiz: ask yourself, hint, example, a new question (Premier League fixtures; the answer, a grid, is in the notes).
  - **Jargon out of the slides:** adjacency, dense, sparse, hierarchy and "Munzner's What" are replaced or explained where they first appear. Euler's rule reads "zero or two dots may have an odd number of lines". Teacher notes keep the technical names.
- **31 October 2026, the gaps against the 2025 lecture's outline and Munzner ch. 9 filled.** 68 slides (65 in the student copy).
  - **New slides:** why look at a network (four jobs: follow a path, find the busiest, find the groups, see the shape); Munzner's four layers on the Tube map; five numbers that describe a network (degree, bridge, distance, density, islands), computed with networkx from the Les Misérables data; Liveplasma as a critique, with its picture from the 2025 deck; a line is a claim (closeness, accusation, re-identification, colour alone); zoom, filter, select; make the picture simpler (busiest only, ego network, merge and bundle, fisheye); when a tree gets too big; networks and trees in disguise (Sankey, chord, arc, sunburst, circle packing, dendrogram); tools for networks. A sixth outcome: critique a network picture.
  - **Fixed:** the Lesson studio draws at most four cards, so "Network or tree?" had silently lost its last two since the first build. It is now two slides, and `tests/week8.test.js` fails any card slide with more than four.
