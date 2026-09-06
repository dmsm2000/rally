import { Injectable, signal } from '@angular/core';

/**
 * The topbar's real on-screen height in px — its h-16 content plus whatever
 * `env(safe-area-inset-top)` adds on top of it. `TopbarComponent` is the only place that can
 * measure this (it owns the element); anything that needs to sit flush below the topbar, or cap
 * how far it can translate off-screen on scroll, reads it from here instead of guessing a constant.
 */
@Injectable({ providedIn: 'root' })
export class TopbarMetricsService {
  private readonly _heightPx = signal(64);
  readonly heightPx = this._heightPx.asReadonly();

  setHeightPx(px: number): void {
    if (px > 0) {
      this._heightPx.set(px);
    }
  }
}
