import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 15_000,
  use: {
    baseURL: 'http://localhost:8080',
    executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome',
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'python3 -m http.server 8080',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 5_000,
  },
  reporter: [['list'], ['json', { outputFile: 'replica/test-results.json' }]],
});
