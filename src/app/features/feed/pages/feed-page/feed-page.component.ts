import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FeedService } from '../../feed.service';
import { StatComponent, ChipComponent } from '../../../../shared/ui';
import { FeedCardComponent, PlayerCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'rally-feed-page',
  imports: [RouterLink, StatComponent, ChipComponent, FeedCardComponent, PlayerCardComponent, TranslatePipe],
  templateUrl: './feed-page.component.html',
  styleUrl: './feed-page.component.scss',
})
export class FeedPageComponent {
  protected readonly feed = inject(FeedService);
}
