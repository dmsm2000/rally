import { DatePipe } from '@angular/common';
import { Component, OnDestroy, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CountryDataService } from '../../../core/data/country-data.service';
import { TranslationService } from '../../../core/i18n/translation.service';
import { POST_REPORT_REASONS, Player, Post, PostReportReason } from '../../../core/models';
import { ShareService } from '../../../core/services/share.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AvatarComponent, ChipComponent, DialogComponent, IconComponent } from '../../ui';

// Mirrors MatchesService.DOUBLES_CAPACITY — kept local since this component doesn't otherwise
// depend on the matches feature (the parent resolves participant Players via the `participants` input).
const DOUBLES_CAPACITY = 4;

// A tap within this window of a previous one counts as a double-tap, Instagram-style, and likes
// the post. Images are deliberately not tappable to expand/zoom for now — a single tap does
// nothing (video has its own native controls instead, so it isn't wrapped in this gesture at all —
// a single tap there has to reach the play button).
const DOUBLE_TAP_WINDOW_MS = 300;
// Matches the `animate-tennis-pop` keyframe duration (styles.css) — the burst overlay is removed
// the instant the pop finishes rather than lingering in its 'both' fill-mode end state.
const LIKE_BURST_MS = 450;

@Component({
  selector: 'rally-feed-card',
  imports: [AvatarComponent, ChipComponent, DialogComponent, IconComponent, RouterLink, TranslatePipe, DatePipe],
  templateUrl: './feed-card.component.html',
  styleUrl: './feed-card.component.scss',
})
export class FeedCardComponent implements OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly countryData = inject(CountryDataService);
  // Injected rather than raised as an output: the share target is derivable from the post alone,
  // and this card has two hosts now (the feed and the public post page) that would otherwise both
  // have to thread the same handler through.
  private readonly shareService = inject(ShareService);
  private readonly translation = inject(TranslationService);
  private readonly toast = inject(ToastService);

  private burstTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTapAt = 0;

  protected readonly likeBurst = signal(false);
  protected readonly likeButtonPop = signal(false);
  // Grabbed client-side from the video's own first frame — user-uploaded posts have no separate
  // thumbnail asset, and without an explicit `poster` mobile browsers commonly show a plain black
  // box until playback starts instead of painting that frame themselves.
  protected readonly videoPoster = signal<string | undefined>(undefined);

  readonly post = input.required<Post>();
  readonly player = input<Player | undefined>();
  /** Doubles roster Players, resolved by the parent — see FeedService.doublesParticipantsFor(). */
  readonly participants = input<(Player | undefined)[]>([]);
  readonly volunteering = input(false);
  readonly joining = input(false);
  readonly leaving = input(false);
  /** The bottom border separates one post from the next in the feed's own scrolling stack — the
   *  public /posts/:id page renders exactly one card with nothing stacked directly under it, where
   *  that same line just reads as a stray rule with nothing to explain it. */
  readonly showDivider = input(true);

  readonly liked = output<void>();
  readonly volunteered = output<void>();
  readonly joined = output<void>();
  readonly left = output<void>();
  /** Filing the report is the host's job — this card sits in shared/ and must not reach into a feature repository. */
  readonly reported = output<PostReportReason>();
  /** Same reasoning as reported — the confirm dialog and the actual delete both belong to the host. */
  readonly deleted = output<void>();

  protected readonly reportReasons = POST_REPORT_REASONS;
  protected readonly menuOpen = signal(false);
  // The menu's other view (reporting). Kept as a flag on the same dialog rather than a separate
  // one, so going back doesn't animate the whole sheet out and in again.
  protected readonly menuReporting = signal(false);

  // Own posts route to the own-profile page (there's no /players/:id entry for yourself). Compares
  // against post().authorId, not player()?.id — the mock-bridged "me" player keeps a permanent fake
  // id that never matches the real signed-in uid (see RallyDataService high-value gotcha).
  protected readonly profileLink = computed(() =>
    this.post().authorId === this.auth.currentUserId() ? '/profile' : `/players/${this.post().authorId}`
  );

  // Gates hosting/joining your own trip or match announcement below.
  protected readonly isOwnPost = computed(() => this.post().authorId === this.auth.currentUserId());

  // Match/trip/venue posts are system-generated announcements, not authored content — no reaction
  // feature on them at all, for anyone (see canLike below).
  protected readonly isAutomaticPost = computed(() => !!(this.post().match || this.post().trip || this.post().venue));

  // Whether the like button is actually clickable right now — the button itself is always shown
  // (see the template), including to observers and on your own post, so this only gates
  // interactivity. Same eligibility the media double-tap gesture checks, pulled out so it doesn't
  // duplicate the condition.
  //
  // Every gate in this component tests a truthy uid rather than !isObserver(), because this card
  // also renders on the public post page, where the viewer is neither signed in *nor* an observer
  // — !isObserver() is true for them, which would have offered actions that RLS then refuses. For
  // a signed-in viewer the two are equivalent, so nothing changes inside the app.
  protected readonly canLike = computed(() => !!this.auth.currentUserId() && !this.isAutomaticPost());

  // Hover always previews the state a click would land on — lime to like, back to neutral to
  // unlike — so an already-liked post reacts to the pointer the same way an unliked one does.
  // cursor-pointer rides along for the same reason: both states are clickable.
  protected readonly likeButtonClass = computed(() => {
    const liked = this.post().likedByMe;
    if (!this.canLike()) {
      return liked ? 'text-lime' : 'text-muted-foreground';
    }
    return liked ? 'cursor-pointer text-lime hover:text-foreground' : 'cursor-pointer text-foreground hover:text-lime';
  });

  // Only shown to players who could realistically host — same country-level match as the World
  // page's own "host requests for my country" list, not the stricter exact-city match.
  protected readonly canHost = computed(
    () => !!this.auth.currentUserId() && !this.isOwnPost() && this.auth.currentPlayer().country === this.post().trip?.destinationCountry
  );

  protected readonly tripFlag = computed(
    () => this.countryData.countries().find(c => c.name === this.post().trip?.destinationCountry)?.flag ?? '🌍'
  );

  // Mirrors tripFlag() — MatchPost only carries a country name, no flag of its own.
  protected readonly matchFlag = computed(
    () => this.countryData.countries().find(c => c.name === this.post().match?.country)?.flag ?? '🌍'
  );

  // Only shown to players who could realistically join — same location-level match as the
  // Matches page's own "open near me" list, not restricted to the exact same city.
  protected readonly canJoin = computed(
    () =>
      !!this.auth.currentUserId() &&
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
      !!this.auth.currentUserId() &&
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
      !!this.auth.currentUserId() &&
      !this.isOwnPost() &&
      this.post().match?.status === 'open' &&
      this.post().match?.format === 'Doubles' &&
      this.hasJoinedDoubles()
  );

  // Reporting your own post is meaningless, and a logged-out reader has no identity to file one
  // with (post_reports' insert policy is `to authenticated`), so the option is simply absent.
  protected readonly canReport = computed(() => !!this.auth.currentUserId() && !this.isOwnPost());

  // Trip/match/venue posts are deleted by deleting the thing they announce, not directly (mirrors
  // the old canDelete input the parent used to compute: `authorId === me && !trip && !match && !venue`).
  protected readonly canDelete = computed(() => this.isOwnPost() && !this.isAutomaticPost());

  protected readonly doublesEmptySlots = computed(() =>
    Array.from({ length: Math.max(0, DOUBLES_CAPACITY - this.participants().length) }, (_, i) => i)
  );

  constructor() {
    this.countryData.loadCountries();
  }

  ngOnDestroy(): void {
    if (this.burstTimer) {
      clearTimeout(this.burstTimer);
    }
  }

  // The image has no single-tap action for now (see DOUBLE_TAP_WINDOW_MS) — only a fast second tap
  // within the window does anything, and only when liking is actually possible.
  protected onMediaTap(): void {
    if (!this.canLike()) {
      return;
    }
    const now = Date.now();
    const sinceLastTap = now - this.lastTapAt;
    this.lastTapAt = now;
    if (sinceLastTap < DOUBLE_TAP_WINDOW_MS) {
      this.lastTapAt = 0;
      this.likeFromDoubleTap();
    }
  }

  // Runs once the video's first frame is actually decoded and on-screen — earlier events
  // (loadedmetadata) only guarantee dimensions/duration, not a paintable frame. `crossorigin` on
  // the <video> (paired with feed-media's public, CORS-open bucket) is what keeps this canvas read
  // from being cross-origin-tainted; without it toDataURL() throws instead of returning an image.
  protected onVideoLoadedData(event: Event): void {
    if (this.videoPoster()) {
      return;
    }
    const video = event.target as HTMLVideoElement;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      this.videoPoster.set(canvas.toDataURL('image/jpeg', 0.75));
    } catch {
      // Codec/CORS edge case — video still plays fine via its own controls, just without a poster.
    }
  }

  private likeFromDoubleTap(): void {
    // Mirrors Instagram: a double tap always shows the burst, but only ever adds a like — it
    // never unlikes an already-liked post.
    if (!this.post().likedByMe) {
      this.liked.emit();
    }
    this.playLikeBurst();
  }

  protected openMenu(): void {
    this.menuReporting.set(false);
    this.menuOpen.set(true);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
    this.menuReporting.set(false);
  }

  // The only sharing action left — see git history on this file and on ShareService for the
  // native-share-sheet/send-to-a-contact version this replaced. Both round-tripped through enough
  // platform-specific bugs (a detached macOS share popover, a dialog that closed itself on a plain
  // cancel) to not be worth the complexity; a plain copy always works. Shows its own result via
  // toast — no more guessing at what happened, it awaits the actual clipboard write.
  //
  // Copy first, close after: shareService.copyLink() is called (starting the clipboard write)
  // before closeMenu() tears down the dialog, including the button that was just clicked — only
  // the *toast* waits for the result, not the close.
  protected async copyLink(): Promise<void> {
    const copied = this.shareService.copyLink(`posts/${this.post().id}`);
    this.closeMenu();
    if (await copied) {
      this.toast.success(this.translation.t('common.linkCopied'));
    } else {
      this.toast.error(this.translation.t('common.shareFailed'));
    }
  }

  protected submitReport(reason: PostReportReason): void {
    this.closeMenu();
    this.reported.emit(reason);
  }

  protected submitDelete(): void {
    this.closeMenu();
    this.deleted.emit();
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
