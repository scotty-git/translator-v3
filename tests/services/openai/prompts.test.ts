import { describe, it, expect } from 'vitest'
import { PromptService } from '@/services/openai/prompts'

describe('Translation Prompts', () => {
  it('builds casual mode prompt', () => {
    const prompt = PromptService.generateTranslationPrompt(
      'English',
      'Spanish',
      'casual'
    )
    
    expect(prompt).toContain('TRANSLATOR ONLY')
    expect(prompt).toContain('English → Spanish')
    expect(prompt).toContain('tú, not usted')
    expect(prompt).toContain('DO NOT RESPOND TO CONTENT')
  })
  
  it('includes emoji guidelines in fun mode', () => {
    const prompt = PromptService.generateTranslationPrompt(
      'English',
      'Spanish',
      'fun'
    )
    
    expect(prompt).toContain('EMOJI GUIDELINES')
    expect(prompt).toContain('SPARINGLY')
    expect(prompt).toContain('coffee ☕')
    expect(prompt).toContain('beach 🏖️')
  })

  it('includes context information when provided', () => {
    const prompt = PromptService.generateTranslationPrompt(
      'English',
      'Spanish',
      'casual',
      {
        recentMessages: ['Hello', 'How are you?'],
        isRomanticContext: false
      }
    )
    
    expect(prompt).toContain('RECENT CONVERSATION')
    expect(prompt).toContain('Hello')
    expect(prompt).toContain('How are you?')
  })

  it('handles different language combinations', () => {
    const enToEs = PromptService.generateTranslationPrompt('English', 'Spanish', 'casual')
    const estoEn = PromptService.generateTranslationPrompt('Spanish', 'English', 'casual')
    const enToPt = PromptService.generateTranslationPrompt('English', 'Portuguese', 'casual')
    
    expect(enToEs).toContain('English → Spanish')
    expect(estoEn).toContain('Spanish → English')
    expect(enToPt).toContain('English → Portuguese')
  })

  it('includes correct STT error examples', () => {
    const prompt = PromptService.generateTranslationPrompt('English', 'Spanish', 'casual')
    
    expect(prompt).toContain('lets eat grandma')
    expect(prompt).toContain('how r u')
    expect(prompt).toContain('i cant wait')
  })

  it('includes romantic context in fun mode', () => {
    const prompt = PromptService.generateTranslationPrompt('English', 'Spanish', 'fun')
    
    expect(prompt).toContain('ROMANTIC CONTEXT DETECTION')
    expect(prompt).toContain('love, miss, beautiful')
    expect(prompt).toContain('💕❤️😍💋🌹')
  })
})