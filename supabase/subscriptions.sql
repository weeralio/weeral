-- Subscriptions (Stripe)
create table if not exists subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references auth.users(id) on delete set null,
  email                  text,
  stripe_customer_id     text unique not null,
  stripe_subscription_id text unique not null,
  plan                   text not null check (plan in ('starter', 'growth', 'agency')),
  billing                text not null check (billing in ('monthly', 'annual')),
  status                 text not null default 'incomplete',
  current_period_end     timestamptz,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- Index for fast lookup by user
create index if not exists subscriptions_user_id_idx on subscriptions(user_id);
create index if not exists subscriptions_email_idx   on subscriptions(email);

-- RLS
alter table subscriptions enable row level security;

create policy "users see own subscription" on subscriptions
  for select using (auth.uid() = user_id);

-- Webhook (service role) bypasses RLS — no insert/update policy needed
