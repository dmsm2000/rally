import { Injectable, inject } from '@angular/core';
import { RallyDataService } from '../../core/data/rally-data.service';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileRepositoryService } from '../../core/data/profile-repository.service';
import { Player } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly data = inject(RallyDataService);
  private readonly auth = inject(AuthService);
  private readonly profiles = inject(ProfileRepositoryService);

  readonly me = this.auth.currentPlayer;

  /** Persists to the real profiles table first (if there's a real account), then updates the UI — so the
   *  displayed Player never shows a change that failed to save. */
  async updateMe(partial: Partial<Player>): Promise<{ success: boolean; error?: string }> {
    const userId = this.auth.currentUserId();
    if (userId) {
      const result = await this.profiles.update(userId, partial);
      if (!result.success) {
        return result;
      }
    }
    this.data.updateMe(partial);
    return { success: true };
  }
}
