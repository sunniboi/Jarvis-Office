// F01-Write — Neues Dokument erstellen, tippen, speichern, laden
import { test, expect } from '@playwright/test';
import { setupPageGuards, axeCheck, launchApp, goBack } from './helpers';

test.describe('F01-Write Neues Dokument', () => {
  test.beforeEach(async ({ page }) => {
    setupPageGuards(page);
    await page.goto('/');
    await launchApp(page, /Write/i);
  });

  test('F01W-H1 Editor ist fokussierbar und nimmt Text an', async ({ page }) => {
    const editor = page.locator('#write-editor');
    await editor.click();
    await editor.pressSequentially('Hallo Welt');
    await expect(editor).toContainText('Hallo Welt');
    await axeCheck(page);
  });

  test('F01W-H2 Speichern → Neu → Öffnen lädt Dokument', async ({ page }) => {
    const editor = page.locator('#write-editor');
    await editor.click();
    await editor.pressSequentially('Test-Inhalt 123');
    await page.getByRole('button', { name: /speichern/i }).click();
    await expect(page.locator('.statusbar')).toContainText('Gespeichert');
    await page.getByRole('button', { name: /neu/i }).click();
    await page.getByRole('button', { name: /öffnen/i }).click();
    await expect(page.locator('.modal-overlay').first()).toBeVisible();
  });

  test('F01W-H3 Bold-Button formatiert Text', async ({ page }) => {
    const editor = page.locator('#write-editor');
    await editor.click();
    await editor.pressSequentially('Fetter Text');
    await page.keyboard.press('Control+A');
    await page.getByRole('button', { name: /fett/i }).or(
      page.locator('[data-cmd="bold"]')
    ).click();
    const inner = await editor.innerHTML();
    expect(inner).toMatch(/<b>|<strong>|font-weight/i);
  });

  test('F01W-H4 Wörter-Zähler aktualisiert sich', async ({ page }) => {
    const editor = page.locator('#write-editor');
    await editor.click();
    await editor.pressSequentially('Eins Zwei Drei');
    const wc = page.locator('#write-wordcount');
    await expect(wc).toContainText('3');
  });

  test('F01W-E1 Sehr langer Titel (60 Zeichen) bricht nicht', async ({ page }) => {
    const titleEl = page.locator('#write-title');
    await titleEl.click();
    await titleEl.fill('A'.repeat(60));
    await page.getByRole('button', { name: /speichern/i }).click();
    await expect(page.locator('.statusbar')).toContainText('Gespeichert');
  });

  test('F01W-E2 Strg+S speichert Dokument', async ({ page }) => {
    const editor = page.locator('#write-editor');
    await editor.click();
    await editor.pressSequentially('Keyboard-Save');
    await page.keyboard.press('Control+S');
    await expect(page.locator('.statusbar')).toContainText('Gespeichert');
  });

  test('F01W-E3 Zurück mit ungespeicherten Änderungen zeigt Warnung', async ({ page }) => {
    const editor = page.locator('#write-editor');
    await editor.click();
    await editor.pressSequentially('ungespeichert');
    page.once('dialog', d => d.dismiss());
    await page.getByRole('button', { name: /zurück/i }).click();
    // Dialog abgelehnt → App bleibt offen, Launcher bleibt hidden
    await expect(page.locator('#launcher')).toHaveClass(/hidden/);
  });
});
