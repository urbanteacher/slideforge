// Stitches "Which Chart?" with macOS's own AVFoundation, so no ffmpeg is needed:
// mixes each narration line in at its cue time, then writes H.264 + AAC.
//   swiftc -O tools/video-which-chart/encode.swift -o <outDir>/encode
//   <outDir>/encode <outDir> 25 <dest.mp4> [videoBitsPerSecond]
// Reads <outDir>/timeline.json and <outDir>/frames/*.jpg (render.mjs).
import AVFoundation
import Foundation
import ImageIO

let args = CommandLine.arguments
let outDir = URL(fileURLWithPath: args[1])
let fps = Int32(args[2])!
let dest = URL(fileURLWithPath: args[3])
let bitrate = args.count > 4 ? Int(args[4])! : 1_400_000

struct Line: Decodable { let start: Double; let file: String }
struct Timeline: Decodable { let lines: [String: Line]; let total: Double }
let tl = try JSONDecoder().decode(Timeline.self, from: Data(contentsOf: outDir.appendingPathComponent("timeline.json")))

// 1. One narration track: every line converted to 44.1 kHz mono and laid at its start.
let rate = 44100.0
let fmt = AVAudioFormat(standardFormatWithSampleRate: rate, channels: 1)!
let total = AVAudioFrameCount(tl.total * rate) + 1
let mix = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: total)!
mix.frameLength = total
memset(mix.floatChannelData![0], 0, Int(total) * 4)
for (_, line) in tl.lines {
  let file = try AVAudioFile(forReading: URL(fileURLWithPath: line.file))
  let src = AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: AVAudioFrameCount(file.length))!
  try file.read(into: src)
  let conv = AVAudioConverter(from: file.processingFormat, to: fmt)!
  let dst = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: AVAudioFrameCount(Double(src.frameLength) * rate / file.processingFormat.sampleRate) + 4096)!
  var fed = false
  var err: NSError?
  conv.convert(to: dst, error: &err) { _, status in
    if fed { status.pointee = .endOfStream; return nil }
    fed = true; status.pointee = .haveData; return src
  }
  if let err { throw err }
  let off = Int(line.start * rate), n = min(Int(dst.frameLength), Int(total) - off)
  let d = mix.floatChannelData![0], s = dst.floatChannelData![0]
  for i in 0..<max(0, n) { d[off + i] += s[i] * 0.95 }
}
let wav = outDir.appendingPathComponent("narration.wav")
try? FileManager.default.removeItem(at: wav)
do {
  let w = try AVAudioFile(forWriting: wav, settings: [AVFormatIDKey: kAudioFormatLinearPCM, AVSampleRateKey: rate, AVNumberOfChannelsKey: 1, AVLinearPCMBitDepthKey: 16, AVLinearPCMIsFloatKey: false])
  try w.write(from: mix)
}

// 2. Frames + narration into one MP4.
try? FileManager.default.removeItem(at: dest)
let writer = try AVAssetWriter(outputURL: dest, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true
let colour = [AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2, AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2, AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2]
let vIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: 1920, AVVideoHeightKey: 1080, AVVideoColorPropertiesKey: colour,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: bitrate, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalKey: Int(fps) * 2]])
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: vIn, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: 1920, kCVPixelBufferHeightKey as String: 1080])
let aIn = AVAssetWriterInput(mediaType: .audio, outputSettings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: rate, AVNumberOfChannelsKey: 1, AVEncoderBitRateKey: 96000])
writer.add(vIn); writer.add(aIn)
writer.startWriting(); writer.startSession(atSourceTime: .zero)

let framesDir = outDir.appendingPathComponent("frames")
let frames = try FileManager.default.contentsOfDirectory(atPath: framesDir.path).filter { $0.hasSuffix(".jpg") }.sorted()
let space = CGColorSpace(name: CGColorSpace.sRGB)!
let group = DispatchGroup()
var fi = 0
group.enter()
vIn.requestMediaDataWhenReady(on: DispatchQueue(label: "video")) {
  while vIn.isReadyForMoreMediaData {
    if fi >= frames.count { vIn.markAsFinished(); group.leave(); return }
    autoreleasepool {
      let src = CGImageSourceCreateWithURL(framesDir.appendingPathComponent(frames[fi]) as CFURL, nil)!
      let img = CGImageSourceCreateImageAtIndex(src, 0, nil)!
      var pb: CVPixelBuffer?
      CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
      CVPixelBufferLockBaseAddress(pb!, [])
      let ctx = CGContext(data: CVPixelBufferGetBaseAddress(pb!), width: 1920, height: 1080, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pb!), space: space,
                          bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
      ctx.draw(img, in: CGRect(x: 0, y: 0, width: 1920, height: 1080))
      CVPixelBufferUnlockBaseAddress(pb!, [])
      adaptor.append(pb!, withPresentationTime: CMTime(value: CMTimeValue(fi), timescale: fps))
    }
    fi += 1
  }
}
let asset = AVURLAsset(url: wav)
let reader = try AVAssetReader(asset: asset)
let rOut = AVAssetReaderTrackOutput(track: asset.tracks(withMediaType: .audio)[0], outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM])
reader.add(rOut); reader.startReading()
group.enter()
aIn.requestMediaDataWhenReady(on: DispatchQueue(label: "audio")) {
  while aIn.isReadyForMoreMediaData {
    if let sb = rOut.copyNextSampleBuffer() { aIn.append(sb) } else { aIn.markAsFinished(); group.leave(); return }
  }
}
group.wait()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
if writer.status != .completed { print("failed:", writer.error as Any); exit(1) }
print("wrote", dest.path, frames.count, "frames")
