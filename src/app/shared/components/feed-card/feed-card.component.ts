import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CountryDataService } from '../../../core/data/country-data.service';
import { Player, Post } from '../../../core/models';
import { MediaLightboxService } from '../../../core/services/media-lightbox.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AvatarComponent, ChipComponent, IconComponent } from '../../ui';

// Mirrors MatchesService.DOUBLES_CAPACITY — kept local since this component doesn't otherwise
// depend on the matches feature (the parent resolves participant Players via the `participants` input).
const DOUBLES_CAPACITY = 4;

@Component({
  selector: 'rally-feed-card',
  imports: [AvatarComponent, ChipComponent, IconComponent, RouterLink, TranslatePipe, DatePipe],
  templateUrl: './feed-card.component.html',
  styleUrl: './feed-card.component.scss',
})
export class FeedCardComponent {
  protected readonly auth = inject(AuthService);
  private readonly lightbox = inject(MediaLightboxService);
  private readonly countryData = inject(CountryDataService);

  readonly post = input.required<Post>();
  readonly player = input<Player | undefined>();
  /** Doubles roster Players, resolved by the parent — see FeedService.doublesParticipantsFor(). */
  readonly participants = input<(Player | undefined)[]>([]);
  readonly canDelete = input(false);
  readonly deleting = input(false);
  readonly volunteering = input(false);
  readonly joining = input(false);
  readonly leaving = input(false);

  readonly liked = output<void>();
  readonly deleted = output<void>();
  readonly volunteered = output<void>();
  readonly joined = output<void>();
  readonly left = output<void>();

  // Own posts route to the own-profile page (there's no /players/:id entry for yourself). Compares
  // against post().authorId, not player()?.id — the mock-bridged "me" player keeps a permanent fake
  // id that never matches the real signed-in uid (see RallyDataService high-value gotcha).
  protected readonly profileLink = computed(() =>
    this.post().authorId === this.auth.currentUserId() ? '/profile' : `/players/${this.post().authorId}`
  );

  // Deliberately independent of canDelete() (which the parent forces false for trip posts, since
  // those are only ever deleted by deleting the trip) — this still needs to say "yes, mine" so the
  // like button stays blocked on your own trip announcement the same as on any other own post.
  protected readonly isOwnPost = computed(() => this.post().authorId === this.auth.currentUserId());

  // Only shown to players who could realistically host — same country-level match as the World
  // page's own "host requests for my country" list, not the stricter exact-city match.
  protected readonly canHost = computed(
    () => !this.auth.isObserver() && !this.isOwnPost() && this.auth.currentPlayer().country === this.post().trip?.destinationCountry
  );

  protected readonly tripFlag = computed(
    () => this.countryData.countries().find(c => c.name === this.post().trip?.destinationCountry)?.flag ?? '🌍'
  );

  // Only shown to players who could realistically join — same location-level match as the
  // Matches page's own "open near me" list, not restricted to the exact same city.
  protected readonly canJoin = computed(
    () =>
      !this.auth.isObserver() &&
      !this.isOwnPost() &&
      this.post().match?.status === 'open' &&
      this.post().match?.format !== 'Doubles' &&
      this.auth.currentPlayer().country === this.post().match?.country
  );

  protected readonly hasJoinedDoubles = computed(() => !!this.post().match?.participantIds?.includes(this.auth.currentUserId() ?? ''));

  // A full roster flips the match to 'upcoming' server-side (see join_doubles_match()), so an
  // 'open' doubles post is never full — no separate "roster full" state to gate on here.
  protected readonly canJoinDoubles = computed(
    () =>
      !this.auth.isObserver() &&
      !this.isOwnPost() &&
      this.post().match?.status === 'open' &&
      this.post().match?.format === 'Doubles' &&
      !this.hasJoinedDoubles() &&
      this.auth.currentPlayer().country === this.post().match?.country
  );

  // Excludes the creator (auto-added as a roster slot by createOpenMatch()) — leaving only removes
  // a participant's own roster row, not the whole match, so the creator must withdraw the post
  // itself (cancelMatch, from /matches) rather than "leave" their own announcement.
  protected readonly canLeaveDoubles = computed(
    () =>
      !this.auth.isObserver() &&
      !this.isOwnPost() &&
      this.post().match?.status === 'open' &&
      this.post().match?.format === 'Doubles' &&
      this.hasJoinedDoubles()
  );

  protected readonly doublesEmptySlots = computed(() =>
    Array.from({ length: Math.max(0, DOUBLES_CAPACITY - this.participants().length) }, (_, i) => i)
  );

  constructor() {
    this.countryData.loadCountries();
  }

  protected openMedia(): void {
    const post = this.post();
    if (post.mediaUrl && post.mediaType) {
      this.lightbox.open({ url: post.mediaUrl, type: post.mediaType });
    }
  }
}
