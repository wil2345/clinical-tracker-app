import { test, expect } from '@playwright/test';

test.describe('Clinical Tracker Core Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear IndexedDB via App/Storage
    await page.evaluate(async () => {
        if (window.storage) await window.storage.clearAll();
        if (window.App) window.App.closeModal();
    });
    await page.reload();
    await page.waitForFunction(() => window.App && window.App.state);
  });

  test('should display today date and empty state', async ({ page }) => {
    await expect(page.locator('#view-subtitle')).not.toHaveText('Loading...');
    await expect(page.locator('#today-empty')).toBeVisible();
  });

  test('should trigger emergency alert for high temperature', async ({ page, isMobile }) => {
    if (isMobile) {
        await page.click('#btn-add-entry-mobile', { force: true });
    } else {
        await page.evaluate(() => window.App.openModal());
    }

    await page.click('button[data-section="vitals"]');
    await page.fill('input[name="temp"]', '38.5');
    await expect(page.locator('#emergency-alert')).toBeVisible();
    await page.click('#btn-save-entry');

    // Marker checks
    await expect(page.locator('#today-list')).toContainText('38.5°C');
  });

  test('should record blood work and update latest markers', async ({ page, isMobile }) => {
    if (isMobile) {
        await page.click('#btn-add-entry-mobile', { force: true });
    } else {
        await page.evaluate(() => window.App.openModal());
    }
    
    await page.click('button[data-section="blood"]');
    await page.fill('input[name="anc"]', '0.4');
    await page.fill('input[name="platelets"]', '45');
    await page.fill('input[name="wbc"]', '3.1');
    await page.click('#btn-save-entry');

    await expect(page.locator('#today-anc')).toHaveText('0.4');
    await expect(page.locator('#today-platelets')).toHaveText('45.0');
    await expect(page.locator('#today-wbc')).toHaveText('3.1');
    await expect(page.locator('#today-anc')).toHaveClass(/text-red-600/);
  });

  test('should capture and display clinical photos', async ({ page, isMobile }) => {
    if (isMobile) {
        await page.click('#btn-add-entry-mobile', { force: true });
    } else {
        await page.evaluate(() => window.App.openModal());
    }
    
    await page.click('button[data-section="photos"]');
    await page.evaluate(() => {
        const fakePhoto = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
        if (!window.App.state.currentPhotos) window.App.state.currentPhotos = [];
        window.App.state.currentPhotos.push(fakePhoto);
        window.App.renderPhotoPreviews();
        window.App.validateForm();
    });

    await expect(page.locator('#photo-previews img')).toBeVisible();
    await page.fill('#input-notes', 'Photo Test');
    await page.click('#btn-save-entry');
    
    const entry = page.locator('#today-list > div').first();
    await expect(entry).toContainText('Photo Test');
    await expect(entry.locator('img')).toBeVisible();
  });

  test('should support multiple active cycles', async ({ page }) => {
    await page.goto('/#settings');
    // Add Cycle 1
    await page.click('#btn-add-cycle');
    await page.fill('#cycle-name', 'Maintenance');
    await page.click('#btn-save-cycle');
    
    // Add Cycle 2
    await page.click('#btn-add-cycle');
    await page.fill('#cycle-name', 'Pulse');
    await page.click('#btn-save-cycle');

    await page.goto('/#dashboard');
    const badges = page.locator('#cycle-badges-container span');
    await expect(badges).toHaveCount(2);
    // Use regex to match "Day X" since timezone shifts might cause Day 1 or Day 2
    await expect(badges.first()).toContainText(/Maintenance Day \d+/);
    await expect(badges.nth(1)).toContainText(/Pulse Day \d+/);
  });
});
