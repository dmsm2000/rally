export interface ChatMessage {
  id: string;
  /** Player id of whoever sent it — 'joao' (me) or the other participant. */
  senderId: string;
  text: string;
  sentAt: string;
}

export interface Conversation {
  id: string;
  /** The other participant; the current player is always the implicit second side. */
  playerId: string;
  messages: ChatMessage[];
  unread: number;
}
