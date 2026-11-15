"""Week 10's Build-it code (LDSCI6253, visualisation for machine learning), run for real.

Each STEP is the code a slide prints. This script runs them in order, renders
each picture, and writes

    assets/lesson/ipdv/week10/code-<id>.png   the picture the step makes
    tools/ipdv-week10/code/steps.json         the code, for the slides
    tools/ipdv-week10/data/facts.json         every number the slides quote

so the code on a slide is always the code that drew the picture beside it,
and no number on a slide is typed by hand. "lib-*" steps are the one-line
library charts (seaborn, scikit-learn's displays); the others are Altair.

    uv run --with altair --with pandas --with vl-convert-python --with scikit-learn \
        --with seaborn --with matplotlib python tools/ipdv-week10/code/steps.py
"""
import json
import os
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = ROOT / "assets/lesson/ipdv/week10"
os.chdir(OUT)  # the code reads 'songs.csv', as a student's notebook will

import altair as alt  # noqa: E402
import matplotlib  # noqa: E402
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

# Every line a slide prints is kept to about 60 characters, so it can be printed large.
SETUP = """import altair as alt
import pandas as pd

songs = pd.read_csv('songs.csv')
FEATURES = ['danceability', 'energy', 'loudness',
            'speechiness', 'acousticness', 'instrumentalness',
            'liveness', 'valence', 'tempo', 'duration_ms']
# Okabe and Ito's colour-blind-safe colours, one per genre
genre = alt.Color('playlist_genre:N', title='genre',
    scale=alt.Scale(
        domain=['edm', 'latin', 'pop', 'r&b', 'rap', 'rock'],
        range=['#0072b2', '#e69f00', '#cc79a7', '#009e73',
               '#d55e00', '#56b4e9']))
"""

SETUP_SHOW = SETUP + """
# How many songs in each genre?
alt.Chart(songs).mark_bar().encode(
    x=alt.X('count()', title='rows in the file'),
    y=alt.Y('playlist_genre:N', sort='-x', title=None),
    color=genre.legend(None),
).properties(width=420, height=220)
"""

# ------------------------------------------------------------ stop 1: look before you model
LOOK_KEEP = """# The file is sorted by playlist. Shuffle it once, so any
# slice of it (a sample, a test set) mixes every genre.
unique = (songs.drop_duplicates('track_id')
          .sample(frac=1, random_state=0))
sample = unique.sample(4000, random_state=0)
"""
LOOK = LOOK_KEEP + """
alt.Chart(sample).mark_bar().encode(
    x=alt.X('track_popularity:Q', bin=alt.Bin(step=2),
            title='popularity (0 to 100)'),
    y=alt.Y('count()', title='songs'),
).properties(width=520, height=300)
"""
BOX = """alt.Chart(sample).mark_boxplot(size=30).encode(
    x=alt.X('playlist_genre:N', title=None),
    y=alt.Y('speechiness:Q', title='speechiness (0 to 1)'),
    color=genre.legend(None),
).properties(width=520, height=300)
"""
LIB_LOOK = """import seaborn as sns

songs.isna().sum()            # missing values, per column
songs.duplicated('track_id').sum()   # the same song twice

sns.histplot(songs, x='track_popularity', bins=50)
"""

# ------------------------------------------------------------ stop 2: too many columns
MATRIX = """brush = alt.selection_interval()
small = sample.sample(1500, random_state=1)

alt.Chart(small).mark_point(size=12).encode(
    alt.X(alt.repeat('column'), type='quantitative'),
    alt.Y(alt.repeat('row'), type='quantitative'),
    color=alt.when(brush).then(genre)
             .otherwise(alt.value('#d9dde2')),
).add_params(brush).properties(
    width=125, height=125,
).repeat(
    row=['danceability', 'energy', 'speechiness'],
    column=['danceability', 'energy', 'speechiness'],
)
"""
LIB_PAIR = """import seaborn as sns

few = ['danceability', 'energy', 'speechiness']
sns.pairplot(sample, vars=few, hue='playlist_genre',
             plot_kws={'s': 6})
"""
PCA = """from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

scaled = StandardScaler().fit_transform(sample[FEATURES])
pca = PCA(n_components=2).fit(scaled)
xy = pca.transform(scaled)
mapped = sample.assign(pc1=xy[:, 0], pc2=xy[:, 1])
kept = pca.explained_variance_ratio_.sum()

alt.Chart(mapped).mark_circle(size=10, opacity=0.6).encode(
    x=alt.X('pc1:Q', title='first direction'),
    y=alt.Y('pc2:Q', title='second direction'),
    color=genre,
    tooltip=['track_name', 'track_artist', 'playlist_genre'],
).properties(width=470, height=330,
    title=f'Two axes keep {kept:.0%} of the variation')
"""

