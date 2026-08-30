import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { FeedCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { AvatarComponent, EmptyStateComponent, StatComponent } from '../../../../shared/ui';
import { FeedService } from '../../feed.service';

@Component({
  selector: 'rally-feed-page',
  imports: [
    RouterLink,
    FormsModule,
    StatComponent,
    AvatarComponent,
    EmptyStateComponent,
    FeedCardComponent,
    TranslatePipe
  ],
  templateUrl: './feed-page.component.html',
  styleUrl: './feed-page.component.scss'
})
export class FeedPageComponent {
  protected readonly feed = inject(FeedService);
  protected readonly auth = inject(AuthService);

  protected onMediaSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.feed.attachMedia(file);
    }
    input.value = '';
  }
}
