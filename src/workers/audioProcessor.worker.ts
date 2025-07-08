/**
 * Audio Processing Web Worker for Phase 7
 * Handles heavy audio operations off the main thread for better performance
 * Prevents UI blocking during audio compression, analysis, and format conversion
 */

// Define message types for type safety
export interface AudioWorkerMessage {
  id: string
  type: 'COMPRESS_AUDIO' | 'ANALYZE_AUDIO' | 'CONVERT_FORMAT' | 'NORMALIZE_AUDIO'
  data: any
}

export interface AudioWorkerResponse {
  id: string
  type: 'AUDIO_COMPRESSED' | 'AUDIO_ANALYZED' | 'FORMAT_CONVERTED' | 'AUDIO_NORMALIZED' | 'ERROR'
  data: any
  error?: string
}

export interface AudioAnalysisResult {
  peak: number
  rms: number
  duration: number
  sampleRate: number
  channels: number
  format: string
}

export interface AudioCompressionOptions {
  quality: 'high' | 'medium' | 'low'
  targetSampleRate?: number
  targetChannels?: number
}

// Audio processing functions
class AudioProcessor {
  /**
   * Compress audio for network optimization
   */
  static async compressAudio(
    audioBuffer: ArrayBuffer, 
    options: AudioCompressionOptions
  ): Promise<ArrayBuffer> {
    console.log(`🔧 [Audio Worker] Compressing audio: ${audioBuffer.byteLength} bytes`)
    
    // Parse the audio data (simplified implementation)
    const inputData = new Float32Array(audioBuffer)
    
    // Quality-based compression parameters
    const compressionParams = {
      high: { reduction: 0.1, sampleRateReduction: 1.0 },
      medium: { reduction: 0.3, sampleRateReduction: 0.8 },
      low: { reduction: 0.5, sampleRateReduction: 0.6 }
    }
    
    const params = compressionParams[options.quality]
    
    // Simple compression: reduce sample rate and apply basic compression
    const targetLength = Math.floor(inputData.length * params.sampleRateReduction)
    const compressedData = new Float32Array(targetLength)
    
    // Downsample with basic averaging
    const step = inputData.length / targetLength
    for (let i = 0; i < targetLength; i++) {
      const sourceIndex = Math.floor(i * step)
      compressedData[i] = inputData[sourceIndex] * (1 - params.reduction)
    }
    
    console.log(`✅ [Audio Worker] Compression complete: ${compressedData.buffer.byteLength} bytes (${Math.round((1 - compressedData.buffer.byteLength / audioBuffer.byteLength) * 100)}% reduction)`)
    
    return compressedData.buffer
  }
  
  /**
   * Analyze audio properties for quality assessment
   */
  static analyzeAudio(audioBuffer: ArrayBuffer): AudioAnalysisResult {
    console.log(`📊 [Audio Worker] Analyzing audio: ${audioBuffer.byteLength} bytes`)
    
    const data = new Float32Array(audioBuffer)
    let peak = 0
    let sum = 0
    
    // Calculate peak and RMS values
    for (let i = 0; i < data.length; i++) {
      const sample = Math.abs(data[i])
      peak = Math.max(peak, sample)
      sum += sample * sample
    }
    
    const rms = Math.sqrt(sum / data.length)
    
    // Estimate audio properties (simplified)
    const sampleRate = 44100 // Default, would need proper parsing for real implementation
    const channels = 1 // Mono assumption
    const duration = data.length / sampleRate
    
    const result: AudioAnalysisResult = {
      peak,
      rms,
      duration,
      sampleRate,
      channels,
      format: 'float32'
    }
    
    console.log(`📊 [Audio Worker] Analysis complete:`, result)
    
    return result
  }
  
