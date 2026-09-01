import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from '../../../core/auth/auth.service';
import { supabase } from '../../../core/auth/supabase.client';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ChatMessage, Conversation } from '../../../core/models';
import { MessagesWidgetService } from '../../../core/services/messages-widget.service';
import { ToastService } from '../../../core/services/toast.service';
import { PlayersRepository } from '../../players/data/players.repository';

interface ConversationRow {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

/** Data-access boundary for real-time direct messaging (see supabase/migrations/0009_messages.sql). */
@Injectable({ providedIn: 'root' })
export class MessagesRepository {
  private readonly auth = inject(AuthService);
  private readonly players = inject(PlayersRepository);
  private readonly widget = inject(MessagesWidgetService);
  private readonly toast = inject(ToastService);
  private readonly translation = inject(TranslationService);

  private readonly _conversations = signal<Conversation[]>([]);
  private readonly _typingPlayerId = signal<string | null>(null);

  // Sorted by most recently active first — plain field updates on the underlying signal (new
  // message, optimistic send) don't reorder the array themselves, so this recomputes order on read.
  readonly conversations = computed(() => [...this._conversations()].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)));
  readonly typingPlayerId = this._typingPlayerId.asReadonly();
  readonly myId = this.auth.currentUserId;

  private inboxChannel?: RealtimeChannel;
  private typingChannel?: RealtimeChannel;
  private typingClearTimer?: ReturnType<typeof setTimeout>;
  private lastTypingSentAt = 0;

  constructor() {
    effect(() => {
      const uid = this.auth.currentUserId();
      untracked(() => {
        if (uid) {
          void this.init(uid);
        } else {
          this.teardownRealtime();
          this._conversations.set([]);
        }
      });
    });
  }

  playerById(id: string | undefined) {
    return this.players.getById(id ?? '');
  }

  conversationByPlayer(playerId: string) {
    return this._conversations().find(c => c.playerId === playerId);
  }

  /** Finds (or lazily starts) the conversation with a player, e.g. from their "Message" button. */
  async ensureConversationWithPlayer(playerId: string): Promise<string> {
    const existing = this.conversationByPlayer(playerId);
    if (existing) {
      return existing.id;
    }
    const { data, error } = await supabase.rpc('ensure_conversation', { other_user_id: playerId });
    if (error || !data) {
      console.error('Failed to start conversation:', error?.message);
      this.toast.error(this.translation.t('messages.sendFailed'));
      throw error ?? new Error('ensure_conversation returned no id');
    }
    const conversationId = data as string;
    if (!this._conversations().some(c => c.id === conversationId)) {
      const conversation: Conversation = {
        id: conversationId,
        playerId,
        messages: [],
        unread: 0,
        lastMessageAt: new Date().toISOString()
      };
      this._conversations.update(list => [conversation, ...list]);
    }
    return conversationId;
  }

  // Always persists the read cursor when called (even if locally already 0) — otherwise a message
  // that arrives while the thread is already open would never advance conversation_reads, and would
  // wrongly count as unread again after a reload.
  markRead(conversationId: string): void {
    const uid = this.myId();
    const conversation = this._conversations().find(c => c.id === conversationId);
    if (!uid || !conversation) {
      return;
    }
    if (conversation.unread > 0) {
      this._conversations.update(list => list.map(c => (c.id === conversationId ? { ...c, unread: 0 } : c)));
    }
    void supabase
      .from('conversation_reads')
      .upsert(
        { conversation_id: conversationId, user_id: uid, last_read_at: new Date().toISOString() },
        { onConflict: 'conversation_id,user_id' }
      )
      .then(({ error }) => {
        if (error) {
          console.error('Failed to persist read state:', error.message);
        }
      });
  }

  /** Optimistically appends, then reconciles with (or rolls back from) the real inserted row. */
  sendMessage(conversationId: string, text: string): void {
    const uid = this.myId();
    if (!uid) {
      return;
    }
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    this.updateConversation(conversationId, c => ({
      ...c,
      messages: [...c.messages, { id: tempId, senderId: uid, text, createdAt: now }],
      lastMessageAt: now
    }));

    void supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: uid, body: text })
      .select('id,created_at')
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          console.error('Failed to send message:', error?.message);
          this.toast.error(this.translation.t('messages.sendFailed'));
          this.updateConversation(conversationId, c => ({
            ...c,
            messages: c.messages.filter(m => m.id !== tempId)
          }));
          return;
        }
        this.updateConversation(conversationId, c => ({
          ...c,
          messages: c.messages.map(m => (m.id === tempId ? { ...m, id: data.id, createdAt: data.created_at } : m))
        }));
      });
  }

  /** Joins the ephemeral (non-persisted) typing-broadcast channel for the currently open thread. */
  joinTypingChannel(conversationId: string): void {
    this.leaveTypingChannel();
    const uid = this.myId();
    this.typingChannel = supabase
      .channel(`conversation:${conversationId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.['userId'] && payload['userId'] !== uid) {
          this._typingPlayerId.set(payload['userId']);
          clearTimeout(this.typingClearTimer);
          this.typingClearTimer = setTimeout(() => this._typingPlayerId.set(null), 3000);
        }
      })
      .subscribe();
  }

  leaveTypingChannel(): void {
    if (this.typingChannel) {
      void supabase.removeChannel(this.typingChannel);
      this.typingChannel = undefined;
    }
    clearTimeout(this.typingClearTimer);
    this._typingPlayerId.set(null);
  }

  /** Throttled — at most once every 2s, so typing doesn't flood the channel on every keystroke. */
  notifyTyping(): void {
    const uid = this.myId();
    const now = Date.now();
    if (!uid || !this.typingChannel || now - this.lastTypingSentAt < 2000) {
      return;
    }
    this.lastTypingSentAt = now;
    void this.typingChannel.send({ type: 'broadcast', event: 'typing', payload: { userId: uid } });
  }

  private async init(uid: string): Promise<void> {
    this.teardownRealtime();

    const { data: conversationRows, error: conversationsError } = await supabase
      .from('conversations')
      .select('id,user_a,user_b,last_message_at')
      .or(`user_a.eq.${uid},user_b.eq.${uid}`)
      .order('last_message_at', { ascending: false });
    if (conversationsError || !conversationRows) {
      console.error('Failed to load conversations:', conversationsError?.message);
      this._conversations.set([]);
      this.subscribeInbox();
      return;
    }

    const ids = conversationRows.map(c => c.id);
    const [{ data: readRows }, { data: messageRows }] =
      ids.length === 0
        ? [{ data: [] as { conversation_id: string; last_read_at: string }[] }, { data: [] as MessageRow[] }]
        : await Promise.all([
            supabase.from('conversation_reads').select('conversation_id,last_read_at').eq('user_id', uid).in('conversation_id', ids),
            supabase.from('messages').select('id,conversation_id,sender_id,body,created_at').in('conversation_id', ids).order('created_at', { ascending: true })
          ]);

    const lastReadByConversation = new Map((readRows ?? []).map(r => [r.conversation_id, r.last_read_at]));
    const messagesByConversation = new Map<string, ChatMessage[]>();
    for (const row of (messageRows ?? []) as MessageRow[]) {
      const list = messagesByConversation.get(row.conversation_id) ?? [];
      list.push({ id: row.id, senderId: row.sender_id, text: row.body, createdAt: row.created_at });
      messagesByConversation.set(row.conversation_id, list);
    }

    this._conversations.set(
      (conversationRows as ConversationRow[]).map(row => {
        const messages = messagesByConversation.get(row.id) ?? [];
        const lastReadAt = lastReadByConversation.get(row.id);
        const unread = messages.filter(m => m.senderId !== uid && (!lastReadAt || m.createdAt > lastReadAt)).length;
        return {
          id: row.id,
          playerId: row.user_a === uid ? row.user_b : row.user_a,
          messages,
          unread,
          lastMessageAt: row.last_message_at
        };
      })
    );

    this.subscribeInbox();
  }

  private subscribeInbox(): void {
    this.inboxChannel = supabase
      .channel('messages-inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload =>
        this.handleIncomingMessage(payload.new as MessageRow)
      )
      .subscribe();
  }

  private handleIncomingMessage(row: MessageRow): void {
    const uid = this.myId();
    if (!uid || row.sender_id === uid) {
      return;
    }
    const conversation = this._conversations().find(c => c.id === row.conversation_id);
    if (!conversation) {
      void this.adoptUnknownConversation(row, uid);
      return;
    }
    const isOpenThread = this.widget.activePlayerId() === conversation.playerId;
    this.updateConversation(conversation.id, c => ({
      ...c,
      messages: [...c.messages, { id: row.id, senderId: row.sender_id, text: row.body, createdAt: row.created_at }],
      lastMessageAt: row.created_at,
      unread: isOpenThread ? c.unread : c.unread + 1
    }));
    if (isOpenThread) {
      this.markRead(conversation.id);
    }
  }

  private async adoptUnknownConversation(row: MessageRow, uid: string): Promise<void> {
    const { data, error } = await supabase
      .from('conversations')
      .select('id,user_a,user_b,last_message_at')
      .eq('id', row.conversation_id)
      .maybeSingle();
    if (error || !data) {
      console.error('Failed to load new conversation:', error?.message);
      return;
    }
    const conversation: Conversation = {
      id: data.id,
      playerId: data.user_a === uid ? data.user_b : data.user_a,
      messages: [{ id: row.id, senderId: row.sender_id, text: row.body, createdAt: row.created_at }],
      unread: 1,
      lastMessageAt: data.last_message_at
    };
    this._conversations.update(list => (list.some(c => c.id === conversation.id) ? list : [conversation, ...list]));
  }

  private updateConversation(conversationId: string, updater: (c: Conversation) => Conversation): void {
    this._conversations.update(list => list.map(c => (c.id === conversationId ? updater(c) : c)));
  }

  private teardownRealtime(): void {
    if (this.inboxChannel) {
      void supabase.removeChannel(this.inboxChannel);
      this.inboxChannel = undefined;
    }
    this.leaveTypingChannel();
  }
}
