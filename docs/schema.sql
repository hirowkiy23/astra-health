-- ASTRA reference schema for Supabase PostgreSQL.
-- The hackathon demo uses local SQLite; this is the production-shaped target.

create table astronauts (
  id text primary key,
  name text not null,
  role text,
  mission_id text not null,
  mission_day int not null default 0,
  created_at timestamptz not null default now()
);

create table medical_profiles (
  astronaut_id text primary key references astronauts(id) on delete cascade,
  allergies text[] not null default '{}',
  medical_history text,
  baseline_data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table vital_readings (
  id uuid primary key default gen_random_uuid(),
  astronaut_id text not null references astronauts(id) on delete cascade,
  heart_rate int,
  spo2 numeric(5,2),
  temperature numeric(4,2),
  blood_pressure text,
  recorded_at timestamptz not null,
  simulated boolean not null default true,
  source text not null default 'demo'
);
create index vital_readings_astronaut_time on vital_readings (astronaut_id, recorded_at desc);

create table consultations (
  id text primary key,
  astronaut_id text not null references astronauts(id) on delete cascade,
  started_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'closed'))
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  consultation_id text not null references consultations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table medical_incidents (
  id text primary key,
  astronaut_id text not null references astronauts(id),
  consultation_id text not null references consultations(id),
  severity text not null check (severity in ('red', 'yellow', 'green')),
  symptoms text not null,
  response text not null,
  status text not null default 'open',
  triage_rule_id text,
  triage_validated boolean not null default false,
  created_at timestamptz not null default now()
);

-- Reference material is versioned so citations can be traced to what was retrieved.
create table references (
  id text primary key,
  title text not null,
  section text,
  source text not null,
  url text,
  version text not null,
  retrieved_at date
);

create table audit_events (
  id bigserial primary key,
  actor_id text,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  created_at timestamptz not null default now()
);

insert into astronauts (id, name, role, mission_id, mission_day)
values ('demo-001', 'Alex Morgan', 'Mission specialist', 'ARES-01', 127);

insert into medical_profiles (astronaut_id, allergies, medical_history, baseline_data)
values ('demo-001', '{}', 'Fictional demo profile.', '{"heart_rate":"64-72","spo2":"97-100"}');
