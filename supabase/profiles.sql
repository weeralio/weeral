-- User profiles (onboarding data)
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  first_name    text,
  last_name     text,
  phone         text,
  address_line  text,
  city          text,
  postal_code   text,
  country       text default 'France',
  company       text,
  industry      text,
  team_size     text,
  goals         text[] default '{}',
  referral_source text,
  onboarding_completed boolean default false,
  created_at    timestamptz default now()
);

alter table profiles enable row level security;

create policy "users read own profile" on profiles
  for select using (auth.uid() = id);

create policy "users update own profile" on profiles
  for update using (auth.uid() = id);

-- Auto-create empty profile on user signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