KMEANS = """from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

scaled = StandardScaler().fit_transform(unique[FEATURES])
groups = KMeans(n_clusters=5, n_init=10,
                random_state=0).fit_predict(scaled)

# What is each group like? Its average on every feature,
# in standard units: 0 is the average song
profile = (pd.DataFrame(scaled, columns=FEATURES)
           .assign(group=[f'group {g + 1}' for g in groups])
           .groupby('group').mean().reset_index()
           .melt('group', var_name='feature', value_name='z'))

alt.Chart(profile).mark_rect().encode(
    x=alt.X('feature:N', sort=FEATURES, title=None),
    y=alt.Y('group:N', title=None),
    color=alt.Color('z:Q', title='above or below average',
        scale=alt.Scale(scheme='redblue', domain=[-1.5, 1.5],
                        reverse=True)),
).properties(width=420, height=210)
"""

# ------------------------------------------------------------ stop 3: what does the model listen to?
MODEL_KEEP = """from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier

X, y = unique[FEATURES], unique['playlist_genre']
X_tr, X_te, y_tr, y_te = train_test_split(
    X, y, test_size=0.25, random_state=0, stratify=y)
model = RandomForestClassifier(300, random_state=0)
model.fit(X_tr, y_tr)        # learn from 3 songs in 4
"""
CORR = """corr = (unique[FEATURES].corr().reset_index()
        .melt('index', var_name='other', value_name='r'))

base = alt.Chart(corr).encode(
    x=alt.X('index:N', title=None, sort=FEATURES),
    y=alt.Y('other:N', title=None, sort=FEATURES))
cells = base.mark_rect().encode(
    color=alt.Color('r:Q', scale=alt.Scale(
        scheme='redblue', domain=[-1, 1], reverse=True)))
words = base.mark_text(fontSize=9).encode(
    text=alt.Text('r:Q', format='.1f'))

(cells + words).properties(width=380, height=380)
"""
IMPORTANCE = MODEL_KEEP + """
from sklearn.inspection import permutation_importance
shuffled = permutation_importance(
    model, X_te, y_te, n_repeats=5, random_state=0)
scores = pd.DataFrame({'feature': FEATURES,
    'lost': shuffled.importances_mean})

alt.Chart(scores).mark_bar(color='#0c3354').encode(
    x=alt.X('lost:Q', axis=alt.Axis(format='%'),
            title='accuracy lost when the feature is shuffled'),
    y=alt.Y('feature:N', sort='-x', title=None),
).properties(width=460, height=300)
"""

BOTH = """both = pd.DataFrame({'feature': FEATURES,
    'the forest’s own count': model.feature_importances_,
    'shuffle and see': shuffled.importances_mean,
}).melt('feature', var_name='method', value_name='importance')

alt.Chart(both).mark_bar(color='#0c3354').encode(
    x=alt.X('importance:Q', title=None),
    y=alt.Y('feature:N', sort='-x', title=None),
).properties(width=200, height=260).facet(
    column=alt.Column('method:N', title=None),
).resolve_scale(x='independent', y='independent')
"""

# ------------------------------------------------------------ stop 4: where is it wrong?
SCORE = """guess = model.predict(X_te)            # songs it never saw
accuracy = (guess == y_te).mean()         # share it got right
baseline = y_te.value_counts(normalize=True).max()
labels = sorted(y.unique())
found = pd.DataFrame({'genre': labels, 'recall': [
    (guess[y_te == g] == g).mean() for g in labels]})

bars = alt.Chart(found).mark_bar().encode(
    x=alt.X('recall:Q', axis=alt.Axis(format='%'),
            scale=alt.Scale(domain=[0, 1]),
            title='share of each genre’s songs it got right'),
    y=alt.Y('genre:N', sort='-x', title=None),
    color=genre.legend(None))
lines = alt.Chart(pd.DataFrame({'at': [accuracy, baseline],
    'what': ['all songs', 'always the commonest genre']})
).mark_rule(strokeDash=[5, 3]).encode(x='at:Q')
names = lines.mark_text(align='left', dx=4, y=-8).encode(
    text='what:N')
(bars + lines + names).properties(width=420, height=230)
"""

