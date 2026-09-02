import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CountryDataService } from '../../../core/data/country-data.service';
import { Player, Post } from '../../../core/models';
import { MediaLightboxService } from '../../../core/services/media-lightbox.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AvatarComponent, ChipComponent, IconComponent } from '../../ui';

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
  readonly canDelete = input(false);
  readonly deleting = input(false);
  readonly volunteering = input(false);
  readonly joining = input(false);

  readonly liked = output<void>();
  readonly deleted = output<void>();
  readonly volunteered = output<void>();
  readonly joined = output<void>();

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
  // Matches page's own "open near me" list, not restricted to the exact same city. Doubles
  // matches aren't joinable from the feed yet — see the roster count + "view match" link instead,
  // which sends interested players to /matches/:id to actually join.
  protected readonly canJoin = computed(
    () =>
      !this.auth.isObserver() &&
      !this.isOwnPost() &&
      this.post().match?.status === 'open' &&
      this.post().match?.format !== 'Doubles' &&
      this.auth.currentPlayer().country === this.post().match?.country
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
