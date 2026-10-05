# Which Chart? Think Before You Draw

The 5-minute Week 4 bridge explainer (slide 10 of `ipdv-col-w4`), made in code from the video treatment.
No ffmpeg: Playwright's Chromium draws the frames and macOS AVFoundation writes the MP4.

```bash
OUT=/tmp/which-chart            # any scratch folder
python3 -m venv $OUT/tts && $OUT/tts/bin/pip install edge-tts   # once: github.com/rany2/edge-tts
EDGE_TTS=$OUT/tts/bin/edge-tts node tools/video-which-chart/voice.mjs $OUT   # Ryan, one file per line + timeline.json
node tools/video-which-chart/render.mjs $OUT --stills 30,170,245  # check a few moments
node tools/video-which-chart/render.mjs $OUT --fps 25 --workers 6 # every frame (about 75 s)
swiftc -O tools/video-which-chart/encode.swift -o $OUT/encode
$OUT/encode $OUT 25 assets/lesson/ipdv/week4/which-chart.mp4 1000000
```

- **Words:** `script.json`, one entry per narration line. Scenes are cued to the lines, so a change of wording re-times itself.
- **Pictures:** `scenes.html`, one function per scene. Every chart is plotted from the 2024 figures at the top of the file, taken from `lessons/tfl-daily-cycle-hires.xlsx`.
- **Voice:** Microsoft's `en-GB-RyanNeural` at +8%, set in `script.json`. It needs the network. `VO_ENGINE=mac` uses the Mac's offline `say` voice instead.
- **Your own voice:** record each line as `<id>.mp3` (ids are in `script.json`), put the files in `$OUT/vo/`, then run `VO_KEEP=1 node tools/video-which-chart/voice.mjs $OUT` and re-render. The timeline is re-measured from your recordings.
