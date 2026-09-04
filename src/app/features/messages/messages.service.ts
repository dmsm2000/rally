import { Injectable, computed, inject } from '@angular/core';
import { Conversation, Player } from '../../core/models';
import { MessagesRepository } from './data/messages.repository';

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private readonly repository = inject(MessagesRepository);

  readonly myId = computed(() => this.repository.myId());

  // Pairs each conversation with its player, most recently active first.
  readonly conversations = computed(() =>
    this.repository
      .conversations()
      .map((conversation) => ({ conversation, player: this.repository.playerById(conversation.playerId) }))
      .filter((row): row is { conversation: Conversation; player: Player } => !!row.player),
  );

  readonly unreadTotal = computed(() => this.repository.conversations().reduce((sum, c) => sum + c.unread, 0));
  readonly typingPlayerId = computed(() => this.repository.typingPlayerId());

  playerById(id: string | undefined) {
    return this.repository.playerById(id);
  }

  conversationByPlayer(playerId: string) {
    return this.repository.conversationByPlayer(playerId);
  }

  async ensureConversationWithPlayer(playerId: string): Promise<string> {
    return this.repository.ensureConversationWithPlayer(playerId);
  }

  markRead(conversationId: string): void {
    this.repository.markRead(conversationId);
  }

  async deleteConversation(conversationId: string): Promise<void> {
    return this.repository.deleteConversation(conversationId);
  }

  send(conversationId: string, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    this.repository.sendMessage(conversationId, trimmed);
  }

  joinTypingChannel(conversationId: string): void {
    this.repository.joinTypingChannel(conversationId);
  }

  leaveTypingChannel(): void {
    this.repository.leaveTypingChannel();
  }

  notifyTyping(): void {
    this.repository.notifyTyping();
  }
}
