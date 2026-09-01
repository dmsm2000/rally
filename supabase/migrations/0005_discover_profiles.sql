-- Public discovery deliberately exposes only profile fields needed by the player list.
-- Keep private data such as birth_date out of this function.
create or replace function public.discover_profiles()
returns table (
  id uuid,
  first_name text,
  last_name text,
  city text,
  country text,
  level text,
  format text,
  surface text,
  bio text,
  avatar_seed text,
  avatar_style text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.first_name,
    p.last_name,
    p.city,
    p.country,
    p.level,
    p.format,
    p.surface,
    p.bio,
    p.avatar_seed,
    p.avatar_style
  from public.profiles p
  where p.id is distinct from auth.uid()
  order by p.created_at desc;
$$;

grant execute on function public.discover_profiles() to anon, authenticated;