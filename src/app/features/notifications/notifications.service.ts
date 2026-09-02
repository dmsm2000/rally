import { Injectable, computed, inject } from '@angular/core';
import { NotificationKind } from '../../core/models';
import { NotificationsRepository } from './data/notifications.repository';
import { PlayersRepository } from '../players/data/players.repository';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly repository = inject(NotificationsRepository);
  private readonly players = inject(PlayersRepository);

  readonly all = computed(() => this.repository.notifications());
  readonly unreadCount = computed(() => this.all().filter(n => !n.read).length);

  playerById(id: string | undefined) {
    return this.players.getById(id ?? '');
  }

  /** Called by other features to notify a player in real time — e.g. TripsRepository.volunteer(). */
  notify(recipientId: string, kind: NotificationKind, data?: Record<string, string>): Promise<void> {
    return this.repository.notify(recipientId, kind, data);
  }

  markRead(id: string): void {
    this.repository.markRead(id);
  }

  markAllRead(): void {
    this.repository.markAllRead();
  }
}
