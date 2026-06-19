drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own_or_platform on public.profiles;

create policy profiles_insert_own_member on public.profiles
for insert to authenticated
with check (
  id = auth.uid()
  and platform_role = 'member'
);

create policy profiles_update_platform_only on public.profiles
for update to authenticated
using (app_private.is_platform_owner())
with check (app_private.is_platform_owner());
