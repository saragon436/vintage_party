import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
    let component: ConfirmDialogComponent;
    let fixture: ComponentFixture<ConfirmDialogComponent>;
    let activeModalSpy: jasmine.SpyObj<NgbActiveModal>;

    beforeEach(async () => {
        activeModalSpy = jasmine.createSpyObj('NgbActiveModal', ['close', 'dismiss']);

        await TestBed.configureTestingModule({
            declarations: [ConfirmDialogComponent],
            providers: [{ provide: NgbActiveModal, useValue: activeModalSpy }],
        }).compileComponents();

        fixture = TestBed.createComponent(ConfirmDialogComponent);
        component = fixture.componentInstance;
    });

    it('defaults to showing both the confirm and cancel buttons', () => {
        fixture.detectChanges();

        const buttons = fixture.nativeElement.querySelectorAll('.modal-footer button');
        expect(buttons.length).toBe(2);
    });

    it('hides the cancel button in alert mode (showCancel = false)', () => {
        component.showCancel = false;
        fixture.detectChanges();

        const buttons = fixture.nativeElement.querySelectorAll('.modal-footer button');
        expect(buttons.length).toBe(1);
        expect(buttons[0].textContent.trim()).toBe(component.confirmText);
    });

    it('closes with true when the confirm button is clicked', () => {
        fixture.detectChanges();

        const confirmButton = fixture.nativeElement.querySelector('.btn-outline-success');
        confirmButton.click();

        expect(activeModalSpy.close).toHaveBeenCalledWith(true);
    });

    it('dismisses when the cancel button is clicked', () => {
        fixture.detectChanges();

        const cancelButton = fixture.nativeElement.querySelector('.btn-outline-dark');
        cancelButton.click();

        expect(activeModalSpy.dismiss).toHaveBeenCalled();
    });
});
