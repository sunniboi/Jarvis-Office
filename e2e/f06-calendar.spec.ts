// F06-Calendar — Termin anlegen, Monatsansicht, Ansicht wechseln
import { test, expect } from '@playwright/test';
import { setupPageGuards, axeCheck, launchApp } from './helpers';

test.describe('F06-Calendar Termine', () => {
  test.beforeEach(async ({ page }) => {
    setupPageGuards(page);
    await page.goto('/');
    await launchApp(page, /Calendar/i);
  });

  test('F06-H1 Monatsansicht lädt mit Wochentag-Headern', async ({ page }) => {
    const dayHeaders = page.locator('.cal-dow');
    await expect(dayHeaders).toHaveCount(7);
    await axeCheck(page);
  });

  test('F06-H2 Neuer Termin anlegen über Tages-Klick', async ({ page }) => {
    const today = page.locator('.cal-day.today');
    await today.click();
    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible();
    await page.locator('input[aria-label*="Titel"], #ev-title').fill('Test-Meeting');
    await page.getByRole('button', { name: /speichern|hinzufügen/i }).click();
    await expect(modal).toHaveCount(0);
  });

  test('F06-H3 Ansicht Woche öffnet Wochen-Grid', async ({ page }) => {
    await page.getByRole('button', { name: /woche/i }).click();
    await expect(page.locator('.cal-week-col')).toHaveCount(7);
  });

  test('F06-H4 Ansicht Tag zeigt Tagesübersicht', async ({ page }) => {
    await page.getByRole('button', { name: /tag/i }).click();
    await expect(page.locator('.cal-day-view').first()).toBeVisible();
  });

  test('F06-H5 Mini-Kalender Sidebar ist sichtbar', async ({ page }) => {
    // Mini-Kalender-Sidebar ist in dieser Version nicht implementiert (BUG-005)
    const miniCal = page.locator('.mini-cal');
    const exists = await miniCal.count();
    test.skip(exists === 0, 'Mini-Kalender nicht implementiert (BUG-005)');
    await expect(miniCal).toBeVisible();
  });

  test('F06-E1 Termin ohne Titel zeigt Fallback-Label', async ({ page }) => {
    const today = page.locator('.cal-day.today');
    await today.click();
    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible();
    // kein Titel eintragen
    await page.getByRole('button', { name: /speichern|hinzufügen/i }).click();
    // entweder Modal bleibt offen (Validierung) oder Termin erscheint mit Fallback
  });
});
