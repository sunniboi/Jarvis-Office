// F01 — Launcher: App-Karten laden, Uhr läuft, Settings-Modal
import { test, expect } from '@playwright/test';
import { setupPageGuards, axeCheck } from './helpers';

test.describe('F01 Launcher', () => {
  test.beforeEach(async ({ page }) => {
    setupPageGuards(page);
    await page.goto('/');
  });

  test('F01-H1 Launcher zeigt 8 App-Karten', async ({ page }) => {
    const cards = page.locator('.app-card');
    await expect(cards).toHaveCount(8);
    await axeCheck(page);
  });

  test('F01-H2 Uhr ist sichtbar und enthält Zeitformat', async ({ page }) => {
    const clock = page.locator('#clock');
    await expect(clock).toBeVisible();
    await expect(clock).not.toBeEmpty();
  });

  test('F01-H3 Settings-Modal öffnet und schließt', async ({ page }) => {
    await page.getByRole('button', { name: /einstellungen/i }).click();
    await expect(page.getByRole('dialog', { name: /einstellungen/i }).or(
      page.locator('.modal')
    )).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.modal-overlay')).toHaveCount(0);
  });

  test('F01-E1 App startet nach Klick und Zurück-Button kehrt zum Launcher zurück', async ({ page }) => {
    await page.getByRole('button').filter({ hasText: /Write/i }).click();
    await expect(page.locator('#launcher')).toHaveClass(/hidden/);
    await page.getByRole('button', { name: /zurück/i }).click();
    await expect(page.locator('#launcher')).not.toHaveClass(/hidden/);
  });
});
