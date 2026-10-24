import base from './playwright.config';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  ...base,
  workers: 3,
  use: { ...base.use, baseURL: 'http://127.0.0.1:5393' },
  webServer: { command: 'npx vite --host 127.0.0.1 --port 5393 --strictPort', url: 'http://127.0.0.1:5393', reuseExistingServer: false, timeout: 90_000 },
});
