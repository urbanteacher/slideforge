# LDSCI6253 Week 9 · Who drives the story? Every Build-it, ready to run.
# Put no2_london.csv beside this file. In a notebook, paste one part per cell, in order:
# each part shows its chart as the last line of the cell.

import altair as alt
import pandas as pd

air = pd.read_csv('no2_london.csv')
road = air[air['type'].isin(['Roadside', 'Kerbside'])]
my1 = air[air['code'] == 'MY1']      # Marylebone Road


# %% 1. Start with the bare line
alt.Chart(my1).mark_line(point=True).encode(
    x=alt.X('year:O', title=None),
    y=alt.Y('no2:Q', title='NO₂ (µg/m³)'),
).properties(width=560, height=300)


# %% 2. Say the finding in the title
red = '#c8102e'
line = alt.Chart(my1).mark_line(strokeWidth=3, color=red).encode(
    x=alt.X('year:O', title=None),
    y=alt.Y('no2:Q', title='NO₂ (µg/m³)'),
)
limit = alt.Chart().mark_rule(strokeDash=[6, 4]).encode(
    y=alt.datum(40))

finding = ('Marylebone Road’s air has a third'
           ' of the NO₂ it had in 2010')
how = 'Yearly average; dashed: the legal limit, 40 µg/m³'

(line + limit).properties(
    width=560, height=300,
    title=alt.Title(finding, subtitle=how),
)


# %% 3. Write on the chart where it happened
notes = pd.DataFrame({
    'year': [2019, 2020, 2021, 2023],
    'at':   [172, 157, 142, 127],     # how high each sits
    'text': ['Central ULEZ', 'Lockdown',
             'ULEZ reaches here', 'ULEZ: all London'],
})
rules = alt.Chart(notes).mark_rule(color='grey').encode(
    x='year:O', y='at:Q', y2=alt.datum(0))  # up to its note
words = alt.Chart(notes).mark_text(align='left', dx=5).encode(
    x='year:O', y='at:Q', text='text:N')

(line + limit + rules + words).properties(
    width=560, height=300,
    title=alt.Title(finding, subtitle=how),
)


# %% 4. One line in colour, the rest grey
grey = '#a6a6a6'
others = alt.Chart(road).mark_line(color=grey, strokeWidth=1)
others = others.encode(
    x='year:O', y='no2:Q',
    detail='code:N',                 # one line per monitor
)

# the layer added last is drawn on top: grey, then red
(others + line + limit + rules + words).properties(
    width=560, height=300,
    title=alt.Title(finding, subtitle=how),
)


# %% 5. Let the reader drive: tooltip and legend
pick = alt.selection_point(fields=['type'], bind='legend')
# colours a colour-blind reader can tell apart (Okabe-Ito)
types = ['Kerbside', 'Roadside', 'Urban Background',
         'Suburban', 'Industrial']
colours = ['#d55e00', '#e69f00', '#0072b2',
           '#56b4e9', '#8c8c8c']

alt.Chart(air).mark_line(point=True).encode(
    x=alt.X('year:O', title=None),
    y=alt.Y('no2:Q', title='NO₂ (µg/m³)'),
    detail='code:N',
    color=alt.Color('type:N', title='Monitor',
        scale=alt.Scale(domain=types, range=colours)),
    opacity=alt.when(pick).then(alt.value(0.9))
                          .otherwise(alt.value(0.05)),
    tooltip=['site:N', 'borough:N', 'type:N',
             'year:O', 'no2:Q'],
).add_params(pick).properties(width=560, height=300)


# %% 6. A martini glass: chapters, then open
chapter = alt.param(value=1, bind=alt.binding_radio(
    options=[1, 2, 3], name='Chapter '))

told = (rules.transform_filter(chapter >= 2)   # the stem
        + words.transform_filter(chapter >= 2))
dots = alt.OverlayMarkDef(color=grey, size=15)
bowl = others.mark_line(color=grey, point=dots).encode(
    tooltip=['site:N', 'borough:N', 'year:O', 'no2:Q'],
).transform_filter(chapter >= 3)               # the bowl

still = alt.Scale(domain=[0, 180])    # the axis stays still
hero = line.encode(y=alt.Y('no2:Q', scale=still,
                           title='NO₂ (µg/m³)'))

(bowl + hero + limit + told).add_params(chapter).properties(
    width=560, height=300,
    title=alt.Title(finding, subtitle=how),
)


# %% 7. Guess first, then show
guess = alt.param(value=60, bind=alt.binding_range(
    min=0, max=100, step=1, name='Your guess for 2025 '))
show = alt.param(value=False,
                 bind=alt.binding_checkbox(name='Show me '))

years = list(range(2010, 2026))   # room for the years to guess
base = alt.Chart(my1).encode(
    x=alt.X('year:O', title=None,
            scale=alt.Scale(domain=years)),
    y=alt.Y('no2:Q', title='NO₂ (µg/m³)',
            scale=alt.Scale(domain=[0, 100])))
known = base.mark_line(strokeWidth=3, color='#0c3354')
known = known.transform_filter(alt.datum.year <= 2016)
truth = base.mark_line(strokeWidth=6, color='#c8102e')
truth = truth.transform_filter(
    (alt.datum.year >= 2016) & show)
yours = alt.Chart().mark_point(size=260, filled=True,
                               color='#0c3354').encode(
    x=alt.XDatum(2025, type='ordinal'),
    y=alt.YDatum(guess, type='quantitative'))

(known + truth + yours).add_params(guess, show).properties(
    width=560, height=300,
    title='Marylebone Road, 2016: 89. Guess 2025.')
