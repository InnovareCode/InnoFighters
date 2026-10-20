import { defineConfig, devices } from '@playwright/test';

const emCI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  // cada página baixa ~6 MB de arte e várias rodam o protótipo de 9 MB ao lado: com 12 workers os testes de
  // jogo estouravam o tempo por falta de CPU, não por defeito. 4 deixa a suíte estável.
  workers: 4,
  forbidOnly: emCI,
  retries: emCI ? 1 : 0,
  reporter: emCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    // Emula celular (viewport/toque/UA) usando o Chromium; so o Chromium e instalado.
    { name: 'celular', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !emCI,
    timeout: 60_000,
  },
});
