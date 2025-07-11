# Phase 5: Translation Pipeline Integration

## 🎯 Vibe Check

**What we're doing**: Integrating message editing with the TranslationPipeline to ensure edited messages trigger re-translation, whether they originated from voice or text input.

**Why it's awesome**: Users can fix transcription errors or rephrase their thoughts, and the translation automatically updates - keeping conversations flowing smoothly across language barriers!

**Time estimate**: 60-75 minutes of Claude working autonomously

**Project type**: Service Integration

## ✅ Success Criteria

- [ ] Edited messages trigger re-translation through TranslationPipeline
- [ ] Works for both voice-originated and text-originated messages  
- [ ] Translation preserves original language detection
- [ ] Re-translation respects conversation context
- [ ] Loading states show during re-translation
- [ ] Failed re-translations handled gracefully
- [ ] Performance metrics tracked for re-translations

## 🚀 Pre-Flight Checklist

Before starting, verify:
- [ ] Phase 4 complete (edit UI working)
- [ ] Dev server is running: `npm run dev`
- [ ] All tests pass: `npm test`
- [ ] Create safety commit: `git add -A && git commit -m "chore: pre-phase-5 checkpoint"`
- [ ] Create git tag: `git tag pre-phase-5`

## 🧪 Automated Test Suite

```typescript
// tests/features/phase-5-validation.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Phase 5: Translation Integration Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    
    // Send a test message
    await page.click('[data-testid="text-input-toggle"]')
    await page.fill('[data-testid="text-input"]', 'Hello world')
    await page.press('[data-testid="text-input"]', 'Enter')
    await page.waitForTimeout(2000) // Wait for translation
  })
  
  test('edited text message triggers re-translation', async ({ page }) => {
    const message = page.locator('[data-testid="message-bubble"]').first()
    
    // Verify original translation
    await expect(message.locator('[data-testid="message-text"]')).toContainText('Hola mundo')
    
    // Edit the message
    await message.locator('[data-testid="edit-button"]').click()
    const editInput = message.locator('[data-testid="edit-input"]')
    await editInput.clear()
    await editInput.fill('Goodbye world')
    await message.locator('[data-testid="save-edit-button"]').click()
    
    // Wait for re-translation
    await page.waitForTimeout(2000)
    
    // Verify new translation
    await expect(message.locator('[data-testid="message-text"]')).toContainText('Adiós mundo')
    await expect(message.locator('[data-testid="edited-indicator"]')).toBeVisible()
  })
  
  test('edited voice message triggers re-translation', async ({ page }) => {
    // Simulate voice message
    await page.evaluate(() => {
      window.testHelpers?.addVoiceMessage('Good morning', 'Buenos días')
    })
    
    const message = page.locator('[data-testid="message-bubble"]').first()
    
    // Edit the voice transcription
    await message.locator('[data-testid="edit-button"]').click()
    const editInput = message.locator('[data-testid="edit-input"]')
    await editInput.clear()
    await editInput.fill('Good evening')
    await message.locator('[data-testid="save-edit-button"]').click()
    
    // Wait for re-translation
    await page.waitForTimeout(2000)
    
    // Verify new translation
    await expect(message.locator('[data-testid="message-text"]')).toContainText('Buenas tardes')
  })
  
  test('re-translation shows loading state', async ({ page }) => {
    const message = page.locator('[data-testid="message-bubble"]').first()
    
    // Start editing
    await message.locator('[data-testid="edit-button"]').click()
    const editInput = message.locator('[data-testid="edit-input"]')
    await editInput.clear()
    await editInput.fill('Testing loading state')
    
    // Mock slow translation
    await page.evaluate(() => {
      window.testHelpers?.setTranslationDelay(3000)
    })
    
    await message.locator('[data-testid="save-edit-button"]').click()
    
    // Verify loading state appears
    await expect(message.locator('[data-testid="translation-loading"]')).toBeVisible()
    
    // Wait for completion
    await page.waitForTimeout(3500)
    await expect(message.locator('[data-testid="translation-loading"]')).not.toBeVisible()
  })
  
  test('failed re-translation shows error state', async ({ page }) => {
    const message = page.locator('[data-testid="message-bubble"]').first()
    
    // Mock translation failure
    await page.evaluate(() => {
      window.testHelpers?.setTranslationError(true)
    })
    
    // Edit message
    await message.locator('[data-testid="edit-button"]').click()
    const editInput = message.locator('[data-testid="edit-input"]')
    await editInput.clear()
    await editInput.fill('This will fail')
    await message.locator('[data-testid="save-edit-button"]').click()
    
    // Wait for error
    await page.waitForTimeout(1000)
    
    // Verify error state
    await expect(message.locator('[data-testid="translation-error"]')).toBeVisible()
    await expect(message.locator('[data-testid="retry-translation"]')).toBeVisible()
  })
  
  test('conversation context preserved in re-translation', async ({ page }) => {
    // Add multiple messages for context
    await page.evaluate(() => {
      window.testHelpers?.addMessage('I love pizza', 'Me encanta la pizza')
      window.testHelpers?.addMessage('It is my favorite food', 'Es mi comida favorita')
    })
    
    // Edit the second message with pronoun
    const messages = page.locator('[data-testid="message-bubble"]')
    const secondMessage = messages.nth(1)
    
    await secondMessage.locator('[data-testid="edit-button"]').click()
    const editInput = secondMessage.locator('[data-testid="edit-input"]')
    await editInput.clear()
    await editInput.fill('It tastes amazing') // "It" should refer to pizza
    await secondMessage.locator('[data-testid="save-edit-button"]').click()
    
    // Wait for re-translation
    await page.waitForTimeout(2000)
    
    // Verify context-aware translation
    await expect(secondMessage.locator('[data-testid="message-text"]')).toContainText('Sabe increíble')
  })
})
```

