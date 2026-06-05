-- Sport-level configuration source of truth for [sport]-routed pages.
-- Keep obvious global metadata in first-class columns and everything else in JSONB.
create table public.sport_configs (
    id text primary key,
    auth_enabled boolean not null default false,
    emoji text not null,
    name text not null,
    type text not null,
    description text,
    config jsonb not null default '{}'::jsonb,
    updated_by uuid references public.profiles(id) on delete set null,
    updated_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    constraint sport_configs_id_nonempty check (id <> ''),
    constraint sport_configs_emoji_nonempty check (emoji <> ''),
    constraint sport_configs_name_nonempty check (name <> ''),
    constraint sport_configs_type_nonempty check (type <> ''),
    constraint sport_configs_config_is_object check (jsonb_typeof(config) = 'object')
);

create index sport_configs_updated_at_idx on public.sport_configs (updated_at desc);

alter table public.sport_configs enable row level security;

create policy "sport_configs_read"
    on public.sport_configs for select
    using (true);

create policy "sport_configs_insert"
    on public.sport_configs for insert
    with check (public.is_admin(auth.uid()));

create policy "sport_configs_update"
    on public.sport_configs for update
    using (public.is_sport_admin(auth.uid(), id))
    with check (public.is_sport_admin(auth.uid(), id));

create policy "sport_configs_delete"
    on public.sport_configs for delete
    using (public.is_admin(auth.uid()));
