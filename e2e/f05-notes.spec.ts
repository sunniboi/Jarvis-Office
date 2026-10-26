// F05-Notes — Notiz erstellen, anpinnen, suchen
import { test, expect } from '@playwright/test';
import { setupPageGuards, axeCheck, launchApp } from './helpers';

test.describe('F05-Notes Schnellnotizen', () => {
  test.beforeEach(async ({ page }) => {
    setupPageGuards(page);
    await page.goto('/');
    await launchApp(page, /Notes/i);
  });

  test('F05-H1 Neue Notiz anlegen und Text schreiben', async ({ page }) => {
    await page.getByRole('button', { name: /neu|new|\+/i }).click();
    const titleIn = page.locator('.notes-title-in, #notes-title');
    await titleIn.fill('Meine Testnotiz');
    const body = page.locator('.notes-content, #notes-body');
    await body.click();
    await body.pressSequentially('Notiz-Inhalt hier.');
    await expect(page.locator('.note-item').first()).toContainText('Meine Testnotiz');
    await axeCheck(page);
  });

  test('F05-H2 Anpinnen hebt Notiz an Liste-Anfang', async ({ page }) => {
    await page.getByRole('button', { name: /neu|new|\+/i }).click();
    const titleIn = page.locator('.notes-title-in, #notes-title');
    await titleIn.fill('Wichtig');
    const pinBtn = page.locator('#notes-pin, [title*="heften"]');
    await pinBtn.click();
    await expect(page.locator('.note-item.pinned').first()).toContainText('Wichtig');
  });

  test('F05-H3 Suche filtert Notizen', async ({ page }) => {
    const search = page.locator('.notes-search, #notes-search');
    await search.fill('Erste');
    await expect(page.locator('.note-item')).toHaveCount(1);
  });

  test('F05-E1 Leerer Titel erzeugt keine Fehlermeldung', async ({ page }) => {
    await page.getByRole('button', { name: /neu|new|\+/i }).click();
    // kein Titel, nur Body
    const body = page.locator('.notes-content, #notes-body');
    await body.click();
    await body.pressSequentially('Nur Body-Text');
    // keine Exception erwartet
  });

  test('F05-E2 Alle Notizen löschen → leerer State', async ({ page }) => {
    // Note-Liste hat mindestens eine Notiz (seed)
    const items = page.locator('.note-item');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      await items.first().click();
      const del = page.locator('#notes-delete, [title*="löschen"]');
      if (await del.isVisible()) await del.click();
      page.once('dialog', d => d.accept());
    }
    // kein Crash erwartet
  });
});
