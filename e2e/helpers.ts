import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export function setupPageGuards(page: Page) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') throw new Error(`console error: ${msg.text()}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 500) throw new Error(`${res.status()} on ${res.url()}`);
  });
}

export async function axeCheck(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
}

export async function launchApp(page: Page, appLabel: RegExp | string) {
  await page.getByRole('button').filter({ hasText: appLabel }).click();
}

export async function goBack(page: Page) {
  await page.locator('.back-btn').click();
}