CONFUSION = """from sklearn.metrics import confusion_matrix

labels = sorted(y.unique())
counts = confusion_matrix(y_te, model.predict(X_te),
                          labels=labels)
share = counts / counts.sum(axis=1, keepdims=True)
cm = pd.DataFrame(share, index=labels, columns=labels)
cm = (cm.reset_index(names='true')
        .melt('true', var_name='guessed', value_name='share'))

base = alt.Chart(cm).encode(
    x=alt.X('guessed:N', title='the model guessed'),
    y=alt.Y('true:N', title='the real genre'))
cells = base.mark_rect().encode(
    color=alt.Color('share:Q', scale=alt.Scale(scheme='blues'),
                    legend=None))
words = base.mark_text().encode(
    text=alt.Text('share:Q', format='.0%'),
    color=alt.when(alt.datum.share > 0.5)
             .then(alt.value('white')).otherwise(alt.value('black')))

(cells + words).properties(width=360, height=360)
"""
LIB_CONFUSION = """from sklearn.metrics import ConfusionMatrixDisplay

ConfusionMatrixDisplay.from_estimator(
    model, X_te, y_te, normalize='true',
    values_format='.0%', cmap='Blues')
"""
DEPTH = """from sklearn.model_selection import validation_curve
from sklearn.tree import DecisionTreeClassifier

depths = list(range(1, 26))
train, test = validation_curve(
    DecisionTreeClassifier(random_state=0), X, y,
    param_name='max_depth', param_range=depths, cv=3)
curve = pd.DataFrame({'depth': depths,
    'songs it learnt from': train.mean(axis=1),
    'songs it never saw': test.mean(axis=1),
}).melt('depth', var_name='scored on', value_name='accuracy')

alt.Chart(curve).mark_line(point=True).encode(
    x=alt.X('depth:Q', title='how deep the tree may grow'),
    y=alt.Y('accuracy:Q', axis=alt.Axis(format='%')),
    color=alt.Color('scored on:N', scale=alt.Scale(
        range=['#9aa3ad', '#c8102e'])),
).properties(width=470, height=300)
"""
# Three genres and two features, so the boundary can be drawn on a page.
BOUNDARY_KEEP = """three = unique[unique['playlist_genre']
                .isin(['pop', 'rap', 'rock'])]
two = ['speechiness', 'danceability']
"""
BOUNDARY = BOUNDARY_KEEP + """depth = {depth}
tree = DecisionTreeClassifier(max_depth=depth, random_state=0)
tree.fit(three[two], three['playlist_genre'])

# Ask the tree about every point of a grid: its answer is the boundary
# 60 x 60 = 3,600 points: under Altair's 5,000-row limit
gx, gy = np.meshgrid(np.linspace(0, 0.5, 60), np.linspace(0.2, 1, 60))
grid = pd.DataFrame({{'speechiness': gx.ravel(),
                     'danceability': gy.ravel()}})
grid['playlist_genre'] = tree.predict(grid[two])

x = alt.X('speechiness:Q', scale=alt.Scale(domain=[0, 0.5]),
          axis=alt.Axis(values=[0, 0.1, 0.2, 0.3, 0.4, 0.5]))
y = alt.Y('danceability:Q', scale=alt.Scale(domain=[0.2, 1]))
area = alt.Chart(grid).mark_square(size=55, opacity=0.3).encode(
    x=x, y=y, color=genre)
seen = three.sample(600, random_state=0).query(
    'speechiness <= 0.5 and danceability >= 0.2')
dots = alt.Chart(seen).mark_circle(size=16, stroke='white',
    strokeWidth=0.5).encode(x=x, y=y, color=genre)

(area + dots).properties(width=400, height=330)
"""
LIB_BOUNDARY = """import numpy as np
from sklearn.inspection import DecisionBoundaryDisplay

shown = DecisionBoundaryDisplay.from_estimator(
    tree, three[two], response_method='predict',
    alpha=0.4, eps=0.02, cmap='tab10')
few = three.sample(600, random_state=0)
shown.ax_.scatter(few['speechiness'], few['danceability'],
    c=few['playlist_genre'].astype('category').cat.codes,
    cmap='tab10', vmax=9, s=8, edgecolor='white', linewidth=0.3)
"""

