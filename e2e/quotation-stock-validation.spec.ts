import { test, expect } from '@playwright/test';
import { login, createQuotation, quoteAndConvertToContract, rowByExactCell } from './helpers';

test('blocks editing a pending quotation into a mobiliario amount that is no longer available', async ({ page }) => {
    // Ventana de fechas propia (lejos de otros tests) para que nada más
    // choque contra este mismo mobiliario en ese rango. A propósito un solo
    // día con horario de oficina (09:00-18:00 hora de Lima): es justo el
    // caso que antes subestimaba el uso real (ver groupAccessoryByDay).
    const installDaysFromNow = 40;
    const pickupDaysFromNow = 40;

    await login(page);

    // 1. Crear PRIMERO la cotización PENDIENTE (sin convertir), con 1
    // unidad. Con 20 libres en ese momento, su validador de cliente queda
    // "abierto" hasta 20 (guarda el stock visto al agregar el ítem).
    const pendingQuotationCode = await createQuotation(page, {
        installDaysFromNow,
        pickupDaysFromNow,
        amount: 1,
    });

    // 2. DESPUÉS, reservar 18 de esas 20 unidades vía un CONTRATO real
    // (otra cotización, con 18 unidades, convertida) para las mismas
    // fechas. Este es justo el caso que preocupa: el mobiliario se
    // comprometió en otro lado DESPUÉS de haber armado la primera
    // cotización, cuyo formulario todavía "cree" que hay 20 libres.
    await page.getByRole('link', { name: 'Cotizaciones' }).click();
    await quoteAndConvertToContract(page, { installDaysFromNow, pickupDaysFromNow, amount: 18 });

    // 3. Volver a la cotización pendiente y pedirle más de lo que queda
    // realmente libre (quedan 2, se piden 5): el backend revalida contra
    // reservas reales (contratos) y debe bloquear el guardado en vez de
    // ofrecerle al cliente algo que ya no hay.
    await page.getByRole('link', { name: 'Cotizaciones' }).click();
    const row = rowByExactCell(page, pendingQuotationCode);
    await row.getByRole('button', { name: 'Detalle' }).click();

    const amountInput = page
        .locator('tbody[formarrayname="listAccessories"] input[formcontrolname="amount"]')
        .first();
    await amountInput.fill('5');

    await page.getByRole('button', { name: 'Guardar Cotización' }).click();
    const [putResponse] = await Promise.all([
        page.waitForResponse((res) => res.request().method() === 'PUT' && res.url().includes('/quotation/')),
        page.getByRole('button', { name: 'Sí' }).click(),
    ]);
    expect(putResponse.status()).toBe(424);

    // El aviso de error ahora es el modal propio de la app (no un alert()
    // nativo del navegador): se cierra con su botón "Aceptar" antes de
    // seguir, para no dejarlo abierto tapando el resto de la pantalla.
    await expect(page.getByText('no tiene disponibilidad suficiente')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Aceptar' }).click();

    // Tras el aviso, updateFormStock() refresca el stock y muestra un
    // SEGUNDO modal propio ("El stock ha sido actualizado..."); también hay
    // que cerrarlo antes de seguir interactuando con la pantalla.
    await expect(page.getByText('El stock ha sido actualizado')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Aceptar' }).click();

    // 4. El cambio NO debe haber quedado guardado: al salir y volver a
    // entrar (recargando desde el backend), la cantidad sigue en 1.
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('button', { name: 'Nueva Cotización' })).toBeVisible();
    await row.getByRole('button', { name: 'Detalle' }).click();
    await expect(
        page.locator('tbody[formarrayname="listAccessories"] input[formcontrolname="amount"]').first()
    ).toHaveValue('1');
});
