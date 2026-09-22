import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmDialogService } from './confirm-dialog.service';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogService', () => {
    let service: ConfirmDialogService;
    let modalServiceSpy: jasmine.SpyObj<NgbModal>;
    let componentInstance: any;
    let modalRef: any;

    beforeEach(() => {
        componentInstance = {};
        modalServiceSpy = jasmine.createSpyObj('NgbModal', ['open']);

        service = new ConfirmDialogService(modalServiceSpy);
    });

    const stubModalResult = (resultPromise: Promise<any>) => {
        modalRef = { componentInstance, result: resultPromise };
        modalServiceSpy.open.and.returnValue(modalRef);
    };

    describe('confirm', () => {
        it('opens the shared dialog with the given text and resolves true when confirmed', async () => {
            stubModalResult(Promise.resolve(true));

            const result = service.confirm('¿Seguro?', 'Título', 'Sí, dale', 'Cancelar');

            expect(modalServiceSpy.open).toHaveBeenCalledWith(ConfirmDialogComponent, { centered: true });
            expect(componentInstance.title).toBe('Título');
            expect(componentInstance.message).toBe('¿Seguro?');
            expect(componentInstance.confirmText).toBe('Sí, dale');
            expect(componentInstance.cancelText).toBe('Cancelar');
            await expectAsync(result).toBeResolvedTo(true);
        });

        it('resolves false when the modal is dismissed (cancel/backdrop/escape)', async () => {
            stubModalResult(Promise.reject('dismissed'));

            const result = service.confirm('¿Seguro?');

            await expectAsync(result).toBeResolvedTo(false);
        });

        it('resolves false when the modal closes with a falsy value', async () => {
            stubModalResult(Promise.resolve(false));

            const result = service.confirm('¿Seguro?');

            await expectAsync(result).toBeResolvedTo(false);
        });

        it('uses sensible defaults for title/confirmText/cancelText', async () => {
            stubModalResult(Promise.resolve(true));

            service.confirm('mensaje');

            expect(componentInstance.title).toBe('Confirmar');
            expect(componentInstance.confirmText).toBe('Sí');
            expect(componentInstance.cancelText).toBe('No');
        });
    });

    describe('alert', () => {
        it('opens the shared dialog with a single button (no cancel option)', async () => {
            stubModalResult(Promise.resolve(true));

            const result = service.alert('Ojo con esto', 'Cuidado', 'Entendido');

            expect(modalServiceSpy.open).toHaveBeenCalledWith(ConfirmDialogComponent, { centered: true });
            expect(componentInstance.title).toBe('Cuidado');
            expect(componentInstance.message).toBe('Ojo con esto');
            expect(componentInstance.confirmText).toBe('Entendido');
            expect(componentInstance.showCancel).toBeFalse();
            await expectAsync(result).toBeResolved();
        });

        it('resolves even if the modal is dismissed instead of closed', async () => {
            stubModalResult(Promise.reject('dismissed'));

            const result = service.alert('mensaje');

            await expectAsync(result).toBeResolved();
        });

        it('uses sensible defaults for title/confirmText', async () => {
            stubModalResult(Promise.resolve(true));

            service.alert('mensaje');

            expect(componentInstance.title).toBe('Aviso');
            expect(componentInstance.confirmText).toBe('Aceptar');
        });
    });
});
