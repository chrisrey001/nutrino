-- Migration 003: Multi-user auth + proper RLS
-- Run AFTER creating your real auth account and noting your auth.uid()

-- 1. Drop old permissive policies
drop policy if exists "allow all profiles" on profiles;
drop policy if exists "allow all meals" on meals;
drop policy if exists "open" on favorites;
-- Catch any other permissive policies by common naming patterns
drop policy if exists "Allow all" on profiles;
drop policy if exists "Allow all" on meals;
drop policy if exists "Allow all" on favorites;

-- 2. Enable RLS on all tables (safe to run even if already enabled)
alter table profiles enable row level security;
alter table meals enable row level security;
alter table favorites enable row level security;

-- 3. Proper per-user RLS policies
create policy "users_own_profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "users_own_meals" on meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_favorites" on favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. Remove hardcoded DEFAULT from meals.user_id
alter table meals alter column user_id drop default;

-- 5. Auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ONE-TIME DATA MIGRATION (run manually after signing up)
-- Replace <your-auth-uid> with your actual auth.uid() value.
-- ============================================================
-- update meals    set user_id = '<your-auth-uid>' where user_id = '00000000-0000-0000-0000-000000000001';
-- update favorites set user_id = '<your-auth-uid>' where user_id = '00000000-0000-0000-0000-000000000001';
-- update profiles  set id     = '<your-auth-uid>' where id      = '00000000-0000-0000-0000-000000000001';
