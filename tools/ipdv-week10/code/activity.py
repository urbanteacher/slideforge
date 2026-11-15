"""Week 10's lab challenge (LDSCI6253, visualisation for machine learning): "R&B or rap? Check the model".

One hour. The lecture's Build-its checked a six-genre model on songs; here students run the same five checks on a
new question, two genres a listener can tell apart but the numbers only partly can. One source, two notebooks:

    lessons/10_Activity_IPDV_Model_Check.ipynb             the student copy: tasks, with blanks (___) to fill
    lessons/10_Activity_IPDV_Model_Check_Solutions.ipynb   the teacher copy: every blank filled and run, what each
                                                           cell should show, timings, an error guide, a picture of
                                                           every chart (plan B), sample answers, a marking guide

In the code below, ⟦…⟧ marks what the student writes: the student copy shows ___ there, the teacher copy what is
inside, so the two copies can never disagree. Every number in a check or a heading is worked out from the data here.

    uv run --with nbformat --with nbclient --with ipykernel --with altair --with pandas --with scikit-learn \\
        --with vl-convert-python python tools/ipdv-week10/code/activity.py [picsdir]
"""
import ast
import base64
import os
import pathlib
import re
import sys

import nbformat as nbf
import numpy as np
import pandas as pd
from nbclient import NotebookClient
from sklearn.ensemble import RandomForestClassifier
from sklearn.inspection import permutation_importance
from sklearn.model_selection import train_test_split, validation_curve
from sklearn.tree import DecisionTreeClassifier

ROOT = pathlib.Path(__file__).resolve().parents[3]
DATA = ROOT / "assets/lesson/ipdv/week10"
STUDENT = ROOT / "lessons/10_Activity_IPDV_Model_Check.ipynb"
TEACHER = ROOT / "lessons/10_Activity_IPDV_Model_Check_Solutions.ipynb"
LIVE = "https://slideforge-rpjj.onrender.com/assets/lesson/ipdv/week10/"
FEATURES = ['danceability', 'energy', 'loudness', 'speechiness', 'acousticness', 'instrumentalness',
            'liveness', 'valence', 'tempo', 'duration_ms']

# ------------------------------------------------------------------ the facts, from the data
songs = pd.read_csv(DATA / "songs.csv")
two = songs[songs["playlist_genre"].isin(["r&b", "rap"])]
both = int(two.groupby("track_id")["playlist_genre"].nunique().gt(1).sum())
unique = two.drop_duplicates("track_id").sample(frac=1, random_state=0)
X, y = unique[FEATURES], unique["playlist_genre"]
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, random_state=0, stratify=y)
model = RandomForestClassifier(300, random_state=0).fit(X_tr, y_tr)
guess = model.predict(X_te)
perm = permutation_importance(model, X_te, y_te, n_repeats=5, random_state=0)
order = [FEATURES[i] for i in np.argsort(-perm.importances_mean)]
depths = list(range(1, 21))
tr, te = validation_curve(DecisionTreeClassifier(random_state=0), X, y, param_name="max_depth", param_range=depths, cv=3)
med = unique.groupby("playlist_genre")[FEATURES].median()
F = dict(rows=len(two), tracks=len(unique), both=both, rap=int((y == "rap").sum()), rnb=int((y == "r&b").sum()),
         acc=float((guess == y_te).mean()), base=float(y_te.value_counts(normalize=True).max()),
         rec_rnb=float(((guess == "r&b") & (y_te == "r&b")).sum() / (y_te == "r&b").sum()),
         rec_rap=float(((guess == "rap") & (y_te == "rap")).sum() / (y_te == "rap").sum()),
         top=order[0], second=order[1], best=depths[int(te.mean(1).argmax())], best_acc=float(te.mean(1).max()),
         deep_train=float(tr.mean(1)[-1]), deep_test=float(te.mean(1)[-1]),
         sp_rap=float(med.loc["rap", "speechiness"]), sp_rnb=float(med.loc["r&b", "speechiness"]))
assert F["top"] == "speechiness" and F["acc"] > F["base"] + 0.15 and F["rec_rap"] > F["rec_rnb"], F   # the story
pc = lambda v: f"{v * 100:.0f}%"

