-- ─────────────────────────────────────────────────────────────────────────
-- DELETE_ACCOUNT.sql — lets a signed-in user permanently delete their own
-- account from Supabase: all of their app data AND their auth.users row.
--
-- Run this once in the Supabase SQL editor. The web app calls it via
-- supabase.rpc('delete_my_account') from Settings → Danger zone.
--
-- Implementation notes:
--  • SECURITY DEFINER so it can delete from auth.users (owned by the
--    supabase admin role). It only ever touches the CALLER's own rows,
--    identified by auth.uid() — a user can never delete anyone else.
--  • Every table delete is wrapped in its own BEGIN/EXCEPTION block and
--    guarded by to_regclass, so the function still succeeds no matter which
--    optional migrations (SOCIAL_*, MORE_SCHEMA, …) have been applied.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  t   text;
  -- Tables that key the user by a plain `user_id` column. Deleted in an order
  -- that respects typical child→parent relationships; missing tables/columns
  -- are skipped gracefully.
  user_id_tables text[] := array[
    'post_reports', 'post_comment_likes', 'post_comments', 'post_likes',
    'post_tags', 'reposts', 'posts',
    'match_scores', 'match_players', 'matches',
    'wallet_transactions', 'wallets',
    'course_corrections', 'practice_sessions',
    'round_holes', 'rounds', 'shots',
    'course_holes', 'courses',
    'notifications', 'user_profiles'
  ];
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Plain user_id tables.
  foreach t in array user_id_tables loop
    if to_regclass('public.' || t) is not null then
      begin
        execute format('delete from public.%I where user_id = $1', t) using uid;
      exception when others then
        -- table exists but has no user_id column, or some other non-fatal
        -- issue — ignore and keep going.
        null;
      end;
    end if;
  end loop;

  -- Relational tables that reference the user under different column names.
  begin execute 'delete from public.notifications where actor_id = $1' using uid; exception when others then null; end;
  begin execute 'delete from public.friendships where requester_id = $1 or addressee_id = $1' using uid; exception when others then null; end;
  begin execute 'delete from public.messages where sender_id = $1' using uid; exception when others then null; end;
  begin execute 'delete from public.conversations where user_a = $1 or user_b = $1' using uid; exception when others then null; end;

  -- Finally, remove the auth account itself. This signs the user out
  -- everywhere and frees their email for re-registration.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
