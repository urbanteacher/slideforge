"""The final infographic, built one week at a time (LDSCI6253).

Each STEP is the Altair a week adds to the page. The slides print that code
and show the picture it makes, so they come from the same text: this script
runs every step in order, renders its panel, and writes

    assets/lesson/ipdv/week5/page-<id>.png   the panel the step makes
    tools/ipdv-week5/page/steps.json         the code, for the slides
    assets/lesson/ipdv/week5/infographic-by-week.py   the whole thing, runnable

Data: the synthetic bike-share city from the students' workbook
(Guides for info vis/student_five_visualisation_infographic.ipynb, §3-4 and
§12), already cleaned. Fictional districts; not London.

    python3 tools/ipdv-week5/page/steps.py      (needs altair, pandas, vl-convert-python)
"""
import json
import pathlib
import altair as alt
import vl_convert as vlc

ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = ROOT / "assets/lesson/ipdv/week5"

SETUP = '''import altair as alt
import pandas as pd

# The workbook's synthetic city, cleaned (workbook §3-4). Not London.
hires = {"A": [12000, 15000, 19000, 24000], "B": [18000, 21000, 24000, 27000],
         "C": [30000, None, 36000, 40000],  "D": [9000, 10000, 11000, 12000],
         "E": [10000, 15000, 22000, 28000], "F": [22000, 25000, 27000, 30000]}
residents = dict(A=80000, B=45000, C=100000, D=60000, E=35000, F=120000)
lane_km = dict(A=12, B=21, C=28, D=8, E=23, F=20)
data = pd.DataFrame([
    {"district_code": c, "district": "District " + c, "year": year,
     "hires": h, "residents": residents[c], "cycle_lane_km": lane_km[c]}
    for c, values in hires.items() for year, h in zip(range(2022, 2026), values)])
data["hires_per_1000"] = data["hires"] / data["residents"] * 1000
latest = data[data["year"] == 2025]
# A year with a missing district is unknown, not lower: min_count keeps it NaN.
totals = data.groupby("year", as_index=False)["hires"].sum(min_count=6)

# Six artificial square districts (workbook §12): x = longitude, y = latitude.
# Each ring runs clockwise: Altair (d3) fills an anticlockwise one inside out.
features = []
for i, code in enumerate("ABCDEF"):
    x, y = (i % 3) * 0.08, 51.0 + (i // 3) * 0.055
    ring = [[x, y], [x, y + .053], [x + .078, y + .053], [x + .078, y], [x, y]]
    features.append({"type": "Feature", "properties": {"district_code": code},
                     "geometry": {"type": "Polygon", "coordinates": [ring]}})

# The page: one width, one gutter, everything else follows from them.
PAGE_W, GAP = 1120, 24
HALF_W = (PAGE_W - GAP) / 2
TILE_W = (PAGE_W - 2 * GAP) / 3
NAVY, RED, GREY, PANEL = "#0c3354", "#c8102e", "#5a6572", "#ece8e0"
one = pd.DataFrame({"one": [1]})
'''

