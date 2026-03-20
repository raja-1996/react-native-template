-- =============================================
-- Chat App Schema
-- =============================================

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    display_name text not null default '',
    avatar_url text,
    created_at timestamptz not null default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, display_name)
    values (new.id, new.email, split_part(new.email, '@', 1));
    return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();

-- Rooms table
create table if not exists public.rooms (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    created_by uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_rooms_created_by on public.rooms(created_by);

-- Messages table
create table if not exists public.messages (
    id uuid default gen_random_uuid() primary key,
    room_id uuid not null references public.rooms(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    content text not null default '',
    image_path text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_messages_room on public.messages(room_id, created_at);
create index if not exists idx_messages_user on public.messages(user_id);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.messages enable row level security;

-- =============================================
-- RLS Policies
-- =============================================

-- Profiles: users can read all profiles, update own
create policy "Anyone can read profiles"
    on public.profiles for select
    using (true);

create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id);

-- Rooms: any authenticated user can read rooms, creator can modify
create policy "Authenticated users can read rooms"
    on public.rooms for select
    using (auth.role() = 'authenticated');

create policy "Users can create rooms"
    on public.rooms for insert
    with check (auth.uid() = created_by);

create policy "Creator can update room"
    on public.rooms for update
    using (auth.uid() = created_by);

create policy "Creator can delete room"
    on public.rooms for delete
    using (auth.uid() = created_by);

-- Messages: any authenticated user can read messages, own messages can be modified
create policy "Authenticated users can read messages"
    on public.messages for select
    using (auth.role() = 'authenticated');

create policy "Authenticated users can send messages"
    on public.messages for insert
    with check (auth.uid() = user_id);

create policy "Users can update own messages"
    on public.messages for update
    using (auth.uid() = user_id);

create policy "Users can delete own messages"
    on public.messages for delete
    using (auth.uid() = user_id);

-- Service role bypass for all tables
create policy "Service role full access profiles"
    on public.profiles for all
    using (auth.role() = 'service_role');

create policy "Service role full access rooms"
    on public.rooms for all
    using (auth.role() = 'service_role');

create policy "Service role full access messages"
    on public.messages for all
    using (auth.role() = 'service_role');

-- =============================================
-- Triggers
-- =============================================

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger rooms_updated_at
    before update on public.rooms
    for each row
    execute function public.update_updated_at();

create trigger messages_updated_at
    before update on public.messages
    for each row
    execute function public.update_updated_at();

-- =============================================
-- Realtime
-- =============================================

alter publication supabase_realtime add table public.messages;

-- =============================================
-- Storage
-- =============================================

-- Create storage bucket for chat images
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', false)
on conflict (id) do nothing;

-- Storage policies
create policy "Users can upload chat images"
    on storage.objects for insert
    with check (
        bucket_id = 'chat-images'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "Users can read chat images"
    on storage.objects for select
    using (
        bucket_id = 'chat-images'
    );

create policy "Users can delete own chat images"
    on storage.objects for delete
    using (
        bucket_id = 'chat-images'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "Service role full storage access"
    on storage.objects for all
    using (auth.role() = 'service_role');
