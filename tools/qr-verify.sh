#!/bin/bash
# Check the QR encoder against a decoder that did not come from this project.
#
# tests/qr.test.js can prove a great deal — that a code round-trips, that the
# error-correction bytes are real Reed-Solomon codewords, that the capacity
# table matches the geometry — and it still cannot prove a phone will read the
# thing. The first working version of js/qr.js passed every one of those and
# was unreadable by every scanner on earth, because the format information was
# bit-reversed and the test's decoder was reversed in exactly the same way.
# Two mirrors agreeing is not a check.
#
# So this renders a code to a PNG and hands it to Apple's Vision framework,
# which is a production decoder with no interest in what this repo believes.
# Run it after touching the encoder.
#
#   tools/qr-verify.sh                        # a join URL at both levels
#   tools/qr-verify.sh "any text" M
#
# Needs macOS with the Command Line Tools (for swiftc) and Python with Pillow.
# Neither is a dependency of SlideForge — this is a development check, not part
# of the app, which is why it lives here and not in js/.
set -e

HERE="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

TEXT="${1:-http://192.168.1.93:8787/join.html?pin=428913}"
LEVELS="${2:-M L}"

cat > "$WORK/dump.js" <<'JS'
global.window = global;
require(process.argv[2] + '/js/qr.js');
var code = window.SF.qr(process.argv[3], { level: process.argv[4] });
console.log(JSON.stringify({
  size: code.size, version: code.version, mask: code.mask,
  rows: code.modules.map(function (r) {
    return r.map(function (v) { return v ? '1' : '0'; }).join('');
  })
}));
JS

cat > "$WORK/png.py" <<'PY'
import json, sys
from PIL import Image
data = json.load(open(sys.argv[1]))
scale, quiet = 12, 4
n = data["size"] + quiet * 2
img = Image.new("L", (n * scale, n * scale), 255)
px = img.load()
for y, row in enumerate(data["rows"]):
    for x, ch in enumerate(row):
        if ch == "1":
            for dy in range(scale):
                for dx in range(scale):
                    px[(x + quiet) * scale + dx, (y + quiet) * scale + dy] = 0
img.save(sys.argv[2])
PY

cat > "$WORK/scan.swift" <<'SWIFT'
import Foundation
import Vision
import AppKit

let path = CommandLine.arguments[1]
guard let image = NSImage(contentsOfFile: path),
      let tiff = image.tiffRepresentation,
      let rep = NSBitmapImageRep(data: tiff),
      let cg = rep.cgImage else {
    print("ERROR could not load \(path)")
    exit(2)
}
let request = VNDetectBarcodesRequest()
request.symbologies = [.qr]
do {
    try VNImageRequestHandler(cgImage: cg, options: [:]).perform([request])
    let results = request.results ?? []
    if results.isEmpty { print("UNREADABLE") }
    for r in results { print("READ \(r.payloadStringValue ?? "<not a string>")") }
} catch {
    print("ERROR \(error)")
    exit(2)
}
SWIFT

echo "Building the reference scanner…"
TMPDIR="$WORK" swiftc -module-cache-path "$WORK/mc" -o "$WORK/scan" "$WORK/scan.swift"

fail=0
for level in $LEVELS; do
  node "$WORK/dump.js" "$HERE" "$TEXT" "$level" > "$WORK/code.json"
  python3 "$WORK/png.py" "$WORK/code.json" "$WORK/code.png"
  version=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$WORK/code.json')).version)")
  result=$("$WORK/scan" "$WORK/code.png")
  printf 'level %s (version %s): %s\n' "$level" "$version" "$result"
  # A decode that comes back with different text is worse than no decode.
  [ "$result" = "READ $TEXT" ] || fail=1
done

if [ "$fail" = 0 ]; then
  echo "Every code read back exactly."
else
  echo "At least one code did not read back. The encoder is wrong, not the scanner."
  exit 1
fi
