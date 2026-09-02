-- Generic real-time notifications: one row per (kind, recipient), created by whichever feature
-- triggers it and delivered live to the recipient's notification bell via Realtime. `kind` plus a
-- small `data` payload keep this reusable for future notification types (messages, matches,
-- achievements, ...) once those features are themselves real — see PRODUCT.md "Still mock today".
-- The first real producer is "someone volunteered to host you" (see TripsRepository.volunteer()).
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  -- Who triggered it, for the bell's avatar; null'd instead of deleted so history survives, and not
  -- a hard reference to any specific entity (trip, match, ...) so this stays kind-agnostic.
  actor_id uuid references public.profiles (id) on delete set null,
  kind text not null,
  -- Snapshot of whatever the notification text needs to render (e.g. city/dates), captured at
  -- creation time so the notification still reads correctly even if the source entity is later
  -- deleted (e.g. the traveller cancels the trip after someone already volunteered to host).
  data jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_at_idx
  on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Recipients can view their own notifications" on public.notifications;
create policy "Recipients can view their own notifications"
  on public.notifications for select
  to authenticated
  using (recipient_id = auth.uid());

-- Same trust model as direct messages: any signed-in player can notify another player, but only
-- ever as themselves (never spoofing a different actor_id).
drop policy if exists "Users can create notifications as themselves" on public.notifications;
create policy "Users can create notifications as themselves"
  on public.notifications for insert
  to authenticated
  with check (actor_id is null or actor_id = auth.uid());

drop policy if exists "Recipients can update their own notifications" on public.notifications;
create policy "Recipients can update their own notifications"
  on public.notifications for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists "Recipients can delete their own notifications" on public.notifications;
create policy "Recipients can delete their own notifications"
  on public.notifications for delete
  to authenticated
  using (recipient_id = auth.uid());

-- Lets Realtime stream inserts to subscribers (still filtered per-subscriber by the RLS policy above).
alter publication supabase_realtime add table public.notifications;
