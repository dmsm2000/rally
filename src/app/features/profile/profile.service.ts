import { Injectable, computed, inject } from '@angular/core';
import { RallyDataService } from '../../core/data/rally-data.service';
import { AuthService } from '../../core/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly data = inject(RallyDataService);
  private readonly auth = inject(AuthService);

  readonly me = this.auth.currentPlayer;
  readonly matches = this.data.matches;
  readonly achievements = computed(() => this.data.achievements().slice(0, 4));
  readonly visitedCountries = computed(() => this.data.countries().filter((c) => c.visited));
  readonly visitedCourts = computed(() => this.data.courts().filter((c) => c.visited));
}