# ------------------------------------------------------------ stop 5: tell the public
HIT = """hit = unique['track_popularity'] >= 80     # a "hit"
X_tr, X_te, h_tr, h_te = train_test_split(
    X, hit, test_size=0.25, random_state=0, stratify=hit)
spotter = RandomForestClassifier(300, random_state=0)
guess = spotter.fit(X_tr, h_tr).predict(X_te)

scores = pd.DataFrame({'claim': [
    'the hit model is right',
    'saying "not a hit" every time is right',
    'real hits the model found'],
  'share': [(guess == h_te).mean(), 1 - h_te.mean(),
            guess[h_te.to_numpy()].mean()]})

alt.Chart(scores).mark_bar(color='#0c3354').encode(
    x=alt.X('share:Q', axis=alt.Axis(format='%'),
            scale=alt.Scale(domain=[0, 1]), title=None),
    y=alt.Y('claim:N', sort=None, title=None),
).properties(width=420, height=180) + alt.Chart(scores).mark_text(
    align='left', dx=6).encode(
    x='share:Q', y=alt.Y('claim:N', sort=None),
    text=alt.Text('share:Q', format='.1%'))
"""

# id: (printed code, what runs before it, the new names the slide lights in red, kind)
STEPS = [
    ("setup", SETUP_SHOW, "", ["FEATURES", "genre = alt.Color", "count()"], "alt"),
    ("lib-look", LIB_LOOK, SETUP, ["isna", "duplicated", "histplot"], "lib"),
    ("look", LOOK, SETUP, ["drop_duplicates", "sample", "bin=alt.Bin", "count()"], "alt"),
    ("box", BOX, SETUP + LOOK_KEEP, ["mark_boxplot", "genre.legend"], "alt"),
    ("lib-pair", LIB_PAIR, SETUP + LOOK_KEEP, ["pairplot", "hue="], "lib"),
    ("matrix", MATRIX, SETUP + LOOK_KEEP, ["selection_interval", "alt.repeat", "alt.when", ".repeat("], "alt"),
    ("pca", PCA, SETUP + LOOK_KEEP, ["StandardScaler", "PCA(", "explained_variance_ratio_", "tooltip"], "alt"),
    ("kmeans", KMEANS, SETUP + LOOK_KEEP, ["KMeans(n_clusters=5", "fit_predict", "groupby('group').mean()", "mark_rect"], "alt"),
    ("corr", CORR, SETUP + LOOK_KEEP, [".corr()", ".melt(", "mark_rect", "mark_text", "redblue"], "alt"),
    ("importance", IMPORTANCE, SETUP + LOOK_KEEP, ["train_test_split", "RandomForestClassifier", "model.fit", "permutation_importance", "sort='-x'"], "alt"),
    ("both", BOTH, SETUP + LOOK_KEEP + IMPORTANCE.rsplit("\nalt.Chart", 1)[0], ["feature_importances_", "importances_mean", ".facet(", "resolve_scale"], "alt"),
    ("score", SCORE, SETUP + LOOK_KEEP + MODEL_KEEP, ["model.predict(X_te)", "(guess == y_te).mean()", "value_counts(normalize=True).max()", "recall"], "alt"),
    ("lib-confusion", LIB_CONFUSION, SETUP + LOOK_KEEP + MODEL_KEEP, ["ConfusionMatrixDisplay", "from_estimator"], "lib"),
    ("confusion", CONFUSION, SETUP + LOOK_KEEP + MODEL_KEEP, ["confusion_matrix", "counts.sum", "mark_rect", "alt.when"], "alt"),
    ("depth", DEPTH, SETUP + LOOK_KEEP + MODEL_KEEP, ["validation_curve", "max_depth", "param_range"], "alt"),
    ("boundary", BOUNDARY.format(depth=3), SETUP + LOOK_KEEP + MODEL_KEEP + "import numpy as np\nfrom sklearn.tree import DecisionTreeClassifier\n", ["DecisionTreeClassifier", "meshgrid", "tree.predict", "mark_square"], "alt"),
    ("lib-boundary", LIB_BOUNDARY, SETUP + LOOK_KEEP + MODEL_KEEP + "import numpy as np\nfrom sklearn.tree import DecisionTreeClassifier\n" + BOUNDARY.format(depth=3), ["DecisionBoundaryDisplay", "eps=0.02", "scatter"], "lib"),
    ("hit", HIT, SETUP + LOOK_KEEP + MODEL_KEEP, ["track_popularity'] >= 80", "stratify=hit", "1 - h_te.mean()"], "alt"),
]


