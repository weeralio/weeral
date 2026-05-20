-- ============================================================
-- SCHEMA - Mailing SaaS
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

-- Extension UUID
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type domain_status as enum ('warmup', 'active', 'blocked', 'paused');
create type campaign_status as enum ('draft', 'scheduled', 'running', 'paused', 'completed', 'blocked');
create type campaign_contact_status as enum ('pending', 'sent', 'bounced', 'complained', 'unsubscribed', 'failed');
create type email_status as enum ('sent', 'delivered', 'bounced', 'complained');

-- ============================================================
-- TABLES
-- ============================================================

-- Profil utilisateur (extension de auth.users Supabase)
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  plan        text not null default 'free',
  created_at  timestamptz not null default now()
);

-- Credentials AWS SES (chiffrés AES-256 côté serveur avant stockage)
create table aws_credentials (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  access_key_id       text not null,  -- chiffré
  secret_access_key   text not null,  -- chiffré
  aws_region          text not null default 'us-east-1',
  ses_in_production   boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique(user_id)  -- 1 compte AWS par user (MVP)
);

-- Domaines d'envoi avec état warmup
create table domains (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  domain          text not null,
  status          domain_status not null default 'warmup',
  warmup_day      int not null default 1,    -- jour actuel dans le planning warmup
  daily_limit     int not null default 100,  -- plafond emails/jour calculé par le warmup
  sent_today      int not null default 0,    -- remis à 0 chaque nuit par cron
  bounce_rate     numeric(5,2) not null default 0,     -- moyenne glissante 7 jours (%)
  complaint_rate  numeric(5,2) not null default 0,     -- moyenne glissante 7 jours (%)
  blocked_reason  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(user_id, domain)
);

-- Adresses email vérifiées dans SES (ex: john@company.com)
create table sender_identities (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  domain_id     uuid not null references domains(id) on delete cascade,
  email         text not null,
  display_name  text,
  ses_verified  boolean not null default false,
  created_at    timestamptz not null default now(),
  unique(user_id, email)
);

-- Contacts globaux par user (réutilisables entre campagnes)
create table contacts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  email            text not null,
  first_name       text,
  last_name        text,
  company          text,
  metadata         jsonb not null default '{}',  -- champs custom libres
  unsubscribed     boolean not null default false,
  unsubscribed_at  timestamptz,
  created_at       timestamptz not null default now(),
  unique(user_id, email)
);

-- Campagnes email
create table campaigns (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references profiles(id) on delete cascade,
  sender_identity_id    uuid not null references sender_identities(id),
  name                  text not null,
  subject               text not null,
  body_html             text not null,
  body_text             text,
  status                campaign_status not null default 'draft',
  scheduled_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Contacts par campagne + statut individuel de livraison
create table campaign_contacts (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  contact_id   uuid not null references contacts(id) on delete cascade,
  status       campaign_contact_status not null default 'pending',
  sent_at      timestamptz,
  unique(campaign_id, contact_id)
);

-- Log des emails envoyés (pour matching webhooks SES/SNS)
create table emails (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references campaigns(id) on delete cascade,
  contact_id      uuid not null references contacts(id),
  domain_id       uuid not null references domains(id),
  ses_message_id  text,  -- ID retourné par SES, utilisé pour matcher les bounces
  status          email_status not null default 'sent',
  sent_at         timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Métriques journalières par domaine (historique warmup)
create table warmup_logs (
  id           uuid primary key default gen_random_uuid(),
  domain_id    uuid not null references domains(id) on delete cascade,
  date         date not null default current_date,
  emails_sent  int not null default 0,
  bounces      int not null default 0,
  complaints   int not null default 0,
  unique(domain_id, date)
);

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on aws_credentials
  for each row execute function update_updated_at();
create trigger set_updated_at before update on domains
  for each row execute function update_updated_at();
create trigger set_updated_at before update on campaigns
  for each row execute function update_updated_at();
create trigger set_updated_at before update on emails
  for each row execute function update_updated_at();

-- ============================================================
-- TRIGGER : création automatique du profil à l'inscription
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- INDEX
-- ============================================================

create index on domains(user_id);
create index on contacts(user_id);
create index on campaigns(user_id);
create index on campaign_contacts(campaign_id);
create index on campaign_contacts(contact_id);
create index on emails(campaign_id);
create index on emails(ses_message_id);  -- pour matcher les webhooks SNS rapidement
create index on warmup_logs(domain_id, date);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Chaque user ne voit que ses propres données
-- ============================================================

alter table profiles enable row level security;
alter table aws_credentials enable row level security;
alter table domains enable row level security;
alter table sender_identities enable row level security;
alter table contacts enable row level security;
alter table campaigns enable row level security;
alter table campaign_contacts enable row level security;
alter table emails enable row level security;
alter table warmup_logs enable row level security;

create policy "users manage own profile" on profiles
  for all using (auth.uid() = id);

create policy "users manage own aws_credentials" on aws_credentials
  for all using (auth.uid() = user_id);

create policy "users manage own domains" on domains
  for all using (auth.uid() = user_id);

create policy "users manage own sender_identities" on sender_identities
  for all using (auth.uid() = user_id);

create policy "users manage own contacts" on contacts
  for all using (auth.uid() = user_id);

create policy "users manage own campaigns" on campaigns
  for all using (auth.uid() = user_id);

create policy "users manage own campaign_contacts" on campaign_contacts
  for all using (
    exists (
      select 1 from campaigns
      where campaigns.id = campaign_contacts.campaign_id
      and campaigns.user_id = auth.uid()
    )
  );

create policy "users manage own emails" on emails
  for all using (
    exists (
      select 1 from campaigns
      where campaigns.id = emails.campaign_id
      and campaigns.user_id = auth.uid()
    )
  );

create policy "users manage own warmup_logs" on warmup_logs
  for all using (
    exists (
      select 1 from domains
      where domains.id = warmup_logs.domain_id
      and domains.user_id = auth.uid()
    )
  );

-- ============================================================
-- FONCTIONS RPC (utilisées par les crons)
-- ============================================================

create or replace function increment_warmup_log(p_domain_id uuid, p_date date)
returns void as $$
begin
  insert into public.warmup_logs(domain_id, date, emails_sent)
  values (p_domain_id, p_date, 1)
  on conflict (domain_id, date)
  do update set emails_sent = warmup_logs.emails_sent + 1;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function increment_warmup_log_bounces(p_domain_id uuid, p_date date)
returns void as $$
begin
  insert into public.warmup_logs(domain_id, date, bounces)
  values (p_domain_id, p_date, 1)
  on conflict (domain_id, date)
  do update set bounces = warmup_logs.bounces + 1;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function increment_warmup_log_complaints(p_domain_id uuid, p_date date)
returns void as $$
begin
  insert into public.warmup_logs(domain_id, date, complaints)
  values (p_domain_id, p_date, 1)
  on conflict (domain_id, date)
  do update set complaints = warmup_logs.complaints + 1;
end;
$$ language plpgsql security definer set search_path = public;
