import { test, expect, APIRequestContext } from '@playwright/test';
import { createContractFromNewQuotation, futureDate, rowByExactCell } from './helpers';
import { E2E_USER } from './fixtures';

const BACKEND_URL = 'http://localhost:3001';

async function apiLogin(request: APIRequestContext): Promise<string> {
    const res = await request.post(`${BACKEND_URL}/auth`, {
        data: { userName: E2E_USER.userName, password: E2E_USER.password },
    });
    const body = await res.json();
    return body.token as string;
}

test('edits a contract\'s dates and mobiliario after creation, then annuls it', async ({ page, request }) => {
    const { contractCode } = await createContractFromNewQuotation(page, 10);
    // Seguimos en la vista de detalle del contrato recién creado
    // (/dashboard/contract?open=<id>), sin haber navegado a otra ruta.

    // 1. Cambiar fecha de instalación y de recojo.
    const newInstallDate = futureDate(20);
    const newPickupDate = futureDate(22);
    await page.locator('input[formcontrolname="installDate"]').fill(newInstallDate);
    await page.locator('input[formcontrolname="pickupDate"]').fill(newPickupDate);

    // 2. Aumentar la cantidad del mobiliario ya asignado (de 1 a 5; hay 20 de
    // stock, así que debe permitirse).
    const amountInput = page
        .locator('tbody[formarrayname="listAccessories"] input[formcontrolname="amount"]')
        .first();
    await amountInput.fill('5');

    // El comentario NO es obligatorio: se deja vacío a propósito (así nace
    // el contrato cuando viene de una cotización sin comentario) para
    // confirmar que igual se puede actualizar.
    await expect(page.locator('[formcontrolname="comment"]')).toHaveValue('');

    // 3. Actualizar (pide confirmación en un modal).
    await page.getByRole('button', { name: 'Actualizar Contrato' }).click();
    await page.getByRole('button', { name: 'Sí' }).click();

    // Tras un update exitoso, el propio componente vuelve solo al listado
    // (sin navegación de ruta: Angular reutiliza la misma instancia al
    // navegar dentro de /dashboard/contract, así que un link del nav no
    // sirve para "volver" aquí).
    await expect(page.getByRole('button', { name: 'Agregar Contrato' })).toBeVisible({ timeout: 10_000 });

    // 4. Confirmar que los cambios quedaron persistidos de verdad (no solo
    // en el formulario): reabrir el contrato y releer sus valores.
    const row = rowByExactCell(page, contractCode);
    await row.getByRole('button', { name: 'Visualizar' }).click();
    await expect(page.locator('input[formcontrolname="installDate"]')).toHaveValue(newInstallDate);
    await expect(page.locator('input[formcontrolname="pickupDate"]')).toHaveValue(newPickupDate);
    await expect(
        page.locator('tbody[formarrayname="listAccessories"] input[formcontrolname="amount"]').first()
    ).toHaveValue('5');

    // 5. Volver al listado (botón real de la UI, no un link de navegación) y
    // anular el contrato.
    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page.getByRole('button', { name: 'Agregar Contrato' })).toBeVisible();
    const rowToDelete = rowByExactCell(page, contractCode);
    await rowToDelete.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('button', { name: 'SI' }).click();

    // 6. El backend es la fuente de verdad: un contrato Anulado no debe
    // salir en "contratos recientes". No lo verificamos por UI porque
    // deleteContract() llama a ngOnInit() directamente (sin navegar), que
    // relee el ?open=<id> ya presente en la URL y vuelve a abrir el mismo
    // contrato en detalle en vez de mostrar el listado.
    const token = await apiLogin(request);
    const res = await request.get(`${BACKEND_URL}/contract/search?onlyRecent=true`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const recentContracts = await res.json();
    expect(recentContracts.some((c: { codContract: string }) => c.codContract === contractCode)).toBe(false);
});
