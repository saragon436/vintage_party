import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of, throwError } from 'rxjs';

import { QuotationComponent } from './quotation.component';
import { CustomerService } from '../Servicios/customer.service';
import { AccessoryService } from '../Servicios/accessory.service';
import { QuotationService } from '../Servicios/quotation.service';
import { ContractService } from '../Servicios/contract.service';
import { AuthenticationToken } from '../Servicios/autentication-token.service';
import { ConfirmDialogService } from '../shared/confirm-dialog/confirm-dialog.service';

describe('QuotationComponent', () => {
    let component: QuotationComponent;
    let modalServiceSpy: jasmine.SpyObj<NgbModal>;
    let customerServiceSpy: jasmine.SpyObj<CustomerService>;
    let accessoryServiceSpy: jasmine.SpyObj<AccessoryService>;
    let quotationServiceSpy: jasmine.SpyObj<QuotationService>;
    let contractServiceSpy: jasmine.SpyObj<ContractService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let confirmDialogSpy: jasmine.SpyObj<ConfirmDialogService>;
    let authenticationToken: AuthenticationToken;

    const makeAccessory = (overrides: Partial<any> = {}) => ({
        _id: 'acc-1',
        description: 'Mantel',
        color: 'Rojo',
        design: 'Liso',
        large: '2',
        bottom: '1',
        high: '1',
        width: '1',
        diameter: '1',
        stock: 5,
        price: 10,
        status: true,
        ...overrides,
    });

    beforeEach(() => {
        modalServiceSpy = jasmine.createSpyObj('NgbModal', ['open']);
        customerServiceSpy = jasmine.createSpyObj('CustomerService', ['listCustomer', 'updateCustomer']);
        accessoryServiceSpy = jasmine.createSpyObj('AccessoryService', ['listStockAccessory']);
        quotationServiceSpy = jasmine.createSpyObj('QuotationService', [
            'saveQuotation',
            'listQuotation',
            'getQuotationById',
            'updateQuotation',
            'generatePdf',
        ]);
        contractServiceSpy = jasmine.createSpyObj('ContractService', ['savecontractbyquotation', 'updateContract', 'getPendingBalanceByCustomer', 'getCustomerIdsWithPendingBalance']);
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        confirmDialogSpy = jasmine.createSpyObj('ConfirmDialogService', ['confirm', 'alert']);
        confirmDialogSpy.alert.and.returnValue(Promise.resolve());

        authenticationToken = new AuthenticationToken();
        authenticationToken.myValue = 'test-token';

        customerServiceSpy.listCustomer.and.returnValue(of([]));
        quotationServiceSpy.listQuotation.and.returnValue(of({ items: [], total: 0, page: 1 }));
        accessoryServiceSpy.listStockAccessory.and.returnValue(of([]));
        contractServiceSpy.getPendingBalanceByCustomer.and.returnValue(
            of({ hasPending: false, total: 0, contracts: [] })
        );
        contractServiceSpy.getCustomerIdsWithPendingBalance.and.returnValue(
            of({ customerIds: [] })
        );

        component = new QuotationComponent(
            modalServiceSpy,
            customerServiceSpy,
            accessoryServiceSpy,
            quotationServiceSpy,
            contractServiceSpy,
            authenticationToken,
            routerSpy as unknown as Router,
            new FormBuilder(),
            confirmDialogSpy
        );
    });

    afterEach(() => {
        // searchStock() (llamado por onSubmitAdd/onEdit) deja viva una
        // suscripción con debounceTime; sin esto, su callback puede disparar
        // después de terminado el test y reventar en un hook afterAll.
        component.unsubscribe.next();
        component.unsubscribe.complete();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    // ==========================
    // Totales (sumarValores)
    // ==========================
    describe('sumarValores', () => {
        it('sums price * amount for every accessory and updates the amount control', () => {
            component.onAddItem(makeAccessory({ _id: 'a1', price: 10, stock: 5 }));
            component.arrayAccessory.at(0).get('amount')?.setValue(2);
            component.onAddItem(makeAccessory({ _id: 'a2', price: 25, stock: 3 }));
            component.arrayAccessory.at(1).get('amount')?.setValue(1);

            component.sumarValores();

            expect(component.total).toBe(45); // (10*2) + (25*1)
            expect(component.form.get('amount')?.value).toBe(45);
        });

        it('is 0 when there are no accessories', () => {
            component.sumarValores();
            expect(component.total).toBe(0);
        });
    });

    // ==========================
    // Agregar / eliminar accesorios
    // ==========================
    describe('onAddItem', () => {
        it('adds a new accessory with default amount 1 and recalculates the total', () => {
            component.onAddItem(makeAccessory({ _id: 'a1', price: 10, stock: 5 }));

            expect(component.arrayAccessory.length).toBe(1);
            const added = component.arrayAccessory.at(0).value;
            expect(added.amount).toBe(1);
            expect(component.total).toBe(10);
        });

        it('does not add the same accessory twice (by id or _id)', () => {
            const accessory = makeAccessory({ _id: 'a1' });

            component.onAddItem(accessory);
            component.onAddItem(accessory);

            expect(component.arrayAccessory.length).toBe(1);
        });

        it('caps the amount validator at the available stock', () => {
            component.onAddItem(makeAccessory({ _id: 'a1', stock: 3 }));

            const amountControl = component.arrayAccessory.at(0).get('amount');
            amountControl?.setValue(4);
            expect(amountControl?.valid).toBeFalse();

            amountControl?.setValue(3);
            expect(amountControl?.valid).toBeTrue();
        });
    });

    describe('onDeleteItem', () => {
        it('removes the accessory and recalculates the total when confirmed', async () => {
            component.onAddItem(makeAccessory({ _id: 'a1', price: 10 }));
            component.onAddItem(makeAccessory({ _id: 'a2', price: 20 }));
            confirmDialogSpy.confirm.and.returnValue(Promise.resolve(true));

            await component.onDeleteItem(0);

            expect(component.arrayAccessory.length).toBe(1);
            expect(component.total).toBe(20);
        });

        it('keeps the accessory when the deletion is not confirmed', async () => {
            component.onAddItem(makeAccessory({ _id: 'a1', price: 10 }));
            confirmDialogSpy.confirm.and.returnValue(Promise.resolve(false));

            await component.onDeleteItem(0);

            expect(component.arrayAccessory.length).toBe(1);
        });
    });

    // ==========================
    // Listado y paginación
    // ==========================
    describe('loadQuotations', () => {
        it('stores the page results and updates the title with the total count', () => {
            const items = [{ _id: 'q1', codQuotation: 'COT-1' }];
            quotationServiceSpy.listQuotation.and.returnValue(of({ items, total: 7, page: 2 }));

            component.loadQuotations(2);

            expect(component.quotations).toEqual(items as any);
            expect(component.totalQuotations).toBe(7);
            expect(component.currentPage).toBe(2);
            expect(component.listTitle).toBe('Listado de Cotizaciones (7)');
        });

        it('redirects to login when the backend returns 401', () => {
            quotationServiceSpy.listQuotation.and.returnValue(
                throwError(() => ({ status: 401 }))
            );

            component.loadQuotations();

            expect(routerSpy.navigate).toHaveBeenCalledWith(['/app-login']);
        });
    });

    describe('goToPage / totalPages', () => {
        it('computes totalPages from totalQuotations and pageSize (min 1)', () => {
            component.totalQuotations = 0;
            expect(component.totalPages).toBe(1);

            component.totalQuotations = 45;
            component.pageSize = 20;
            expect(component.totalPages).toBe(3);
        });

        it('ignores out-of-range or unchanged page requests', () => {
            component.currentPage = 1;
            component.totalQuotations = 20;
            component.pageSize = 20;
            quotationServiceSpy.listQuotation.calls.reset();

            component.goToPage(0);
            component.goToPage(1); // same page
            component.goToPage(2); // out of range (only 1 page)

            expect(quotationServiceSpy.listQuotation).not.toHaveBeenCalled();
        });

        it('loads the requested page when it is valid', () => {
            component.currentPage = 1;
            component.totalQuotations = 40;
            component.pageSize = 20;

            component.goToPage(2);

            expect(quotationServiceSpy.listQuotation).toHaveBeenCalledWith(
                jasmine.anything(),
                2,
                20,
                jasmine.anything()
            );
        });
    });

    describe('onGlobalSearch / clearGlobalSearch', () => {
        it('searches from page 1', () => {
            component.searchValue = 'Juan';
            component.onGlobalSearch();

            expect(quotationServiceSpy.listQuotation).toHaveBeenCalledWith(
                jasmine.anything(),
                1,
                jasmine.anything(),
                'Juan'
            );
        });

        it('clears the search value and reloads page 1', () => {
            component.searchValue = 'Juan';
            component.clearGlobalSearch();

            expect(component.searchValue).toBe('');
            expect(quotationServiceSpy.listQuotation).toHaveBeenCalledWith(
                jasmine.anything(),
                1,
                jasmine.anything(),
                ''
            );
        });
    });

    // ==========================
    // Guardar cotización
    // ==========================
    describe('onSave', () => {
        const fillValidForm = () => {
            component.form.patchValue({
                customer: { _id: 'c1', name: 'Juan', documentNumber: '12345678' },
                createDate: '2024-05-01',
                installDate: '2024-05-01T10:00',
                eventDate: '2024-05-02T10:00',
                pickupDate: '2024-05-03T10:00',
                address: 'Av. Siempre Viva 123',
                district: 'Miraflores',
                amount: 100,
            });
        };

        it('does not call the backend when the form is invalid', async () => {
            await component.onSave();

            expect(confirmDialogSpy.confirm).not.toHaveBeenCalled();
            expect(quotationServiceSpy.saveQuotation).not.toHaveBeenCalled();
            expect(component.form.touched).toBeTrue();
        });

        it('does not save when the user cancels the confirmation dialog', async () => {
            fillValidForm();
            confirmDialogSpy.confirm.and.returnValue(Promise.resolve(false));

            await component.onSave();

            expect(quotationServiceSpy.saveQuotation).not.toHaveBeenCalled();
        });

        it('creates a new quotation, stores the returned id and prints it', async () => {
            fillValidForm();
            confirmDialogSpy.confirm.and.returnValue(Promise.resolve(true));
            quotationServiceSpy.saveQuotation.and.returnValue(
                of({ _id: 'q1', codQuotation: 'COT-001' })
            );
            spyOn(component, 'printQuotation');

            await component.onSave();

            expect(quotationServiceSpy.saveQuotation).toHaveBeenCalled();
            expect(component.form.get('_id')?.value).toBe('q1');
            expect(component.quotationNumber).toBe('COT-001');
            expect(component.isDisabled).toBeTrue();
            expect(component.isSaving).toBeFalse();
            expect(component.printQuotation).toHaveBeenCalledWith(true);
        });

        it('updates an existing quotation and exits the detail view', async () => {
            fillValidForm();
            component.form.patchValue({ _id: 'q1' });
            confirmDialogSpy.confirm.and.returnValue(Promise.resolve(true));
            quotationServiceSpy.updateQuotation.and.returnValue(
                of({ _id: 'q1', codQuotation: 'COT-001' })
            );

            await component.onSave();

            expect(quotationServiceSpy.updateQuotation).toHaveBeenCalled();
            expect(component.condicion).toBeFalse();
            expect(component.mostrarBotones).toBeFalse();
        });

        it('resets isSaving when the create request fails', async () => {
            fillValidForm();
            confirmDialogSpy.confirm.and.returnValue(Promise.resolve(true));
            quotationServiceSpy.saveQuotation.and.returnValue(throwError(() => new Error('boom')));

            await component.onSave();

            expect(component.isSaving).toBeFalse();
        });

        it('alerts and refreshes stock when the backend rejects an update for lack of availability (424)', async () => {
            fillValidForm();
            component.form.patchValue({ _id: 'q1' });
            confirmDialogSpy.confirm.and.returnValue(Promise.resolve(true));
            quotationServiceSpy.updateQuotation.and.returnValue(throwError(() => ({ status: 424 })));
            spyOn(component, 'updateFormStock');

            await component.onSave();

            expect(component.isSaving).toBeFalse();
            expect(confirmDialogSpy.alert).toHaveBeenCalled();
            expect(component.updateFormStock).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    installDate: component.form.value.installDate,
                    pickupDate: component.form.value.pickupDate,
                })
            );
        });
    });

    // ==========================
    // Edición
    // ==========================
    describe('onEdit', () => {
        const quotation = {
            _id: 'q1',
            codQuotation: 'COT-001',
            createDate: '2024-05-01T00:00:00.000Z',
            installDate: '2024-05-01T00:00:00.000Z',
            eventDate: '2024-05-02T00:00:00.000Z',
            pickupDate: '2024-05-03T00:00:00.000Z',
            amount: 50,
            address: 'Calle Falsa 123',
            district: 'Surco',
            comment: 'Sin comentarios',
            customer: { _id: 'c1', name: 'Juan', documentNumber: '12345678' },
            listAccessories: [makeAccessory({ _id: 'a1', amount: 2 })],
        };

        it('fills the form and accessory list from the quotation', () => {
            component.onEdit(quotation as any);

            expect(component.form.get('_id')?.value).toBe('q1');
            expect(component.form.get('address')?.value).toBe('Calle Falsa 123');
            expect(component.form.get('customer')?.value).toEqual(quotation.customer);
            expect(component.arrayAccessory.length).toBe(1);
            expect(component.customerName).toBe('Juan');
            expect(component.quotationNumber).toBe('COT-001');
            expect(component.condicion).toBeTrue();
        });

        it('disables the form when the quotation was already converted to a contract', () => {
            component.onEdit({ ...quotation, status: 'CONVERTED' } as any);
            expect(component.isDisabled).toBeTrue();
        });

        it('keeps the form editable when the quotation is not converted', () => {
            component.onEdit({ ...quotation, status: 'PENDING' } as any);
            expect(component.isDisabled).toBeFalse();
        });
    });

    // ==========================
    // Validación de stock
    // ==========================
    describe('verifyStockAvailability', () => {
        const quotation = {
            _id: 'q1',
            installDate: '2024-05-01T00:00:00.000Z',
            pickupDate: '2024-05-03T00:00:00.000Z',
            listAccessories: [{ id: 'a1', amount: 3 }],
        };

        it('resolves false without calling the backend when dates are missing', (done) => {
            component.verifyStockAvailability({ ...quotation, installDate: '' } as any).subscribe((isValid) => {
                expect(isValid).toBeFalse();
                expect(accessoryServiceSpy.listStockAccessory).not.toHaveBeenCalled();
                done();
            });
        });

        it('resolves true when every accessory has enough fresh stock', (done) => {
            accessoryServiceSpy.listStockAccessory.and.returnValue(
                of([{ _id: 'a1', stock: 5 }])
            );

            component.verifyStockAvailability(quotation as any).subscribe((isValid) => {
                expect(isValid).toBeTrue();
                done();
            });
        });

        it('resolves false when the requested amount exceeds fresh stock', (done) => {
            accessoryServiceSpy.listStockAccessory.and.returnValue(
                of([{ _id: 'a1', stock: 1 }])
            );

            component.verifyStockAvailability(quotation as any).subscribe((isValid) => {
                expect(isValid).toBeFalse();
                done();
            });
        });

        it('resolves false when the accessory no longer exists in the fresh stock list', (done) => {
            accessoryServiceSpy.listStockAccessory.and.returnValue(of([]));

            component.verifyStockAvailability(quotation as any).subscribe((isValid) => {
                expect(isValid).toBeFalse();
                done();
            });
        });
    });

    // ==========================
    // Conversión a contrato
    // ==========================
    describe('convertToContract', () => {
        const quotation = {
            _id: 'q1',
            codQuotation: 'COT-001',
            numberQuotation: 1,
            userCreate: { userName: 'admin' },
            createDate: '2024-04-20T00:00:00.000Z',
            installDate: '2024-05-01T00:00:00.000Z',
            eventDate: '2024-05-02T00:00:00.000Z',
            pickupDate: '2024-05-03T00:00:00.000Z',
            amount: 100,
            address: 'Av. Siempre Viva 123',
            district: 'Miraflores',
            comment: 'Sin comentarios',
            customer: { _id: 'c1', name: 'Juan', documentNumber: '12345678' },
            listAccessories: [{ id: 'a1', amount: 2 }],
        };

        it('does nothing if a conversion for the same quotation is already in progress', async () => {
            component.convertingId = 'q1';

            await component.convertToContract(quotation as any);

            expect(confirmDialogSpy.confirm).not.toHaveBeenCalled();
        });

        it('does nothing when the user cancels the confirmation', async () => {
            confirmDialogSpy.confirm.and.returnValue(Promise.resolve(false));

            await component.convertToContract(quotation as any);

            expect(contractServiceSpy.savecontractbyquotation).not.toHaveBeenCalled();
            expect(component.convertingId).toBeNull();
        });

        it('creates the contract, marks the quotation as CONVERTED and navigates to it', async () => {
            confirmDialogSpy.confirm.and.returnValue(Promise.resolve(true));
            accessoryServiceSpy.listStockAccessory.and.returnValue(of([{ _id: 'a1', stock: 5 }]));
            contractServiceSpy.savecontractbyquotation.and.returnValue(
                of({ _id: 'c1', codContract: 'C-001' })
            );
            contractServiceSpy.updateContract.and.returnValue(of({}));
            quotationServiceSpy.updateQuotation.and.returnValue(of({}));

            await component.convertToContract(quotation as any);

            expect(contractServiceSpy.savecontractbyquotation).toHaveBeenCalledWith(
                { quotationId: 'q1' },
                jasmine.anything()
            );
            expect(contractServiceSpy.updateContract).toHaveBeenCalledWith(
                jasmine.objectContaining({ _id: 'c1', status: 'Por Pagar' }),
                jasmine.anything()
            );
            const statusUpdatePayload = quotationServiceSpy.updateQuotation.calls.mostRecent().args[0];
            expect(statusUpdatePayload).toEqual(
                jasmine.objectContaining({ _id: 'q1', status: 'CONVERTED', amount: 100 })
            );
            // El backend rechaza estos campos con 400 en un PUT (@IsEmpty en
            // QuotationDto); antes se mandaban igual y el error se tragaba en
            // silencio, dejando la cotización sin marcar como CONVERTED.
            expect(statusUpdatePayload.codQuotation).toBeUndefined();
            expect(statusUpdatePayload.numberQuotation).toBeUndefined();
            expect(statusUpdatePayload.userCreate).toBeUndefined();
            expect(routerSpy.navigate).toHaveBeenCalledWith(
                ['/dashboard/contract'],
                { queryParams: { open: 'c1' } }
            );
            expect(component.convertingId).toBeNull();
        });

        it('blocks the conversion and warns the user when stock is insufficient', async () => {
            confirmDialogSpy.confirm.and.returnValue(Promise.resolve(true));
            accessoryServiceSpy.listStockAccessory.and.returnValue(of([{ _id: 'a1', stock: 1 }]));

            await component.convertToContract(quotation as any);

            expect(contractServiceSpy.savecontractbyquotation).not.toHaveBeenCalled();
            expect(confirmDialogSpy.alert).toHaveBeenCalled();
            expect(component.convertingId).toBeNull();
        });
    });
});
