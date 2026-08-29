import { Injectable, computed, inject, signal } from '@angular/core';
import { RallyDataService } from '../data/rally-data.service';
import { Player } from '../models';

/**
 * Stand-in for Supabase Auth. Exposes the same shape a real session-based
 * service would (currentPlayer/isAuthenticated) so screens never talk to Supabase directly.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly data = inject(RallyDataService);
  private readonly _isAuthenticated = signal(true);

  readonly isAuthenticated = this._isAuthenticated.asReadonly();

  readonly currentPlayer = computed<Player>(() => this.data.me());
}