# Each entry: (kind, text, who); kind is 'md', 'code' or 'planb'; who is 'both', 'student' or 'teacher'.
parts = []
md = lambda text, who="both": parts.append(("md", text.strip(), who))
code = lambda text, who="both": parts.append(("code", text.strip(), who))
teacher = lambda text: md("> **Teacher:** " + text.strip().replace("\n", "\n> "), "teacher")
see = lambda text: md("> 👀 **You should see:** " + text.strip().replace("\n", "\n> "), "teacher")
planb = lambda label: parts.append(("planb", label, "teacher"))
write_here = lambda prompt: md("✏️ *" + prompt + "*", "student")
hint = lambda text: md("<details><summary>💡 <b>Hint</b></summary>\n\n" + text.strip() + "\n</details>")

# ------------------------------------------------------------------ opening
md(f"""
# Week 10 lab · R&B or rap? Check the model

**LDSCI6253 Advanced Information Presentation & Visualisation** · Northeastern University London

In the lecture a model guessed six genres from ten numbers, and five charts showed what it saw and where it went
wrong. Today: **one question, the same five checks.** You can hear the difference between R&B and rap. Can a model
tell them apart from the numbers alone, and how would you say so honestly?

| Part | You will… | The chart | Time |
|---|---|---|---|
| **A** | look first: how many songs, how many repeats, which labels disagree | counts | 8 min |
| **B** | find the columns where the two genres differ | box plots, repeated | 10 min |
| **C** | train a model and score it against the lazy answer | | 8 min |
| **D** | find where it is wrong, and what it listens to | confusion matrix, importance | 14 min |
| **E** | find out if it is learning or memorising | the depth curve | 10 min |
| **F** | hand in: the honest chart and its headline | the honest comparison | 10 min |

**How to work, in pairs.** One of you types, the other checks. Before each Run, the checker says what they expect
to see; after it, compare. Swap at each letter. The lecture's code is in `10_Notebook_IPDV_Machine_Learning.ipynb`
and `week10_build_its.py`: each part says which section to look at.

- Where you see `___`, replace it with code, then run the cell (Shift + Enter). Run cells **in order**.
- A ✅ or ❌ line after a cell says whether you are on track.
- Stuck? Open the 💡 **Hint**, then the tutorial section named.

**If you get an error**
- `NameError`: a cell above was not run, or a name is missing its quotes.
- An error that mentions **`BLANK`** or `___`: a blank is still empty.
- `MaxRowsError`: Altair draws up to 5,000 rows. Chart `sample`, not `unique`.
- `SchemaValidationError`: a column name is misspelt, or missing its type (`'speechiness:Q'`).
""")

md(f"""
# Teacher copy: solutions, timings and marking

The student activity with every blank filled in and run. Under each code cell, 👀 says what students should see; each
chart has a picture after it (plan B: if Python will not run, put the pictures on screen and run the parts as a
discussion). Both copies come from `tools/ipdv-week10/code/activity.py`, so they always match.

| Part | Time | The point |
|---|---|---|
| Set up | 2 min | One cell; the data loads from beside the notebook or from the course site |
| A | 8 min | {F['rows']:,} rows but {F['tracks']:,} songs; {F['both']} songs are filed as **both** R&B and rap. The labels are noisy before any model |
| B | 10 min | Speechiness differs most (medians: rap {F['sp_rap']:.2f}, R&B {F['sp_rnb']:.2f}); the rest overlap |
| C | 8 min | {pc(F['acc'])} right against {pc(F['base'])} for always saying the commoner genre |
| D | 14 min | Rap is found {pc(F['rec_rap'])} of the time, R&B {pc(F['rec_rnb'])}; {F['top']} is what it listens to most |
| E | 10 min | Best on new songs at depth {F['best']} ({pc(F['best_acc'])}); at depth 20 it is {pc(F['deep_train'])} on songs it learnt, {pc(F['deep_test'])} on new ones |
| F | 10 min | The honest chart: the model, the lazy answer and each genre's score, side by side, with a finding as its title |

**Learning outcome:** check a classification model with charts before, inside and after it, and report its score
against a baseline and per group.

**Setup:** Python with `altair` (5.4 or later), `pandas` and `scikit-learn`, in VS Code, JupyterLab or Colab.
`songs.csv` should sit beside the notebook; if not, `load()` fetches it from the course site (it can take 30 seconds
to wake the first time). Part E's curve takes about 15 seconds.

**When a student is stuck**

| They see | It means | Say |
|---|---|---|
| `MaxRowsError` | they charted `unique` ({F['tracks']:,} rows) | "Chart `sample`: Altair draws up to 5,000 rows." |
| `ModuleNotFoundError: sklearn` | scikit-learn is not installed | "`pip install scikit-learn`, then restart the kernel." |
| Accuracy far from {pc(F['acc'])} | a different split | "Is `random_state=0` there, and `stratify=y`?" |
| A confusion matrix of counts | the row shares were skipped | "Divide by each row's total: `axis=1`." |
| Every box the same height in B | `y` is not repeated | "`alt.repeat('column')` goes in `y`, with `type='quantitative'`." |

**If students finish early:** add a third genre (`'pop'`) and redo D: which pair does it confuse most? Or repeat C to
E with `max_depth={F['best']}` on a single tree and compare it with the forest.
""", "teacher")

