-- Category names are unique ignoring case and surrounding spaces
-- ("legislazione" clashes with "Legislazione"). The plain unique on name stays.
create unique index categories_name_ci_key on public.categories (lower(btrim(name)));
