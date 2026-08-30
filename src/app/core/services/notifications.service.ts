import { Injectable, computed, inject } from '@angular/core';
import { RallyDataService } from '../data/rally-data.service';

/** Thin read/mark-as-read facade over the notifications held by RallyDataService. */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly data = inject(RallyDataService);

  readonly all = computed(() => this.data.notifications());
  readonly unreadCount = computed(() => this.all().filter((n) => !n.read).length);

  playerById(id: string | undefined) {
    return this.data.playerById(id);
  }

  markRead(id: string): void {
    this.data.markNotificationRead(id);
  }

  markAllRead(): void {
    this.data.markAllNotificationsRead();
  }
}
