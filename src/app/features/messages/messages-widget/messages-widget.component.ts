import { DatePipe } from '@angular/common';
import { Component, ElementRef, HostListener, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessagesService } from '../messages.service';
import { MessagesWidgetService } from '../../../core/services/messages-widget.service';
import { AvatarComponent } from '../../../shared/ui';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'rally-messages-widget',
  imports: [FormsModule, AvatarComponent, TranslatePipe, DatePipe],
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
    // Opening a thread (from the list, a player's "Message" button or a notification) starts it,
    // marks it read, and joins its live typing channel — left again as soon as the thread closes
    // or another one opens. The ensure/markRead calls read+write the conversations signal, so they
    // run untracked to avoid re-triggering this effect.
    effect(onCleanup => {
      const playerId = this.widget.activePlayerId();
      if (!playerId) {
        return;
      }
      untracked(() => {
        void (async () => {
          const conversationId = await this.messages.ensureConversationWithPlayer(playerId);
          this.messages.markRead(conversationId);
          this.messages.joinTypingChannel(conversationId);
        })();
      });
      onCleanup(() => this.messages.leaveTypingChannel());
    });
  }

  protected onDraftChange(value: string): void {
    this.draft.set(value);
    if (value.trim()) {
      this.messages.notifyTyping();
    }
  }

  protected async send(): Promise<void> {
    const playerId = this.widget.activePlayerId();
    const text = this.draft();
    if (!playerId || !text.trim()) {
      return;
    }
    this.draft.set('');
    const conversationId = await this.messages.ensureConversationWithPlayer(playerId);
    this.messages.send(conversationId, text);
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
