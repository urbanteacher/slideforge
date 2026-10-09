// An animated GIF as a silent H.264 MP4, with macOS's own ImageIO and AVFoundation (no ffmpeg).
// The Lesson studio draws a picture once, so a GIF shows only its first frame there; a video
// plays. Each frame keeps the GIF's own delay.
//   swiftc -O tools/ipdv-week5/gif2mp4.swift -o <scratch>/gif2mp4
//   <scratch>/gif2mp4 in.gif out.mp4 [maxWidth]
import AVFoundation
import Foundation
import ImageIO

let args = CommandLine.arguments
let src = URL(fileURLWithPath: args[1]), dest = URL(fileURLWithPath: args[2])
let maxWidth = args.count > 3 ? Int(args[3])! : 1600

guard let source = CGImageSourceCreateWithURL(src as CFURL, nil) else { fatalError("cannot read \(src.path)") }
let count = CGImageSourceGetCount(source)
guard count > 0, let first = CGImageSourceCreateImageAtIndex(source, 0, nil) else { fatalError("no frames") }

/* Even dimensions, no wider than maxWidth: H.264 wants both. */
let scale = min(1.0, Double(maxWidth) / Double(first.width))
let W = Int(Double(first.width) * scale) / 2 * 2, H = Int(Double(first.height) * scale) / 2 * 2

/* The delay of each frame, as the GIF says (unclamped first, then clamped), at least 20 ms. */
func delay(_ i: Int) -> Double {
  let props = CGImageSourceCopyPropertiesAtIndex(source, i, nil) as? [CFString: Any]
  let gif = props?[kCGImagePropertyGIFDictionary] as? [CFString: Any]
  let d = (gif?[kCGImagePropertyGIFUnclampedDelayTime] as? Double) ?? (gif?[kCGImagePropertyGIFDelayTime] as? Double) ?? 0.1
  return max(0.02, d)
}

try? FileManager.default.removeItem(at: dest)
let writer = try AVAssetWriter(outputURL: dest, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 2_500_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel]])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H])
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

let timescale: CMTimeScale = 1000
var t = 0.0
for i in 0..<count {
  guard let img = CGImageSourceCreateImageAtIndex(source, i, nil) else { continue }
  while !input.isReadyForMoreMediaData { usleep(2000) }
  var pb: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
  CVPixelBufferLockBaseAddress(pb!, [])
  let ctx = CGContext(data: CVPixelBufferGetBaseAddress(pb!), width: W, height: H, bitsPerComponent: 8,
                      bytesPerRow: CVPixelBufferGetBytesPerRow(pb!), space: CGColorSpaceCreateDeviceRGB(),
                      bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
  /* A GIF frame can be transparent: lay it on white, as a browser page would show it. */
  ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
  ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
  ctx.interpolationQuality = .high
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H))
  CVPixelBufferUnlockBaseAddress(pb!, [])
  adaptor.append(pb!, withPresentationTime: CMTime(value: CMTimeValue(t * Double(timescale)), timescale: timescale))
  t += delay(i)
}
input.markAsFinished()
writer.endSession(atSourceTime: CMTime(value: CMTimeValue(t * Double(timescale)), timescale: timescale))
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
if writer.status != .completed { fatalError("write failed: \(String(describing: writer.error))") }
print("wrote", dest.lastPathComponent, count, "frames", String(format: "%.1fs", t), "\(W)x\(H)")