STEPS = [
    {"id": "w1", "week": "1", "title": "Lead with the finding", "slot": "B", "panel": "tiles",
     "new": ["mark_text", "alt.layer", "alt.hconcat"],
     "code": '''# Week 1 · a chart shows what a table hides.
# Three checked numbers, each a big value over a caption.
def tile(value, label):
    big = alt.Chart(one).mark_text(
        x=16, y=14, align="left", baseline="top", fontSize=38,
        fontWeight="bold", color=NAVY, text=value)
    small = alt.Chart(one).mark_text(
        x=16, y=72, align="left", baseline="top", fontSize=14,
        color=GREY, text=label)
    return alt.layer(big, small).properties(
        width=TILE_W, height=104,
        view=alt.ViewConfig(fill=PANEL, stroke=None))

growth = totals.hires.iloc[-1] / totals.hires.iloc[0] - 1
rate = latest.loc[latest.hires_per_1000.idxmax()]
most = latest.loc[latest.hires.idxmax()]
tiles = alt.hconcat(
    tile(f"+{growth:.0%}", "Total hires, 2022 to 2025"),
    tile(f"{rate.hires_per_1000:.0f}", f"Hires per 1,000: {rate.district}"),
    tile(f"{most.hires:,.0f}", f"Total hires: {most.district}"),
    spacing=GAP)'''},

    {"id": "w2", "week": "2", "title": "One mark, two channels", "slot": "D", "panel": "line",
     "new": ["mark_line", ".encode(x=, y=)"],
     "code": '''# Week 2 · data → mark → encode → chart.
line = alt.Chart(totals).mark_line(
    point=alt.OverlayMarkDef(color=NAVY, size=60),
    color=NAVY, strokeWidth=3
).encode(
    x=alt.X("year:O", title=None, axis=alt.Axis(labelAngle=0)),
    y=alt.Y("hires:Q", title="Total hires", scale=alt.Scale(zero=True)),
).properties(
    width=HALF_W - 80, height=260,
    title="2 / City total hires · 2023 incomplete")

# 2023 is NaN, so the line breaks there: unknown is not zero.'''},

    {"id": "w3", "week": "3", "title": "Pick the channel by the task", "slot": "C", "panel": "bars",
     "new": ["mark_bar", "sort=\"-x\""],
     "code": '''# Week 3 · compare → length on a shared baseline.
bars = alt.Chart(latest).mark_bar(color=NAVY).encode(
    x=alt.X("hires_per_1000:Q", axis=alt.Axis(tickCount=9),
            title="Hire events per 1,000 residents"),
    y=alt.Y("district:N", sort="-x", title=None),
).properties(
    width=PAGE_W - 110, height=220,
    title="1 / Compare district rates · 2025")

# sort="-x" ranks the bars: the reader's task is "who is highest?"'''},

    {"id": "w4", "week": "4", "title": "Colour is data", "slot": "F", "panel": "heat",
     "new": ["mark_rect", "alt.Color(scheme=)"],
     "code": '''# Week 4 · colour is data: lightness orders.
rate_colour = alt.Color(
    "hires_per_1000:Q", title="Per 1,000",
    scale=alt.Scale(scheme="blues", domain=[0, 900]))

cells = alt.Chart(data).mark_rect(stroke="white").encode(
    x=alt.X("year:O", title=None, axis=alt.Axis(labelAngle=0)),
    y=alt.Y("district:N", title=None),
    color=rate_colour)
gaps = cells.transform_filter("!isValid(datum.hires)").mark_rect(
    color="#d9d9d9").encode(color=alt.value("#d9d9d9"))

heat = (cells + gaps).properties(
    width=HALF_W - 170, height=250,
    title="4 / Scan district × year rates")
# Missing is its own grey, never the lightest blue.'''},

    {"id": "w5", "week": "5", "title": "The chart answers back", "slot": "E", "panel": "scatter",
     "new": ["tooltip=", "selection_point", "add_params"],
     "code": '''# Week 5 · charts that answer back.
hover = alt.selection_point(on="pointerover", fields=["district"],
                            empty=False)
dots = alt.Chart(latest).mark_circle(size=160, opacity=1).encode(
    x=alt.X("cycle_lane_km:Q", title="Cycle-lane length (km)",
            scale=alt.Scale(domain=[0, 35])),
    y=alt.Y("hires_per_1000:Q", title="Hires per 1,000",
            scale=alt.Scale(domain=[0, 900])),
    color=alt.condition(hover, alt.value(RED), alt.value(NAVY)),
    tooltip=[alt.Tooltip("district:N", title="District"),
             alt.Tooltip("hires_per_1000:Q", title="Per 1,000",
                         format=".0f")],
).add_params(hover)
names = dots.mark_text(dx=10, dy=-8, align="left").encode(
    text="district_code:N", color=alt.value(GREY))

scatter = (dots + names).properties(
    width=HALF_W - 80, height=260,
    title="3 / Lane length and use · 2025")'''},

    {"id": "w7", "week": "7", "title": "Where adds meaning", "slot": "G", "panel": "choro",
     "new": ["mark_geoshape", "transform_lookup", ".project"],
     "code": '''# Week 7 · maps: shapes, a join, a projection.
choro = alt.Chart(alt.Data(values=features)).mark_geoshape(
    stroke="white", strokeWidth=3
).transform_lookup(
    lookup="properties.district_code",          # the join key
    from_=alt.LookupData(latest, "district_code",
                         ["district", "hires_per_1000"])
).encode(
    color=rate_colour,                          # Week 4's scale
    tooltip=["district:N",
             alt.Tooltip("hires_per_1000:Q", format=".0f")],
).project(type="mercator").properties(
    width=HALF_W - 170, height=250,
    title="5 / Locate rates · fictional districts")

# Same field, same scale as the heatmap: one legend for both.'''},

    {"id": "page", "week": "★", "title": "Compose: one page, every week", "slot": "*", "panel": "page",
     "new": ["alt.vconcat", "alt.hconcat", ".configure"],
     "code": '''# Final piece · every week becomes one panel.
top = dict(x=0, y=0, align="left", baseline="top")
title = alt.Chart(one).mark_text(
    **top, fontSize=30, fontWeight="bold", color=NAVY,
    text="Hires grew 59%; District E rides most per resident"
).properties(width=PAGE_W, height=40)
source = alt.Chart(one).mark_text(
    **top, fontSize=13, color=GREY,
    text="Synthetic data, fictional districts. Not London."
).properties(width=PAGE_W, height=20)

page = alt.vconcat(
    title,                                     # Week 1
    tiles,                                     # Week 1
    bars,                                      # Week 3
    alt.hconcat(line, scatter, spacing=GAP),   # Weeks 2 and 5
    alt.hconcat(heat, choro, spacing=GAP),     # Weeks 4 and 7
    source,
    spacing=GAP,
).configure_view(stroke=None).configure(background="#fbfaf8")
page.save("infographic.html")'''},
]

