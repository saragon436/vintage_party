import { defineConfig, devices } from '@playwright/test';

// E2E de flujo completo: navegador real -> Angular real -> backend NestJS
// real -> MongoDB en memoria (ver accessories-events-backend/e2e/bootstrap.ts).
// Ambos servidores los levanta y apaga Playwright vía `webServer`.
export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:4300',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: [
        {
            command: 'npm run start:e2e',
            url: 'http://localhost:4300',
            reuseExistingServer: false,
            timeout: 120_000,
        },
        {
            command: 'npm run start:e2e',
            cwd: '../accessories-events-backend',
            url: 'http://localhost:3001/',
            reuseExistingServer: false,
            timeout: 120_000,
        },
    ],
});
