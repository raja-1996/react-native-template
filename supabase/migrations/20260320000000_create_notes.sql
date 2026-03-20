-- Create notes table
create table if not exists public.notes (
    id uuid default gen_random_uuid() primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    content text not null default '',
    attachment_path text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Index for fast user lookups
create index if not exists idx_notes_user_id on public.notes(user_id);

-- Enable RLS
alter table public.notes enable row level security;

-- RLS policies: users can only access their own notes
create policy "Users can select own notes"
    on public.notes for select
    using (auth.uid() = user_id);

create policy "Users can insert own notes"
    on public.notes for insert
    with check (auth.uid() = user_id);

create policy "Users can update own notes"
    on public.notes for update
    using (auth.uid() = user_id);

create policy "Users can delete own notes"
    on public.notes for delete
    using (auth.uid() = user_id);

-- Service role bypass (for FastAPI service role key)
create policy "Service role full access"
    on public.notes for all
    using (auth.role() = 'service_role');

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger notes_updated_at
    before update on public.notes
    for each row
    execute function public.update_updated_at();

-- Enable realtime for notes table
alter publication supabase_realtime add table public.notes;

-- Create storage bucket for attachments
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Storage policies
create policy "Users can upload own attachments"
    on storage.objects for insert
    with check (
        bucket_id = 'attachments'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "Users can read own attachments"
    on storage.objects for select
    using (
        bucket_id = 'attachments'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "Users can delete own attachments"
    on storage.objects for delete
    using (
        bucket_id = 'attachments'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "Service role full storage access"
    on storage.objects for all
    using (auth.role() = 'service_role');
