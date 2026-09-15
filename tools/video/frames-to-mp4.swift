// PNG frames -> H.264 MP4. No ffmpeg on this machine; AVAssetWriter ships with macOS.
import AVFoundation
import AppKit

let args = CommandLine.arguments
guard args.count >= 4 else {
  fputs("usage: enc <framesDir> <out.mp4> <fps> [bitrate]\n", stderr); exit(2)
}
let dir = args[1], outPath = args[2], fps = Int32(args[3]) ?? 24
/* A chart animation needs the bits; a diffuse background loop does not, and
   1.4 Mbps on one buys 800 KB of file for a picture nobody looks at. */
let bitrate = args.count >= 5 ? (Int(args[4]) ?? 1_400_000) : 1_400_000

let fm = FileManager.default
let names = try fm.contentsOfDirectory(atPath: dir).filter { $0.hasSuffix(".png") }.sorted()
guard let first = names.first,
      let probe = NSImage(contentsOfFile: (dir as NSString).appendingPathComponent(first)),
      let pr = probe.representations.first else { fputs("no frames\n", stderr); exit(1) }
let w = pr.pixelsWide, h = pr.pixelsHigh

if fm.fileExists(atPath: outPath) { try fm.removeItem(atPath: outPath) }
let writer = try AVAssetWriter(outputURL: URL(fileURLWithPath: outPath), fileType: .mp4)
let settings: [String: Any] = [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: w, AVVideoHeightKey: h,
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: bitrate,
    AVVideoMaxKeyFrameIntervalKey: fps * 2,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
  ]
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA),
  kCVPixelBufferWidthKey as String: w, kCVPixelBufferHeightKey as String: h
])
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

func buffer(_ path: String) -> CVPixelBuffer? {
  guard let img = NSImage(contentsOfFile: path),
        let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return nil }
  var pb: CVPixelBuffer?
  CVPixelBufferCreate(kCFAllocatorDefault, w, h, kCVPixelFormatType_32BGRA,
    [kCVPixelBufferCGImageCompatibilityKey: true, kCVPixelBufferCGBitmapContextCompatibilityKey: true] as CFDictionary, &pb)
  guard let out = pb else { return nil }
  CVPixelBufferLockBaseAddress(out, [])
  let ctx = CGContext(data: CVPixelBufferGetBaseAddress(out), width: w, height: h,
    bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(out),
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)
  ctx?.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
  CVPixelBufferUnlockBaseAddress(out, [])
  return out
}

let queue = DispatchQueue(label: "enc")
let done = DispatchSemaphore(value: 0)
var i = 0
input.requestMediaDataWhenReady(on: queue) {
  while input.isReadyForMoreMediaData {
    if i >= names.count { input.markAsFinished(); done.signal(); return }
    let path = (dir as NSString).appendingPathComponent(names[i])
    guard let pb = buffer(path) else { fputs("bad frame \(names[i])\n", stderr); exit(1) }
    adaptor.append(pb, withPresentationTime: CMTime(value: CMTimeValue(i), timescale: fps))
    i += 1
  }
}
done.wait()
writer.finishWriting {}
while writer.status == .writing { usleep(50_000) }
if writer.status != .completed { fputs("writer failed: \(String(describing: writer.error))\n", stderr); exit(1) }
print("wrote \(outPath) — \(names.count) frames at \(fps)fps, \(w)x\(h), \(bitrate / 1000) kbps")