# ------------------------------------------------------------------ 0
md("""
## 0 · Set up

Run this cell first. It loads the songs and sets the ten audio numbers a model sees.
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

___ = 'BLANK: replace ___ with your code'   # an empty blank names itself in the error

songs = load('songs')
FEATURES = ['danceability', 'energy', 'loudness',
            'speechiness', 'acousticness', 'instrumentalness',
            'liveness', 'valence', 'tempo', 'duration_ms']
pair = alt.Color('playlist_genre:N', title='genre', scale=alt.Scale(
    domain=['r&b', 'rap'], range=['#009e73', '#d55e00']))
songs.head()
""")
see("a table of five songs: name, artist, popularity, the playlist's genre and subgenre, then the audio numbers.")

# ------------------------------------------------------------------ A
md("""
## A · Look first (8 min · tutorial §1)

**A1.** Keep only the rows whose `playlist_genre` is R&B or rap. The genres are written `'r&b'` and `'rap'`.
""")
code("""
two = songs[songs['playlist_genre'].isin(⟦['r&b', 'rap']⟧)]
len(two)
""")
md("**A2.** The same song can sit in several playlists. Count the songs filed under **both** genres.")
code(f"""
genres_per_song = two.groupby('track_id')['playlist_genre'].nunique()
both = (genres_per_song > ⟦1⟧).sum()
check(both == {F['both']}, f'{{both}} songs are filed as both R&B and rap: their label is a coin toss',
      'count the songs with more than one genre')
""")
md("**A3.** Keep one row per song, then shuffle (the file is sorted by playlist). Take a sample to chart.")
code(f"""
unique = two.drop_duplicates(⟦'track_id'⟧).sample(frac=1, random_state=0)
sample = unique.sample(4000, random_state=0)
check(len(unique) == {F['tracks']}, f'{{len(unique)}} songs: {{(unique.playlist_genre == "rap").sum()}} rap, '
      f'{{(unique.playlist_genre == "r&b").sum()}} R&B', 'drop the repeats by their id')
""")
see(f"✅ {F['tracks']:,} songs: {F['rap']:,} rap, {F['rnb']:,} R&B. And {F['both']} filed as both in A2.")
write_here("In one sentence: what does A2 mean for any model trained on these labels?")
teacher(f"A good answer: about {F['both'] / F['tracks'] * 100:.0f} songs in 100 have a label that is partly arbitrary, so no model can be right on all of them. The labels are the playlist's, not the song's.")

# ------------------------------------------------------------------ B
md("""
## B · Which columns differ? (10 min · tutorial §1c and §2b)

**B1.** Draw a box plot per genre for four columns at once: one chart, repeated.
""")
hint("`mark_boxplot()` draws the boxes. `alt.repeat('column')` stands in for each name in the list.")
code("""
alt.Chart(sample).mark_⟦boxplot⟧(size=40).encode(
    x=alt.X('playlist_genre:N', title=None),
    y=alt.Y(alt.repeat('column'), type='quantitative'),
    color=pair.legend(None),
).properties(width=150, height=250).repeat(
    column=['speechiness', 'danceability', 'energy', 'tempo'],
)
""")
see(f"four pairs of boxes. Rap's speechiness box sits clearly higher (medians {F['sp_rap']:.2f} against {F['sp_rnb']:.2f}); the other three overlap a lot.")
planb("boxes")
write_here("Which column will help a model most? Which will hardly help? Write your guess: Part D checks it.")

