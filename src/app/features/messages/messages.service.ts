import { Injectable, computed, inject } from '@angular/core';
import { MessagesRepository } from './data/messages.repository';

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private readonly repository = inject(MessagesRepository);

  readonly me = computed(() => this.repository.me());

  // Pairs each conversation with its player, most recently started/updated first.
  readonly conversations = computed(() =>
    this.repository
      .conversations()
      .map((conversation) => ({ conversation, player: this.repository.playerById(conversation.playerId) }))
      .filter((row) => !!row.player),
  );

  readonly unreadTotal = computed(() => this.repository.conversations().reduce((sum, c) => sum + c.unread, 0));

  playerById(id: string | undefined) {
    return this.repository.playerById(id);
  }

  conversationByPlayer(playerId: string) {
    return this.repository.conversationByPlayer(playerId);
  }

  ensureConversationWithPlayer(playerId: string): string {
    return this.repository.ensureConversation(playerId);
  }

  markRead(conversationId: string): void {
    this.repository.markRead(conversationId);
  }

  send(conversationId: string, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    this.repository.sendMessage(conversationId, trimmed);
  }
}