def save(id_, result, kind):
    path = OUT / f"code-{id_}.png"
    if kind == "lib":
        fig = plt.gcf()
        fig.set_dpi(100)
        fig.savefig(path, dpi=130, bbox_inches="tight", facecolor="white")
        plt.close("all")
    else:
        result.save(str(path), scale_factor=2)
    shrink(path)
    print("drew", path.name)


def shrink(path):
    """64 colours, no dithering: a chart has few colours, and the lesson carries these pictures inside it."""
    from PIL import Image
    Image.open(path).convert("RGB").quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(path, optimize=True)


def last_value(code, scope):
    """Run a cell the way Jupyter does: everything, then the last expression's value."""
    lines = code.rstrip().split("\n")
    # the last statement starts at the last line that isn't indented or a continuation
    start = max(i for i, l in enumerate(lines) if l and not l[0].isspace() and not l.startswith(")"))
    head, tail = "\n".join(lines[:start]), "\n".join(lines[start:])
    exec(head, scope)
    try:
        return eval(tail, scope)
    except SyntaxError:
        exec(tail, scope)
        return None


out = []
for id_, code, before, new, kind in STEPS:
    scope = {}
    exec(before, scope)
    plt.close("all")
    result = last_value(code, scope)
    save(id_, result, kind)
    for name in new:
        if name not in code:
            raise SystemExit(f"{id_}: '{name}' is not in its code")
    out.append({"id": id_, "kind": kind, "code": code, "run": before + "\n" + code, "new": new})

# The depth-2, 6 and 20 boundaries for the "too simple, about right, too wiggly" slide.
for d in (2, 6, 20):
    scope = {}
    exec(SETUP + LOOK_KEEP + "import numpy as np\nfrom sklearn.tree import DecisionTreeClassifier\n", scope)
    chart = last_value(BOUNDARY.format(depth=d), scope).properties(width=300, height=260)
    chart = chart.configure_legend(disable=True)
    chart.save(str(OUT / f"boundary-{d}.png"), scale_factor=2)
    shrink(OUT / f"boundary-{d}.png")
    print("drew", f"boundary-{d}.png")

(ROOT / "tools/ipdv-week10/code/steps.json").write_text(json.dumps({"steps": out}, indent=1, ensure_ascii=False) + "\n")

# ------------------------------------------------------------ every number a slide quotes
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor  # noqa: E402
from sklearn.inspection import permutation_importance  # noqa: E402
from sklearn.linear_model import LogisticRegression  # noqa: E402
from sklearn.metrics import confusion_matrix, mean_absolute_error, r2_score  # noqa: E402
from sklearn.model_selection import train_test_split, validation_curve  # noqa: E402
from sklearn.pipeline import make_pipeline  # noqa: E402
from sklearn.preprocessing import StandardScaler  # noqa: E402
from sklearn.decomposition import PCA  # noqa: E402
from sklearn.tree import DecisionTreeClassifier  # noqa: E402

