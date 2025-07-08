import { test, expect } from '@playwright/test'

test.describe('Home Page Navigation Fix', () => {
  test.setTimeout(30000)

  test('Verify home page loads correctly at root URL', async ({ page }) => {
    console.log('🏠 Testing home page accessibility at root URL...')
    
    // Clear any cache/service worker issues
    await page.context().clearCookies()
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
    
    console.log('📊 Current URL:', page.url())
    console.log('📊 Page title:', await page.title())
    
    // Verify we're on the home page, not redirected to /translator
    expect(page.url()).toBe('http://127.0.0.1:5173/')
    
    // Check for home page content
    await expect(page.locator('text=Real-time Translator v3')).toBeVisible({ timeout: 10000 })
    
    // Verify the main action buttons are present
    await expect(page.locator('text=Start Translating')).toBeVisible()
    await expect(page.locator('text=Create New Session')).toBeVisible()
    await expect(page.locator('text=Join Existing Session')).toBeVisible()
    
    console.log('✅ Home page loads correctly at root URL')
    
    // Test navigation to single device translator
    console.log('🎯 Testing navigation to single device translator...')
    await page.locator('text=Start Translating').click()
    
    await page.waitForURL('**/translator', { timeout: 10000 })
    expect(page.url()).toBe('http://127.0.0.1:5173/translator')
    
    console.log('✅ Navigation to translator works correctly')
    
    // Test navigation back to home
    console.log('🏠 Testing navigation back to home...')
    await page.locator('text=Back').click()
    
    await page.waitForURL('http://127.0.0.1:5173/', { timeout: 10000 })
    expect(page.url()).toBe('http://127.0.0.1:5173/')
    
    console.log('✅ Navigation back to home works correctly')
    console.log('🎉 All home page navigation tests passed!')
  })
})