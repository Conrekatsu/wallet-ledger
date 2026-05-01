import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  webServer: [
    {
      command:
        'docker compose up -d postgres && node -e "setTimeout(() => process.exit(0), 8000)" && npm --prefix backend run migrate && npm --prefix backend run dev',
      cwd: '.',
      url: 'http://localhost:4000/api/health',
      env: {
        DATABASE_URL: 'postgres://hwuser:hwpassword@localhost:5432/hwdb',
        JWT_SECRET: 'e2e-test-secret',
        JWT_EXPIRES_IN: '7d',
      },
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'npm run dev',
      cwd: './frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
