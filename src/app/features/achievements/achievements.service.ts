import { Injectable, computed, inject } from '@angular/core';
import { RallyDataService } from '../../core/data/rally-data.service';

@Injectable({ providedIn: 'root' })
export class AchievementsService {
  private readonly data = inject(RallyDataService);

  readonly all = this.data.achievements;
  readonly unlocked = computed(() => this.all().filter((a) => a.unlocked));
  readonly locked = computed(() => this.all().filter((a) => !a.unlocked));
}
