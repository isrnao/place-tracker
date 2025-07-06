-- Initial schema for Place Tracker
CREATE TABLE IF NOT EXISTS categories (
  id serial PRIMARY KEY,
  key text NOT NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS prefectures (
  id serial PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS places (
  id serial PRIMARY KEY,
  prefecture_id integer NOT NULL REFERENCES prefectures(id) ON DELETE CASCADE,
  category_id integer NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS visits (
  place_id integer PRIMARY KEY REFERENCES places(id) ON DELETE CASCADE
);
