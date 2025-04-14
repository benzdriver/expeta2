import { test, expect } from '@playwright/test';

test.describe('Basic UI Tests', () => {
  test('homepage loads correctly', async ({ page }) => {
    await page.goto('/');
    
    await page.screenshot({ path: 'test-results/homepage.png', fullPage: true });
    
    const title = await page.title();
    expect(title).toBeTruthy();
    
    await expect(page).toHaveURL(/.*\/$/);
  });
  
  test('navigation works', async ({ page }) => {
    await page.goto('/');
    
    const navElements = await page.$$('nav a, button, .nav-link');
    
    if (navElements.length > 0) {
      await navElements[0].click();
      
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ path: 'test-results/navigation.png', fullPage: true });
      
      const currentUrl = page.url();
      expect(currentUrl).not.toEqual('/');
    }
  });
  
  test('form interaction', async ({ page }) => {
    await page.goto('/');
    
    const inputFields = await page.$$('input, textarea');
    
    if (inputFields.length > 0) {
      await inputFields[0].fill('Test input');
      
      await page.screenshot({ path: 'test-results/form-interaction.png', fullPage: true });
      
      const value = await inputFields[0].inputValue();
      expect(value).toBe('Test input');
    }
  });
});
