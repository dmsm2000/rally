import { Injectable, computed, inject, signal } from '@angular/core';
import { RallyDataService } from '../../core/data/rally-data.service';
import { Player } from '../../core/models';
import { CourtsService } from '../courts/courts.service';

export const PASSPORT_TABS = [
  'passport.tabOverview',
  'passport.tabCountries',
  'passport.tabCourts',
  'passport.tabPlayers',
  'passport.tabAchievements'
] as const;

@Injectable({ providedIn: 'root' })
export class PassportService {
  private readonly data = inject(RallyDataService);
  private readonly courts = inject(CourtsService);

  readonly tabs = PASSPORT_TABS;
  readonly activeTab = signal<string>(PASSPORT_TABS[0]);
  readonly loadingCourts = this.courts.loadingCaptures;

  readonly me = this.data.me;
  readonly countries = this.data.countries;
  // Real, and unfakeable: a country is stamped once you've captured a court in it, and a court is
  // captured when a check-in row exists in a corroborated venue — see my_captured_courts() in
  // 0024_venues_and_courts.sql. Both come from CourtsService so every count in the app agrees.
  readonly visitedCourts = this.courts.myCaptures;
  readonly visitedCountries = this.courts.myCountries;
  // The "still to play" list stays an aspirational mock roster, minus whatever is genuinely stamped.
  readonly lockedCountries = computed(() => {
    const visited = new Set(this.visitedCountries().map(c => c.name));
    return this.countries().filter(c => !visited.has(c.name));
  });

  readonly achievements = this.data.achievements;
  readonly unlockedAchievements = computed(() => this.achievements().filter(a => a.unlocked));
  readonly lockedAchievements = computed(() => this.achievements().filter(a => !a.unlocked));

  // The locked achievement you're closest to unlocking, to give the overview tab a concrete "almost there" nudge.
  readonly nextAchievement = computed(() => {
    const candidates = this.lockedAchievements().filter(
      (a): a is typeof a & { progress: number; goal: number } => a.progress != null && !!a.goal
    );
    if (!candidates.length) {
      return undefined;
    }
    return [...candidates].sort((a, b) => b.progress / b.goal - a.progress / a.goal)[0];
  });

  // Everyone the current user has actually shared a court with, deduplicated across all their matches.
  readonly playersMet = computed<Player[]>(() => {
    const meId = this.data.me().id;
    return this.data
      .playersMetBy(meId)
      .map(id => this.data.playerById(id))
      .filter((p): p is Player => !!p);
  });

  selectTab(tab: string): void {
    this.activeTab.set(tab);
  }
}
