import { Injectable, computed, inject } from '@angular/core';
import { RallyDataService } from '../../core/data/rally-data.service';
import { Player } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class PassportService {
  private readonly data = inject(RallyDataService);

  readonly countries = this.data.countries;
  readonly visitedCountries = computed(() => this.countries().filter((c) => c.visited));
  readonly lockedCountries = computed(() => this.countries().filter((c) => !c.visited));
  readonly visitedCourts = computed(() => this.data.courts().filter((c) => c.visited));

  readonly achievements = this.data.achievements;
  readonly unlockedAchievements = computed(() => this.achievements().filter((a) => a.unlocked));
  readonly lockedAchievements = computed(() => this.achievements().filter((a) => !a.unlocked));

  // Everyone the current user has actually shared a court with, deduplicated across all their matches.
  readonly playersMet = computed<Player[]>(() => {
    const meId = this.data.me().id;
    const ids = new Set<string>();
    for (const m of this.data.matches()) {
      if (m.playerA === meId && m.playerB) {
        ids.add(m.playerB);
      } else if (m.playerB === meId) {
        ids.add(m.playerA);
      }
    }
    return [...ids].map((id) => this.data.playerById(id)).filter((p): p is Player => !!p);
  });
}
