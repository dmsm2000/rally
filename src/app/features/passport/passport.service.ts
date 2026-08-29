import { Injectable, computed, inject } from '@angular/core';
import { RallyDataService } from '../../core/data/rally-data.service';

@Injectable({ providedIn: 'root' })
export class PassportService {
  private readonly data = inject(RallyDataService);

  readonly countries = this.data.countries;
  readonly visitedCountries = computed(() => this.countries().filter((c) => c.visited));
  readonly lockedCountries = computed(() => this.countries().filter((c) => !c.visited));
  readonly visitedCourts = computed(() => this.data.courts().filter((c) => c.visited));
}
