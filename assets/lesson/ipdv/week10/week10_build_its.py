# LDSCI6253 Week 10 · What does the model see? Every Build-it, ready to run.
# Put songs.csv beside this file. In a notebook, paste one part per cell, in order:
# each part shows its chart as the last line of the cell.

import altair as alt
import pandas as pd
from pathlib import Path
import numpy as np

LIVE = "https://slideforge-rpjj.onrender.com/assets/lesson/ipdv/week10/"

def load(name):
    """Read name.csv from beside this notebook, or from the course site if it is not here."""
    here = Path(name + ".csv")
    return pd.read_csv(here if here.exists() else LIVE + name + ".csv")

songs = load('songs')
FEATURES = ['danceability', 'energy', 'loudness',
            'speechiness', 'acousticness', 'instrumentalness',
            'liveness', 'valence', 'tempo', 'duration_ms']
# Okabe and Ito's colour-blind-safe colours, one per genre
genre = alt.Color('playlist_genre:N', title='genre',
    scale=alt.Scale(
        domain=['edm', 'latin', 'pop', 'r&b', 'rap', 'rock'],
        range=['#0072b2', '#e69f00', '#cc79a7', '#009e73',
               '#d55e00', '#56b4e9']))

# The file is sorted by playlist. Shuffle it once, so any
# slice of it (a sample, a test set) mixes every genre.


# %% 1a · Look first, the library way
import seaborn as sns

songs.isna().sum()            # missing values, per column
songs.duplicated('track_id').sum()   # the same song twice

sns.histplot(songs, x='track_popularity', bins=50)


# %% 1b · Look first: what does popularity look like?
# The file is sorted by playlist. Shuffle it once, so any
# slice of it (a sample, a test set) mixes every genre.
unique = (songs.drop_duplicates('track_id')
          .sample(frac=1, random_state=0))
sample = unique.sample(4000, random_state=0)

alt.Chart(sample).mark_bar().encode(
    x=alt.X('track_popularity:Q', bin=alt.Bin(step=2),
            title='popularity (0 to 100)'),
    y=alt.Y('count()', title='songs'),
).properties(width=520, height=300)


# %% 1c · One feature, six genres
alt.Chart(sample).mark_boxplot(size=30).encode(
    x=alt.X('playlist_genre:N', title=None),
    y=alt.Y('speechiness:Q', title='speechiness (0 to 1)'),
    color=genre.legend(None),
).properties(width=520, height=300)


# %% 2a · Ten columns at once, the library way
import seaborn as sns

few = ['danceability', 'energy', 'speechiness']
sns.pairplot(sample, vars=few, hue='playlist_genre',
             plot_kws={'s': 6})


# %% 2b · A matrix you can brush
brush = alt.selection_interval()
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


# %% 2c · Ten columns on one map: PCA
from sklearn.decomposition import PCA
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


# %% 2d · Let the model find the groups: k-means
from sklearn.cluster import KMeans
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


# %% 3a · Which columns move together?
corr = (unique[FEATURES].corr().reset_index()
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


# %% 3b · What does the model listen to?
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier

X, y = unique[FEATURES], unique['playlist_genre']
X_tr, X_te, y_tr, y_te = train_test_split(
    X, y, test_size=0.25, random_state=0, stratify=y)
model = RandomForestClassifier(300, random_state=0)
model.fit(X_tr, y_tr)        # learn from 3 songs in 4

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


# %% 3c · Two ways to rank the same features
both = pd.DataFrame({'feature': FEATURES,
    'the forest’s own count': model.feature_importances_,
    'shuffle and see': shuffled.importances_mean,
}).melt('feature', var_name='method', value_name='importance')

alt.Chart(both).mark_bar(color='#0c3354').encode(
    x=alt.X('importance:Q', title=None),
    y=alt.Y('feature:N', sort='-x', title=None),
).properties(width=200, height=260).facet(
    column=alt.Column('method:N', title=None),
).resolve_scale(x='independent', y='independent')


# %% 4a · Score it: right, compared with what, for whom?
guess = model.predict(X_te)            # songs it never saw
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


# %% 4b · Where is it wrong? The library way
from sklearn.metrics import ConfusionMatrixDisplay

ConfusionMatrixDisplay.from_estimator(
    model, X_te, y_te, normalize='true',
    values_format='.0%', cmap='Blues')


# %% 4c · A confusion matrix in Altair
from sklearn.metrics import confusion_matrix

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


# %% 4d · Is it learning, or memorising?
from sklearn.model_selection import validation_curve
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


# %% 4e · Where does the model draw the line?
three = unique[unique['playlist_genre']
                .isin(['pop', 'rap', 'rock'])]
two = ['speechiness', 'danceability']
depth = 3
tree = DecisionTreeClassifier(max_depth=depth, random_state=0)
tree.fit(three[two], three['playlist_genre'])

# Ask the tree about every point of a grid: its answer is the boundary
# 60 x 60 = 3,600 points: under Altair's 5,000-row limit
gx, gy = np.meshgrid(np.linspace(0, 0.5, 60), np.linspace(0.2, 1, 60))
grid = pd.DataFrame({'speechiness': gx.ravel(),
                     'danceability': gy.ravel()})
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


# %% 4f · The boundary, the library way
import numpy as np
from sklearn.inspection import DecisionBoundaryDisplay

shown = DecisionBoundaryDisplay.from_estimator(
    tree, three[two], response_method='predict',
    alpha=0.4, eps=0.02, cmap='tab10')
few = three.sample(600, random_state=0)
shown.ax_.scatter(few['speechiness'], few['danceability'],
    c=few['playlist_genre'].astype('category').cat.codes,
    cmap='tab10', vmax=9, s=8, edgecolor='white', linewidth=0.3)


# %% 4g · The tree's questions, drawn out
import matplotlib.pyplot as plt
from sklearn.tree import plot_tree

small = DecisionTreeClassifier(max_depth=2, random_state=0)
small.fit(three[two], three['playlist_genre'])

plt.figure(figsize=(11, 5))
plot_tree(small, feature_names=two, class_names=list(small.classes_),
          impurity=False, proportion=True, rounded=True, fontsize=12)


# %% 5 · Tell the public: the honest comparison
hit = unique['track_popularity'] >= 80     # a "hit"
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
