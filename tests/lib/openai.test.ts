import { describe, it, expect } from 'vitest'
import { calculateWhisperCost, calculateGPTCost, calculateTTSCost } from '@/lib/openai'

describe('OpenAI Cost Calculations', () => {
  it('calculates Whisper cost correctly', () => {
    expect(calculateWhisperCost(30)).toBeCloseTo(0.006, 5) // 30s = 1 min
    expect(calculateWhisperCost(90)).toBeCloseTo(0.012, 5) // 90s = 2 min (rounded up)
    expect(calculateWhisperCost(150)).toBeCloseTo(0.018, 5) // 150s = 3 min (rounded up)
  })
  
  it('calculates GPT cost correctly', () => {
    const cost = calculateGPTCost(1000, 500)
    expect(cost).toBeCloseTo(0.00015 + 0.0003, 5)
  })
  
  it('calculates TTS cost correctly', () => {
    expect(calculateTTSCost(1000)).toBe(0.015)
    expect(calculateTTSCost(500)).toBe(0.0075)
    expect(calculateTTSCost(2000)).toBe(0.03)
  })

  it('handles edge cases', () => {
    expect(calculateWhisperCost(0)).toBe(0)
    expect(calculateGPTCost(0, 0)).toBe(0)
    expect(calculateTTSCost(0)).toBe(0)
  })
})