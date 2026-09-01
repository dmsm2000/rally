-- Lets either participant delete a conversation — deletes it (and its messages/read state, via
-- existing `on delete cascade`) for BOTH participants, not just the caller.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- (Additive migration — 0009_messages.sql already ran, this only adds to it.)

create policy "Participants can delete their conversation"
  on public.conversations for delete
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Defense in depth: not strictly required (the cascade from conversations already removes these),
-- but cheap to have, same reasoning as the profiles delete policy in 0002_delete_own_account.sql.
create policy "Participants can delete their messages"
  on public.messages for delete
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (auth.uid() = c.user_a or auth.uid() = c.user_b)
    )
  );

create policy "Users can delete their own read state"
  on public.conversation_reads for delete
  using (user_id = auth.uid());

-- Postgres Changes only ships full old-row data (needed to evaluate the RLS policy above, which
-- references user_a/user_b, and to deliver the deleted id) for DELETE events when replica identity
-- is FULL — the default (primary key only) would otherwise silently drop the event for subscribers.
alter table public.conversations replica identity full;