# Before the maps lecture: one map of London, built in four moves, on made-up
# numbers. The same moves the infographic's map panel makes; they lead into
# the lecture's three parts (Place, Flatten, Fill) and the lab's join.
# Boundaries: assets/lesson/ipdv/week5/london-boroughs.geojson, a lighter copy
# (coordinates rounded, every 4th point) of the course's London Poverty file.
MAP_STEPS = [
    {"id": "m1", "move": "1", "title": "Shapes: draw the geometry", "panel": "outline",
     "new": ["mark_geoshape", "json.load", "alt.Data(values="], "part": "Place",
     "code": '''# 1 · Shapes. A map starts from geometry, not from data.
import json
with open("london-boroughs.geojson") as f:
    london = json.load(f)
print(len(london["features"]), london["features"][0]["properties"])
# 33 {'name': 'Barking and Dagenham'}

shapes = alt.Data(values=london["features"])
outline = alt.Chart(shapes).mark_geoshape(
    fill="#dcd8d0", stroke="white", strokeWidth=1
).properties(width=420, height=330, title="33 boroughs, no data yet")'''},

    {"id": "m2", "move": "2", "title": "Join: every shape finds its row", "panel": "joined",
     "new": ["transform_lookup", "LookupData", "assert", "default_rng"], "part": "lab",
     "code": '''# 2 · Data and join. Made-up numbers, one row per borough.
import numpy as np
names = [f["properties"]["name"] for f in london["features"]]
rng = np.random.default_rng(6253)
fake = pd.DataFrame({"borough": names,
                     "hires_per_1000": rng.integers(150, 900, len(names))})
assert set(fake.borough) == set(names)   # every shape has a row

joined = alt.Chart(shapes).mark_geoshape(
    stroke="white", strokeWidth=1
).transform_lookup(
    lookup="properties.name",                 # the shape's key
    from_=alt.LookupData(fake, "borough",     # the table's key
                         ["borough", "hires_per_1000"])
).encode(
    color=alt.Color("borough:N", legend=None)  # a check, not the map
).properties(width=420, height=330, title="Check: every borough took a name")
# A borough left grey found no row: fix the key, never the colour.'''},

    {"id": "m3", "move": "3", "title": "Fill: colour the number", "panel": "filled",
     "new": ["scheme=\"blues\""], "part": "Fill",
     "code": '''# 3 · Fill. A sequential scale: darker means more.
filled = alt.Chart(shapes).mark_geoshape(
    stroke="white", strokeWidth=1
).transform_lookup(
    lookup="properties.name",
    from_=alt.LookupData(fake, "borough", ["borough", "hires_per_1000"])
).encode(
    color=alt.Color("hires_per_1000:Q", title="Per 1,000",
                    scale=alt.Scale(scheme="blues")),
).properties(width=420, height=330,
             title="Bike hires per 1,000 residents (made up)")

# A rate per resident, not a count: big boroughs would win a count.'''},

    {"id": "m4", "move": "4", "title": "Flatten, then answer back", "panel": "london_map",
     "new": [".project", "tooltip="], "part": "Flatten",
     "code": '''# 4 · Flatten and answer back: a projection, a tooltip.
london_map = filled.encode(
    tooltip=[alt.Tooltip("borough:N", title="Borough"),
             alt.Tooltip("hires_per_1000:Q", title="Per 1,000")],
).project(
    type="mercator"       # the choice today's Part 2 is about
)
london_map.save("london-map.html")

# Try type="identity", reflectY=True: London comes out squashed.
# That is a projection choice too, and today is why.'''},
]

