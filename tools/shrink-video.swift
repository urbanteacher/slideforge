// Re-encode a video smaller for the web: H.264 at a chosen height and bitrate, AAC audio. Render's free plan
// sends 5 GB a month and a lecture clip is sent whole to every screen that plays it, so the bitrate is the cost.
// avconvert's presets pick their own (higher) bitrates; this one is set by hand.
//
//   swift tools/shrink-video.swift <in.mp4> <out.mp4> [height=720] [video kbps=500] [audio kbps=96]
import AVFoundation

let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: shrink-video.swift in.mp4 out.mp4 [height] [kbps] [audio kbps]"); exit(2) }
let src = URL(fileURLWithPath: args[1]), dst = URL(fileURLWithPath: args[2])
let height = args.count > 3 ? Int(args[3]) ?? 720 : 720
let kbps = args.count > 4 ? Int(args[4]) ?? 500 : 500
let akbps = args.count > 5 ? Int(args[5]) ?? 96 : 96
try? FileManager.default.removeItem(at: dst)

let asset = AVURLAsset(url: src)
let sem = DispatchSemaphore(value: 0)
Task {
  do {
    let vtrack = try await asset.loadTracks(withMediaType: .video).first!
    let atrack = try await asset.loadTracks(withMediaType: .audio).first
    let natural = try await vtrack.load(.naturalSize), transform = try await vtrack.load(.preferredTransform)
    let shown = natural.applying(transform)
    let (w0, h0) = (abs(shown.width), abs(shown.height))
    let h = min(Double(height), Double(h0)), w = (w0 * h / h0 / 2).rounded() * 2

    let reader = try AVAssetReader(asset: asset)
    let vout = AVAssetReaderTrackOutput(track: vtrack, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange])
    reader.add(vout)
    let writer = try AVAssetWriter(outputURL: dst, fileType: .mp4)
    writer.shouldOptimizeForNetworkUse = true   // the index first, so playback starts before the end arrives
    let vin = AVAssetWriterInput(mediaType: .video, outputSettings: [
      AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: Int(w), AVVideoHeightKey: Int(h),
      AVVideoScalingModeKey: AVVideoScalingModeResizeAspect,
      AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: kbps * 1000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalDurationKey: 2]
    ])
    vin.transform = transform
    writer.add(vin)
    var aout: AVAssetReaderTrackOutput? = nil, ain: AVAssetWriterInput? = nil
    if let atrack {
      let o = AVAssetReaderTrackOutput(track: atrack, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM])
      reader.add(o); aout = o
      let i = AVAssetWriterInput(mediaType: .audio, outputSettings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVNumberOfChannelsKey: 2, AVSampleRateKey: 44100, AVEncoderBitRateKey: akbps * 1000])
      writer.add(i); ain = i
    }
    reader.startReading(); writer.startWriting(); writer.startSession(atSourceTime: .zero)
    let group = DispatchGroup()
    func pump(_ input: AVAssetWriterInput, _ output: AVAssetReaderTrackOutput, _ label: String) {
      group.enter()
      input.requestMediaDataWhenReady(on: DispatchQueue(label: label)) {
        while input.isReadyForMoreMediaData {
          guard let buf = output.copyNextSampleBuffer() else { input.markAsFinished(); group.leave(); return }
          input.append(buf)
        }
      }
    }
    pump(vin, vout, "video")
    if let ain, let aout { pump(ain, aout, "audio") }
    group.wait()
    await writer.finishWriting()
    if writer.status != .completed { print("failed: \(String(describing: writer.error))"); exit(1) }
    print("wrote \(dst.path) at \(Int(w))x\(Int(h)), \(kbps) kbps")
  } catch { print("failed: \(error)"); exit(1) }
  sem.signal()
}
sem.wait()
