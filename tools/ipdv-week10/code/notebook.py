"""Week 10's tutorial notebook (LDSCI6253, visualisation for machine learning): the lecture's code, to run and change.

One section per slide of code, in the lecture's order: the library's one line first where the lecture shows it, then
the Altair build, then a *Try it* with a folded model answer. The code is read from steps.json, so the notebook and
the lecture never disagree. It also writes week10_build_its.py, every Build-it in one file. The lab challenge
(activity.py) uses the same checks on a new question.

    uv run --with nbformat python tools/ipdv-week10/code/notebook.py [--run]

writes lessons/10_Notebook_IPDV_Machine_Learning.ipynb without outputs. --run also runs it end to end (needs
nbclient, ipykernel, altair, pandas, scikit-learn, seaborn, matplotlib, vl-convert-python) and writes the run copy
beside it, for the teacher.
"""
import json
import pathlib
import sys

import nbformat as nbf

ROOT = pathlib.Path(__file__).resolve().parents[3]
DATA = ROOT / "assets/lesson/ipdv/week10"
STEPS = {s["id"]: s for s in json.loads((ROOT / "tools/ipdv-week10/code/steps.json").read_text())["steps"]}
F = json.loads((ROOT / "tools/ipdv-week10/data/facts.json").read_text())
OUT = ROOT / "lessons/10_Notebook_IPDV_Machine_Learning.ipynb"
RUN = ROOT / "lessons/10_Notebook_IPDV_Machine_Learning_RUN.ipynb"
LIVE = "https://slideforge-rpjj.onrender.com/assets/lesson/ipdv/week10/"
pct = lambda v: f"{v * 100:.0f}%"

# The setup every section builds on: the slides' setup, with the CSV read from beside the notebook or the site.
SETUP = STEPS["look"]["run"].split("\n\n", 1)[0]  # the imports
FIRST = STEPS["look"]["run"][: STEPS["look"]["run"].index("unique = (")].strip()
LOAD = f'''from pathlib import Path
import numpy as np

LIVE = "{LIVE}"

def load(name):
    """Read name.csv from beside this notebook, or from the course site if it is not here."""
    here = Path(name + ".csv")
    return pd.read_csv(here if here.exists() else LIVE + name + ".csv")
'''
SETUP_CELL = FIRST.replace("import pandas as pd\n", "import pandas as pd\n" + LOAD).replace("pd.read_csv('songs.csv')", "load('songs')")

cells = []
md = lambda s: cells.append(nbf.v4.new_markdown_cell(s.strip()))
code = lambda s: cells.append(nbf.v4.new_code_cell(s.strip()))


def answer(s):
    return "<details><summary><b>Stuck? Open a model answer</b></summary>\n\n```python\n" + s.strip() + "\n```\n</details>"


md(f"""
# Week 10 · What does the model see? Check a model in five charts

**LDSCI6253 Advanced Information Presentation & Visualisation** · Northeastern University London

This is the lecture's code, to run and change. One dataset throughout: about 30,000 songs and their Spotify audio
features (TidyTuesday, 21 January 2020). At each of the five stops you see the **library's one line** first (seaborn
or scikit-learn's own display), then **build the chart in Altair**, where you choose every colour, order and word.

| § | Stop | The question | The chart | New code |
|---|---|---|---|---|
| 1 | Look first | Is the data fit to learn from? | histogram, box plot | `drop_duplicates`, `bin`, `mark_boxplot` |
| 2 | Too many columns | How do you see ten at once? | brushed matrix, PCA map, k-means groups | `alt.repeat`, `selection_interval`, `PCA`, `KMeans` |
| 3 | What it listens to | Which features matter? | heatmap, importance bars | `.corr()`, `permutation_importance` |
| 4 | Where it's wrong | Is the model any good? | confusion matrix, depth curve, boundary | `confusion_matrix`, `validation_curve` |
| 5 | Tell the public | What does "98%" hide? | the honest comparison | a baseline beside the model |

Run the cells **in order**: each section builds on the one before. Models take a few seconds to train; the depth
curve in §4 takes about half a minute. Needs `altair` (5.4 or later), `pandas`, `scikit-learn`, `seaborn`.
""")

md("""
## 0 · Set up

Put `songs.csv` beside this notebook (it is on Canvas); if it is not there, `load` reads it from the course site.
`FEATURES` are the ten audio numbers a model sees; `genre` is one colour per genre, safe for colour-blind readers.
""")
code(SETUP_CELL)