scope = {}
exec(SETUP + LOOK_KEEP, scope)
songs, unique, F = scope["songs"], scope["unique"], scope["FEATURES"]
X, y = unique[F], unique["playlist_genre"]
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, random_state=0, stratify=y)
rf = RandomForestClassifier(300, random_state=0).fit(X_tr, y_tr)
pred = rf.predict(X_te)
labels = sorted(y.unique())
cm = confusion_matrix(y_te, pred, labels=labels)
recall = dict(zip(labels, (np.diag(cm) / cm.sum(1)).round(3)))
share = cm / cm.sum(1, keepdims=True)
np.fill_diagonal(share, 0)
mix = {g: labels[int(share[i].argmax())] for i, g in enumerate(labels)}
lr = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000)).fit(X_tr, y_tr)
perm = permutation_importance(rf, X_te, y_te, n_repeats=5, random_state=0)
perm = dict(sorted(zip(F, perm.importances_mean.round(4)), key=lambda kv: -kv[1]))
gini = dict(sorted(zip(F, rf.feature_importances_.round(4)), key=lambda kv: -kv[1]))
hit = unique["track_popularity"] >= 80
hX_tr, hX_te, h_tr, h_te = train_test_split(X, hit, test_size=0.25, random_state=0, stratify=hit)
hg = RandomForestClassifier(300, random_state=0).fit(hX_tr, h_tr).predict(hX_te)
pX_tr, pX_te, p_tr, p_te = train_test_split(X, unique["track_popularity"], test_size=0.25, random_state=0)
pp = RandomForestRegressor(300, random_state=0, min_samples_leaf=5).fit(pX_tr, p_tr).predict(pX_te)
pca = PCA(2).fit(StandardScaler().fit_transform(scope["sample"][F]))  # the Build-it's own sample, so its title agrees
depths = list(range(1, 26))
tr, te = validation_curve(DecisionTreeClassifier(random_state=0), X, y, param_name="max_depth", param_range=depths, cv=3)
te_m, tr_m = te.mean(1), tr.mean(1)
best = depths[int(te_m.argmax())]
by_genre = unique.groupby("playlist_genre")[["speechiness", "danceability", "energy", "acousticness", "tempo", "valence"]].mean().round(3)
rel = pd.to_datetime(songs.track_album_release_date, errors="coerce", format="mixed").dt.year
dup = songs[songs.duplicated("track_id", keep=False)]
facts = {
    "rows": len(songs), "tracks": int(songs.track_id.nunique()),
    "multiGenre": int(dup.groupby("track_id").playlist_genre.nunique().gt(1).sum()),
    "missingNames": int(songs.track_name.isna().sum()),
    "zeroPopularity": int((songs.track_popularity == 0).sum()),
    "zeroPopularityUnique": int((unique.track_popularity == 0).sum()),
    "zeroTempo": int((songs.tempo == 0).sum()),
    "shortestSeconds": round(float(songs.duration_ms.min()) / 1000, 1),
    "years": [int(rel.min()), int(rel.median()), int(rel.max())],
    "genreCounts": songs.playlist_genre.value_counts().to_dict(),
    "accuracy": round(float((pred == y_te).mean()), 3),
    "logistic": round(float(lr.score(X_te, y_te)), 3),
    "baseline": round(float(y_te.value_counts(normalize=True).max()), 3),
    "recall": {k: float(v) for k, v in recall.items()},
    "mostConfusedWith": mix,
    "permutation": {k: float(v) for k, v in perm.items()},
    "builtIn": {k: float(v) for k, v in gini.items()},
    "hitShare": round(float(hit.mean()), 3),
    "hitAccuracy": round(float((hg == h_te).mean()), 3),
    "alwaysNo": round(float(1 - h_te.mean()), 3),
    "hitsFound": round(float(hg[h_te.to_numpy()].mean()), 3),
    "hitsInTest": int(h_te.sum()),
    "popularityR2": round(float(r2_score(p_te, pp)), 3),
    "popularityMAE": round(float(mean_absolute_error(p_te, pp)), 1),
    "guessMeanMAE": round(float(mean_absolute_error(p_te, np.full(len(p_te), p_tr.mean()))), 1),
    "pca": [round(float(v), 3) for v in pca.explained_variance_ratio_],
    "corrEnergyLoudness": round(float(unique.energy.corr(unique.loudness)), 2),
    "corrEnergyAcoustic": round(float(unique.energy.corr(unique.acousticness)), 2),
    "byGenre": by_genre.to_dict(orient="index"),
    "depth": {"best": best, "bestTest": round(float(te_m.max()), 3), "at": {str(d): [round(float(a), 3), round(float(b), 3)] for d, a, b in zip(depths, tr_m, te_m)}},
}
# The songs the opener asks about: their numbers, and every genre their rows are filed under.
def song(name, artist):
    rows = songs[(songs.track_name == name) & (songs.track_artist == artist)]
    first = rows.iloc[0]
    return {"name": name, "artist": artist, "genres": sorted(rows.playlist_genre.unique()),
            **{k: round(float(first[k]), 3) for k in ["danceability", "energy", "speechiness", "acousticness", "valence", "tempo"]}}
