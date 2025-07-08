import { test, expect } from '@playwright/test'

test.describe('Manual Conversation Context Test', () => {
  test.setTimeout(30000)

  test('Test conversation context core functionality', async ({ page }) => {
    console.log('🧪 [Manual] Testing conversation context core functionality')
    
    // Navigate to Single Device Mode
    await page.goto('http://127.0.0.1:5173/')
    await page.waitForSelector('text=Start Translating', { timeout: 10000 })
    
    const startButton = page.locator('text=Start Translating')
    await startButton.click()
    await page.waitForTimeout(2000)
    
    // Capture all console logs
    const allLogs = []
    page.on('console', msg => {
      allLogs.push(msg.text())
    })
    
    // Wait and see what logs we get just from initialization
    await page.waitForTimeout(3000)
    
    console.log('📊 All console logs captured:')
    allLogs.forEach((log, i) => {
      console.log(`${i + 1}. ${log}`)
    })
    
    // Check if our ConversationContext files are being loaded
    const contextLogs = allLogs.filter(log => 
      log.includes('Context') || 
      log.includes('conversationContext') ||
      log.includes('ConversationContextManager') ||
      log.includes('buildWhisperContext') ||
      log.includes('buildTranslationContext')
    )
    
    console.log('📋 Context-related logs:', contextLogs.length)
    contextLogs.forEach(log => console.log(`   - ${log}`))
    
    // Test basic page functionality
    const hasRecordingButton = await page.locator('[data-testid="recording-button"]').count()
    console.log('🎤 Recording button found:', hasRecordingButton > 0 ? 'Yes' : 'No')
    
    // Just verify the page loads without errors
    const errorElements = await page.locator('.error, [class*="error"]').count()
    expect(errorElements).toBeLessThan(1)
    
    console.log('✅ Basic page functionality works')
  })
})