import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification } from '../../../core/models';
import { NotificationsService } from '../../../core/services/notifications.service';
import { MessagesWidgetService } from '../../../core/services/messages-widget.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

const KIND_ICON: Record<AppNotification['kind'], string> = {
  message: '💬',
  match: '🎾',
  trip: '✈️',
  achievement: '🏅',
};

@Component({
  selector: 'rally-notifications-bell',
  imports: [TranslatePipe],
  templateUrl: './notifications-bell.component.html',
  styleUrl: './notifications-bell.component.scss',
})
export class NotificationsBellComponent {
  protected readonly notifications = inject(NotificationsService);
  protected readonly open = signal(false);
  protected readonly kindIcon = KIND_ICON;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  private readonly widget = inject(MessagesWidgetService);

  protected toggle(): void {
    this.open.update((value) => !value);
  }

  protected select(notification: AppNotification): void {
    this.notifications.markRead(notification.id);
    this.open.set(false);
    const messageThreadMatch = notification.link.match(/^\/messages\/(.+)$/);
    if (messageThreadMatch) {
      this.widget.openThread(messageThreadMatch[1]);
      return;
    }
    this.router.navigateByUrl(notification.link);
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
}
