-- Gender is shown only when a player selected a value other than "Prefer not to say".
drop function if exists public.discover_profiles();

create function public.discover_profiles()
returns table (
  id uuid,
  member_number int,
  first_name text,
  last_name text,
  city text,
  country text,
  gender text,
  level text,
  years int,
  format text,
  surface text,
  dominant_hand text,
  backhand text,
  play_style text,
  court_pref text,
  frequency text,
  coached boolean,
  coached_frequency text,
  times_of_day text[],
  availability text[],
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
    p.member_number,
    p.first_name,
    p.last_name,
    p.city,
    p.country,
    nullif(p.gender, 'PreferNotToSay'),
    p.level,
    p.years,
    p.format,
    p.surface,
    p.dominant_hand,
    p.backhand,
    p.play_style,
    p.court_pref,
    p.frequency,
    p.coached,
    p.coached_frequency,
    p.times_of_day,
    p.availability,
    p.bio,
    p.avatar_seed,
    p.avatar_style
  from public.profiles p
  where p.id is distinct from auth.uid()
  order by p.created_at desc;
$$;

grant execute on function public.discover_profiles() to anon, authenticated;