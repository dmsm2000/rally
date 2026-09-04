import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { RallyDataService } from '../../core/data/rally-data.service';
import { Player } from '../../core/models';
import { CourtsService } from '../courts/courts.service';
import { MatchesService } from '../matches/matches.service';

export const PASSPORT_TABS = ['passport.tabCountries', 'passport.tabCourts', 'passport.tabPlayers'] as const;

/**
 * The passport is now entirely real: every number on it traces back to a row someone had to earn.
 * Countries and courts come from `my_captured_courts()` (a check-in in a corroborated venue),
 * players met and matches played from completed `matches`. Nothing here can be faked by editing a
 * profile, which is the whole point of a collection.
 */
@Injectable({ providedIn: 'root' })
export class PassportService {
  private readonly data = inject(RallyDataService);
  private readonly courts = inject(CourtsService);
  private readonly matches = inject(MatchesService);
  private readonly auth = inject(AuthService);

  readonly tabs = PASSPORT_TABS;
  readonly activeTab = signal<string>(PASSPORT_TABS[0]);
  readonly loadingCourts = this.courts.loadingCaptures;
  // Without this the players tab claims "you haven't played anyone yet" for as long as the first
  // match load takes, which is exactly the wrong thing to tell someone who has.
  readonly loadingPlayers = this.matches.loading;

  readonly me = this.data.me;
  // Both come from CourtsService so every count in the app agrees — see my_captured_courts() in
  // 0024_venues_and_courts.sql for why a court in an unconfirmed venue never counts.
  readonly visitedCourts = this.courts.myCaptures;
  readonly visitedCountries = this.courts.myCountries;
  readonly matchesPlayed = computed(() => this.matches.completed().length);

  /**
   * Countries where Rally actually knows about a court you haven't stamped yet — a reachable target
   * rather than an aspirational list, and named from the same `venues.country` values as the stamps,
   * so the two lists can never disagree about what a country is called.
   */
  readonly lockedCountries = computed(() => {
    const visited = new Set(this.visitedCountries().map(c => c.name));
    return this.courts.countryCourtCounts().filter(c => !visited.has(c.name));
  });

  /**
   * Everyone you have actually shared a court with. Only completed matches count: you meet someone
   * by playing, not by being invited. Live, since MatchesService keeps its lists fresh over Realtime.
   */
  readonly playersMet = computed<Player[]>(() => {
    const uid = this.auth.currentUserId();
    if (!uid) {
      return [];
    }
    const ids = new Set<string>();
    for (const match of this.matches.completed()) {
      for (const id of [match.playerA, match.playerB, ...(match.participantIds ?? [])]) {
        if (id && id !== uid) {
          ids.add(id);
        }
      }
    }
    return [...ids].map(id => this.matches.playerById(id)).filter((p): p is Player => !!p);
  });

  selectTab(tab: string): void {
    this.activeTab.set(tab);
  }
}
