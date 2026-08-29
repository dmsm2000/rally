import { Component, computed, inject, input } from '@angular/core';
import { RallyDataService } from '../../../core/data/rally-data.service';
import { FeedItem } from '../../../core/models';
import { AvatarComponent } from '../../ui';

@Component({
  selector: 'app-feed-card',
  imports: [AvatarComponent],
  templateUrl: './feed-card.component.html',
  styleUrl: './feed-card.component.scss',
})
export class FeedCardComponent {
  private readonly data = inject(RallyDataService);

  readonly item = input.required<FeedItem>();

  protected readonly player = computed(() => this.data.playerById(this.item().playerId));
}