facts["songs"] = [song("Suge", "DaBaby"), song("Highway to Hell", "AC/DC"), song("Perfect", "Ed Sheeran")]
assert [x["genres"] for x in facts["songs"]] == [["rap"], ["rock"], ["latin"]], "the opener's songs changed genre"
facts["hitsFoundCount"] = int(hg[h_te.to_numpy()].sum())
facts["hitsCalled"] = int(hg.sum())
facts["hitPrecision"] = round(float(h_te.to_numpy()[hg].mean()), 3) if hg.sum() else None
facts["testSongs"] = int(len(y_te))
facts["testRight"] = int((pred == y_te).sum())
from sklearn.model_selection import cross_val_score
cv = cross_val_score(RandomForestClassifier(300, random_state=0), X, y, cv=5)
facts["accuracyRange"] = [round(float(cv.min()), 3), round(float(cv.max()), 3)]
three = unique[unique["playlist_genre"].isin(["pop", "rap", "rock"])]
facts["threeBaseline"] = round(float(three["playlist_genre"].value_counts(normalize=True).max()), 3)
# The ladder: the best rule a person could read off one chart, or one scatter, against the forest on all ten
import itertools
one = sorted(((DecisionTreeClassifier(max_depth=3, random_state=0).fit(X_tr[[f]], y_tr).score(X_te[[f]], y_te), f) for f in F), reverse=True)[0]
two = sorted(((DecisionTreeClassifier(max_depth=4, random_state=0).fit(X_tr[[a, b]], y_tr).score(X_te[[a, b]], y_te), a, b) for a, b in itertools.combinations(F, 2)), reverse=True)[0]
facts["ladder"] = {"oneChart": round(float(one[0]), 3), "oneFeature": one[1], "scatter": round(float(two[0]), 3), "scatterFeatures": [two[1], two[2]]}
assert facts["baseline"] < facts["ladder"]["oneChart"] < facts["ladder"]["scatter"] < facts["accuracy"], "the ladder no longer climbs"
# The clusters, as the kmeans Build-it finds them
from sklearn.cluster import KMeans
from sklearn.neighbors import NearestNeighbors
Z = StandardScaler().fit_transform(unique[F])
km = KMeans(n_clusters=5, n_init=10, random_state=0).fit_predict(Z)
zp = pd.DataFrame(Z, columns=F).assign(g=km).groupby("g").mean()
WORD = {"danceability": "danceable", "energy": "energetic", "loudness": "loud", "speechiness": "wordy", "acousticness": "acoustic",
        "instrumentalness": "instrumental", "liveness": "live-sounding", "valence": "happy", "tempo": "fast", "duration_ms": "long"}
OPP = {"danceability": "hard to dance to", "energy": "calm", "loudness": "quiet", "speechiness": "few words", "acousticness": "electronic",
       "instrumentalness": "sung", "liveness": "studio", "valence": "sad", "tempo": "slow", "duration_ms": "short"}
clusters = []
for g in range(5):
    row = zp.loc[g].sort_values(key=abs, ascending=False)
    traits = [(WORD if v > 0 else OPP)[f] for f, v in row.head(2).items()]
    members = unique[km == g]
    share = members["playlist_genre"].value_counts(normalize=True)
    hits = members.sort_values("track_popularity", ascending=False)
    names = []
    for name, artist in hits[["track_name", "track_artist"]].itertuples(index=False):
        if (name, artist) not in names: names.append((name, artist))
        if len(names) == 3: break
    clusters.append({"group": g + 1, "size": int(len(members)), "traits": traits, "topGenre": share.index[0], "topShare": round(float(share.iloc[0]), 2),
                     "songs": [f"{a}, {b}" for a, b in names]})
