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

  /** Fans a notification out to many recipients at once — e.g. MatchesRepository.createOpenMatch(). */
  notifyMany(recipientIds: string[], kind: NotificationKind, data?: Record<string, string>): Promise<void> {
    return this.repository.notifyMany(recipientIds, kind, data);
  }

  markRead(id: string): void {
    this.repository.markRead(id);
  }

  clearAll(): Promise<boolean> {
    return this.repository.clearAll();
  }
}