## 📝 Implementation Steps

### Step 1: Extend TranslationPipeline for Re-translation

Update the TranslationPipeline to handle re-translation requests:

```typescript
// In src/services/pipeline/TranslationPipeline.ts

export interface ReTranslationRequest extends TranslationRequest {
  messageId: string
  isEdit: boolean
  previousTranslation?: string
  conversationContext?: ConversationContextEntry[]
}

export class TranslationPipeline implements ITranslationPipeline {
  // ... existing code ...
  
  /**
   * Handle re-translation of edited messages
   */
  async reTranslateMessage(request: ReTranslationRequest): Promise<TranslationResult> {
    const startTime = Date.now()
    
    try {
      // Mark message as processing
      this.onReTranslationStart?.(request.messageId)
      
      // Detect language if not provided (for edited text)
      let sourceLanguage = request.sourceLanguage
      if (!sourceLanguage) {
        const detection = await this.detectLanguage(request.text)
        sourceLanguage = detection.language
      }
      
      // Get conversation context for better translation
      const context = request.conversationContext || 
        this.conversationManager.getRecentContext(5)
      
      // Translate with context
      const translationResult = await this.performTranslation({
        text: request.text,
        sourceLanguage,
        targetLanguage: request.targetLanguage,
        context,
        isReTranslation: true
      })
      
      // Update performance metrics
      const metrics: PerformanceMetrics = {
        totalDuration: Date.now() - startTime,
        translationDuration: translationResult.duration,
        operation: 're-translation',
        timestamp: new Date().toISOString()
      }
      
      // Notify completion
      this.onReTranslationComplete?.({
        messageId: request.messageId,
        translation: translationResult.translation,
        originalText: request.text,
        sourceLanguage,
        targetLanguage: request.targetLanguage,
        metrics
      })
      
      return {
        translation: translationResult.translation,
        sourceLanguage,
        targetLanguage: request.targetLanguage,
        confidence: translationResult.confidence,
        metrics
      }
      
    } catch (error) {
      console.error('Re-translation failed:', error)
      
      // Notify error
      this.onReTranslationError?.(request.messageId, error)
      
      throw new TranslationError(
        'RE_TRANSLATION_FAILED',
        'Failed to re-translate message',
        error
      )
    }
  }
  
  /**
   * Perform the actual translation with OpenAI
   */
  private async performTranslation({
    text,
    sourceLanguage,
    targetLanguage,
    context,
    isReTranslation
  }: {
    text: string
    sourceLanguage: string
    targetLanguage: string
    context: ConversationContextEntry[]
    isReTranslation?: boolean
  }): Promise<{ translation: string; confidence: number; duration: number }> {
    const startTime = Date.now()
    
    // Build system prompt with context
    const systemPrompt = this.buildTranslationPrompt({
      sourceLanguage,
      targetLanguage,
      context,
      isReTranslation
    })
    
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.3,
      max_tokens: 500
    })
    
    const translation = completion.choices[0]?.message?.content || ''
    
    return {
      translation: translation.trim(),
      confidence: 0.95, // Could be calculated based on model confidence
      duration: Date.now() - startTime
    }
  }
  
  private buildTranslationPrompt({
    sourceLanguage,
    targetLanguage,
    context,
    isReTranslation
  }: {
    sourceLanguage: string
    targetLanguage: string
    context: ConversationContextEntry[]
    isReTranslation?: boolean
  }): string {
    let prompt = `You are a professional translator. Translate from ${sourceLanguage} to ${targetLanguage}.
