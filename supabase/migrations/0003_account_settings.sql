-- Self-service account settings.
--
-- Profile edits already use the user's own RLS policy. Username changes
-- need one guarded operation because pseudo-email accounts derive their
-- Supabase login address from the username.

create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'You cannot change your own role.';
  end if;
  if new.status is distinct from old.status then
    raise exception 'You cannot change your own account status.';
  end if;
  if new.username is distinct from old.username
    and coalesce(current_setting('rentycar.allow_username_change', true), '') <> 'on' then
    raise exception 'Use the account settings flow to change your username.';
  end if;

  return new;
end;
$$;

create or replace function public.update_own_username(target_username text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_username text := lower(trim(coalesce(target_username, '')));
  email_login boolean;
begin
  if current_user_id is null then
    raise exception 'You are not signed in.';
  end if;

  if normalized_username !~ '^[a-z0-9_-]{3,32}$' then
    raise exception 'Username must be 3-32 characters and use only letters, numbers, underscores, or dashes.';
  end if;

  select uses_email_login
  into email_login
  from public.profiles
  where id = current_user_id
  for update;

  if not found then
    raise exception 'Profile not found.';
  end if;

  if exists (
    select 1
    from public.profiles
    where username = normalized_username
      and id <> current_user_id
  ) then
    raise exception 'That username is already taken.';
  end if;

  perform set_config('rentycar.allow_username_change', 'on', true);

  update public.profiles
  set username = normalized_username
  where id = current_user_id;

  update auth.users
  set
    email = case
      when email_login then email
      else normalized_username || '@rentycar.local'
    end,
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('username', normalized_username),
    updated_at = now()
  where id = current_user_id;

  return normalized_username;
exception
  when unique_violation then
    raise exception 'That username is already taken.';
end;
$$;

revoke all on function public.update_own_username(text) from public;
grant execute on function public.update_own_username(text) to authenticated;

notify pgrst, 'reload schema';
