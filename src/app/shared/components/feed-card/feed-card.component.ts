import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
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

  readonly post = input.required<Post>();
  readonly player = input<Player | undefined>();
  readonly canDelete = input(false);
  readonly deleting = input(false);

  readonly liked = output<void>();
  readonly deleted = output<void>();

  // Own posts route to the own-profile page (there's no /players/:id entry for yourself). Compares
  // against post().authorId, not player()?.id — the mock-bridged "me" player keeps a permanent fake
  // id that never matches the real signed-in uid (see RallyDataService high-value gotcha).
  protected readonly profileLink = computed(() =>
    this.post().authorId === this.auth.currentUserId() ? '/profile' : `/players/${this.post().authorId}`
  );

  protected openMedia(): void {
    const post = this.post();
    if (post.mediaUrl && post.mediaType) {
      this.lightbox.open({ url: post.mediaUrl, type: post.mediaType });
    }
  }
}