Keep the translation natural and conversational.
Preserve the original meaning and tone.`
    
    if (isReTranslation) {
      prompt += `\nThis is a correction of a previous message, so ensure accuracy.`
    }
    
    if (context.length > 0) {
      prompt += `\n\nConversation context for reference:`
      context.forEach(entry => {
        prompt += `\n${entry.role}: ${entry.original} (${entry.translation})`
      })
      prompt += `\n\nUse this context to ensure pronouns and references are translated correctly.`
    }
    
    return prompt
  }
}
```

### Step 2: Connect MessageSyncService to TranslationPipeline

Wire up the re-translation trigger:

```typescript
// In src/services/MessageSyncService.ts

export class MessageSyncService {
  constructor(
    private realtimeConnection: RealtimeConnection,
    private supabase: SupabaseClient,
    private currentUserId: string,
    private translationPipeline?: ITranslationPipeline,
    private callbacks?: MessageSyncCallbacks
  ) {
    // ... existing code ...
  }
  
  // Update editMessage to trigger re-translation
  async editMessage(messageId: string, newOriginalText: string): Promise<void> {
    const operation: EditOperation = {
      type: 'edit_message',
      messageId,
      originalText: newOriginalText,
      previousText: '',
      timestamp: new Date().toISOString()
    }
    
    if (this.connectionStatus === 'connected') {
      try {
        // Get current message for context
        const { data: currentMessage } = await this.supabase
          .from('messages')
          .select('*')
          .eq('id', messageId)
          .single()
        
        operation.previousText = currentMessage.original_text
        
        // Update message and clear translation
        const { error } = await this.supabase
          .from('messages')
          .update({
            original_text: newOriginalText,
            is_edited: true,
            edited_at: new Date().toISOString(),
            translated_text: null, // Clear to show loading state
            translation_status: 'pending'
          })
          .eq('id', messageId)
        
        if (error) throw error
        
        // Trigger re-translation if pipeline available
        if (this.translationPipeline) {
          await this.triggerReTranslation(
            messageId, 
            newOriginalText,
            currentMessage.original_language,
            currentMessage.target_language || this.getTargetLanguage()
          )
        } else {
          // Fallback: notify UI to handle re-translation
          this.onReTranslationNeeded?.(messageId, newOriginalText)
        }
        
      } catch (error) {
        console.error('Failed to edit message:', error)
        this.queueOperation(operation)
      }
    } else {
      this.queueOperation(operation)
    }
  }
  
  private async triggerReTranslation(
    messageId: string, 
    originalText: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<void> {
    try {
      const result = await this.translationPipeline!.reTranslateMessage({
        messageId,
        text: originalText,
        sourceLanguage,
        targetLanguage,
        isEdit: true,
        audioUrl: '', // Not needed for text edits
        conversationContext: await this.getConversationContext()
      })
      
      // Update message with new translation
      await this.supabase
        .from('messages')
        .update({
          translated_text: result.translation,
          translation_status: 'completed',
          performance_metrics: result.metrics
        })
        .eq('id', messageId)
      
    } catch (error) {
      // Update message with error status
      await this.supabase
        .from('messages')
        .update({
          translation_status: 'failed',
          translation_error: error.message
        })
        .eq('id', messageId)
      
      throw error
    }
  }
  
  private async getConversationContext(): Promise<ConversationContextEntry[]> {
    // Get recent messages for context
    const { data: messages } = await this.supabase
      .from('messages')
      .select('*')
      .eq('session_id', this.currentSessionId)
      .order('timestamp', { ascending: false })
      .limit(10)
    
    if (!messages) return []
    
    return messages.reverse().map(msg => ({
      role: msg.sender_id === this.currentUserId ? 'user' : 'assistant',
      original: msg.original_text,
      translation: msg.translated_text || '',
      timestamp: msg.timestamp
    }))
  }
}
```

