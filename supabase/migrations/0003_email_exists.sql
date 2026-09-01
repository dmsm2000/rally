-- Lets the (unauthenticated) register form check "is this email already taken?" before submitting.
-- Needed because `profiles` has no email column and its RLS only allows reading your own row anyway
-- (auth.uid() is null for a logged-out caller) — this reads `auth.users` instead, which the client
-- can never query directly, hence the security-definer function.
create or replace function public.email_exists(email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from auth.users where lower(auth.users.email) = lower(email_exists.email)
  );
$$;

grant execute on function public.email_exists(text) to anon, authenticated;
