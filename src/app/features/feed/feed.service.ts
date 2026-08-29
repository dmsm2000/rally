import { Injectable, computed, inject, signal } from '@angular/core';
import { RallyDataService } from '../../core/data/rally-data.service';
import { FeedRepository } from './data/feed.repository';

export const FEED_TABS = ['feed.tabEveryone', 'feed.tabFollowing', 'feed.tabYourCity', 'feed.tabAroundWorld'] as const;

@Injectable({ providedIn: 'root' })
export class FeedService {
  private readonly data = inject(RallyDataService);
  private readonly repository = inject(FeedRepository);

  readonly me = this.data.me;
  readonly heroImage = this.data.heroImage;

  readonly tabs = FEED_TABS;
  readonly activeTab = signal<string>(FEED_TABS[0]);

  readonly items = computed(() => this.repository.getAll());
  readonly suggestedPlayers = computed(() => this.repository.suggestedPlayers());

  selectTab(tab: string): void {
    this.activeTab.set(tab);
  }
}
