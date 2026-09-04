import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { RallyDataService } from '../../core/data/rally-data.service';
import { TranslationService } from '../../core/i18n/translation.service';
import { Player } from '../../core/models';
import { CourtsService } from '../courts/courts.service';
import { MatchesService } from '../matches/matches.service';

export const PASSPORT_TABS = ['passport.tabCountries', 'passport.tabCourts', 'passport.tabPlayers'] as const;

export interface PlayerMetSummary {
  player: Player;
  timesPlayed: number;
  /** Locale-formatted month/year, e.g. "set. de 2026" — same convention as a country's firstPlayed. */
  lastPlayedAt: string;
}

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
  private readonly translation = inject(TranslationService);

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
   * Everyone you have actually shared a court with, plus how often and when you last did — only
   * completed matches count: you meet someone by playing, not by being invited. Live, since
   * MatchesService keeps its lists fresh over Realtime. Sorted most-recently-played first.
   */
  readonly playersMet = computed<PlayerMetSummary[]>(() => {
    const uid = this.auth.currentUserId();
    if (!uid) {
      return [];
    }
    const seen = new Map<string, { count: number; lastDate: string }>();
    for (const match of this.matches.completed()) {
      const ids = new Set(
        [match.playerA, match.playerB, ...(match.participantIds ?? [])].filter(
          (id): id is string => !!id && id !== uid
        )
      );
      for (const id of ids) {
        const entry = seen.get(id);
        seen.set(id, {
          count: (entry?.count ?? 0) + 1,
          lastDate: !entry || match.matchDate > entry.lastDate ? match.matchDate : entry.lastDate
        });
      }
    }
    return [...seen.entries()]
      .map(([id, entry]) => ({ ...entry, player: this.matches.playerById(id) }))
      .filter((entry): entry is { count: number; lastDate: string; player: Player } => !!entry.player)
      .sort((a, b) => b.lastDate.localeCompare(a.lastDate))
      .map(({ player, count, lastDate }) => ({ player, timesPlayed: count, lastPlayedAt: this.formatMonth(lastDate) }));
  });

  selectTab(tab: string): void {
    this.activeTab.set(tab);
  }

  // Mirrors CourtsService's own formatMonth() — same "short month, numeric year" convention as a
  // country's firstPlayed, so date copy reads the same everywhere in the passport.
  private formatMonth(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(this.translation.locale(), { month: 'short', year: 'numeric' });
  }
}
