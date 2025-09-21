-- 0001_init_schema.sql
-- Core DB objects, RLS, and matching helpers

create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

create type public.user_role as enum ('admin','firm_admin','firm_member','client');
create type public.subscription_plan as enum ('free','starter','pro');
create type public.subscription_status as enum ('inactive','active','past_due','canceled');
create type public.match_status as enum ('notified','accepted','declined','contacted','ignored');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'client',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger if not exists trg_profiles_updated before update on public.profiles
for each row execute procedure public.set_updated_at();

create table if not exists public.firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  email text,
  phone text,
  website text,
  description text,
  logo_url text,
  hero_image_url text,
  address text,
  city text,
  province text,
  country text not null default 'ZA',
  latitude double precision,
  longitude double precision,
  is_published boolean not null default false,
  bbee_level text,
  law_society_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger if not exists trg_firms_updated before update on public.firms
for each row execute procedure public.set_updated_at();

create table if not exists public.firm_members (
  firm_id uuid references public.firms(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role public.user_role not null default 'firm_member',
  status text not null default 'active',
  primary key (firm_id, user_id),
  created_at timestamptz not null default now()
);

create table if not exists public.practice_areas (
  id serial primary key,
  slug text unique not null,
  name text not null,
  description text
);

create table if not exists public.firm_practice_areas (
  firm_id uuid references public.firms(id) on delete cascade,
  practice_area_id int references public.practice_areas(id) on delete cascade,
  price_tier text check (price_tier in ('budget','standard','premium')),
  experience_years int default 0,
  primary key (firm_id, practice_area_id)
);

create table if not exists public.languages (
  code text primary key,
  name text not null
);

create table if not exists public.firm_languages (
  firm_id uuid references public.firms(id) on delete cascade,
  language_code text references public.languages(code) on delete cascade,
  primary key (firm_id, language_code)
);

create table if not exists public.provinces (
  id serial primary key,
  name text not null,
  slug text unique not null
);

create table if not exists public.cities (
  id serial primary key,
  province_id int references public.provinces(id) on delete cascade,
  name text not null,
  slug text not null,
  latitude double precision,
  longitude double precision,
  unique (province_id, slug)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  city text,
  province text,
  preferred_language_code text references public.languages(code),
  description text not null,
  practice_area_ids int[] default '{}',
  budget_range text,
  urgency text,
  remote_ok boolean default true,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  firm_id uuid references public.firms(id) on delete cascade,
  score numeric not null,
  status public.match_status not null default 'notified',
  created_at timestamptz not null default now(),
  unique (lead_id, firm_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid unique references public.firms(id) on delete cascade,
  plan public.subscription_plan not null default 'free',
  status public.subscription_status not null default 'inactive',
  payfast_subscription_id text,
  payfast_token text,
  m_payment_id text,
  next_bill_date date,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger if not exists trg_subscriptions_updated before update on public.subscriptions
for each row execute procedure public.set_updated_at();

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  payfast_payment_id text,
  amount_cents integer not null,
  currency text not null default 'ZAR',
  status text not null,
  paid_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid references public.firms(id) on delete cascade,
  source text not null,
  input_text text not null,
  model text not null,
  suggestions jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.firms add column if not exists search_vector tsvector;
create index if not exists idx_firms_search on public.firms using gin (search_vector);
create or replace function public.update_firms_search_vector()
returns trigger language plpgsql as $$
begin
  new.search_vector := to_tsvector('simple',
    coalesce(new.name,'') || ' ' ||
    coalesce(new.description,'') || ' ' ||
    coalesce(new.city,'') || ' ' ||
    coalesce(new.province,'')
  );
  return new;
end $$;

create trigger if not exists trg_firms_tsv before insert or update on public.firms
for each row execute procedure public.update_firms_search_vector();

create or replace function public.haversine_km(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
returns double precision language plpgsql immutable as $$
declare r int := 6371; dlat double precision := radians(lat2-lat1); dlon double precision := radians(lon2-lon1); a double precision; c double precision; begin
  if lat1 is null or lon1 is null or lat2 is null or lon2 is null then return null; end if;
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)^2;
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  return r * c;
end $$;

create table if not exists public.match_weights (
  id int primary key default 1,
  practice_area numeric not null default 0.5,
  location numeric not null default 0.2,
  price_tier numeric not null default 0.1,
  language numeric not null default 0.1,
  profile_completeness numeric not null default 0.1
);
insert into public.match_weights (id) values (1) on conflict (id) do nothing;

create or replace function public.compute_match_score(p_lead uuid, p_firm uuid)
returns numeric language plpgsql stable as $$
declare w record; score numeric := 0; pa_overlap int := 0; pa_count int := 0; loc_score numeric := 0; price_score numeric := 0; lang_score numeric := 0; prof_score numeric := 0; l record; f record; overlap int := 0; begin
  select * into w from public.match_weights where id=1;
  select * into l from public.leads where id = p_lead;
  select * into f from public.firms where id = p_firm;
  select count(*) into overlap
  from public.firm_practice_areas fpa
  join unnest(coalesce(l.practice_area_ids, '{}')) as pid on pid = fpa.practice_area_id
  where fpa.firm_id = p_firm;
  pa_overlap := overlap;
  pa_count := greatest(array_length(coalesce(l.practice_area_ids, '{}'), 1), 1);
  score := score + (w.practice_area * (pa_overlap::numeric / pa_count::numeric));
  if l.city is not null and l.province is not null and f.city is not null and f.province is not null then
    if l.city = f.city and l.province = f.province then loc_score := 1; elsif l.province = f.province then loc_score := 0.6; else loc_score := 0.3; end if;
  end if;
  if l.remote_ok then loc_score := greatest(loc_score, 0.5); end if;
  score := score + (w.location * loc_score);
  if l.preferred_language_code is not null then
    select count(*) into overlap from public.firm_languages fl where fl.firm_id = p_firm and fl.language_code = l.preferred_language_code;
    lang_score := case when overlap > 0 then 1 else 0 end;
    score := score + (w.language * lang_score);
  end if;
  if l.budget_range is not null then
    select count(*) into overlap from public.firm_practice_areas fpa
    join unnest(coalesce(l.practice_area_ids, '{}')) as pid on pid = fpa.practice_area_id
    where fpa.firm_id = p_firm and (
      (l.budget_range ilike '%low%' and fpa.price_tier = 'budget') or
      (l.budget_range ilike '%mid%' and fpa.price_tier = 'standard') or
      (l.budget_range ilike '%high%' and fpa.price_tier = 'premium')
    );
    price_score := case when overlap > 0 then 1 else 0.3 end;
  else
    price_score := 0.5;
  end if;
  prof_score := ((case when f.logo_url is not null then 0.2 else 0 end) + (case when f.description is not null then 0.2 else 0 end) + (case when exists (select 1 from public.firm_practice_areas where firm_id=p_firm) then 0.2 else 0 end) + (case when exists (select 1 from public.firm_languages where firm_id=p_firm) then 0.2 else 0 end) + (case when f.is_published then 0.2 else 0 end));
  score := score + (w.profile_completeness * prof_score);
  return round(score::numeric, 6);
end $$;

create or replace function public.match_firms_for_lead(p_lead uuid, p_limit int default 10)
returns table (firm_id uuid, score numeric) language sql stable as $$
  select f.id as firm_id, public.compute_match_score(p_lead, f.id) as score
  from public.firms f
  where f.is_published = true
  order by score desc
  limit p_limit;
$$;

alter table public.profiles enable row level security;
alter table public.firms enable row level security;
alter table public.firm_members enable row level security;
alter table public.practice_areas enable row level security;
alter table public.firm_practice_areas enable row level security;
alter table public.languages enable row level security;
alter table public.firm_languages enable row level security;
alter table public.provinces enable row level security;
alter table public.cities enable row level security;
alter table public.leads enable row level security;
alter table public.matches enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.ai_suggestions enable row level security;
alter table public.match_weights enable row level security;

create policy "profiles self select" on public.profiles for select using (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);

create policy "firms public read published" on public.firms for select using (is_published = true);
create policy "firms members read" on public.firms for select using (exists(select 1 from public.firm_members fm where fm.firm_id = id and fm.user_id = auth.uid()));
create policy "firms members update" on public.firms for update using (exists(select 1 from public.firm_members fm where fm.firm_id = id and fm.user_id = auth.uid() and fm.role in ('firm_admin','admin')));
create policy "firms members insert" on public.firms for insert with check (auth.uid() is not null);
create policy "firms members delete" on public.firms for delete using (exists(select 1 from public.firm_members fm where fm.firm_id = id and fm.user_id = auth.uid() and fm.role in ('firm_admin','admin')));

create policy "firm_members read" on public.firm_members for select using (user_id = auth.uid() or exists(select 1 from public.firm_members fm2 where fm2.firm_id = firm_id and fm2.user_id = auth.uid()));
create policy "firm_members manage" on public.firm_members for all using (exists(select 1 from public.firm_members fm2 where fm2.firm_id = firm_id and fm2.user_id = auth.uid() and fm2.role in ('firm_admin','admin'))) with check (exists(select 1 from public.firm_members fm2 where fm2.firm_id = firm_id and fm2.user_id = auth.uid() and fm2.role in ('firm_admin','admin')));

create policy "practice_areas read" on public.practice_areas for select using (true);
create policy "languages read" on public.languages for select using (true);
create policy "provinces read" on public.provinces for select using (true);
create policy "cities read" on public.cities for select using (true);

create policy "firm_practice_areas read public" on public.firm_practice_areas for select using (true);
create policy "firm_practice_areas manage members" on public.firm_practice_areas for all using (exists(select 1 from public.firm_members fm where fm.firm_id = firm_id and fm.user_id = auth.uid())) with check (exists(select 1 from public.firm_members fm where fm.firm_id = firm_id and fm.user_id = auth.uid()));

create policy "firm_languages read public" on public.firm_languages for select using (true);
create policy "firm_languages manage members" on public.firm_languages for all using (exists(select 1 from public.firm_members fm where fm.firm_id = firm_id and fm.user_id = auth.uid())) with check (exists(select 1 from public.firm_members fm where fm.firm_id = firm_id and fm.user_id = auth.uid()));

create policy "leads owner read" on public.leads for select using (created_by = auth.uid());
create policy "leads owner insert" on public.leads for insert with check (created_by = auth.uid() or created_by is null);
create policy "leads owner update" on public.leads for update using (created_by = auth.uid());
create policy "leads firm match read" on public.leads for select using (exists(select 1 from public.matches m join public.firm_members fm on m.firm_id = fm.firm_id where m.lead_id = id and fm.user_id = auth.uid()));
