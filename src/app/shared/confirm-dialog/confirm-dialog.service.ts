import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmDialogComponent } from './confirm-dialog.component';

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  constructor(private modalService: NgbModal) {}

  confirm(
    message: string,
    title = 'Confirmar',
    confirmText = 'Sí',
    cancelText = 'No'
  ): Promise<boolean> {
    const modalRef = this.modalService.open(ConfirmDialogComponent, { centered: true });
    modalRef.componentInstance.title = title;
    modalRef.componentInstance.message = message;
    modalRef.componentInstance.confirmText = confirmText;
    modalRef.componentInstance.cancelText = cancelText;

    return modalRef.result.then(
      (result) => result === true,
      () => false
    );
  }

  // Aviso de solo-lectura (un botón), para reemplazar los alert() nativos
  // del navegador y mantener el mismo modal en toda la app.
  alert(message: string, title = 'Aviso', buttonText = 'Aceptar'): Promise<void> {
    const modalRef = this.modalService.open(ConfirmDialogComponent, { centered: true });
    modalRef.componentInstance.title = title;
    modalRef.componentInstance.message = message;
    modalRef.componentInstance.confirmText = buttonText;
    modalRef.componentInstance.showCancel = false;

    return modalRef.result.then(
      () => undefined,
      () => undefined
    );
  }
}
