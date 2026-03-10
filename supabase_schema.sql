-- Atualização Segura do Schema (Idempotente)

-- 1. Tabela Profiles
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  avatar_url text,
  daily_goal_seconds integer default 14400,
  theme text default 'light',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Adicionar colunas novas caso não existam
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'notification_preferences') then
    alter table public.profiles add column notification_preferences jsonb default '{"push": true, "email": false, "marketing": false}'::jsonb;
  end if;
end $$;

-- Policies para Profiles (Drop para recriar e evitar duplicidade)
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;

alter table public.profiles enable row level security;

create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);

-- Trigger de User (Recriar function e trigger)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing; -- Evita erro se profile já existir
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Tabela Notifications
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  message text not null,
  type text default 'info',
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Policies para Notifications
drop policy if exists "Users can view their own notifications" on public.notifications;
drop policy if exists "Users can update their own notifications" on public.notifications;

alter table public.notifications enable row level security;

create policy "Users can view their own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users can update their own notifications" on public.notifications for update using (auth.uid() = user_id);

-- 3. Tabela Daily Goals
create table if not exists public.daily_goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  date date default current_date not null,
  goal_seconds integer not null,
  achieved_seconds integer default 0,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date)
);

-- Policies para Daily Goals
drop policy if exists "Users can view their own goals" on public.daily_goals;
drop policy if exists "Users can update their own goals" on public.daily_goals;
drop policy if exists "Users can insert their own goals" on public.daily_goals;

alter table public.daily_goals enable row level security;

create policy "Users can view their own goals" on public.daily_goals for select using (auth.uid() = user_id);
create policy "Users can update their own goals" on public.daily_goals for update using (auth.uid() = user_id);
create policy "Users can insert their own goals" on public.daily_goals for insert with check (auth.uid() = user_id);

-- 4. Storage para Avatares
-- Criação do bucket (se não existir)
-- Nota: Você precisa executar isso no SQL Editor do Supabase Dashboard se não tiver permissão direta aqui.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policies para Storage (Drop para recriar)
DROP POLICY IF EXISTS "Avatar Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;

-- Criar Policies
CREATE POLICY "Avatar Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid() = owner
  );