### Step 3: Update MessageBubble for Re-translation States

Add visual feedback during re-translation:

```typescript
// Update src/features/translator/shared/components/MessageBubble.tsx

export function MessageBubble({
  message,
  onEdit,
  // ... other props
}: MessageBubbleProps) {
  // ... existing state ...
  
  const [isReTranslating, setIsReTranslating] = useState(false)
  const [reTranslationError, setReTranslationError] = useState<string | null>(null)
  
  // Handle edit save with re-translation
  const handleSaveEdit = async () => {
    if (!editText.trim() || editText === message.original) {
      setIsEditMode(false)
      return
    }
    
    setIsSaving(true)
    setIsReTranslating(true)
    setReTranslationError(null)
    
    try {
      await onEdit?.(message.id, editText.trim())
      setIsEditMode(false)
    } catch (error) {
      console.error('Failed to save edit:', error)
      setReTranslationError('Failed to re-translate message')
    } finally {
      setIsSaving(false)
      // Keep re-translating state until message updates
    }
  }
  
  // Watch for translation completion
  useEffect(() => {
    if (isReTranslating && message.translation && message.is_edited) {
      setIsReTranslating(false)
    }
  }, [message.translation, message.is_edited, isReTranslating])
  
  // Render translation state
  const renderTranslationState = () => {
    if (isReTranslating) {
      return (
        <div className="flex items-center gap-2 mt-2 text-sm opacity-70" data-testid="translation-loading">
          <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
          <span>Re-translating...</span>
        </div>
      )
    }
    
    if (reTranslationError) {
      return (
        <div className="flex items-center gap-2 mt-2 text-sm text-red-500" data-testid="translation-error">
          <AlertCircle className="h-3 w-3" />
          <span>{reTranslationError}</span>
          <button
            onClick={handleRetryTranslation}
            className="underline hover:no-underline"
            data-testid="retry-translation"
          >
            Retry
          </button>
        </div>
      )
    }
    
    return null
  }
  
  const handleRetryTranslation = async () => {
    setReTranslationError(null)
    setIsReTranslating(true)
    try {
      await onEdit?.(message.id, message.original || '')
    } catch (error) {
      setReTranslationError('Retry failed')
    }
  }
  
  return (
    <div /* ... existing wrapper ... */>
      <div /* ... message bubble ... */>
        {/* Normal Message Display */}
        <div className={getFontSizeClass(fontSize)} data-testid="message-text">
          {primaryText}
        </div>
        
        {/* Show edited indicator */}
        {message.is_edited && !isReTranslating && (
          <span className="text-xs opacity-60 ml-1" data-testid="edited-indicator">
            (edited)
          </span>
        )}
        
        {/* Translation state feedback */}
        {renderTranslationState()}
        
        {/* ... rest of message content ... */}
      </div>
    </div>
  )
}
```

### Step 4: Add Translation Pipeline Callbacks

Define callbacks for UI updates:

```typescript
// In src/services/pipeline/types.ts

export interface TranslationPipelineCallbacks {
  // Existing callbacks
  onTranslationStart?: (requestId: string) => void
  onTranslationComplete?: (result: TranslationResult) => void
  onTranslationError?: (error: TranslationError) => void
  
  // Re-translation callbacks
  onReTranslationStart?: (messageId: string) => void
  onReTranslationComplete?: (result: ReTranslationResult) => void
  onReTranslationError?: (messageId: string, error: Error) => void
}

export interface ReTranslationResult {
  messageId: string
  translation: string
  originalText: string
  sourceLanguage: string
  targetLanguage: string
  metrics: PerformanceMetrics
}
```

