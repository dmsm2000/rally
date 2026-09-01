export interface ChatMessage {
  id: string;
  /** Profile id of whoever sent it. */
  senderId: string;
  text: string;
  /** ISO timestamp. */
  createdAt: string;
}

export interface Conversation {
  id: string;
  /** The other participant's profile id; the current player is always the implicit second side. */
  playerId: string;
  messages: ChatMessage[];
  unread: number;
  /** ISO timestamp — drives conversation-list ordering. */
  lastMessageAt: string;
}