facts["clusters"] = clusters
# Songs like this one: the nearest songs on all ten features, skipping the same song filed twice
nn = NearestNeighbors(n_neighbors=12).fit(Z)
seed = int(np.where((unique["track_name"] == "Blinding Lights").to_numpy())[0][0])
near = []
for i in nn.kneighbors(Z[seed:seed + 1])[1][0][1:]:
    r = unique.iloc[i]
    key = (r["track_name"], r["track_artist"])
    if key != ("Blinding Lights", "The Weeknd") and key not in [(a, b) for a, b, _ in near]: near.append((r["track_name"], r["track_artist"], r["playlist_genre"]))
    if len(near) == 3: break
facts["likeBlindingLights"] = [{"name": a, "artist": b, "genre": c} for a, b, c in near]
# Before and after: what a person with one chart recognises, against the model, genre by genre
chart_rule = DecisionTreeClassifier(max_depth=3, random_state=0).fit(X_tr[[facts["ladder"]["oneFeature"]]], y_tr)
chart_guess = chart_rule.predict(X_te[[facts["ladder"]["oneFeature"]]])
facts["chartRecall"] = {g: round(float((chart_guess[(y_te == g).to_numpy()] == g).mean()), 2) for g in labels}
# Odd rows found by a model (an isolation forest flagging the oddest 1%), against stop 1's look by eye
from sklearn.ensemble import IsolationForest
odd = IsolationForest(n_estimators=300, contamination=0.01, random_state=0).fit(Z).predict(Z) == -1
facts["anomalies"] = {"flagged": int(odd.sum()), "share": 0.01,
                      "caughtTempoZero": bool(odd[(unique["tempo"] == 0).to_numpy()].all()),
                      "shortTracks": int((unique["duration_ms"] < 30000).sum()),
                      "caughtShort": bool(odd[(unique["duration_ms"] < 30000).to_numpy()].all()),
                      "instrumental": round(float((unique[odd]["instrumentalness"] > 0.5).mean()), 2)}
first_genre = unique.loc[unique["track_name"] == "Blinding Lights", "playlist_genre"].iloc[0]
facts["sameGenre"] = {"genre": first_genre, "songs": int((unique["playlist_genre"] == first_genre).sum())}
facts["hitLift"] = round(facts["hitPrecision"] / facts["hitShare"], 0) if facts["hitPrecision"] else None
# Points for the drawn pictures: the five groups on a two-axis map, and the odd songs among the rest
from sklearn.decomposition import PCA as _PCA
xy = _PCA(2).fit_transform(Z)
pick = np.random.default_rng(0).choice(len(Z), 700, replace=False)
facts["clusterMap"] = [[round(float(xy[i, 0]), 2), round(float(xy[i, 1]), 2), int(km[i])] for i in pick]
odd_idx = np.where(odd)[0]
calm_idx = np.random.default_rng(1).choice(np.where(~odd)[0], 600, replace=False)
facts["oddMap"] = [[round(float(unique["tempo"].iloc[i]), 1), round(float(unique["duration_ms"].iloc[i]) / 1000, 1), int(odd[i])] for i in np.concatenate([calm_idx, odd_idx])]
facts["anscombe"] = {"meanX": 9, "meanY": 7.5, "r": 0.82, "line": "y = 3 + 0.5x"}
# What the slides say in words must still be true of the data.
assert facts["byGenre"]["rap"]["speechiness"] == max(v["speechiness"] for v in facts["byGenre"].values()), "rap is no longer the wordiest"
assert facts["hitAccuracy"] <= facts["alwaysNo"], "the hit model now beats always-no"
assert facts["chartRecall"]["rock"] < facts["recall"]["rock"], "the chart now recognises rock as well as the model"
assert facts["anomalies"]["caughtTempoZero"] and facts["anomalies"]["caughtShort"], "the detector no longer flags stop 1's odd rows"
assert facts["accuracy"] > facts["logistic"] > facts["baseline"]
assert te_m[-1] < te_m.max() and tr_m[-1] > 0.95, "the depth curve no longer overfits"
(ROOT / "tools/ipdv-week10/data").mkdir(exist_ok=True)
(ROOT / "tools/ipdv-week10/data/facts.json").write_text(json.dumps(facts, indent=1) + "\n")
print(json.dumps({k: facts[k] for k in ("accuracy", "baseline", "hitAccuracy", "alwaysNo", "hitsFound", "pca")}))
print("depth", facts["depth"]["best"], facts["depth"]["bestTest"], facts["depth"]["at"]["2"], facts["depth"]["at"]["6"], facts["depth"]["at"]["20"])
