// F02-Calc — Tabelle berechnen, Formel eingeben, Fehlerbehandlung
import { test, expect } from '@playwright/test';
import { setupPageGuards, axeCheck, launchApp } from './helpers';

test.describe('F02-Calc Tabellenkalkulation', () => {
  test.beforeEach(async ({ page }) => {
    setupPageGuards(page);
    await page.goto('/');
    await launchApp(page, /Calc/i);
  });

  test('F02-H1 Zelle erhält Eingabe und zeigt Wert', async ({ page }) => {
    const cell = page.locator('.calc-table td').first();
    await cell.click();
    await page.keyboard.type('42');
    await page.keyboard.press('Enter');
    await expect(cell).toContainText('42');
    await axeCheck(page);
  });

  test('F02-H2 SUM-Formel wird ausgewertet', async ({ page }) => {
    const bar = page.locator('.formula-bar, #calc-formula');
    // A1 = 10
    await page.locator('.calc-table td').nth(0).click();
    await bar.fill('10');
    await bar.press('Enter');
    // A2 = 20
    await page.locator('.calc-table td').nth(26).click();
    await bar.fill('20');
    await bar.press('Enter');
    // A3 = =SUM(A1:A2)
    await page.locator('.calc-table td').nth(52).click();
    await bar.fill('=SUM(A1:A2)');
    await bar.press('Enter');
    await expect(page.locator('.calc-table td').nth(52)).toContainText('30');
  });

  test('F02-H3 Formel-Bar zeigt aktive Zelle', async ({ page }) => {
    const cell = page.locator('.calc-table td').nth(0);
    const bar = page.locator('.formula-bar, #calc-formula');
    await cell.click();
    await bar.fill('99');
    await bar.press('Enter');
    await cell.click();
    await expect(bar).toHaveValue('99');
  });

  test('F02-E1 Division durch Null zeigt Fehlertext', async ({ page }) => {
    await page.locator('.calc-table td').nth(0).click();
    await page.keyboard.type('=1/0');
    await page.keyboard.press('Enter');
    await expect(page.locator('.calc-table td').nth(0)).toContainText(/#/);
  });

  test('F02-E2 Tab-Navigation wechselt Zelle', async ({ page }) => {
    await page.locator('.calc-table td').nth(0).click();
    await page.keyboard.press('Tab');
    const ref = page.locator('.cell-ref-box, .calc-cell-ref');
    if (await ref.isVisible()) {
      await expect(ref).toContainText('B1');
    }
  });
});
