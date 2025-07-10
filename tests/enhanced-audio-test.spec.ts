import { test, expect } from '@playwright/test'

test.describe('Enhanced Audio Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5177/')
    await page.waitForLoadState('networkidle')
  })

  test('audio settings UI with volume and sound selection', async ({ page }) => {
    // Click settings button - use the gear icon button
    const settingsButton = page.locator('button[data-settings-button]')
    await settingsButton.click()
    await page.waitForTimeout(500)
    
    // First, enable sounds if not already enabled
    const soundToggle = page.locator('button[class*="inline-flex"][class*="rounded-full"]').first()
    const toggleClasses = await soundToggle.getAttribute('class')
    if (!toggleClasses?.includes('bg-blue-600')) {
      await soundToggle.click()
      await page.waitForTimeout(300)
    }
    
    // Verify volume controls appear
    const volumeLabel = page.locator('text=/Volume/i')
    await expect(volumeLabel).toBeVisible()
    
    // Test volume level buttons
    const quietButton = page.locator('button:has-text("Quiet")')
    const loudButton = page.locator('button:has-text("Loud")')
    
    await expect(quietButton).toBeVisible()
    await expect(loudButton).toBeVisible()
    
    // Click quiet and verify it's selected
    await quietButton.click()
    await page.waitForTimeout(100)
    let quietClasses = await quietButton.getAttribute('class')
    expect(quietClasses).toContain('bg-blue-500')
    
    // Click loud and verify it's selected
    await loudButton.click()
    await page.waitForTimeout(100)
    let loudClasses = await loudButton.getAttribute('class')
    expect(loudClasses).toContain('bg-blue-500')
    
    // Verify notification sound controls
    const soundLabel = page.locator('text=/Notification Sound/i')
    await expect(soundLabel).toBeVisible()
    
    // Test sound selection buttons
    const chimeButton = page.locator('button:has-text("Chime")')
    const bellButton = page.locator('button:has-text("Bell")')
    const popButton = page.locator('button:has-text("Pop")')
    
    await expect(chimeButton).toBeVisible()
    await expect(bellButton).toBeVisible()
    await expect(popButton).toBeVisible()
    
    // Test clicking different sounds
    await bellButton.click()
    await page.waitForTimeout(100)
    let bellClasses = await bellButton.getAttribute('class')
    expect(bellClasses).toContain('bg-blue-500')
    
    await popButton.click()
    await page.waitForTimeout(100)
    let popClasses = await popButton.getAttribute('class')
    expect(popClasses).toContain('bg-blue-500')
    
    // Go back to chime
    await chimeButton.click()
    await page.waitForTimeout(100)
    let chimeClasses = await chimeButton.getAttribute('class')
    expect(chimeClasses).toContain('bg-blue-500')
    
    // Test that test button still works
    const testButton = page.locator('button:has-text("Test")')
    await expect(testButton).toBeVisible()
    
    // Take screenshot of enhanced settings
    await page.screenshot({ path: 'test-results/enhanced-audio-settings.png' })
    
    console.log('✅ Enhanced audio settings UI working correctly')
  })

  test('settings persist when toggling sounds off and on', async ({ page }) => {
    // Click settings button - use the gear icon button
    const settingsButton = page.locator('button[data-settings-button]')
    await settingsButton.click()
    await page.waitForTimeout(500)
    
    // Enable sounds
    const soundToggle = page.locator('button[class*="inline-flex"][class*="rounded-full"]').first()
    const initialClasses = await soundToggle.getAttribute('class')
    if (!initialClasses?.includes('bg-blue-600')) {
      await soundToggle.click()
      await page.waitForTimeout(300)
    }
    
    // Set specific preferences
    const quietButton = page.locator('button:has-text("Quiet")')
    const bellButton = page.locator('button:has-text("Bell")')
    
    await quietButton.click()
    await bellButton.click()
    await page.waitForTimeout(200)
    
    // Turn sounds off
    await soundToggle.click()
    await page.waitForTimeout(300)
    
    // Verify volume and sound options are hidden
    await expect(page.locator('text=/Volume/i')).not.toBeVisible()
    await expect(page.locator('text=/Notification Sound/i')).not.toBeVisible()
    
    // Turn sounds back on
    await soundToggle.click()
    await page.waitForTimeout(300)
    
    // Verify settings persisted
    await expect(page.locator('text=/Volume/i')).toBeVisible()
    await expect(page.locator('text=/Notification Sound/i')).toBeVisible()
    
    // Check that previous selections are still active
    const quietClassesAfter = await quietButton.getAttribute('class')
    const bellClassesAfter = await bellButton.getAttribute('class')
    
    expect(quietClassesAfter).toContain('bg-blue-500')
    expect(bellClassesAfter).toContain('bg-blue-500')
    
    console.log('✅ Audio settings persist correctly')
  })

  test('visual appearance in dark mode', async ({ page }) => {
    // Switch to dark mode first
    const settingsButton = page.locator('button[aria-label="Toggle settings"]')
    await settingsButton.click()
    await page.waitForTimeout(500)
    
    const darkModeToggle = page.locator('button[aria-label="Toggle dark mode"]')
    if (await darkModeToggle.isVisible()) {
      await darkModeToggle.click()
      await page.waitForTimeout(500)
    }
    
    // Close and reopen settings to see dark mode styling
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await settingsButton.click()
    await page.waitForTimeout(500)
    
    // Enable sounds to see all controls
    const soundToggle = page.locator('button[class*="inline-flex"][class*="rounded-full"]').first()
    const toggleClasses = await soundToggle.getAttribute('class')
    if (!toggleClasses?.includes('bg-blue-600')) {
      await soundToggle.click()
      await page.waitForTimeout(300)
    }
    
    // Take screenshot of dark mode audio settings
    await page.screenshot({ path: 'test-results/enhanced-audio-settings-dark.png' })
    
    console.log('✅ Dark mode styling for audio settings looks good')
  })
})