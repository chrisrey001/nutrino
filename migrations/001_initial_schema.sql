-- Nutrino: initial schema
-- Run via Supabase dashboard or MCP apply_migration

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  name text,
  calorie_goal integer default 2100,
  carbs_goal_g integer default 131,
  protein_goal_g integer default 236,
  fats_goal_g integer default 70,
  dietician_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into profiles (id) values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) default '00000000-0000-0000-0000-000000000001',
  date date not null,
  meal_type text not null,
  description text,
  image_url text,
  calories integer,
  carbs_g real,
  protein_g real,
  fats_g real,
  items jsonb,
  ai_raw_response jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists meals_date_idx on meals(date);
create index if not exists meals_user_date_idx on meals(user_id, date);

alter table profiles enable row level security;
alter table meals enable row level security;
create policy "allow all profiles" on profiles for all using (true) with check (true);
create policy "allow all meals" on meals for all using (true) with check (true);

-- Storage: create meal-photos bucket (run in Supabase dashboard if MCP not available)
-- insert into storage.buckets (id, name, public) values ('meal-photos', 'meal-photos', true);