SECTIONS = [
    ("lib-look", "1a · Look first, the library way",
     "Three lines most notebooks start with: blanks per column, repeated songs, and seaborn's histogram.", None, None),
    ("look", "1b · Look first: what does popularity look like?",
     "One row per song, **shuffled** (the file is sorted by playlist, so any slice of it would be one genre), then a histogram.",
     f"Draw `tempo` instead of `track_popularity` (change the `x` column and its title; try `step=5`). Is there a tower anywhere? (One song has tempo 0.)",
     "alt.Chart(sample).mark_bar().encode(\n    x=alt.X('tempo:Q', bin=alt.Bin(step=5), title='tempo (beats a minute)'),\n    y=alt.Y('count()', title='songs'),\n).properties(width=520, height=300)"),
    ("box", "1c · One feature, six genres",
     "A box plot per genre: the middle half of the songs as a box, the median as a line, outliers as dots.",
     "Change `speechiness` to `danceability`. Which genre is least danceable?",
     "alt.Chart(sample).mark_boxplot(size=30).encode(\n    x=alt.X('playlist_genre:N', title=None),\n    y=alt.Y('danceability:Q'),\n    color=genre.legend(None),\n).properties(width=520, height=300)\n# Rock: its box sits lowest."),
    ("lib-pair", "2a · Ten columns at once, the library way",
     "seaborn's `pairplot`: every pair of columns as a scatter. Quick, but you can't ask it anything.", None, None),
    ("matrix", "2b · A matrix you can brush",
     "Week 5's brush, on a matrix: drag a box on any panel and the same songs light up in every other panel.",
     "Add `'valence'` to both lists in `.repeat(...)`. Then drag a box round the songs with the most speechiness: what genre are they?",
     "# in .repeat(...):\nrow=['danceability', 'energy', 'speechiness', 'valence'],\ncolumn=['danceability', 'energy', 'speechiness', 'valence'],\n# The wordiest songs are mostly rap (orange)."),
    ("pca", "2c · Ten columns on one map: PCA",
     "Scale every column first, then find the two directions that keep the most variation. The title says how much survives.",
     "Leave out the scaling: use `sample[FEATURES]` instead of `scaled` in `fit` and `transform`. What happens to the share kept, and why?",
     "pca = PCA(n_components=2).fit(sample[FEATURES])\nxy = pca.transform(sample[FEATURES])\n# Almost 100% 'kept': duration_ms (hundreds of thousands) swamps every other column.\n# The map is then only song length. Scale first."),
    ("kmeans", "2d · Let the model find the groups: k-means",
     "**Clustering** is the unsupervised kind of ML: k-means is given the ten numbers and no genres, and finds groups of songs that sit close together. The heatmap shows each group's average on every feature (0 is the average song).",
     "Try `n_clusters=3`, then `8`. Then see which genres land in each group: `pd.crosstab(groups, unique['playlist_genre'], normalize='index').round(2)`. Do the groups match the genres?",
     "groups = KMeans(n_clusters=3, n_init=10, random_state=0).fit_predict(scaled)\npd.crosstab(groups, unique['playlist_genre'], normalize='index').round(2)\n# The groups cut across genres: they are closer to moods (wordy, calm, energetic)."),
    ("corr", "3a · Which columns move together?",
     "Correlation between every pair of columns, as a heatmap with its numbers on it. Correlation runs from −1 to 1, so the colour scale diverges from white at 0.",
     "Change the scheme to `'blues'` and remove `domain=[-1, 1]`. Why is that worse?",
     "color=alt.Color('r:Q', scale=alt.Scale(scheme='blues'))\n# −0.5 and +0.5 now look like 'a bit' and 'a lot': the sign is lost.\n# A diverging scale with 0 in the middle shows both directions."),
    ("importance", "3b · What does the model listen to?",
     "The first model: three hundred decision trees that vote, trained on three songs in four. Then shuffle one column at a time on the songs it never saw: how much accuracy is lost?",
     "Draw the forest's own count instead: `pd.DataFrame({'feature': FEATURES, 'lost': model.feature_importances_})`. Which feature comes first now?",
     "scores = pd.DataFrame({'feature': FEATURES,\n    'lost': model.feature_importances_})\n# then the same alt.Chart(scores)... cell.\n# The two rankings differ: the forest's own count favours columns with many different values."),
    ("both", "3c · Two ways to rank the same features",
     "The forest's own count (made while it trained) beside the shuffle (measured on test songs it never saw), so you can see them disagree.",
     "Which feature moves most between the two rankings? Why might a column with many different values (like `duration_ms`) score higher in the forest's own count?",
     "# The forest's own count favours columns with many different values:\n# a tree can split them in many places, so they get used more often.\n# The shuffle asks a fairer question: how much worse is the model, on new songs, without it?"),
    ("score", "4a · Score it: right, compared with what, for whom?",
     "**Accuracy** is the share of test songs the model gets right. The **baseline** is the score of a rule that learns nothing: always the commonest genre. **Recall** for one genre is the share of its real songs the model gets right.",
     "Print the three numbers: `print(f'{accuracy:.0%} right, baseline {baseline:.0%}')` and `found.sort_values('recall')`. Which genre has the lowest recall?",
     "print(f'{accuracy:.0%} right, baseline {baseline:.0%}')\nfound.sort_values('recall')\n# Latin and pop are lowest: their playlists overlap."),
    ("lib-confusion", "4b · Where is it wrong? The library way",
     "scikit-learn draws the confusion matrix straight from the model. Read a row: of the real songs of that genre, what did the model call them?", None, None),
    ("confusion", "4c · A confusion matrix in Altair",
     "The same matrix, built: you choose the colours, the order and the words. Each row adds up to 100%.",
     "Show counts instead of shares: use `counts` in place of `share` when making `cm`, and `format='d'` for the text. Why are shares fairer for comparing genres?",
     "cm = pd.DataFrame(counts, index=labels, columns=labels)\n# ... and text=alt.Text('share:Q', format='d'), with domain off the colour scale\n# Genres have different numbers of songs; shares put every row on the same 0–100% footing."),
    ("depth", "4d · Is it learning, or memorising?",
     "One tree, allowed to grow deeper and deeper. Grey: how it scores on the songs it learnt from. Red: on songs it never saw.",
     "Find the best depth in code: `curve[curve['scored on'] == 'songs it never saw'].sort_values('accuracy').tail(1)`. Mark it on the chart with a rule.",
     "best = curve[curve['scored on'] == 'songs it never saw'].nlargest(1, 'accuracy')\nrule = alt.Chart(best).mark_rule(strokeDash=[4, 3]).encode(x='depth:Q')\n(alt.Chart(curve).mark_line(point=True).encode(\n    x='depth:Q', y=alt.Y('accuracy:Q', axis=alt.Axis(format='%')),\n    color='scored on:N') + rule).properties(width=470, height=300)"),
    ("boundary", "4e · Where does the model draw the line?",
     "Ask the tree about a grid of made-up songs, and colour each point of the grid by its answer: that is the boundary. Altair never sees the model, only a table of its answers.",
     "Change `depth = 3` to `depth = 20` and run it again. Would this boundary work on next year's songs?",
     "depth = 20\n# ... the rest of the cell unchanged.\n# The boundary wraps round single songs: it has memorised them. New songs won't sit in the same tiny islands."),
    ("lib-boundary", "4f · The boundary, the library way",
     "scikit-learn's `DecisionBoundaryDisplay` does the grid for you. Its default margin (`eps=1.0`) is meant for unscaled data: try deleting `eps=0.02` to see why it is set.", None, None),
    ("lib-tree", "4g · The tree's questions, drawn out",
     "`plot_tree` draws the same kind of tree as a flowchart: each box is a yes/no question, and each answer box says which genre it guesses and what share of songs reach it. This is the depth-2 tree, the \"too simple\" boundary, as questions.",
     "Change `max_depth=2` to `max_depth=3`. How many answer boxes now? Could you still explain every one to a friend?",
     "small = DecisionTreeClassifier(max_depth=3, random_state=0)\n# ... the rest unchanged. Eight answer boxes: still readable.\n# At the best depth for six genres, the tree has hundreds: that is why we chart its behaviour instead."),
    ("hit", "5 · Tell the public: the honest comparison",
     f"A \"hit\" is popularity 80 or more: {F['hitShare'] * 100:.1f}% of songs. The model is right {F['hitAccuracy'] * 100:.1f}% of the time; saying \"not a hit\" every time is right {F['alwaysNo'] * 100:.1f}%. The chart puts the three numbers a reader needs side by side.",
     "Lower the bar for a hit to 70 and run it again. Does the model find more of the real hits? Is \"98% accurate\" still the right headline?",
     "hit = unique['track_popularity'] >= 70\n# ... the rest unchanged. More songs count as hits, the baseline's score falls,\n# and the share of real hits found is still the number a reader needs."),
]

