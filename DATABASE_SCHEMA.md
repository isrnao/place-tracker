# Database Schema

This project stores its data in a Postgres database managed by Supabase.
The schema consists of the following tables and helper SQL functions used by the
application loaders.

## Tables

### categories

- `id` integer primary key
- `key` text
- `slug` text unique
- `name` text

### prefectures

- `id` integer primary key
- `name` text

### places

- `id` integer primary key
- `prefecture_id` integer references `prefectures.id`
- `category_id` integer references `categories.id`
- `name` text

### visits

- `user_id` uuid references `auth.users.id`
- `place_id` integer references `places.id`
- `visited_at` timestamptz default `now()`
- primary key (`user_id`, `place_id`)
- row level security enabled with policy `auth.uid() = user_id`

## Functions

### `prefecture_progress(p_user_id uuid, p_category int)`

Returns progress information for each prefecture. When `p_category` is `NULL`
all categories are aggregated. The result contains `id`, `name`, `visited`
(count of visits), and `total` (number of places).

### `places_with_visit(p_user_id uuid, p_prefecture int, p_category int)`

Returns all places for the specified prefecture and optional category together
with a boolean `visited` flag.

### `places_by_category(p_user_id uuid, p_category int)`

Returns all places for the provided category across all prefectures with a
`visited` flag.
