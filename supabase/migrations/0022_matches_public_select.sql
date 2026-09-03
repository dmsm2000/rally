-- Extends matches' existing select policy to unauthenticated (anon) viewers, so open matches are
-- visible to observers the same way trip_intents/discover_profiles already are — see PRODUCT.md /
-- CLAUDE.md's observer-mode rules. Direct invites stay private: for an anon session auth.uid() is
-- null, so `player_a = auth.uid() or player_b = auth.uid()` still evaluates false and only the
-- `kind = 'open'` branch can pass. match_participants' own select policy already keys off this same
-- policy via a correlated EXISTS against public.matches, so widening this one policy also makes an
-- open doubles match's roster visible to observers without any change there.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

drop policy if exists "Participants and open matches are visible" on public.matches;
create policy "Participants and open matches are visible"
  on public.matches for select
  to authenticated, anon
  using (player_a = auth.uid() or player_b = auth.uid() or kind = 'open');
