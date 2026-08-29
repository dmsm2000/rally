import { Injectable, computed, inject } from '@angular/core';
import { RallyDataService } from '../../core/data/rally-data.service';

/** Aggregates cross-domain slices needed by the home dashboard. */
@Injectable({ providedIn: 'root' })
export class HomeService {
  private readonly data = inject(RallyDataService);

  readonly me = this.data.me;
  readonly heroImage = this.data.heroImage;

  readonly nearbyPlayers = computed(() => this.data.players().filter((p) => p.distanceKm < 300));
  readonly abroadPlayers = computed(() => this.data.players().filter((p) => p.distanceKm >= 300));
  readonly upcomingMatches = computed(() => this.data.matches().filter((m) => m.status === 'upcoming'));
  readonly nearbyCourts = computed(() => this.data.courts().slice(0, 4));
  readonly featuredTournaments = computed(() => this.data.tournaments().slice(0, 2));
  readonly topDestinations = computed(() => this.data.destinations().slice(0, 3));
  readonly recentFeed = computed(() => this.data.feed().slice(0, 2));
}
