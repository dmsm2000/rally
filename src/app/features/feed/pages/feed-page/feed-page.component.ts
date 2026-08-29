import { Component, inject } from '@angular/core';
import { FeedService } from '../../feed.service';
import { PageHeaderComponent, ChipComponent } from '../../../../shared/ui';
import { FeedCardComponent, PlayerCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-feed-page',
  imports: [PageHeaderComponent, ChipComponent, FeedCardComponent, PlayerCardComponent, TranslatePipe],
  templateUrl: './feed-page.component.html',
  styleUrl: './feed-page.component.scss',
})
export class FeedPageComponent {
  protected readonly feed = inject(FeedService);
}
