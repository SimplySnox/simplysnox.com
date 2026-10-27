-- PayTrack: invite-only auth is configured in the Supabase dashboard (see setup guide).
-- Run this migration once in your own Supabase project's SQL editor.
begin;

create table public.paytrack_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  constraint paytrack_document_shape check (
    jsonb_typeof(data) = 'object'
    and data ?& array['version', 'settings', 'shifts', 'paychecks', 'activeShift']
    and data->'version' = '1'::jsonb
    and jsonb_typeof(data->'settings') = 'object'
    and jsonb_typeof(data->'shifts') = 'array'
    and jsonb_typeof(data->'paychecks') = 'array'
    and (data->'activeShift' = 'null'::jsonb or jsonb_typeof(data->'activeShift') = 'object')
    and octet_length(data::text) <= 8000000
  )
);
alter table public.paytrack_accounts enable row level security;
revoke all on table public.paytrack_accounts from anon, authenticated;
grant select on table public.paytrack_accounts to authenticated;
grant insert (user_id, data) on public.paytrack_accounts to authenticated;
create policy "Read own PayTrack account" on public.paytrack_accounts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Create own PayTrack account" on public.paytrack_accounts
  for insert to authenticated with check (user_id = (select auth.uid()));

-- All updates go through a compare-and-swap. A stale device cannot silently
-- replace newer records, and the caller cannot select another account's ID.
create function public.save_paytrack(expected_revision bigint, payload jsonb, expected_user uuid)
returns setof public.paytrack_accounts
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if expected_user is null or expected_user <> auth.uid() then
    raise exception 'account_changed' using errcode = '28000';
  end if;
  if expected_revision is null or expected_revision < 0 then
    raise exception 'invalid_revision' using errcode = '22023';
  end if;
  return query
    update public.paytrack_accounts
    set data = payload, revision = revision + 1, updated_at = now()
    where user_id = auth.uid() and revision = expected_revision
    returning *;
  if not found then
    raise exception 'paytrack_conflict' using errcode = 'P0001';
  end if;
end;
$$;
revoke all on function public.save_paytrack(bigint, jsonb, uuid) from public, anon;
grant execute on function public.save_paytrack(bigint, jsonb, uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('paytrack-stubs', 'paytrack-stubs', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
create policy "Read own PayTrack stubs" on storage.objects
  for select to authenticated using (
    bucket_id = 'paytrack-stubs' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
create policy "Upload own PayTrack stubs" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'paytrack-stubs' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
create policy "Delete own PayTrack stubs" on storage.objects
  for delete to authenticated using (
    bucket_id = 'paytrack-stubs' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

commit;
