import { Page, expect } from '@playwright/test';
import { E2E_USER, E2E_CUSTOMER_NAME, E2E_ACCESSORY_DESCRIPTION } from './fixtures';

export function futureDateTimeLocal(daysFromNow: number, hour: string): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const yyyy = d.getFullYear();
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hour}`;
}

export function futureDate(daysFromNow: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const yyyy = d.getFullYear();
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Fila cuya coincidencia es por texto EXACTO de alguna celda (no por
// substring): un código de contrato corto puede ser substring del código de
// cotización de OTRA fila (columna "Cotización"), y viceversa, así que
// `locator('tr', { hasText })` de Playwright (coincidencia parcial) puede
// resolver a más de una fila.
export function rowByExactCell(page: Page, text: string) {
    return page.locator('tr').filter({
        has: page.locator('td', { hasText: new RegExp(`^\\s*${escapeRegExp(text)}\\s*$`) }),
    });
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function selectFromNgSelect(page: Page, index: number, searchText: string) {
    const ngSelect = page.locator('ng-select').nth(index);
    await ngSelect.locator('.ng-select-container').click();
    await ngSelect.locator('input[type="text"]').fill(searchText);
    await page.locator('.ng-option', { hasText: searchText }).first().click();
}

export async function login(page: Page) {
    await page.goto('/login');
    await page.locator('input[name="email"]').fill(E2E_USER.userName);
    await page.locator('input[name="password"]').fill(E2E_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
}

export interface QuotationDates {
    installDate: string;
    eventDate: string;
    pickupDate: string;
}

export function quotationDatesFor(installDaysFromNow: number, pickupDaysFromNow = installDaysFromNow): QuotationDates {
    return {
        installDate: futureDateTimeLocal(installDaysFromNow, '09:00'),
        eventDate: futureDateTimeLocal(installDaysFromNow, '12:00'),
        pickupDate: futureDateTimeLocal(pickupDaysFromNow, '18:00'),
    };
}

// Crea una cotización nueva para el cliente/mobiliario semilla y la deja
// PENDIENTE (sin convertir). Asume que ya se hizo login y se está en
// cualquier pantalla del dashboard. Devuelve su código único.
export async function createQuotation(
    page: Page,
    {
        installDaysFromNow = 7,
        pickupDaysFromNow = installDaysFromNow,
        amount = 1,
    }: { installDaysFromNow?: number; pickupDaysFromNow?: number; amount?: number } = {}
): Promise<string> {
    await page.getByRole('link', { name: 'Cotizaciones' }).click();
    await page.getByRole('button', { name: 'Nueva Cotización' }).click();

    await selectFromNgSelect(page, 0, E2E_CUSTOMER_NAME);

    const dates = quotationDatesFor(installDaysFromNow, pickupDaysFromNow);
    await page.locator('input[formcontrolname="installDate"]').fill(dates.installDate);
    await page.locator('input[formcontrolname="eventDate"]').fill(dates.eventDate);
    await page.locator('input[formcontrolname="pickupDate"]').fill(dates.pickupDate);

    await page.locator('input[formcontrolname="address"]').fill('Av. Siempre Viva 123');
    await page.locator('select[formcontrolname="district"]').selectOption('Miraflores');

    await selectFromNgSelect(page, 1, E2E_ACCESSORY_DESCRIPTION);
    await expect(page.getByText('No Existen Registros')).toHaveCount(0);

    if (amount !== 1) {
        await page
            .locator('tbody[formarrayname="listAccessories"] input[formcontrolname="amount"]')
            .first()
            .fill(String(amount));
    }

    await page.getByRole('button', { name: 'Guardar Cotización' }).click();
    // Leer el código directo de la respuesta del POST: el listado puede
    // acumular varias cotizaciones pendientes del mismo cliente semilla (de
    // otros tests), así que no hay forma confiable de identificar "la que
    // acabamos de crear" solo por texto en la fila.
    const [response] = await Promise.all([
        page.waitForResponse(
            (res) => res.request().method() === 'POST' && res.url().endsWith('/quotation')
        ),
        page.getByRole('button', { name: 'Sí' }).click(),
    ]);
    const created = await response.json();

    await expect(page.getByRole('button', { name: 'Nueva Cotización' })).toBeVisible();
    return created.codQuotation as string;
}

// Crea una cotización y la convierte a contrato de una. Asume que ya se hizo
// login. Deja al navegador en la pantalla de detalle del contrato recién
// creado (condicion=true, mostrarBotones=false), como si se hubiera
// navegado ahí tras darle "Generar Contrato" en la cotización.
export async function quoteAndConvertToContract(
    page: Page,
    {
        installDaysFromNow = 7,
        pickupDaysFromNow = installDaysFromNow,
        amount = 1,
    }: { installDaysFromNow?: number; pickupDaysFromNow?: number; amount?: number } = {}
): Promise<{ quotationCode: string; contractCode: string }> {
    const quotationCode = await createQuotation(page, { installDaysFromNow, pickupDaysFromNow, amount });

    const quotationRow = rowByExactCell(page, quotationCode);
    await quotationRow.getByRole('button', { name: 'Generar Contrato' }).click();
    await page.getByRole('button', { name: 'Sí' }).click();

    // La conversión exitosa muestra el modal propio de la app ("Contrato
    // creado exitosamente...") y espera a que se cierre ANTES de navegar
    // (para no dejarlo huérfano tapando la pantalla del contrato).
    await page.getByRole('button', { name: 'Aceptar' }).click();

    await page.waitForURL('**/dashboard/contract**');
    const contractCode = await page.locator('input#co-contrato').inputValue();

    return { quotationCode, contractCode };
}

// Flujo completo: login -> crear cotización -> convertirla a contrato.
export async function createContractFromNewQuotation(
    page: Page,
    installDaysFromNow = 7
): Promise<{ quotationCode: string; contractCode: string }> {
    await login(page);
    return quoteAndConvertToContract(page, { installDaysFromNow });
}
