"""Week 10's data: about 30,000 songs and their Spotify audio features, fetched once.

The source is TidyTuesday, 21 January 2020 (rfordatascience/tidytuesday, CC0),
collected from Spotify's Web API with the spotifyr package. Every row is kept,
duplicates included, because finding them is the first thing the lecture does.
Only the album and playlist ids and the album name are dropped, to keep the
file small for students.

    uv run --with pandas python tools/ipdv-week10/fetch-songs.py

writes assets/lesson/ipdv/week10/songs.csv.
"""
import pathlib

import pandas as pd

URL = ("https://raw.githubusercontent.com/rfordatascience/tidytuesday/main/"
       "data/2020/2020-01-21/spotify_songs.csv")
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "assets/lesson/ipdv/week10/songs.csv"

KEEP = ["track_id", "track_name", "track_artist", "track_popularity",
        "track_album_release_date", "playlist_name", "playlist_genre", "playlist_subgenre",
        "danceability", "energy", "key", "loudness", "mode", "speechiness",
        "acousticness", "instrumentalness", "liveness", "valence", "tempo", "duration_ms"]

songs = pd.read_csv(URL)[KEEP]
OUT.parent.mkdir(parents=True, exist_ok=True)
songs.to_csv(OUT, index=False)
print(f"{len(songs)} rows, {songs.track_id.nunique()} different tracks -> {OUT.relative_to(ROOT)}")
