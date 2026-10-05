// Narration for "Which Chart?": one audio file per line, and the timeline the
// scenes are keyed to. Run: node tools/video-which-chart/voice.mjs <outDir>
//
// Every line is its own file so a recorded voice can replace the synthetic one
// line by line: drop <id>.aiff (or .wav/.m4a) into <outDir>/vo/ with
// VO_KEEP=1 and the timeline is re-measured from whatever is there.
// (Recordings must use the extension the engine writes: .mp3 for edge, .aiff for mac.)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2] || path.join(here, 'out'));
const script = JSON.parse(fs.readFileSync(path.join(here, 'script.json'), 'utf8'));
fs.mkdirSync(path.join(out, 'vo'), { recursive: true });

function duration(file) {
  const info = execFileSync('afinfo', [file], { encoding: 'utf8' });
  const m = info.match(/estimated duration:\s*([\d.]+)/);
  if (!m) throw new Error('no duration for ' + file);
  return Number(m[1]);
}

/* "edge": Microsoft's Ryan via edge-tts (github.com/rany2/edge-tts), which needs
   the network; EDGE_TTS points at its binary. VO_ENGINE=mac falls back to `say`. */
const edge = (process.env.VO_ENGINE || script.engine) === 'edge';
let t = 0;
const timeline = { scenes: [], lines: {} };
for (const scene of script.scenes) {
  const start = t;
  t += scene.lead;
  for (const [id, text] of scene.lines) {
    const file = path.join(out, 'vo', id + (edge ? '.mp3' : '.aiff'));
    if (!(process.env.VO_KEEP && fs.existsSync(file))) {
      if (edge) execFileSync(process.env.EDGE_TTS || 'edge-tts', ['--voice', script.voice, '--rate=' + script.rate, '--text', text, '--write-media', file]);
      else execFileSync('say', ['-v', script.macVoice, '-r', String(script.macRate), '-o', file, text]);
    }
    const d = duration(file);
    timeline.lines[id] = { start: +t.toFixed(3), end: +(t + d).toFixed(3), file, text };
    t += d + script.gap;
  }
  t += scene.tail - script.gap;
  timeline.scenes.push({ id: scene.id, start: +start.toFixed(3), end: +t.toFixed(3) });
}
timeline.total = +t.toFixed(3);
fs.writeFileSync(path.join(out, 'timeline.json'), JSON.stringify(timeline, null, 2));
console.log('total', timeline.total.toFixed(1) + 's');
for (const s of timeline.scenes) console.log(s.id.padEnd(8), s.start.toFixed(1), '→', s.end.toFixed(1));
