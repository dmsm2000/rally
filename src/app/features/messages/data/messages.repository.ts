import { Injectable, inject } from '@angular/core';
import { RallyDataService } from '../../../core/data/rally-data.service';

@Injectable({ providedIn: 'root' })
export class MessagesRepository {
  private readonly data = inject(RallyDataService);

  me() {
    return this.data.me();
  }

  typingPlayerId() {
    return this.data.typingPlayerId();
  }

  conversations() {
    return this.data.conversations();
  }

  conversationById(id: string) {
    return this.data.conversationById(id);
  }

  conversationByPlayer(playerId: string) {
    return this.data.conversationByPlayer(playerId);
  }

  playerById(id: string | undefined) {
    return this.data.playerById(id);
  }

  ensureConversation(playerId: string): string {
    return this.data.ensureConversation(playerId);
  }

  markRead(conversationId: string): void {
    this.data.markConversationRead(conversationId);
  }

  sendMessage(conversationId: string, text: string): void {
    this.data.sendMessage(conversationId, text);
  }
}
