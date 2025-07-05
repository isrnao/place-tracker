# Database Schema

## tables

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

- `place_id` integer references `places.id`
