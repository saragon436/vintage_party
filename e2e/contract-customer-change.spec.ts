import { test, expect } from '@playwright/test';
import { createContractFromNewQuotation, selectFromNgSelect } from './helpers';
import { E2E_CUSTOMER_NAME } from './fixtures';

test('loads the quotation customer and confirms a customer change in both documents', async ({ page }) => {
    const selectorErrors: string[] = [];
    page.on('console', message => {
        if (message.type() === 'error' && /TypeError|ItemsList|NgSelectComponent/.test(message.text())) selectorErrors.push(message.text());
    });
    await page.addInitScript(() => { window.print = () => {}; });
    const { quotationCode } = await createContractFromNewQuotation(page, 90);
    const selector = page.locator('ng-select[formcontrolname="customer"]');
    await expect(selector.locator('.ng-value-label')).toContainText(E2E_CUSTOMER_NAME);

    const headers = await page.evaluate(() => {
        const host = document.querySelector('app-contract');
        const component = (window as any).ng.getComponent(host);
        return { Authorization: 'Bearer ' + component.authenticationToken.myValue };
    });
    const created = await page.request.post('http://localhost:3001/customer', {
        headers, data: { name: 'Cliente reasignado E2E', documentNumber: '88888888', address: 'Av. Nueva 456', phone: '912345678', status: true },
    });
    expect(created.ok()).toBeTruthy();
    // Volver a cargar el catálogo manteniendo la misma sesión y formulario.
    await page.evaluate(() => (window as any).ng.getComponent(document.querySelector('app-contract')).findClient());
    await selectFromNgSelect(page, 0, 'Cliente reasignado E2E');
    await page.getByRole('button', { name: 'Actualizar Contrato', exact: true }).click();
    const modal = page.locator('ngb-modal-window');
    await expect(modal).toContainText('Cambiar cliente');
    await expect(modal).toContainText(quotationCode);
    await expect(modal).toContainText('adelantos');
    await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(modal).toHaveCount(0);

    await page.getByRole('button', { name: 'Actualizar Contrato', exact: true }).click();
    const responsePromise = page.waitForResponse(r => r.request().method() === 'PUT' && r.url().endsWith('/contract/customer'));
    await page.locator('ngb-modal-window').getByRole('button', { name: 'Aceptar', exact: true }).click();
    const response = await responsePromise;
    expect(response.status(), await response.text()).toBe(204);
    const contractId = new URL(page.url()).searchParams.get('open');
    const contract = await (await page.request.get('http://localhost:3001/contract/' + contractId, { headers })).json();
    const quotations = await (await page.request.get('http://localhost:3001/quotation', { headers })).json();
    const quotation = (quotations.items || quotations).find((q: any) => q.codQuotation === quotationCode);
    expect(contract.customer.name).toBe('Cliente reasignado E2E');
    expect(quotation.customer.name).toBe('Cliente reasignado E2E');
    expect(selectorErrors).toEqual([]);
});
