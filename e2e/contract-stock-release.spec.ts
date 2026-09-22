import { test, expect } from '@playwright/test';
import { login, quoteAndConvertToContract, rowByExactCell } from './helpers';

// Responde una pregunta concreta: si el Contrato A sube a usar TODO el
// stock libre y luego se reduce de nuevo, ¿queda esa unidad realmente libre
// para que un Contrato B distinto la pueda reservar? El sistema no debe
// "recordar" el pico histórico de A: solo debe mirar cuánto tiene A
// reservado AHORA MISMO en la base de datos.
test('reducing one contract frees stock for a different contract to claim', async ({ page }) => {
    const installDaysFromNow = 50; // ventana propia, lejos de otros tests

    await login(page);

    // 1. Contrato A: reserva 19 de las 20 unidades disponibles (queda 1 libre).
    const { contractCode: contractACode } = await quoteAndConvertToContract(page, {
        installDaysFromNow,
        amount: 19,
    });
    // Seguimos en la vista de detalle de A.

    const amountInput = () =>
        page.locator('tbody[formarrayname="listAccessories"] input[formcontrolname="amount"]').first();

    // 2. Subir A a 20 (usa TODO lo que queda libre; permitido porque al
    // revalidar, A se excluye de su propia reserva actual).
    await amountInput().fill('20');
    await page.getByRole('button', { name: 'Actualizar Contrato' }).click();
    await page.getByRole('button', { name: 'Sí' }).click();
    await expect(page.getByRole('button', { name: 'Agregar Contrato' })).toBeVisible({ timeout: 10_000 });

    // 3. Con 0 unidades libres, ese mobiliario no debe poder ofrecerse en
    // una cotización nueva para el mismo día (no aparece como opción).
    await page.getByRole('link', { name: 'Cotizaciones' }).click();
    await page.getByRole('button', { name: 'Nueva Cotización' }).click();
    const installDate = new Date();
    installDate.setDate(installDate.getDate() + installDaysFromNow);
    const yyyy = installDate.getFullYear();
    const mm = (installDate.getMonth() + 1).toString().padStart(2, '0');
    const dd = installDate.getDate().toString().padStart(2, '0');
    await page.locator('input[formcontrolname="installDate"]').fill(`${yyyy}-${mm}-${dd}T09:00`);
    await page.locator('input[formcontrolname="eventDate"]').fill(`${yyyy}-${mm}-${dd}T12:00`);
    await page.locator('input[formcontrolname="pickupDate"]').fill(`${yyyy}-${mm}-${dd}T18:00`);
    const accessorySelect = page.locator('ng-select').nth(1);
    await accessorySelect.locator('.ng-select-container').click();
    await accessorySelect.locator('input[type="text"]').fill('Mantel E2E');
    await expect(page.locator('.ng-option', { hasText: 'Mantel E2E' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Cancelar' }).click();

    // 4. Reducir A de vuelta a 19 (libera 1 unidad).
    await page.getByRole('link', { name: 'Contrato', exact: true }).click();
    const rowA = rowByExactCell(page, contractACode);
    await rowA.getByRole('button', { name: 'Visualizar' }).click();
    await amountInput().fill('19');
    await page.getByRole('button', { name: 'Actualizar Contrato' }).click();
    await page.getByRole('button', { name: 'Sí' }).click();
    await expect(page.getByRole('button', { name: 'Agregar Contrato' })).toBeVisible({ timeout: 10_000 });

    // 5. Ahora SÍ debe poder crearse y convertirse un Contrato B, distinto,
    // con esa unidad que A acaba de soltar.
    const { contractCode: contractBCode } = await quoteAndConvertToContract(page, {
        installDaysFromNow,
        amount: 1,
    });

    expect(contractBCode).toMatch(/^\d{4}-\d{10}$/);
    expect(contractBCode).not.toBe(contractACode);
});
