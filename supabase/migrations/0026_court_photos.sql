-- Up to three photos per court, contributed by anyone who can see it. The bucket and its object
-- policies are a straight copy of feed-media's (0011_posts.sql), including the {userId}/{uuid}.{ext}
-- key convention: the uploader owns the file, the court row just points at it. Folder-per-court
-- would have read better but would break the own-folder-only storage policy that already works.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

-- ============================================================================
-- Storage: court-photos bucket
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('court-photos', 'court-photos', true)
on conflict (id) do nothing;

create policy "Court photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'court-photos');

create policy "Users can upload their own court photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'court-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own court photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'court-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- court_photos
-- ============================================================================

create table public.court_photos (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  url text not null,
  created_at timestamptz not null default now()
);

create index court_photos_court_idx on public.court_photos (court_id, created_at);

-- Three per court in total, not three per person — the cap belongs to the court, which is what the
-- card renders. Enforced by a trigger rather than a check constraint because it counts siblings.
create or replace function public.enforce_court_photo_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.court_photos where court_id = new.court_id) >= 3 then
    raise exception 'court photo limit reached';
  end if;
  return new;
end;
$$;

create trigger court_photos_cap
  before insert on public.court_photos
  for each row execute function public.enforce_court_photo_cap();

alter table public.court_photos enable row level security;

create policy "Court photos are visible with their court"
  on public.court_photos for select
  to authenticated, anon
  using (
    exists (
      select 1 from public.courts c
      join public.venues v on v.id = c.venue_id
      where c.id = court_id and (v.status = 'live' or v.created_by = auth.uid())
    )
  );

create policy "Users can add photos to a court they can see"
  on public.court_photos for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.courts c
      join public.venues v on v.id = c.venue_id
      where c.id = court_id and (v.status = 'live' or v.created_by = auth.uid())
    )
  );

-- The uploader can always remove their own; the venue's discoverer can also clear a wrong photo off
-- a court in the venue they maintain, matching "the creator edits" from 0024.
create policy "Uploaders and venue creators can remove photos"
  on public.court_photos for delete
  to authenticated
  using (
    uploaded_by = auth.uid()
    or exists (
      select 1 from public.courts c
      join public.venues v on v.id = c.venue_id
      where c.id = court_id and v.created_by = auth.uid()
    )
  );
