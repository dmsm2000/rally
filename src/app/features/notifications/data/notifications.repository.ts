import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from '../../../core/auth/auth.service';
import { supabase } from '../../../core/auth/supabase.client';
import { AppNotification, NotificationKind } from '../../../core/models';

interface NotificationRow {
  id: string;
  actor_id: string | null;
  kind: NotificationKind;
  data: Record<string, string>;
  read: boolean;
  created_at: string;
}

const SELECT_COLUMNS = 'id,actor_id,kind,data,read,created_at';
const LOAD_LIMIT = 50;

/** Data-access boundary for generic real-time notifications (see supabase/migrations/0017_notifications.sql). */
@Injectable({ providedIn: 'root' })
export class NotificationsRepository {
  private readonly auth = inject(AuthService);

  private readonly _notifications = signal<AppNotification[]>([]);

  // Sorted by most recent first — an optimistic mark-read doesn't reorder the array itself, so this
  // recomputes order on read (same approach as MessagesRepository.conversations).
  readonly notifications = computed(() => [...this._notifications()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

  private channel?: RealtimeChannel;

  constructor() {
    effect(() => {
      const uid = this.auth.currentUserId();
      untracked(() => {
        if (uid) {
          void this.init(uid);
        } else {
          this.teardownRealtime();
          this._notifications.set([]);
        }
      });
    });
  }

  /** Notifies another player as the signed-in user; delivered live to them via Realtime. */
  async notify(recipientId: string, kind: NotificationKind, data: Record<string, string> = {}): Promise<void> {
    const uid = this.auth.currentUserId();
    if (!uid || recipientId === uid) {
      return;
    }
    const { error } = await supabase.from('notifications').insert({ recipient_id: recipientId, actor_id: uid, kind, data });
    if (error) {
      console.error('Failed to create notification:', error.message);
    }
  }

  /** Fans a notification out to many recipients at once (e.g. "an open match appeared in my
   * city") as a single batched insert, instead of one `notify()` call per recipient. */
  async notifyMany(recipientIds: string[], kind: NotificationKind, data: Record<string, string> = {}): Promise<void> {
    const uid = this.auth.currentUserId();
    if (!uid) {
      return;
    }
    const others = recipientIds.filter(id => id !== uid);
    if (others.length === 0) {
      return;
    }
    const { error } = await supabase
      .from('notifications')
      .insert(others.map(recipientId => ({ recipient_id: recipientId, actor_id: uid, kind, data })));
    if (error) {
      console.error('Failed to create notifications:', error.message);
    }
  }

  markRead(id: string): void {
    const notification = this._notifications().find(n => n.id === id);
    if (!notification || notification.read) {
      return;
    }
    this._notifications.update(list => list.map(n => (n.id === id ? { ...n, read: true } : n)));
    void supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to mark notification read:', error.message);
        }
      });
  }

  async clearAll(): Promise<boolean> {
    const uid = this.auth.currentUserId();
    if (!uid || this._notifications().length === 0) {
      return true;
    }
    const snapshot = this._notifications();
    this._notifications.set([]);
    const { error } = await supabase.from('notifications').delete().eq('recipient_id', uid);
    if (error) {
      console.error('Failed to clear notifications:', error.message);
      this._notifications.set(snapshot);
      return false;
    }
    return true;
  }

  private async init(uid: string): Promise<void> {
    this.teardownRealtime();
    const { data, error } = await supabase
      .from('notifications')
      .select(SELECT_COLUMNS)
      .eq('recipient_id', uid)
      .order('created_at', { ascending: false })
      .limit(LOAD_LIMIT);
    if (error || !data) {
      console.error('Failed to load notifications:', error?.message);
      this._notifications.set([]);
    } else {
      this._notifications.set((data as NotificationRow[]).map(row => this.toNotification(row)));
    }
    this.subscribeRealtime();
  }

  private subscribeRealtime(): void {
    this.channel = supabase
      .channel('notifications-inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload =>
        this.handleIncoming(payload.new as NotificationRow)
      )
      .subscribe();
  }

  private handleIncoming(row: NotificationRow): void {
    if (this._notifications().some(n => n.id === row.id)) {
      return;
    }
    this._notifications.update(list => [this.toNotification(row), ...list]);
  }

  private teardownRealtime(): void {
    if (this.channel) {
      void supabase.removeChannel(this.channel);
      this.channel = undefined;
    }
  }

  private toNotification(row: NotificationRow): AppNotification {
    return {
      id: row.id,
      kind: row.kind,
      actorId: row.actor_id ?? undefined,
      data: row.data ?? {},
      read: row.read,
      createdAt: row.created_at
    };
  }
}