for key, title, what, task, model in SECTIONS:
    md(f"## {title}\n\n{what}")
    code(STEPS[key]["code"])
    if task:
        md(f"**Try it.** {task}\n\n" + answer(model))

md("""
## Next: the lab

Open `10_Activity_IPDV_Model_Check.ipynb`. A new question for the same five checks: **can the audio tell R&B from
rap?** You will look first, find which columns differ, train a model, find where it is wrong, and write the honest
headline.
""")

nb = nbf.v4.new_notebook(cells=cells)
nb.metadata = {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"}, "language_info": {"name": "python"}}
nbf.write(nb, OUT)
print("wrote", OUT.relative_to(ROOT))

# Every Build-it as one file students can run: the setup, then each part in the lecture's order.
script = ["# LDSCI6253 Week 10 · What does the model see? Every Build-it, ready to run.",
          "# Put songs.csv beside this file. In a notebook, paste one part per cell, in order:",
          "# each part shows its chart as the last line of the cell.", "", SETUP_CELL]
for i, (key, title, *_rest) in enumerate(SECTIONS, 1):
    script += ["", "", f"# %% {title}", STEPS[key]["code"].strip()]
(DATA / "week10_build_its.py").write_text("\n".join(script) + "\n")
print("wrote", (DATA / "week10_build_its.py").relative_to(ROOT))

if "--run" in sys.argv:
    from nbclient import NotebookClient
    ran = nbf.read(OUT, as_version=4)
    NotebookClient(ran, timeout=300, kernel_name="python3", resources={"metadata": {"path": str(DATA)}}).execute()
    for c in ran.cells:
        for o in c.get("outputs", []):
            assert o.get("output_type") != "error", (c.source[:80], o.get("evalue"))
    nbf.write(ran, RUN)
    print("ran it end to end, no errors:", RUN.relative_to(ROOT))
