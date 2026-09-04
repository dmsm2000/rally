import { DatePipe } from '@angular/common';
import { Component, OnDestroy, computed, inject, input, output, signal } from '@angular/core';
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

// A tap within this window of the previous one counts as a double-tap, Instagram-style. The first
// tap is held back for exactly this long before it falls through to the single-tap action, so a
// following second tap can still cancel it.
const DOUBLE_TAP_WINDOW_MS = 300;
// Matches the `animate-tennis-pop` keyframe duration (styles.css) — the burst overlay is removed
// the instant the pop finishes rather than lingering in its 'both' fill-mode end state.
const LIKE_BURST_MS = 450;

@Component({
  selector: 'rally-feed-card',
  imports: [AvatarComponent, ChipComponent, IconComponent, RouterLink, TranslatePipe, DatePipe],
  templateUrl: './feed-card.component.html',
  styleUrl: './feed-card.component.scss',
})
export class FeedCardComponent implements OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly lightbox = inject(MediaLightboxService);
  private readonly countryData = inject(CountryDataService);

  private tapTimer: ReturnType<typeof setTimeout> | null = null;
  private burstTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTapAt = 0;

  protected readonly likeBurst = signal(false);
  protected readonly likeButtonPop = signal(false);

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

  // Match/trip/venue posts are system-generated announcements, not authored content — no reaction
  // feature on them at all, for anyone (see canLike below).
  protected readonly isAutomaticPost = computed(() => !!(this.post().match || this.post().trip || this.post().venue));

  // Same eligibility the like button already gated on inline — pulled out so the media
  // double-tap gesture can check it too without duplicating the conditions.
  protected readonly canLike = computed(() => !this.auth.isObserver() && !this.isOwnPost() && !this.isAutomaticPost());

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

  ngOnDestroy(): void {
    if (this.tapTimer) {
      clearTimeout(this.tapTimer);
    }
    if (this.burstTimer) {
      clearTimeout(this.burstTimer);
    }
  }

  protected openMedia(): void {
    const post = this.post();
    if (post.mediaUrl && post.mediaType) {
      this.lightbox.open({ url: post.mediaUrl, type: post.mediaType });
    }
  }

  // Distinguishes a single tap (open the lightbox) from a double tap (like), the way every
  // photo-feed app does it: the first tap is held back for DOUBLE_TAP_WINDOW_MS in case a second
  // one lands and cancels it. Skipped entirely when liking isn't possible (observer/own post) so
  // a single tap there still opens the lightbox immediately, with no artificial delay.
  protected onMediaTap(): void {
    if (!this.canLike()) {
      this.openMedia();
      return;
    }
    const now = Date.now();
    const sinceLastTap = now - this.lastTapAt;
    this.lastTapAt = now;
    if (this.tapTimer && sinceLastTap < DOUBLE_TAP_WINDOW_MS) {
      clearTimeout(this.tapTimer);
      this.tapTimer = null;
      this.lastTapAt = 0;
      this.likeFromDoubleTap();
      return;
    }
    this.tapTimer = setTimeout(() => {
      this.tapTimer = null;
      this.openMedia();
    }, DOUBLE_TAP_WINDOW_MS);
  }

  private likeFromDoubleTap(): void {
    // Mirrors Instagram: a double tap always shows the burst, but only ever adds a like — it
    // never unlikes an already-liked post.
    if (!this.post().likedByMe) {
      this.liked.emit();
    }
    this.playLikeBurst();
  }

  protected onLikeButtonClick(): void {
    const alreadyLiked = this.post().likedByMe;
    this.liked.emit();
    if (!alreadyLiked) {
      this.likeButtonPop.set(false);
      requestAnimationFrame(() => this.likeButtonPop.set(true));
    }
  }

  private playLikeBurst(): void {
    if (this.burstTimer) {
      clearTimeout(this.burstTimer);
    }
    this.likeBurst.set(false);
    requestAnimationFrame(() => this.likeBurst.set(true));
    this.burstTimer = setTimeout(() => this.likeBurst.set(false), LIKE_BURST_MS);
  }
}
