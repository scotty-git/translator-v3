import { test, expect } from '@playwright/test'

test.describe('Debug Feature Implementation', () => {
  test('should load app and test font cycling', async ({ page }) => {
    console.log('🧪 Starting app load test')
    
    // Navigate to app
    await page.goto('http://127.0.0.1:5173/')
    console.log('✅ Navigated to app')
    
    // Wait for app to load
    await page.waitForSelector('[data-testid="home-screen"]', { timeout: 15000 })
    console.log('✅ Home screen loaded')
    
    // Test font cycling
    await page.keyboard.press('f')
    await page.waitForTimeout(200)
    
    const htmlClass = await page.locator('html').getAttribute('class')
    console.log('📊 Font class after F press:', htmlClass)
    expect(htmlClass).toContain('font-')
    
    console.log('✅ Font cycling test passed')
  })

  test('should navigate to single device mode', async ({ page }) => {
    console.log('🧪 Testing Single Device Mode navigation')
    
    await page.goto('http://127.0.0.1:5173/')
    await page.waitForSelector('[data-testid="home-screen"]', { timeout: 15000 })
    
    // Click single device mode
    await page.locator('text=Start Translating').click()
    console.log('✅ Clicked Start Translating')
    
    // Wait for single device mode to load
    await page.waitForSelector('[data-testid="recording-button"]', { timeout: 10000 })
    console.log('✅ Single Device Mode loaded')
    
    // Check for audio visualization
    const audioViz = page.locator('.flex.items-end.justify-center').first()
    await expect(audioViz).toBeVisible({ timeout: 5000 })
    console.log('✅ Audio visualization found')
    
    // Count bars
    const bars = audioViz.locator('> div')
    const barCount = await bars.count()
    console.log('📊 Audio visualization bars:', barCount)
    expect(barCount).toBe(5)
  })

  test('should access settings page', async ({ page }) => {
    console.log('🧪 Testing Settings page')
    
    await page.goto('http://127.0.0.1:5173/settings')
    await page.waitForSelector('text=Settings', { timeout: 10000 })
    console.log('✅ Settings page loaded')
    
    // Check for font size section
    const fontSizeSection = page.locator('text=Font Size')
    await expect(fontSizeSection).toBeVisible({ timeout: 5000 })
    console.log('✅ Font Size section found')
    
    // Check for sound notifications section
    const soundSection = page.locator('text=Sound Notifications')
    await expect(soundSection).toBeVisible({ timeout: 5000 })
    console.log('✅ Sound Notifications section found')
  })
})