import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of, throwError } from 'rxjs';

import { ContractComponent } from './contract.component';
import { CustomerService } from '../Servicios/customer.service';
import { AccessoryService } from '../Servicios/accessory.service';
import { ContractService } from '../Servicios/contract.service';
import { AuthenticationToken } from '../Servicios/autentication-token.service';
import { ConfirmDialogService } from '../shared/confirm-dialog/confirm-dialog.service';

describe('ContractComponent', () => {
    let component: ContractComponent;
    let modalServiceSpy: jasmine.SpyObj<NgbModal>;
    let customerServiceSpy: jasmine.SpyObj<CustomerService>;
    let accessoryServiceSpy: jasmine.SpyObj<AccessoryService>;
    let contractServiceSpy: jasmine.SpyObj<ContractService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let confirmDialogSpy: jasmine.SpyObj<ConfirmDialogService>;
    let authenticationToken: AuthenticationToken;
    let activatedRouteStub: any;

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
        selectedValues: undefined,
        ...overrides,
    });

    const makeContract = (overrides: Partial<any> = {}) => ({
        _id: 'ct1',
        codContract: '2024-0000000001',
        createDate: '2024-05-01T00:00:00.000Z',
        installDate: '2024-05-01T00:00:00.000Z',
        eventDate: '2024-05-02T00:00:00.000Z',
        pickupDate: '2024-05-03T00:00:00.000Z',
        high: '1',
        stock: 5,
        address: 'Calle Falsa 123',
        district: 'Surco',
        hourIni: '08:00',
        hourFin: '10:00',
        hourIniPickup: '18:00',
        hourFinPickup: '20:00',
        comment: 'Sin comentarios',
        amount: 100,
        status: 'Por Pagar',
        listAccessories: [{ id: 'a1', amount: 2, price: 10, description: 'Mantel' }],
        onAccount: [],
        customer: { name: 'Juan', documentNumber: '12345678', phone: '999999999' },
        userCreate: { userName: 'admin' },
        ...overrides,
    });

    beforeEach(() => {
        modalServiceSpy = jasmine.createSpyObj('NgbModal', ['open']);
        customerServiceSpy = jasmine.createSpyObj('CustomerService', ['listCustomer', 'updateCustomer']);
        accessoryServiceSpy = jasmine.createSpyObj('AccessoryService', ['listStockAccessory']);
        contractServiceSpy = jasmine.createSpyObj('ContractService', [
            'saveContract',
            'updateContract',
            'getRecentContracts',
            'getContractsByYearAndStatus',
            'searchContracts',
            'listContractById',
            'getPendingBalanceByCustomer',
            'getCustomerIdsWithPendingBalance',
        ]);
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        confirmDialogSpy = jasmine.createSpyObj('ConfirmDialogService', ['confirm', 'alert']);
        confirmDialogSpy.alert.and.returnValue(Promise.resolve());

        authenticationToken = new AuthenticationToken();
        authenticationToken.myValue = 'test-token';
        authenticationToken.user = { userName: 'admin' };

        activatedRouteStub = {
            snapshot: { queryParamMap: { get: jasmine.createSpy('get').and.returnValue(null) } },
        };

        customerServiceSpy.listCustomer.and.returnValue(of([]));
        contractServiceSpy.getRecentContracts.and.returnValue(of([]));
        contractServiceSpy.getPendingBalanceByCustomer.and.returnValue(
            of({ hasPending: false, total: 0, contracts: [] })
        );
        contractServiceSpy.getCustomerIdsWithPendingBalance.and.returnValue(
            of({ customerIds: [] })
        );
        accessoryServiceSpy.listStockAccessory.and.returnValue(of([]));


        component = new ContractComponent(
            modalServiceSpy,
            customerServiceSpy,
            accessoryServiceSpy,
            contractServiceSpy,
            authenticationToken,
            routerSpy as unknown as Router,
            activatedRouteStub as unknown as ActivatedRoute,
            null as any,
            new FormBuilder(),
            confirmDialogSpy
        );
    });

    afterEach(() => {
        // ngOnInit()/searchStock() dejan una suscripción con debounceTime viva;
        // sin esto, su callback puede disparar tras terminar el test y
        // reventar en un hook afterAll con los spies ya fuera de contexto.
        component.unsubscribe.next();
        component.unsubscribe.complete();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    // ==========================
    // buildYears
    // ==========================
    describe('buildYears', () => {
        it('builds the last 5 years before the current year', () => {
            component.buildYears();
            expect(component.years).toEqual([
                component.currentYear - 1,
                component.currentYear - 2,
                component.currentYear - 3,
                component.currentYear - 4,
                component.currentYear - 5,
            ]);
        });
    });

    // ==========================
    // Totales
    // ==========================
    describe('sumarValores / sumarValoresOnAccount', () => {
        it('computes the accessories total, the paid total and the balance', () => {
            component.arrayAccessory.push(
                component['formBuilder'].group({ price: 10, amount: 2 })
            );
            component.arrayAccessory.push(
                component['formBuilder'].group({ price: 5, amount: 4 })
            );
            component.arrayOnAccount.push(component['formBuilder'].group({ amount: 15 }));

            component.sumarValores();

            expect(component.total).toBe(40); // 10*2 + 5*4
            expect(component.totalOnAccount).toBe(15);
            expect(component.totalBalance).toBe(25);
            expect(component.form.get('amount')?.value).toBe(40);
        });

        it('is 0 when there is nothing loaded', () => {
            component.sumarValores();
            expect(component.total).toBe(0);
            expect(component.totalBalance).toBe(0);
        });
    });

    // ==========================
    // onAddItem
    // ==========================
    describe('onAddItem', () => {
        const selectElement = (accessory: any) => ({ selectedValues: [accessory] } as any);

        it('adds the accessory using its free stock as the amount ceiling', () => {
            component.onAddItem(selectElement(makeAccessory({ _id: 'a1', stock: 5 })));

            expect(component.arrayAccessory.length).toBe(1);
            const amountControl = component.arrayAccessory.at(0).get('amount');
            amountControl?.setValue(5);
            expect(amountControl?.valid).toBeTrue();
            amountControl?.setValue(6);
            expect(amountControl?.valid).toBeFalse();
        });

        it('does not add the same accessory twice', () => {
            const accessory = makeAccessory({ _id: 'a1' });
            component.onAddItem(selectElement(accessory));
            component.onAddItem(selectElement(accessory));

            expect(component.arrayAccessory.length).toBe(1);
        });

        it('adds the previously reserved amount to the ceiling when dates are unchanged', () => {
            component.originalInstallDate = '2024-05-01';
            component.originalPickupDate = '2024-05-03';
            component.form.patchValue({ installDate: '2024-05-01', pickupDate: '2024-05-03' });
            component.originalAccessoryAmounts.set('a1', 3);

            component.onAddItem(selectElement(makeAccessory({ _id: 'a1', stock: 2 })));

            const amountControl = component.arrayAccessory.at(0).get('amount');
            amountControl?.setValue(5); // 2 (stock libre) + 3 (ya reservado)
            expect(amountControl?.valid).toBeTrue();
        });

        it('ignores the previous reservation when the dates changed', () => {
            component.originalInstallDate = '2024-05-01';
            component.originalPickupDate = '2024-05-03';
            component.form.patchValue({ installDate: '2024-06-01', pickupDate: '2024-06-03' });
            component.originalAccessoryAmounts.set('a1', 3);

            component.onAddItem(selectElement(makeAccessory({ _id: 'a1', stock: 2 })));

            const amountControl = component.arrayAccessory.at(0).get('amount');
            amountControl?.setValue(3);
            expect(amountControl?.valid).toBeFalse(); // solo el stock libre (2) aplica
        });
    });

    describe('onAddItemOnAccount', () => {
        it('pushes a new payment entry and recalculates totals', () => {
            component.arrayAccessory.push(component['formBuilder'].group({ price: 10, amount: 2 }));
            component.sumarValores();

            component.onAddItemOnAccount(20);

            expect(component.arrayOnAccount.length).toBe(1);
            expect(component.onAccount).toBe(0);
            expect(component.totalOnAccount).toBe(20);
            expect(component.totalBalance).toBe(0); // 20 - 20
        });
    });

    describe('onDeleteItem / onDeleteItemOnAccount', () => {
        it('removes the accessory when confirmed', async () => {
            component.arrayAccessory.push(component['formBuilder'].group({ price: 10, amount: 1 }));
            confirmDialogSpy.confirm.and.returnValue(Promise.resolve(true));

            await component.onDeleteItem(0);

            expect(component.arrayAccessory.length).toBe(0);
        });

        it('keeps the accessory when not confirmed', async () => {
            component.arrayAccessory.push(component['formBuilder'].group({ price: 10, amount: 1 }));
            confirmDialogSpy.confirm.and.returnValue(Promise.resolve(false));

            await component.onDeleteItem(0);

            expect(component.arrayAccessory.length).toBe(1);
        });

        it('removes the payment when confirmed', async () => {
            component.arrayOnAccount.push(component['formBuilder'].group({ amount: 10 }));
            confirmDialogSpy.confirm.and.returnValue(Promise.resolve(true));

            await component.onDeleteItemOnAccount(0);

            expect(component.arrayOnAccount.length).toBe(0);
        });
    });

    // ==========================
    // Guardar / Actualizar
    // ==========================
    describe('onSave', () => {
        const fillValidForm = () => {
            component.form.patchValue({
                customer: { id: 'c1', name: 'Juan', documentNumber: '12345678' },
                onAccountvalues: 0,
                saldo: 0,
                createDate: '2024-05-01',
                installDate: '2024-05-01',
                eventDate: '2024-05-02',
                pickupDate: '2024-05-03',
                address: 'Av. Siempre Viva 123',
                district: 'Miraflores',
                hourIni: '08:00',
                hourFin: '10:00',
                hourIniPickup: '18:00',
                hourFinPickup: '20:00',
                amount: 100,
                comment: 'Contrato de prueba',
                price: 100,
            });
        };

        it('does not call the backend when the form is invalid', () => {
            component.onSave();
            expect(contractServiceSpy.saveContract).not.toHaveBeenCalled();
        });

        it('creates the contract and stores the response data', () => {
            fillValidForm();
            component.mostrarBotones = true;
            contractServiceSpy.saveContract.and.returnValue(
                of({
                    codContract: '2024-0000000001',
                    customer: { name: 'Juan', phone: '999999999', documentNumber: '12345678' },
                })
            );
            spyOn(component, 'startTimer');

            component.onSave();

            expect(contractServiceSpy.saveContract).toHaveBeenCalled();
            const sentPayload = contractServiceSpy.saveContract.calls.mostRecent().args[0];
            expect(sentPayload._id).toBeUndefined();
            expect(component.numberContract).toBe('2024-0000000001');
            expect(component.customerName).toBe('Juan');
            expect(component.isDisabled).toBeTrue();
            expect(component.isSaving).toBeFalse();
            expect(component.startTimer).toHaveBeenCalled();
        });

        it('falls back to selectedCustomer when the customer control is not an object and mostrarBotones is false', () => {
            fillValidForm();
            component.form.patchValue({ customer: 'texto libre' });
            component.mostrarBotones = false;
            component.selectedCustomer = { id: 'c2', name: 'Maria', documentNumber: '87654321' };
            contractServiceSpy.saveContract.and.returnValue(
                of({ codContract: 'X', customer: { name: 'Maria', phone: '1', documentNumber: '2' } })
            );
            spyOn(component, 'startTimer');

            component.onSave();

            const sentPayload = contractServiceSpy.saveContract.calls.mostRecent().args[0];
            expect(sentPayload.customer).toEqual(component.selectedCustomer);
        });

        it('resets isSaving when the request fails', () => {
            fillValidForm();
            component.mostrarBotones = true;
            contractServiceSpy.saveContract.and.returnValue(throwError(() => new Error('boom')));

            component.onSave();

            expect(component.isSaving).toBeFalse();
        });
    });

    describe('onUpdate', () => {
        const fillValidForm = () => {
            component.form.patchValue({
                customer: { id: 'c1', name: 'Juan', documentNumber: '12345678' },
                onAccountvalues: 0,
                saldo: 0,
                createDate: '2024-05-01',
                installDate: '2024-05-01',
                eventDate: '2024-05-02',
                pickupDate: '2024-05-03',
                address: 'Av. Siempre Viva 123',
                district: 'Miraflores',
                hourIni: '08:00',
                hourFin: '10:00',
                hourIniPickup: '18:00',
                hourFinPickup: '20:00',
                amount: 100,
                comment: 'Contrato de prueba',
                price: 100,
                _id: 'ct1',
            });
        };

        it('does nothing when the user cancels the confirmation', async () => {
            fillValidForm();
            confirmDialogSpy.confirm.and.returnValue(Promise.resolve(false));

            await component.onUpdate();

            expect(contractServiceSpy.updateContract).not.toHaveBeenCalled();
        });

        it('the comment field is not mandatory (a contract from a quotation often has none)', async () => {
            fillValidForm();
            component.form.patchValue({ comment: '' });
            confirmDialogSpy.confirm.and.returnValue(Promise.resolve(true));
            contractServiceSpy.updateContract.and.returnValue(of({}));
            spyOn(component, 'startTimer');

            await component.onUpdate();

            expect(component.form.valid).toBeTrue();
            expect(contractServiceSpy.updateContract).toHaveBeenCalled();
        });

        it('sends only the editable fields plus the accessory list', async () => {
            fillValidForm();
            component.arrayAccessory.push(component['formBuilder'].group({ id: 'a1', amount: 2, price: 10 }));
            confirmDialogSpy.confirm.and.returnValue(Promise.resolve(true));
            contractServiceSpy.updateContract.and.returnValue(of({}));
            spyOn(component, 'startTimer');

            await component.onUpdate();

            expect(contractServiceSpy.updateContract).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    _id: 'ct1',
                    installDate: '2024-05-01',
                    pickupDate: '2024-05-03',
                }),
                jasmine.anything()
            );
            expect(component.isDisabled).toBeTrue();
            expect(component.startTimer).toHaveBeenCalled();
        });

        it('sends an increased amount for an existing accessory plus a newly added one', async () => {
            fillValidForm();
            // Ya tenía 1 unidad de a1 asignada; se sube a 5 y se agrega a2 nuevo.
            component.arrayAccessory.push(component['formBuilder'].group({ id: 'a1', amount: 5, price: 10 }));
            component.arrayAccessory.push(component['formBuilder'].group({ id: 'a2', amount: 2, price: 20 }));
            confirmDialogSpy.confirm.and.returnValue(Promise.resolve(true));
            contractServiceSpy.updateContract.and.returnValue(of({}));
            spyOn(component, 'startTimer');

            await component.onUpdate();

            const payload = contractServiceSpy.updateContract.calls.mostRecent().args[0];
            expect(payload.listAccessories).toEqual([
                jasmine.objectContaining({ id: 'a1', amount: 5 }),
                jasmine.objectContaining({ id: 'a2', amount: 2 }),
            ]);
        });

        it('alerts the user when the backend reports insufficient stock (424)', async () => {
            fillValidForm();
            confirmDialogSpy.confirm.and.returnValue(Promise.resolve(true));
            contractServiceSpy.updateContract.and.returnValue(throwError(() => ({ status: 424 })));

            await component.onUpdate();

            expect(component.isSaving).toBeFalse();
            expect(confirmDialogSpy.alert).toHaveBeenCalled();
        });
    });

    // ==========================
    // Carga de contrato para edición
    // ==========================
    describe('findAccesoryById / cargarContratoDesdeObjeto', () => {
        it('does nothing when the contract id is not found in the current list', () => {
            component.contract = [makeContract({ _id: 'other' })];

            component.findAccesoryById('missing-id');

            expect(component.condicion).toBeFalse();
            expect(component._idContrat).toBe('');
        });

        it('fills the form and accessory/payment arrays from the matching contract', () => {
            const contract = makeContract();
            component.contract = [contract];

            component.findAccesoryById('ct1');

            expect(component._idContrat).toBe('ct1');
            expect(component.form.get('address')?.value).toBe('Calle Falsa 123');
            expect(component.customerName).toBe('Juan');
            expect(component.arrayAccessory.length).toBe(1);
            expect(component.originalAccessoryAmounts.get('a1')).toBe(2);
            expect(component.condicion).toBeTrue();
            expect(component.mostrarBotones).toBeFalse();
            expect(component.A_cuenta_2).toBe(component.totalBalance);
        });
    });

    // ==========================
    // Pagos a cuenta
    // ==========================
    describe('addAcount', () => {
        it('marks the contract as Pagado when the balance reaches zero', () => {
            component._idContrat = 'ct1';
            component.A_cuenta_2 = 100;
            component.A_cuenta_1 = 100;
            contractServiceSpy.updateContract.and.returnValue(of({}));
            spyOn(component, 'onSubmitExit');

            component.addAcount();

            expect(component.selectStatus).toBe('Pagado');
            const payload = contractServiceSpy.updateContract.calls.mostRecent().args[0];
            expect(payload.status).toBe('Pagado');
            expect(payload._id).toBe('ct1');
            expect(component.onSubmitExit).toHaveBeenCalled();
        });

        it('redirects to login on a 401 error', () => {
            component._idContrat = 'ct1';
            contractServiceSpy.updateContract.and.returnValue(throwError(() => ({ status: 401 })));

            component.addAcount();

            expect(routerSpy.navigate).toHaveBeenCalledWith(['/app-login']);
        });
    });

    describe('deleteContract', () => {
        it('marks the contract as Anulado and reloads on success', () => {
            component.idItemDelete = 'ct1';
            contractServiceSpy.updateContract.and.returnValue(of({}));
            spyOn(component, 'ngOnInit');

            component.deleteContract();

            const payload = contractServiceSpy.updateContract.calls.mostRecent().args[0];
            expect(payload).toEqual({ _id: 'ct1', onAccount: [], status: 'Anulado' });
            expect(component.ngOnInit).toHaveBeenCalled();
        });

        it('redirects to login on a 401 error', () => {
            component.idItemDelete = 'ct1';
            contractServiceSpy.updateContract.and.returnValue(throwError(() => ({ status: 401 })));

            component.deleteContract();

            expect(routerSpy.navigate).toHaveBeenCalledWith(['/app-login']);
        });
    });

    describe('onOptionChange', () => {
        it('does not call the backend when the new status is Anulado', () => {
            component.onOptionChange('ct1', 'Anulado');
            expect(contractServiceSpy.updateContract).not.toHaveBeenCalled();
        });

        it('updates the status and refreshes the filtered list otherwise', () => {
            contractServiceSpy.updateContract.and.returnValue(of({}));
            contractServiceSpy.getContractsByYearAndStatus.and.returnValue(of([]));

            component.onOptionChange('ct1', 'Pagado');

            expect(contractServiceSpy.updateContract).toHaveBeenCalledWith(
                { _id: 'ct1', status: 'Pagado', onAccount: [] },
                jasmine.anything()
            );
            expect(contractServiceSpy.getContractsByYearAndStatus).toHaveBeenCalled();
        });
    });

    // ==========================
    // Listado / búsqueda
    // ==========================
    describe('loadRecentContracts', () => {
        it('sorts contracts by numeric code (descending) and updates the title', () => {
            contractServiceSpy.getRecentContracts.and.returnValue(
                of([
                    makeContract({ _id: 'c1', codContract: '2024-0000000001' }),
                    makeContract({ _id: 'c3', codContract: '2024-0000000003' }),
                    makeContract({ _id: 'c2', codContract: '2024-0000000002' }),
                ])
            );

            component.loadRecentContracts();

            expect(component.contract.map((c) => c._id)).toEqual(['c3', 'c2', 'c1']);
            expect(component.listTitle).toContain('[3]');
        });

        it('filters out contracts without a valid codContract', () => {
            contractServiceSpy.getRecentContracts.and.returnValue(
                of([makeContract({ codContract: '' }), makeContract({ _id: 'ok' })])
            );

            component.loadRecentContracts();

            expect(component.contract.length).toBe(1);
            expect(component.contract[0]._id).toBe('ok');
        });

        it('redirects to login on a 401 error', () => {
            contractServiceSpy.getRecentContracts.and.returnValue(throwError(() => ({ status: 401 })));

            component.loadRecentContracts();

            expect(routerSpy.navigate).toHaveBeenCalledWith(['/app-login']);
        });
    });

    describe('onGlobalSearch / clearGlobalSearch', () => {
        it('reloads recent contracts when the search term is blank', () => {
            component.searchValue = '   ';
            contractServiceSpy.getRecentContracts.calls.reset();

            component.onGlobalSearch();

            expect(contractServiceSpy.getRecentContracts).toHaveBeenCalled();
            expect(contractServiceSpy.searchContracts).not.toHaveBeenCalled();
        });

        it('searches with the trimmed term otherwise', () => {
            component.searchValue = '  Juan  ';
            contractServiceSpy.searchContracts.and.returnValue(of([]));

            component.onGlobalSearch();

            expect(contractServiceSpy.searchContracts).toHaveBeenCalledWith('Juan', jasmine.anything());
        });

        it('clears the search value and reloads recent contracts', () => {
            component.searchValue = 'Juan';
            contractServiceSpy.getRecentContracts.calls.reset();

            component.clearGlobalSearch();

            expect(component.searchValue).toBe('');
            expect(contractServiceSpy.getRecentContracts).toHaveBeenCalled();
        });
    });

    // ==========================
    // ngOnInit
    // ==========================
    describe('ngOnInit', () => {
        it('opens the contract from the "open" query param when present', () => {
            activatedRouteStub.snapshot.queryParamMap.get.and.returnValue('ct1');
            const response = makeContract();
            contractServiceSpy.listContractById = jasmine
                .createSpy('listContractById')
                .and.returnValue(of(response)) as any;
            spyOn<any>(component, 'cargarContratoDesdeObjeto');

            component.ngOnInit();

            expect(contractServiceSpy.listContractById).toHaveBeenCalledWith('ct1', jasmine.anything());
            expect((component as any).cargarContratoDesdeObjeto).toHaveBeenCalledWith(response);
        });

        it('falls back to recent contracts if loading the "open" contract fails', () => {
            activatedRouteStub.snapshot.queryParamMap.get.and.returnValue('ct1');
            contractServiceSpy.listContractById = jasmine
                .createSpy('listContractById')
                .and.returnValue(throwError(() => new Error('not found'))) as any;
            spyOn(component, 'loadRecentContracts');

            component.ngOnInit();

            expect(component.loadRecentContracts).toHaveBeenCalled();
        });

        it('loads the initialContract input when there is no "open" query param', () => {
            const initial = makeContract();
            component.initialContract = initial as any;
            spyOn<any>(component, 'cargarContratoDesdeObjeto');

            component.ngOnInit();

            expect((component as any).cargarContratoDesdeObjeto).toHaveBeenCalledWith(initial);
        });

        it('loads recent contracts by default', () => {
            spyOn(component, 'loadRecentContracts');

            component.ngOnInit();

            expect(component.loadRecentContracts).toHaveBeenCalled();
        });
    });
});