### Step 5: Integration with MessageQueueService

Update MessageQueueService to handle re-translation:

```typescript
// In src/services/queues/MessageQueueService.ts

export class MessageQueueService implements IMessageQueue {
  // ... existing code ...
  
  /**
   * Update message after edit and trigger re-translation
   */
  async updateMessageForEdit(
    messageId: string, 
    newOriginalText: string
  ): Promise<void> {
    const messageIndex = this.messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return
    
    const message = this.messages[messageIndex]
    
    // Update message
    const updatedMessage: QueuedMessage = {
      ...message,
      original: newOriginalText,
      translation: null, // Clear translation
      status: 'processing',
      is_edited: true,
      edited_at: new Date().toISOString()
    }
    
    this.messages[messageIndex] = updatedMessage
    this.notifySubscribers()
    
    // Trigger re-translation through sync service
    if (this.messageSyncService) {
      await this.messageSyncService.editMessage(messageId, newOriginalText)
    }
  }
  
  /**
   * Update message with re-translation result
   */
  updateMessageTranslation(
    messageId: string, 
    translation: string,
    metrics?: PerformanceMetrics
  ): void {
    const messageIndex = this.messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return
    
    this.messages[messageIndex] = {
      ...this.messages[messageIndex],
      translation,
      status: 'displayed',
      displayed_at: new Date().toISOString(),
      performance_metrics: metrics
    }
    
    this.notifySubscribers()
  }
}
```

### Step 6: Add Test Helpers

Create test helpers for development:

```typescript
// In src/utils/testHelpers.ts

export const testHelpers = {
  // ... existing helpers ...
  
  addVoiceMessage(original: string, translation: string) {
    if (!this.messageQueue) return
    
    const message = {
      id: uuidv4(),
      original,
      translation,
      original_lang: 'en',
      target_lang: 'es',
      status: 'displayed' as const,
      queued_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      displayed_at: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      sender_id: 'current-user',
      user_id: 'current-user',
      performance_metrics: {
        totalDuration: 1500,
        transcriptionDuration: 500,
        translationDuration: 800,
        operation: 'voice-translation'
      },
      audio_url: 'mock-audio-url'
    }
    
    this.messageQueue.add(message)
    return message
  },
  
  setTranslationDelay(delay: number) {
    if (window.translationPipeline) {
      window.translationPipeline.setMockDelay(delay)
    }
  },
  
  setTranslationError(shouldError: boolean) {
    if (window.translationPipeline) {
      window.translationPipeline.setMockError(shouldError)
    }
  }
}
```

## ✅ Validation Steps

After implementation:

1. **Unit Testing**
   ```bash
   npm test -- TranslationPipeline MessageSyncService
   ```

2. **Integration Testing**
   ```bash
   npx playwright test tests/features/phase-5-validation.spec.ts
   ```

3. **Manual Testing**
   - [ ] Edit text message - translation updates
   - [ ] Edit voice message transcription - translation updates
   - [ ] Loading state shows during re-translation
   - [ ] Error state shows on failure with retry option
   - [ ] Conversation context preserved in translations
   - [ ] Performance metrics tracked for re-translations
   - [ ] Works offline (queues for later)

## 🔄 Rollback Plan

If something goes wrong:
```bash
git checkout pre-phase-5
npm install
npm run dev
```

## 📋 Completion Protocol

### Claude will:
1. Implement re-translation support in TranslationPipeline
2. Connect MessageSyncService to trigger re-translations
3. Add UI states for loading and error handling
4. Ensure conversation context is preserved
5. Run all tests to verify functionality
6. Create summary commit with detailed message
7. Report completion using standard format

---

## Implementation Results
*[Claude fills this section after completion]*

### What Changed:
- 

### Issues Encountered:
- 

### Test Results:
- 

### Performance Impact:
- 

### Architecture Improvements:
-