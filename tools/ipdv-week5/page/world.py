"""The maps lecture's three world "Build it" slides: render what their code makes.

The code on each slide is what a student runs (vega_datasets fetches the
world from the web). Here the same charts are drawn offline: the world from
node_modules/vega-datasets, the life expectancy the deck already joins by ISO
number (world-health.json, written from tools/ipdv-week5/figures.js).

    python3 tools/ipdv-week5/page/world.py
"""
import json
import pathlib
import altair as alt
import pandas as pd
import vl_convert as vlc

ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = ROOT / "assets/lesson/ipdv/week5"
topo = json.loads((ROOT / "node_modules/vega-datasets/data/world-110m.json").read_text())
countries = alt.Data(values=topo, format=alt.DataFormat(type="topojson", feature="countries"))
world = pd.DataFrame(json.loads((pathlib.Path(__file__).parent / "world-health.json").read_text()))

LOOK = dict(background="#fbfaf8", font="Avenir Next")


def save(chart, name, w=620, h=330):
    chart = chart.properties(width=w, height=h).configure_view(stroke=None).configure(**LOOK)
    (OUT / name).write_bytes(vlc.vegalite_to_png(chart.to_json(), scale=2))
    print("rendered", name)


grey = alt.Chart(countries).mark_geoshape(fill="lightgrey", stroke="white")
save(grey.project(type="equalEarth"), "build-world.png")

base = alt.Chart(countries).mark_geoshape(fill="lightgrey", stroke="white")
save(base.project(type="mercator", scale=95, translate=[310, 230]), "build-mercator.png", h=300)
save(base.project(type="equalEarth"), "build-equalearth.png", h=300)

choro = alt.Chart(countries).mark_geoshape(stroke="white").transform_lookup(
    lookup="id",
    from_=alt.LookupData(world, "iso_n", ["country", "health", "income"])
).encode(
    color=alt.Color("health:Q", title="Life expectancy", scale=alt.Scale(scheme="blues")),
    tooltip=[alt.Tooltip("country:N", title="Country"),
             alt.Tooltip("health:Q", title="Life expectancy", format=".1f")]
).project(type="equalEarth")
save(choro, "build-choropleth.png")