# ------------------------------------------------------------------ C
md("""
## C · Train and score (8 min · tutorial §3b)

**C1.** Hide one song in four from the model, so you can test it on songs it never saw. `stratify=y` keeps the same
share of each genre in both halves.
""")
code("""
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier

X, y = unique[FEATURES], unique['playlist_genre']
X_tr, X_te, y_tr, y_te = train_test_split(
    X, y, test_size=⟦0.25⟧, random_state=0, stratify=⟦y⟧)
model = RandomForestClassifier(300, random_state=0)
model.fit(X_tr, y_tr)
guess = model.predict(X_te)
""")
md("**C2.** How often is it right, and what would the lazy answer score: always the commoner genre?")
code(f"""
accuracy = (guess == y_te).mean()
lazy = y_te.value_counts(normalize=True).⟦max()⟧
check(abs(accuracy - {F['acc']:.3f}) < 0.01 and abs(lazy - {F['base']:.3f}) < 0.01,
      f'the model: {{accuracy:.0%}}; the lazy answer: {{lazy:.0%}}', 'is random_state=0 there, and stratify=y?')
""")
see(f"✅ the model: {pc(F['acc'])}; the lazy answer: {pc(F['base'])}. It has learnt something real.")

# ------------------------------------------------------------------ D
md("""
## D · Where is it wrong, and what does it listen to? (14 min · tutorial §4b and §3b)

**D1.** A confusion matrix as shares of each real genre: each row adds up to 100%.
""")
hint("Divide each row by its own total: `counts.sum(axis=1, keepdims=True)`. Cells are `mark_rect`.")
code("""
from sklearn.metrics import confusion_matrix

labels = ['r&b', 'rap']
counts = confusion_matrix(y_te, guess, labels=labels)
share = counts / counts.sum(axis=⟦1⟧, keepdims=True)
cm = (pd.DataFrame(share, index=labels, columns=labels)
        .reset_index(names='true')
        .melt('true', var_name='guessed', value_name='share'))

base = alt.Chart(cm).encode(
    x=alt.X('guessed:N', title='the model guessed'),
    y=alt.Y('true:N', title='the real genre'))
cells = base.mark_⟦rect⟧().encode(
    color=alt.Color('share:Q', scale=alt.Scale(scheme='blues', domain=[0, 1]), legend=None))
words = base.mark_text(fontSize=20).encode(
    text=alt.Text('share:Q', format='.0%'),
    color=alt.when(alt.datum.share > 0.5).then(alt.value('white')).otherwise(alt.value('black')))
(cells + words).properties(width=260, height=260)
""")
see(f"a 2 × 2 grid. Rap is recognised {pc(F['rec_rap'])} of the time, R&B {pc(F['rec_rnb'])}: R&B is mistaken for rap more often than the other way round.")
planb("confusion")
md("**D2.** Shuffle each column in turn on the test songs: how much accuracy does the model lose?")
code(f"""
from sklearn.inspection import permutation_importance

shuffled = permutation_importance(model, X_te, y_te, n_repeats=5, random_state=0)
scores = pd.DataFrame({{'feature': FEATURES, 'lost': shuffled.importances_mean}})

alt.Chart(scores).mark_bar(color='#0c3354').encode(
    x=alt.X('lost:Q', axis=alt.Axis(format='%'), title='accuracy lost when shuffled'),
    y=alt.Y('feature:N', sort=⟦'-x'⟧, title=None),
).properties(width=420, height=260)
""")
see(f"{F['top']} far ahead of the rest, then {F['second']}. Compare with your guess in B.")
planb("importance")
write_here("Was your guess from B right? Does speechiness *make* a song rap? Say why not in one sentence.")

