import { Injectable, signal } from '@angular/core';

export type ToastKind = 'error' | 'success' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  durationMs: number;
}

const DEFAULT_DURATION_MS = 5000;

/** App-wide toast notifications (e.g. auth errors) — mounted once via `ui-toast-container` in app.html. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  private nextId = 0;

  readonly toasts = this._toasts.asReadonly();

  show(message: string, kind: ToastKind = 'info', durationMs = DEFAULT_DURATION_MS): void {
    const id = ++this.nextId;
    this._toasts.update(list => [...list, { id, kind, message, durationMs }]);
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  dismiss(id: number): void {
    this._toasts.update(list => list.filter(t => t.id !== id));
  }
}
