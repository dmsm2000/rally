import { Injectable, inject } from '@angular/core';
import { RallyDataService } from '../../../core/data/rally-data.service';
import { FeedItem } from '../../../core/models';

@Injectable({ providedIn: 'root' })
export class FeedRepository {
  private readonly data = inject(RallyDataService);

  getAll(): FeedItem[] {
    return this.data.feed();
  }

  suggestedPlayers() {
    return this.data.players().slice(0, 2);
  }
}
