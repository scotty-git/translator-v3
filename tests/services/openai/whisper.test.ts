import { describe, it, expect } from 'vitest'
import { WhisperService } from '@/services/openai/whisper'

describe('WhisperService', () => {
  it('builds context prompt correctly', () => {
    const messages = ['Hello', 'How are you?', 'I am fine']
    const prompt = WhisperService.buildContextPrompt(messages)
    expect(prompt).toContain('How are you?')
    expect(prompt.length).toBeLessThanOrEqual(200)
  })

  it('handles empty messages array', () => {
    const prompt = WhisperService.buildContextPrompt([])
    expect(prompt).toBe('')
  })

  it('limits prompt to 200 characters', () => {
    const longMessages = [
      'This is a very long message that should be truncated',
      'Another long message that adds to the total length',
      'And yet another long message to ensure we exceed 200 characters total length for this test'
    ]
    const prompt = WhisperService.buildContextPrompt(longMessages)
    expect(prompt.length).toBeLessThanOrEqual(200)
  })
  
  it('detects language correctly', () => {
    expect(WhisperService.detectLanguage('english')).toBe('en')
    expect(WhisperService.detectLanguage('spanish')).toBe('es')
    expect(WhisperService.detectLanguage('portuguese')).toBe('pt')
    expect(WhisperService.detectLanguage('en')).toBe('en')
    expect(WhisperService.detectLanguage('es')).toBe('es')
    expect(WhisperService.detectLanguage('pt')).toBe('pt')
  })

  it('handles unknown language', () => {
    expect(WhisperService.detectLanguage('french')).toBe('en')
    expect(WhisperService.detectLanguage('unknown')).toBe('en')
    expect(WhisperService.detectLanguage('')).toBe('en')
  })

  it('handles case sensitivity', () => {
    expect(WhisperService.detectLanguage('ENGLISH')).toBe('en')
    expect(WhisperService.detectLanguage('Spanish')).toBe('es')
    expect(WhisperService.detectLanguage('PORTUGUESE')).toBe('pt')
  })
})