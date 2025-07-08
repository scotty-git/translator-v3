import OpenAI from 'openai'
import { networkQualityDetector } from './network-quality'

let _openai: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!_openai) {
    // Get API key from runtime environment - this should be set by the user
    const apiKey = (window as any).OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY

    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please set your API key.')
    }

    _openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
      timeout: networkQualityDetector.getCurrentTimeout(), // Adaptive timeout
    })
  }
  
  return _openai
}

/**
 * Get OpenAI client with current network-adaptive timeout
 * This ensures we always use the most current timeout based on network conditions
 */
export function getOpenAIClientWithAdaptiveTimeout(): OpenAI {
  // Get API key from runtime environment - this should be set by the user
  const apiKey = (window as any).OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please set your API key.')
  }

  const currentTimeout = networkQualityDetector.getCurrentTimeout()
  
  console.log(`🌐 Using OpenAI timeout: ${currentTimeout}ms (${networkQualityDetector.getCurrentQuality()} network)`)

  return new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
    timeout: currentTimeout,
  })
}

// API Cost tracking
export const API_COSTS = {
  whisper: 0.006, // per minute
  gpt4oMini: {
    input: 0.00015,  // per 1K tokens
    output: 0.00060  // per 1K tokens
  },
  tts: 0.015 // per 1K characters
}

export function calculateWhisperCost(durationSeconds: number): number {
  const minutes = Math.ceil(durationSeconds / 60)
  return minutes * API_COSTS.whisper
}

export function calculateGPTCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1000) * API_COSTS.gpt4oMini.input
  const outputCost = (outputTokens / 1000) * API_COSTS.gpt4oMini.output
  return inputCost + outputCost
}

export function calculateTTSCost(characters: number): number {
  return (characters / 1000) * API_COSTS.tts
}

export function logApiCost(service: string, cost: number): void {
  console.log(`💰 ${service} cost: $${cost.toFixed(5)}`)
}