import { test, expect } from '@playwright/test';
import { login, quoteAndConvertToContract, rowByExactCell, futureDate } from './helpers';

// Responde otra pregunta concreta: si el mobiliario está agotado los días
// 15 y 16 pero libre el 17, ¿ampliar las fechas de un contrato para que
// cubra 15-17 debería dar 0 disponibles (por los días 15/16), aunque el 17
// esté libre? Sí: el chequeo toma el PICO de uso dentro de TODO el rango
// pedido, no el mejor día suelto. Este test lo prueba contra el sistema
// real: un contrato ocupa todo el stock dos días, otro se crea para un día
// libre aparte, y se intenta extender ese segundo contrato hacia atrás
// hasta pisar los días ocupados.
test('extending a contract into an already fully-booked date blocks the update', async ({ page }) => {
    const occupiedInstallDay = 60;
    const occupiedPickupDay = 61; // ocupado los días 60 y 61
    const freeDay = 63; // libre, sin relación con los días ocupados

    await login(page);

    // 1. Contrato A: ocupa TODO el stock (20 unidades) en los días 60-61.
    await quoteAndConvertToContract(page, {
        installDaysFromNow: occupiedInstallDay,
        pickupDaysFromNow: occupiedPickupDay,
        amount: 20,
    });

    // 2. Contrato B: 1 unidad, para el día 63 en solitario (libre).
    await page.getByRole('link', { name: 'Cotizaciones' }).click();
    const { contractCode: contractBCode } = await quoteAndConvertToContract(page, {
        installDaysFromNow: freeDay,
        amount: 1,
    });
    // Seguimos en la vista de detalle de B.

    const originalInstallDate = futureDate(freeDay);

    // 3. Intentar ampliar B hacia atrás para que cubra también los días
    // ocupados (60 al 63): debe bloquearse, aunque el día 63 esté libre.
    const newInstallDate = futureDate(occupiedInstallDay);
    await page.locator('input[formcontrolname="installDate"]').fill(newInstallDate);

    await page.getByRole('button', { name: 'Actualizar Contrato' }).click();
    const [putResponse] = await Promise.all([
        page.waitForResponse(
            (res) => res.request().method() === 'PUT' && res.url().endsWith('/contract/')
        ),
        page.getByRole('button', { name: 'Sí' }).click(),
    ]);
    expect(putResponse.status()).toBe(424);

    // El aviso de error ahora es el modal propio de la app (no un alert()
    // nativo del navegador): se cierra con su botón "Aceptar" antes de
    // seguir, para no dejarlo abierto tapando el resto de la pantalla.
    await expect(page.getByText('no tiene disponibilidad suficiente')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Aceptar' }).click();

    // 4. El cambio no debe haber quedado guardado: recargar y confirmar que
    // la fecha de instalación de B sigue siendo la original (el día 63).
    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page.getByRole('button', { name: 'Agregar Contrato' })).toBeVisible();
    const rowB = rowByExactCell(page, contractBCode);
    await rowB.getByRole('button', { name: 'Visualizar' }).click();
    await expect(page.locator('input[formcontrolname="installDate"]')).toHaveValue(originalInstallDate);
});
