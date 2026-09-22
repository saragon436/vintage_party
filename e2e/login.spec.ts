import { test, expect } from '@playwright/test';
import { E2E_USER } from './fixtures';

test.describe('Login', () => {
    test('shows an error when the credentials are wrong', async ({ page }) => {
        await page.goto('/login');

        await page.locator('input[name="email"]').fill(E2E_USER.userName);
        await page.locator('input[name="password"]').fill('contrasena-incorrecta');
        await page.locator('button[type="submit"]').click();

        await expect(page.getByText('Usuario o contraseña incorrectos')).toBeVisible();
    });

    test('logs in with valid credentials and reaches the dashboard', async ({ page }) => {
        await page.goto('/login');

        await page.locator('input[name="email"]').fill(E2E_USER.userName);
        await page.locator('input[name="password"]').fill(E2E_USER.password);
        await page.locator('button[type="submit"]').click();

        await page.waitForURL('**/dashboard');
        await expect(page.getByRole('link', { name: 'Cotizaciones' })).toBeVisible();
    });
});
