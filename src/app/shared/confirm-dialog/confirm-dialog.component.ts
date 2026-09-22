import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  @Input() title = 'Confirmar';
  @Input() message = '¿Está seguro?';
  @Input() confirmText = 'Sí';
  @Input() cancelText = 'No';
  // false para los avisos de solo-lectura (ConfirmDialogService.alert):
  // un solo botón para cerrar, sin opción de "No".
  @Input() showCancel = true;

  constructor(public activeModal: NgbActiveModal) {}
}
