import { test, expect } from '@playwright/test';

test.describe('Clinical Tracker Core Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear IndexedDB via App/Storage
    await page.evaluate(async () => {
        if (window.storage) {
            await window.storage.clearAll();
        }
    });
    await page.reload();
    await page.waitForFunction(() => window.App && window.App.state);
  });

  test('should display today date and empty state', async ({ page }) => {
    await expect(page.locator('#current-date')).not.toHaveText('Loading...');
    await expect(page.locator('#today-empty')).toBeVisible();
  });

  test('should trigger emergency alert for high temperature', async ({ page, isMobile }) => {
    const addBtn = isMobile ? page.locator('#btn-add-entry-mobile') : page.locator('#btn-add-entry');
    await addBtn.click();
    await page.click('button[data-section="vitals"]');
    await page.fill('input[name="temp"]', '38.5');
    await expect(page.locator('#emergency-alert')).toBeVisible();
    await page.click('#btn-save-entry');
    const tempBadgeValue = page.locator('#today-temp');
    await expect(tempBadgeValue).toHaveText('38.5');
    await expect(tempBadgeValue).toHaveClass(/text-red-600/);
    await expect(page.locator('#today-list')).toContainText('38.5°C');
  });

  test('should record food and fluid intake with dynamic rows', async ({ page, isMobile }) => {
    const addBtn = isMobile ? page.locator('#btn-add-entry-mobile') : page.locator('#btn-add-entry');
    await addBtn.click();
    await page.click('button[data-section="food"]');
    await page.click('#btn-add-food-item');
    await page.fill('input[name="food_label[]"]', 'Rice');
    await page.fill('input[name="food_value[]"]', '100');
    await page.fill('input[name="food_unit[]"]', 'g');
    await page.click('button[data-section="fluid"]');
    await page.click('#btn-add-fluid-item');
    const fluidInput = page.locator('input[name="fluid_label[]"]');
    await expect(fluidInput).toBeVisible();
    await fluidInput.fill('Water');
    await page.fill('input[name="fluid_value[]"]', '250');
    await page.fill('input[name="fluid_unit[]"]', 'ml');
    await page.click('#btn-save-entry');
    const entry = page.locator('#today-list > div').first();
    await expect(entry).toContainText('Rice');
    await expect(entry).toContainText('100.0g');
    await expect(entry).toContainText('Water');
    await expect(entry).toContainText('250.0ml');
  });

  test('should record medications and preserve notes', async ({ page, isMobile }) => {
    const addBtn = isMobile ? page.locator('#btn-add-entry-mobile') : page.locator('#btn-add-entry');
    await addBtn.click();
    await page.click('button[data-section="meds"]');
    await page.click('#btn-add-meds-item');
    const medInput = page.locator('input[name="meds_label[]"]');
    await expect(medInput).toBeVisible();
    await medInput.fill('Dexamethasone');
    await page.fill('input[name="meds_value[]"]', '4');
    await page.fill('input[name="meds_unit[]"]', 'mg');
    const noteText = 'Patient tolerating meds well.';
    await page.fill('#input-notes', noteText);
    await page.click('#btn-save-entry');
    const entry = page.locator('#today-list > div').first();
    await expect(entry).toContainText('Dexamethasone');
    await expect(entry).toContainText('4.0mg');
    await expect(entry).toContainText(noteText);
  });

  test('should allow editing and deleting a record', async ({ page, isMobile }) => {
    const addBtn = isMobile ? page.locator('#btn-add-entry-mobile') : page.locator('#btn-add-entry');
    await addBtn.click();
    await page.click('button[data-section="vitals"]');
    await page.fill('input[name="temp"]', '36.5');
    await page.click('#btn-save-entry');
    await page.click('.btn-edit');
    await expect(page.locator('#modal-title')).toHaveText('Edit Record');
    const tempInput = page.locator('#input-temp');
    await expect(tempInput).toHaveValue('36.5');
    await tempInput.fill('37.2');
    await tempInput.blur();
    await page.click('#btn-save-entry');
    await expect(page.locator('#today-temp')).toHaveText('37.2', { timeout: 10000 });
    page.on('dialog', dialog => dialog.accept()); 
    await page.click('.btn-delete');
    await expect(page.locator('#today-empty')).toBeVisible();
  });

  test('should switch between Journal and Calendar tabs', async ({ page }) => {
    await page.evaluate(async () => {
        const entry = { id: 't-1', timestamp: new Date().toISOString(), temp: 37.0, notes: 'Test' };
        await window.storage.saveEntry(entry);
    });
    await page.goto('/#history');
    await page.click('#tab-history-calendar');
    await expect(page.locator('#history-content-calendar')).toBeVisible();
    await page.click('#tab-history-list');
    await expect(page.locator('#history-content-list')).toBeVisible();
  });

  test('should filter history by month and year', async ({ page }) => {
    await page.evaluate(async () => {
        const marchEntry = { id: 'march-1', timestamp: '2026-03-15T12:00', temp: 36.6, notes: 'March Record' };
        await window.storage.saveEntry(marchEntry);
    });
    await page.goto('/#history');
    await page.selectOption('#filter-month', '2'); 
    await expect(page.locator('#history-grouped-list')).toContainText('March Record');
    await page.selectOption('#filter-month', '1');
    await expect(page.locator('#history-empty')).toBeVisible();
  });

  test('should navigate months using arrows', async ({ page }) => {
    await page.goto('/#history');
    const monthSelect = page.locator('#filter-month');
    const startMonth = await monthSelect.inputValue();
    await page.click('#btn-prev-month');
    const prevMonth = await monthSelect.inputValue();
    expect(parseInt(prevMonth)).toBe((parseInt(startMonth) - 1 + 12) % 12);
    await page.click('#btn-next-month');
    const nextMonth = await monthSelect.inputValue();
    expect(nextMonth).toBe(startMonth);
  });

  test('should show context menu on calendar day click', async ({ page }) => {
    await page.goto('/#history');
    await page.click('#tab-history-calendar');
    await page.click('#calendar-grid >> text="15"');
    const menu = page.locator('#calendar-context-menu');
    await expect(menu).toBeVisible();
    await page.click('#btn-ctx-add');
    await expect(page.locator('#modal-entry')).toBeVisible();
    const timestamp = await page.inputValue('#entry-timestamp');
    expect(timestamp).toContain('2026-04-15');
  });

  test('should trigger emergency alert for low ANC', async ({ page, isMobile }) => {
    const addBtn = isMobile ? page.locator('#btn-add-entry-mobile') : page.locator('#btn-add-entry');
    await addBtn.click();
    await page.click('button[data-section="blood"]');
    await page.fill('input[name="anc"]', '0.4');
    await expect(page.locator('#emergency-alert')).toBeVisible();
    await page.click('#btn-save-entry');
    const ancBadgeValue = page.locator('#today-anc');
    await expect(ancBadgeValue).toHaveText('0.4');
    await expect(ancBadgeValue).toHaveClass(/text-red-600/);
  });

  test('should capture and display clinical photos', async ({ page, isMobile }) => {
    const addBtn = isMobile ? page.locator('#btn-add-entry-mobile') : page.locator('#btn-add-entry');
    await addBtn.click();
    await page.click('button[data-section="photos"]');
    
    await page.evaluate(async () => {
        const fakePhoto = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
        if (!window.App.state.currentPhotos) window.App.state.currentPhotos = [];
        window.App.state.currentPhotos.push(fakePhoto);
        window.App.renderPhotoPreviews();
        window.App.validateForm();
    });

    await expect(page.locator('#photo-previews img')).toBeVisible();
    await page.fill('#input-notes', 'Photo Test');
    await page.click('#btn-save-entry');
    await page.waitForTimeout(500); 

    const entry = page.locator('#today-list > div').first();
    await expect(entry).toContainText('Photo Test');
    await expect(entry.locator('img')).toBeVisible();
  });
});
