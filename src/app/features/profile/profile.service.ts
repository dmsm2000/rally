import { Injectable, inject } from '@angular/core';
import { RallyDataService } from '../../core/data/rally-data.service';
import { AuthService } from '../../core/auth/auth.service';
import { Player } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly data = inject(RallyDataService);
  private readonly auth = inject(AuthService);

  readonly me = this.auth.currentPlayer;

  updateMe(partial: Partial<Player>): void {
    this.data.updateMe(partial);
  }
}
