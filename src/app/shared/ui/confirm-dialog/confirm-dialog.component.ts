import { Component, inject } from '@angular/core';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

/** Renders whatever ConfirmDialogService.active() currently holds — one instance for the whole app. */
@Component({
  selector: 'ui-confirm-dialog',
  templateUrl: './confirm-dialog.component.html'
})
export class ConfirmDialogComponent {
  protected readonly dialog = inject(ConfirmDialogService);
}
