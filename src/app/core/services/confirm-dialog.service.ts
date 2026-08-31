import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  title?: string;
  /** Styles the confirm button red instead of the default lime — for irreversible/destructive actions. */
  tone?: 'default' | 'destructive';
}

interface ActiveConfirm extends ConfirmRequest {
  resolve: (confirmed: boolean) => void;
}

/** Imperative "are you sure?" dialog — mounted once via `ui-confirm-dialog` in app.html. */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly _active = signal<ActiveConfirm | null>(null);

  readonly active = this._active.asReadonly();

  confirm(request: ConfirmRequest): Promise<boolean> {
    return new Promise(resolve => {
      this._active.set({ ...request, resolve });
    });
  }

  respond(confirmed: boolean): void {
    this._active()?.resolve(confirmed);
    this._active.set(null);
  }
}
