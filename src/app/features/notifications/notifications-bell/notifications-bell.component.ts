import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification, NotificationKind } from '../../../core/models';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { MessagesWidgetService } from '../../../core/services/messages-widget.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { NotificationsService } from '../notifications.service';

interface NotificationRenderer {
  icon: string;
  textKey: string;
  detailKey?: string;
}

// Add an entry here for each new NotificationKind — the template and click routing stay generic.
const RENDERERS: Record<NotificationKind, NotificationRenderer> = {
  trip_host_volunteered: {
    icon: '✈️',
    textKey: 'notifications.kinds.tripHostVolunteered.text',
    detailKey: 'notifications.kinds.tripHostVolunteered.detail'
  },
  match_invite_received: {
    icon: '🎾',
    textKey: 'notifications.kinds.matchInviteReceived.text',
    detailKey: 'notifications.kinds.matchInviteReceived.detail'
  },
  match_invite_accepted: {
    icon: '✅',
    textKey: 'notifications.kinds.matchInviteAccepted.text',
    detailKey: 'notifications.kinds.matchInviteAccepted.detail'
  },
  match_invite_declined: {
    icon: '❌',
    textKey: 'notifications.kinds.matchInviteDeclined.text'
  },
  match_joined: {
    icon: '🤝',
    textKey: 'notifications.kinds.matchJoined.text',
    detailKey: 'notifications.kinds.matchJoined.detail'
  },
  match_cancelled: {
    icon: '🚫',
    textKey: 'notifications.kinds.matchCancelled.text',
    detailKey: 'notifications.kinds.matchCancelled.detail'
  },
  match_open_nearby: {
    icon: '📍',
    textKey: 'notifications.kinds.matchOpenNearby.text',
    detailKey: 'notifications.kinds.matchOpenNearby.detail'
  }
};

const DEFAULT_ICON = '🔔';

@Component({
  selector: 'rally-notifications-bell',
  imports: [TranslatePipe],
  templateUrl: './notifications-bell.component.html',
  styleUrl: './notifications-bell.component.scss'
})
export class NotificationsBellComponent {
  protected readonly notifications = inject(NotificationsService);
  protected readonly open = signal(false);

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly widget = inject(MessagesWidgetService);
  private readonly translation = inject(TranslationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected toggle(): void {
    this.open.update(value => !value);
  }

  protected icon(n: AppNotification): string {
    return RENDERERS[n.kind]?.icon ?? DEFAULT_ICON;
  }

  protected textKey(n: AppNotification): string {
    return RENDERERS[n.kind]?.textKey ?? '';
  }

  protected detailKey(n: AppNotification): string | undefined {
    return RENDERERS[n.kind]?.detailKey;
  }

  // Kind-specific rendering params, resolved live (actor name from the current profile, not
  // snapshotted) — the rest comes from the row's own data snapshot (see NotificationsRepository).
  // Superset of every kind's fields; a given kind's text/detail only references the ones it needs.
  protected params(n: AppNotification): Record<string, string> {
    return {
      name: this.notifications.playerById(n.actorId)?.name ?? '',
      city: n.data['city'] ?? '',
      fromDate: this.formatDate(n.data['fromDate']),
      toDate: this.formatDate(n.data['toDate']),
      matchDate: this.formatDate(n.data['matchDate']),
      matchTime: this.formatTime(n.data['matchTime'])
    };
  }

  protected timeAgo(n: AppNotification): string {
    return this.formatRelativeTime(n.createdAt);
  }

  protected select(notification: AppNotification): void {
    this.notifications.markRead(notification.id);
    this.open.set(false);
    if (notification.kind.startsWith('match_')) {
      const matchId = notification.data['matchId'];
      if (matchId) {
        void this.router.navigate(['/matches', matchId]);
      }
      return;
    }
    // Every other current kind is about a player reaching out — open a DM thread with them.
    if (notification.actorId) {
      this.widget.openThread(notification.actorId);
    }
  }

  protected async clearAll(): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      message: this.translation.t('notifications.clearAllConfirmLead'),
      confirmLabel: this.translation.t('notifications.clearAllConfirmButton'),
      cancelLabel: this.translation.t('notifications.cancel'),
      tone: 'destructive'
    });
    if (!confirmed) {
      return;
    }
    const ok = await this.notifications.clearAll();
    if (!ok) {
      this.toast.error(this.translation.t('notifications.clearAllFailed'));
      return;
    }
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  private formatDate(iso: string | undefined): string {
    if (!iso) {
      return '';
    }
    const [year, month, day] = iso.split('-').map(Number);
    if (!year || !month || !day) {
      return iso;
    }
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat(this.translation.locale(), { day: 'numeric', month: 'short' }).format(date);
  }

  private formatTime(time: string | undefined): string {
    return time ? time.slice(0, 5) : '';
  }

  private formatRelativeTime(iso: string): string {
    const diffMinutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    const rtf = new Intl.RelativeTimeFormat(this.translation.locale(), { numeric: 'auto' });
    if (diffMinutes < 1) {
      return rtf.format(0, 'minute');
    }
    if (diffMinutes < 60) {
      return rtf.format(-diffMinutes, 'minute');
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return rtf.format(-diffHours, 'hour');
    }
    const diffDays = Math.round(diffHours / 24);
    return rtf.format(-diffDays, 'day');
  }
}
