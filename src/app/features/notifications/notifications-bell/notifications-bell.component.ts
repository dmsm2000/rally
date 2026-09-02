import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { AppNotification, NotificationKind } from '../../../core/models';
import { TranslationService } from '../../../core/i18n/translation.service';
import { MessagesWidgetService } from '../../../core/services/messages-widget.service';
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
  protected params(n: AppNotification): Record<string, string> {
    return {
      name: this.notifications.playerById(n.actorId)?.name ?? '',
      city: n.data['city'] ?? '',
      fromDate: this.formatDate(n.data['fromDate']),
      toDate: this.formatDate(n.data['toDate'])
    };
  }

  protected timeAgo(n: AppNotification): string {
    return this.formatRelativeTime(n.createdAt);
  }

  protected select(notification: AppNotification): void {
    this.notifications.markRead(notification.id);
    this.open.set(false);
    // Every current kind is about a player reaching out — open a DM thread with them. Future kinds
    // that need different navigation can branch here on notification.kind.
    if (notification.actorId) {
      this.widget.openThread(notification.actorId);
    }
  }

  protected markAllRead(): void {
    this.notifications.markAllRead();
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