# ------------------------------------------------------------------ E
md("""
## E · Learning, or memorising? (10 min · tutorial §4c)

**E1.** One tree, allowed to ask more and more questions (`max_depth`). Score it on the songs it learnt from and on
songs it never saw.
""")
code("""
from sklearn.model_selection import validation_curve
from sklearn.tree import DecisionTreeClassifier

depths = list(range(1, 21))
train, test = validation_curve(
    DecisionTreeClassifier(random_state=0), X, y,
    param_name=⟦'max_depth'⟧, param_range=depths, cv=3)
curve = pd.DataFrame({'depth': depths,
    'songs it learnt from': train.mean(axis=1),
    'songs it never saw': test.mean(axis=1),
}).melt('depth', var_name='scored on', value_name='accuracy')

alt.Chart(curve).mark_line(point=True).encode(
    x=alt.X('depth:Q', title='how deep the tree may grow'),
    y=alt.Y('accuracy:Q', axis=alt.Axis(format='%'), scale=alt.Scale(zero=False)),
    color=alt.Color('scored on:N', scale=alt.Scale(range=['#9aa3ad', '#c8102e'])),
).properties(width=420, height=260)
""")
see(f"grey climbs to {pc(F['deep_train'])}; red peaks near depth {F['best']} ({pc(F['best_acc'])}) and then slips to {pc(F['deep_test'])}. Past the peak the tree memorises.")
planb("depth")
md("**E2.** Find the best depth in code.")
code(f"""
new = curve[curve['scored on'] == 'songs it never saw']
best = new.loc[new['accuracy'].idxmax(), ⟦'depth'⟧]
check(best == {F['best']}, f'best on new songs at depth {{best}}', "the row with the highest accuracy: its 'depth'")
""")

# ------------------------------------------------------------------ F
md(f"""
## F · Tell the public (10 min · tutorial §5) and hand in

**F1.** One honest chart: the model, the lazy answer, and how often each genre is recognised, on one axis from 0 to
100%. Then **write its title as a finding** (Week 9): what should a reader take away?
""")
code(f"""
recall = {{g: ((guess == g) & (y_te == g)).sum() / (y_te == g).sum() for g in labels}}
honest = pd.DataFrame({{'claim': [
        'the model is right', 'always saying "rap" is right',
        'real rap songs it recognises', 'real R&B songs it recognises'],
    'share': [accuracy, lazy, recall['rap'], recall['r&b']]}})

finding = ⟦'The audio tells rap from R&B {pc(F['acc'])} of the time, and misses R&B more often'⟧

bars = alt.Chart(honest).mark_bar(color='#0c3354').encode(
    x=alt.X('share:Q', axis=alt.Axis(format='%'), scale=alt.Scale(domain=[0, 1]), title=None),
    y=alt.Y('claim:N', sort=None, title=None))
labels_on = bars.mark_text(align='left', dx=6).encode(text=alt.Text('share:Q', format='.0%'))
(bars + labels_on).properties(width=420, height=170,
    title=alt.Title(finding, subtitle='Songs the model had never seen; the genre is the playlist’s'))
""")
see("four bars on one 0–100% axis, with the student's finding as the title.")
planb("honest")
md("""
**F2 · Hand in** (Canvas, by midday on the Friday after the lab): this notebook, run top to bottom, and under this
cell **one sentence per part** (A to F) saying what its chart or number shows. For F, add: *what would a reader need
to know to disagree with your title?*
""")
write_here("A: … B: … C: … D: … E: … F: …")
teacher(f"""**Marking guide (6 marks, one per part).** A: names the {F['both']} double-filed songs as label noise. B: picks
speechiness, from the boxes. C: reports {pc(F['acc'])} **against** {pc(F['base'])}. D: says R&B is missed more often than rap, and that
importance is not cause. E: names a depth near {F['best']} and calls the gap memorising. F: a title that is a finding, the
baseline on the chart, and one thing a reader would need (the labels are the playlist's; only {F['tracks']:,} songs from 2020
playlists; a different split moves the score by a point or two).

**Sample F sentence (excellent):** "The audio alone tells rap from R&B {pc(F['acc'])} of the time, against {pc(F['base'])} for always
guessing rap; it misses R&B more often, and {F['both']} songs carry both labels, so some of its 'mistakes' are the
playlists'." """)


# ------------------------------------------------------------------ build
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
    NotebookClient(solutions, timeout=300, kernel_name="python3",
                   resources={"metadata": {"path": str(DATA)}}).execute()
    for cell in solutions.cells:   # a cell that ran into an error fails the build
        for out in cell.get("outputs", []):
            assert out.get("output_type") != "error", (cell.source[:80], out.get("evalue"))
            assert "❌" not in "".join(out.get("text", "")), (cell.source[:80], out.get("text"))
    nbf.write(student, STUDENT)
    nbf.write(solutions, TEACHER)
    if len(sys.argv) > 1:   # a folder to drop the plan-B pictures in, for looking at them
        for label, png in shots.items():
            pathlib.Path(sys.argv[1], f"planb-{label}.png").write_bytes(png)
    print("wrote", STUDENT.relative_to(ROOT), "and", TEACHER.relative_to(ROOT), "(run, no errors)")
