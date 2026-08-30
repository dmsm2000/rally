import { Injectable, computed, inject, signal } from '@angular/core';
import { RallyDataService } from '../../core/data/rally-data.service';
import { FeedRepository } from './data/feed.repository';

const TAB_EVERYONE = 'feed.tabEveryone';
const TAB_FOLLOWING = 'feed.tabFollowing';
const TAB_YOUR_CITY = 'feed.tabYourCity';
const TAB_AROUND_WORLD = 'feed.tabAroundWorld';

export const FEED_TABS = [TAB_EVERYONE, TAB_FOLLOWING, TAB_YOUR_CITY, TAB_AROUND_WORLD] as const;

@Injectable({ providedIn: 'root' })
export class FeedService {
  private readonly data = inject(RallyDataService);
  private readonly repository = inject(FeedRepository);

  readonly me = this.data.me;
  readonly heroImage = this.data.heroImage;

  readonly tabs = FEED_TABS;
  readonly activeTab = signal<string>(FEED_TABS[0]);

  // "Following" isn't a manual follow — you're connected to anyone you've actually played a match with.
  private readonly followingIds = computed(() => new Set(this.data.playersMetBy(this.me().id)));

  readonly items = computed(() => {
    const all = this.repository.getAll();
    const me = this.me();
    switch (this.activeTab()) {
      case TAB_FOLLOWING: {
        const following = this.followingIds();
        return all.filter(f => f.playerId === me.id || following.has(f.playerId));
      }
      case TAB_YOUR_CITY:
        return all.filter(f => this.data.playerById(f.playerId)?.city === me.city);
      case TAB_AROUND_WORLD:
        return all.filter(f => this.data.playerById(f.playerId)?.city !== me.city);
      default:
        return all;
    }
  });

  readonly composerText = signal('');
  readonly composerMediaUrl = signal<string | null>(null);
  readonly composerMediaType = signal<'image' | 'video' | null>(null);
  readonly canPublish = computed(() => this.composerText().trim().length > 0 || this.composerMediaUrl() !== null);

  selectTab(tab: string): void {
    this.activeTab.set(tab);
  }

  // Reads the picked file locally (no upload backend yet) and previews it as a data URL.
  attachMedia(file: File): void {
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    const reader = new FileReader();
    reader.onload = () => {
      this.composerMediaUrl.set(reader.result as string);
      this.composerMediaType.set(type);
    };
    reader.readAsDataURL(file);
  }

  clearMedia(): void {
    this.composerMediaUrl.set(null);
    this.composerMediaType.set(null);
  }

  publishPost(): void {
    if (!this.canPublish()) {
      return;
    }
    this.repository.createPost({
      text: this.composerText().trim(),
      image: this.composerMediaType() === 'image' ? (this.composerMediaUrl() ?? undefined) : undefined,
      video: this.composerMediaType() === 'video' ? (this.composerMediaUrl() ?? undefined) : undefined
    });
    this.composerText.set('');
    this.clearMedia();
  }
}
