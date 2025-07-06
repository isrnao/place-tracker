-- Add user_id to visits table with composite primary key
alter table if exists visits rename to visits_old;

create table visits (
  user_id uuid references auth.users(id) on delete cascade,
  place_id int references places(id) on delete cascade,
  visited_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

insert into visits (user_id, place_id, visited_at)
select coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), place_id, now()
from visits_old;

drop table visits_old;

alter table visits enable row level security;
create policy "Self-owned visits only" on visits
  for all
  using (auth.uid() = user_id);