LOOK = dict(background="#fbfaf8", font="Avenir Next")


def render(chart, name):
    if not isinstance(chart, alt.TopLevelMixin) or chart.config is alt.Undefined:
        chart = chart.configure_view(stroke=None).configure(**LOOK)
    chart = chart.configure_title(anchor="start", fontSize=15, color="#14181f")
    png = vlc.vegalite_to_png(chart.to_json(), scale=2)
    (OUT / name).write_bytes(png)


def main():
    scope = {}
    exec(SETUP, scope)
    for step in STEPS:
        code = step["code"]
        if step["id"] == "page":
            code = code.replace('page.save("infographic.html")', "")
        exec(code, scope)
        chart = scope[step["panel"]]
        if step["id"] == "page":
            chart = chart.configure_title(anchor="start", fontSize=15, color="#14181f")
            (OUT / "page-page.png").write_bytes(vlc.vegalite_to_png(chart.to_json(), scale=2))
        else:
            render(chart, f"page-{step['id']}.png")
        print("rendered", step["id"])
    import os
    os.chdir(OUT)   # the map steps open london-boroughs.geojson beside them
    for step in MAP_STEPS:
        exec(step["code"].replace('london_map.save("london-map.html")', ""), scope)
        render(scope[step["panel"]], f"page-{step['id']}.png")
        print("rendered", step["id"])
    (pathlib.Path(__file__).parent / "steps.json").write_text(
        json.dumps({"setup": SETUP, "steps": STEPS, "map": MAP_STEPS}, indent=1, ensure_ascii=False) + "\n")
    script = ['"""The final infographic, one week at a time. LDSCI6253.',
              "Run top to bottom; each block is the code from that week's slide.",
              'Synthetic teaching data and fictional districts: not London."""', "", SETUP]
    for step in STEPS:
        script += ["", "", step["code"]]
    script += ["", "", "# ---- Before Week 7: a map of London in four moves (needs london-boroughs.geojson beside this file) ----"]
    for step in MAP_STEPS:
        script += ["", "", step["code"]]
    (OUT / "infographic-by-week.py").write_text("\n".join(script) + "\n")


if __name__ == "__main__":
    main()
