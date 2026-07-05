-- Rubro "Otro / General": caso base para negocios sin leyes sectoriales extra
-- (p. ej. una tienda pequeña que solo guarda teléfonos de clientes). Solo aplica
-- la Ley 21.719, multiplicador 1.00 (sin recargo sectorial), sort 0 → aparece
-- primero y es el rubro por defecto del wizard de alta. Idempotente.
insert into public.sectors (code, name, complexity_multiplier, laws, sort) values
  ('otro', 'Otro / General', 1.00, array['Ley 21.719'], 0)
on conflict (code) do update set
  name = excluded.name,
  complexity_multiplier = excluded.complexity_multiplier,
  laws = excluded.laws,
  sort = excluded.sort;
