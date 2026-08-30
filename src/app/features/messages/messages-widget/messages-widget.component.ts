import { Component, ElementRef, HostListener, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessagesService } from '../messages.service';
import { MessagesWidgetService } from '../../../core/services/messages-widget.service';
import { AvatarComponent } from '../../../shared/ui';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'rally-messages-widget',
  imports: [FormsModule, AvatarComponent, TranslatePipe],
  templateUrl: './messages-widget.component.html',
  styleUrl: './messages-widget.component.scss',
})
export class MessagesWidgetComponent {
  protected readonly messages = inject(MessagesService);
  protected readonly widget = inject(MessagesWidgetService);

  protected readonly rows = computed(() =>
    this.messages.conversations().map(({ conversation, player }) => ({
      conversation,
      player: player!,
      lastMessage: conversation.messages.at(-1),
    })),
  );

  protected readonly activePlayer = computed(() => this.messages.playerById(this.widget.activePlayerId() ?? undefined));
  protected readonly activeConversation = computed(() => {
    const playerId = this.widget.activePlayerId();
    return playerId ? this.messages.conversationByPlayer(playerId) : undefined;
  });

  protected readonly draft = signal('');

  private readonly host = inject(ElementRef<HTMLElement>);

  constructor() {
    // Opening a thread (from the list, a player's "Message" button or a notification) starts it and marks it read.
    // The ensure/markRead calls read+write the conversations signal, so they run untracked to avoid re-triggering this effect.
    effect(() => {
      const playerId = this.widget.activePlayerId();
      if (!playerId) {
        return;
      }
      untracked(() => {
        const conversationId = this.messages.ensureConversationWithPlayer(playerId);
        this.messages.markRead(conversationId);
      });
    });
  }

  protected send(): void {
    const playerId = this.widget.activePlayerId();
    if (!playerId) {
      return;
    }
    const conversationId = this.messages.ensureConversationWithPlayer(playerId);
    this.messages.send(conversationId, this.draft());
    this.draft.set('');
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    // Ignore the very click that just opened the widget (e.g. a "Message" button elsewhere on the page),
    // which would otherwise bubble up to this document listener and close it right away.
    if (this.widget.consumeOutsideCloseSuppression()) {
      return;
    }
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.widget.close();
    }
  }
}
