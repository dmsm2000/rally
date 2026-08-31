-- Lets a signed-in user permanently delete their own account (auth user + profile row).
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- (Additive migration — 0001_profiles.sql already ran, this only adds to it.)

-- Defense in depth: lets a user delete just their profile row directly if ever needed.
-- Not strictly required for the RPC below (security definer bypasses RLS), but cheap to have.
create policy "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- profiles.id already has `on delete cascade` to auth.users (see 0001), so deleting the
-- auth user alone also removes the profile row — no separate profiles delete needed.
--
-- security definer: runs with the function owner's privileges (can touch auth.users, which
-- a normal authenticated role can't) — but it only ever deletes the CALLING user's own row
-- (auth.uid()), it never takes a target id as a parameter, so a user can only delete themself.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

-- Only signed-in users may call it (and, per the function body above, only for themselves).
grant execute on function public.delete_own_account() to authenticated;
