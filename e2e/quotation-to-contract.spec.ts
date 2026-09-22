import { test, expect } from '@playwright/test';
import { createContractFromNewQuotation, rowByExactCell } from './helpers';

test('creates a quotation and converts it into a contract', async ({ page }) => {
    const { quotationCode, contractCode } = await createContractFromNewQuotation(page);

    expect(contractCode).toMatch(/^\d{4}-\d{10}$/);
    await expect(page.locator('[formcontrolname="address"]')).toHaveValue('Av. Siempre Viva 123');

    // La cotización debe haber quedado realmente marcada CONVERTED en el
    // backend (no solo en memoria): al recargar el listado desde cero, el
    // botón debe mostrar "Contrato Generado" y estar deshabilitado. Se
    // busca por su código único (no por cliente: puede haber más de una
    // cotización del mismo cliente semilla entre tests).
    await page.getByRole('link', { name: 'Cotizaciones' }).click();
    const convertedRow = rowByExactCell(page, quotationCode);
    const convertedButton = convertedRow.getByRole('button', { name: 'Contrato Generado' });
    await expect(convertedButton).toBeVisible();
    await expect(convertedButton).toBeDisabled();

    // El listado de contratos debe mostrar de qué cotización viene.
    await page.getByRole('link', { name: 'Contrato', exact: true }).click();
    const contractRow = rowByExactCell(page, contractCode);
    await expect(contractRow).toBeVisible();
    await expect(contractRow).toContainText(quotationCode);
});