  /**
   * Convert audio format
   */
  static async convertFormat(
    audioBuffer: ArrayBuffer, 
    targetFormat: 'wav' | 'mp3' | 'webm'
  ): Promise<ArrayBuffer> {
    console.log(`🔄 [Audio Worker] Converting to ${targetFormat}: ${audioBuffer.byteLength} bytes`)
    
    // Simplified format conversion (in real implementation, would use proper audio encoding)
    const inputData = new Float32Array(audioBuffer)
    
    switch (targetFormat) {
      case 'wav':
        // Convert to WAV format (simplified)
        return this.createWAVBuffer(inputData, 44100, 1)
      
      case 'mp3':
        // Would use a proper MP3 encoder in real implementation
        console.warn('🚨 [Audio Worker] MP3 encoding not implemented, returning original')
        return audioBuffer
      
      case 'webm':
        // Would use WebM encoder
        console.warn('🚨 [Audio Worker] WebM encoding not implemented, returning original')
        return audioBuffer
      
      default:
        throw new Error(`Unsupported format: ${targetFormat}`)
    }
  }
  
  /**
   * Normalize audio levels
   */
  static normalizeAudio(audioBuffer: ArrayBuffer, targetLevel: number = 0.8): ArrayBuffer {
    console.log(`🎚️ [Audio Worker] Normalizing audio to ${targetLevel} level`)
    
    const data = new Float32Array(audioBuffer)
    
    // Find the peak value
    let peak = 0
    for (let i = 0; i < data.length; i++) {
      peak = Math.max(peak, Math.abs(data[i]))
    }
    
    // Calculate normalization factor
    const normalizationFactor = peak > 0 ? targetLevel / peak : 1
    
    // Apply normalization
    const normalizedData = new Float32Array(data.length)
    for (let i = 0; i < data.length; i++) {
      normalizedData[i] = data[i] * normalizationFactor
    }
    
    console.log(`✅ [Audio Worker] Normalization complete (factor: ${normalizationFactor.toFixed(3)})`)
    
    return normalizedData.buffer
  }
  
  /**
   * Create WAV buffer from Float32Array
   */
  private static createWAVBuffer(
    samples: Float32Array, 
    sampleRate: number, 
    channels: number
  ): ArrayBuffer {
    const length = samples.length
    const arrayBuffer = new ArrayBuffer(44 + length * 2)
    const view = new DataView(arrayBuffer)
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true) // PCM format
    view.setUint16(22, channels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * channels * 2, true)
    view.setUint16(32, channels * 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, length * 2, true)
    
    // Convert float samples to 16-bit PCM
    let offset = 44
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]))
      view.setInt16(offset, sample * 0x7FFF, true)
      offset += 2
    }
    
    return arrayBuffer
  }
}

// Worker message handler
self.addEventListener('message', async (event: MessageEvent<AudioWorkerMessage>) => {
  const { id, type, data } = event.data
  
  try {
    console.log(`🔧 [Audio Worker] Processing: ${type}`)
    
    let result: any
    let responseType: AudioWorkerResponse['type']
    
    switch (type) {
      case 'COMPRESS_AUDIO':
        result = await AudioProcessor.compressAudio(data.buffer, data.options)
        responseType = 'AUDIO_COMPRESSED'
        break
        
      case 'ANALYZE_AUDIO':
        result = AudioProcessor.analyzeAudio(data.buffer)
        responseType = 'AUDIO_ANALYZED'
        break
        
      case 'CONVERT_FORMAT':
        result = await AudioProcessor.convertFormat(data.buffer, data.format)
        responseType = 'FORMAT_CONVERTED'
        break
        
      case 'NORMALIZE_AUDIO':
        result = AudioProcessor.normalizeAudio(data.buffer, data.targetLevel)
        responseType = 'AUDIO_NORMALIZED'
        break
        
      default:
        throw new Error(`Unknown message type: ${type}`)
    }
    
    // Send success response
    const response: AudioWorkerResponse = {
      id,
      type: responseType,
      data: result
    }
    
    self.postMessage(response)
    console.log(`✅ [Audio Worker] Completed: ${type}`)
    
  } catch (error) {
    // Send error response
    const errorResponse: AudioWorkerResponse = {
      id,
      type: 'ERROR',
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    
    self.postMessage(errorResponse)
    console.error(`❌ [Audio Worker] Error in ${type}:`, error)
  }
})

// Worker initialization
console.log('🔧 [Audio Worker] Audio processing worker initialized')
self.postMessage({ 
  id: 'init', 
  type: 'WORKER_READY' as any, 
  data: { ready: true } 
})