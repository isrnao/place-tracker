-- Functions providing data for the application

CREATE OR REPLACE FUNCTION prefecture_progress(p_category int DEFAULT NULL)
RETURNS TABLE(id int, name text, visited int, total int)
LANGUAGE sql STABLE AS $$
  SELECT pr.id,
         pr.name,
         COUNT(v.place_id) AS visited,
         COUNT(pl.id) AS total
  FROM prefectures pr
  LEFT JOIN places pl ON pl.prefecture_id = pr.id
  LEFT JOIN visits v ON v.place_id = pl.id
  WHERE p_category IS NULL OR pl.category_id = p_category
  GROUP BY pr.id, pr.name
  ORDER BY pr.id;
$$;

CREATE OR REPLACE FUNCTION places_with_visit(p_prefecture int, p_category int DEFAULT NULL)
RETURNS TABLE(id int, name text, visited boolean)
LANGUAGE sql STABLE AS $$
  SELECT pl.id,
         pl.name,
         v.place_id IS NOT NULL AS visited
  FROM places pl
  LEFT JOIN visits v ON v.place_id = pl.id
  WHERE pl.prefecture_id = p_prefecture
    AND (p_category IS NULL OR pl.category_id = p_category)
  ORDER BY pl.id;
$$;

CREATE OR REPLACE FUNCTION places_by_category(p_category int)
RETURNS TABLE(id int, name text, prefecture_id int, visited boolean)
LANGUAGE sql STABLE AS $$
  SELECT pl.id,
         pl.name,
         pl.prefecture_id,
         v.place_id IS NOT NULL AS visited
  FROM places pl
  LEFT JOIN visits v ON v.place_id = pl.id
  WHERE pl.category_id = p_category
  ORDER BY pl.prefecture_id, pl.id;
$$;
