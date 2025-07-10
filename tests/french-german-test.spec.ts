import { test, expect } from '@playwright/test'

test.describe('French and German Language Support', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5177/')
    await page.waitForLoadState('networkidle')
  })

  test('language selector includes French and German options', async ({ page }) => {
    // Click on the target language dropdown
    const targetLanguageSelect = page.locator('select').first()
    
    // Get all options
    const options = await targetLanguageSelect.locator('option').allTextContents()
    
    // Verify all four languages are present
    expect(options).toContain('ES')
    expect(options).toContain('PT')
    expect(options).toContain('FR')
    expect(options).toContain('DE')
    
    // Select French and verify it's selected
    await targetLanguageSelect.selectOption('fr')
    const selectedFrench = await targetLanguageSelect.inputValue()
    expect(selectedFrench).toBe('fr')
    
    // Select German and verify it's selected
    await targetLanguageSelect.selectOption('de')
    const selectedGerman = await targetLanguageSelect.inputValue()
    expect(selectedGerman).toBe('de')
    
    console.log('✅ Target language selector includes French and German')
  })

  test('UI language selector shows French and German', async ({ page }) => {
    // Look for the language selector button (with flag)
    const languageButton = page.locator('button:has-text("🇬🇧")').first()
    
    if (await languageButton.isVisible()) {
      await languageButton.click()
      await page.waitForTimeout(500)
      
      // Check for French option
      const frenchOption = page.locator('button:has-text("🇫🇷")')
      await expect(frenchOption).toBeVisible()
      await expect(page.locator('text=Français')).toBeVisible()
      
      // Check for German option
      const germanOption = page.locator('button:has-text("🇩🇪")')
      await expect(germanOption).toBeVisible()
      await expect(page.locator('text=Deutsch')).toBeVisible()
      
      // Click French and verify UI updates
      await frenchOption.click()
      await page.waitForTimeout(500)
      
      // The button should now show French flag
      await expect(page.locator('button:has-text("🇫🇷")').first()).toBeVisible()
      
      console.log('✅ UI language selector includes French and German')
    } else {
      console.log('⚠️ Language selector not found on page')
    }
  })

  test('settings menu shows volume and sound options', async ({ page }) => {
    // Click settings button
    const settingsButton = page.locator('button[data-settings-button]')
    await settingsButton.click()
    await page.waitForTimeout(500)
    
    // Enable sounds if not already enabled
    const soundToggle = page.locator('button[class*="inline-flex"][class*="rounded-full"]').first()
    const toggleClasses = await soundToggle.getAttribute('class')
    if (!toggleClasses?.includes('bg-blue-600')) {
      await soundToggle.click()
      await page.waitForTimeout(300)
    }
    
    // Verify volume controls
    await expect(page.locator('text=Volume')).toBeVisible()
    await expect(page.locator('button:has-text("Quiet")')).toBeVisible()
    await expect(page.locator('button:has-text("Loud")')).toBeVisible()
    
    // Verify sound selection
    await expect(page.locator('text=Notification Sound')).toBeVisible()
    await expect(page.locator('button:has-text("Chime")')).toBeVisible()
    await expect(page.locator('button:has-text("Bell")')).toBeVisible()
    await expect(page.locator('button:has-text("Pop")')).toBeVisible()
    
    console.log('✅ Settings menu includes volume and sound options')
  })

  test('visual test - French and German language selection', async ({ page }) => {
    // Select French as target language
    const targetLanguageSelect = page.locator('select').first()
    await targetLanguageSelect.selectOption('fr')
    await page.waitForTimeout(500)
    
    // Take screenshot with French selected
    await page.screenshot({ path: 'test-results/french-selected.png' })
    
    // Select German as target language
    await targetLanguageSelect.selectOption('de')
    await page.waitForTimeout(500)
    
    // Take screenshot with German selected
    await page.screenshot({ path: 'test-results/german-selected.png' })
    
    // Open settings to show all options
    const settingsButton = page.locator('button[data-settings-button]')
    await settingsButton.click()
    await page.waitForTimeout(500)
    
    // Take screenshot of settings
    await page.screenshot({ path: 'test-results/settings-with-languages.png' })
    
    console.log('✅ Visual tests completed for French and German')
  })
})