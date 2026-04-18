-- On first auth signup, grant active Pro for allowlisted emails (e.g. Google OAuth).
-- Edit the allowlist in public.handle_new_user below if you add more comp accounts.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  em text := lower(trim(coalesce(
    new.email,
    new.raw_user_meta_data->>'email',
    ''
  )));
  grant_pro boolean := em in (
    'dsamudri@gmail.com',
    'mdsamudri@gmail.com'
  );
  cur_month text := to_char((timezone('utc', now()))::date, 'YYYY-MM');
  cur_day text := to_char((timezone('utc', now()))::date, 'YYYY-MM-DD');
  exp bigint := extract(epoch from (timezone('utc', now()) + interval '365 days'))::bigint;
begin
  if grant_pro then
    insert into public.profiles (
      id,
      subscription_status,
      subscription_plan,
      scans_limit,
      scans_this_month,
      labs_usage_month,
      labs_light_count,
      labs_ct_mri_count,
      labs_medium_count,
      labs_usage_day,
      labs_scans_today,
      subscription_expires_at,
      updated_at
    )
    values (
      new.id,
      'active',
      'pro',
      90,
      0,
      cur_month,
      0,
      0,
      0,
      cur_day,
      0,
      exp,
      timezone('utc', now())
    )
    on conflict (id) do nothing;
  else
    insert into public.profiles (id)
    values (new.id)
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

comment on function public.handle_new_user() is 'Creates profiles row; allowlisted emails get active Pro on first signup (see grant_pro list inside function).';
