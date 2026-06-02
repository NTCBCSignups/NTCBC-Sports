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

insert into public.sport_configs (
    id,
    auth_enabled,
    emoji,
    name,
    type,
    description,
    config
)
values (
    'softball',
    true,
    '🥎',
    'Softball',
    'Drop-in Practices & Scheduled CCSA Games',
    'Join us for Drop-in Practices. Scheduled Games are only open to confirmed CCSA Team Members.',
    $$
    {
        "day": "Click to see schedule",
        "organizers": "Brandon Cho, Joshua Wong, Isaac Ng",
        "location": {
            "name": "Various locations",
            "address": "See individual sessions"
        },
        "notes": [
            "Our team plays in the CCSA (Christian Community Softball Association), a Toronto-area church softball league that runs during the summer with Senior and Junior divisions.",
            "Team registration for the 2026 season is now closed, but if you're an NTCBC Member, you're welcome to join our drop-in practice sessions! It's a great time for us to connect not only through the game but also with each other and the message of the gospel. Everyone, regardless of your faith background, is welcome.",
            "Softball has two session types: Drop-in Practice (open to all) & Scheduled Games (team members only).",
            "Sign in with Google to sign up for sessions. If you can no longer attend, please cancel your signup.",
            "Please contact the leaders if you have any questions."
        ],
        "defaultTab": "",
        "adminTabs": [
            { "id": "requests", "label": "Access Requests", "iconName": "ClipboardList" },
            { "id": "create", "label": "Create Session", "iconName": "Plus" },
            { "id": "upcoming", "label": "Upcoming Sessions", "iconName": "Calendar" },
            { "id": "past", "label": "Past Sessions", "iconName": "History" },
            { "id": "ccsa", "label": "CCSA Sync", "iconName": "RefreshCw" }
        ],
        "tabs": [
            {
                "value": "drop_in_practice",
                "label": "Practices",
                "defaultTitlePrefix": "Practices",
                "sessionPillColor": "emerald",
                "permissions": {
                    "overview": 1,
                    "view": 1,
                    "signup": 1
                },
                "signupConfirmationDialog": {
                    "maxRole": 1,
                    "message": "Do you go to NTCBC? (Only) If not, have you been approved by a leader to participate?",
                    "rejectedMessage": "This session is for team members, NTCBC goers and approved participants. Please contact the leaders if you'd like to join."
                }
            },
            {
                "value": "scheduled_game",
                "label": "Games",
                "defaultTitlePrefix": "Game",
                "sessionPillColor": "indigo",
                "permissions": {
                    "overview": 1,
                    "view": 2,
                    "signup": 2
                }
            },
            {
                "value": "socials",
                "label": "Socials",
                "defaultTitlePrefix": "Social",
                "sessionPillColor": "gray",
                "permissions": {
                    "overview": 2,
                    "view": 2,
                    "signup": 2
                }
            },
            {
                "value": "umpiring",
                "label": "Umpiring",
                "defaultTitlePrefix": "Umpiring",
                "sessionPillColor": "amber",
                "permissions": {
                    "overview": 2,
                    "view": 2,
                    "signup": 2
                }
            }
        ]
    }
    $$::jsonb
);
