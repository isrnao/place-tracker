create or replace function prefecture_progress(
    p_user_id uuid,
    p_category int default null)
returns table(id int, name text, visited int, total int)
language sql stable as $$
  select pr.id,
         pr.name,
         count(v.place_id) filter (where v.user_id = p_user_id) as visited,
         count(pl.id) as total
  from prefectures pr
  left join places pl on pl.prefecture_id = pr.id
  left join visits v on v.place_id = pl.id
  where p_category is null or pl.category_id = p_category
  group by pr.id, pr.name
  order by pr.id;
$$;

create or replace function places_with_visit(
    p_user_id uuid,
    p_prefecture int,
    p_category int default null)
returns table(id int, name text, visited boolean)
language sql stable as $$
  select pl.id,
         pl.name,
         exists (select 1
                   from visits v
                  where v.place_id = pl.id
                    and v.user_id = p_user_id) as visited
  from places pl
  where pl.prefecture_id = p_prefecture
    and (p_category is null or pl.category_id = p_category)
  order by pl.id;
$$;

create or replace function places_by_category(
    p_user_id uuid,
    p_category int)
returns table(id int, name text, prefecture_id int, visited boolean)
language sql stable as $$
  select pl.id,
         pl.name,
         pl.prefecture_id,
         exists (select 1 from visits v where v.place_id = pl.id and v.user_id = p_user_id) as visited
  from places pl
  where pl.category_id = p_category
  order by pl.prefecture_id, pl.id;
$$;
