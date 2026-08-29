create extension if not exists pg_trgm;

create index if not exists cable_transactions_created_at_idx
  on public.cable_transactions (created_at desc);
create index if not exists cable_transactions_ref_no_idx
  on public.cable_transactions (ref_no);
create index if not exists cable_transactions_ref_no_trgm_idx
  on public.cable_transactions using gin (ref_no gin_trgm_ops);
create index if not exists drum_cables_drum_id_trgm_idx
  on public.drum_cables using gin (drum_id gin_trgm_ops);
create index if not exists cable_transactions_ref_search_idx
  on public.cable_transactions using gin (
    to_tsvector('simple'::regconfig, coalesce(ref_no, ''))
  );
create index if not exists drum_cables_search_idx
  on public.drum_cables using gin (
    to_tsvector(
      'simple'::regconfig,
      coalesce(drum_id, '') || ' ' || coalesce(size, '')
    )
  );

drop function if exists public.get_transaction_page(integer, integer, text, date, date);

create or replace function public.get_transaction_page(
  p_cursor_created_at timestamptz default null,
  p_cursor_ref text default null,
  p_page_size integer default 15,
  p_search text default null,
  p_from_date date default null,
  p_to_date date default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with filtered as (
  select
    ct.id,
    ct.created_at,
    ct.length_cut,
    ct.balance_cable,
    ct.ref_no,
    d.id as drum_pk,
    d.drum_id as drum_number,
    d.size,
    d.testcertificate,
    ty.type_name,
    b.id as brand_pk,
    b.brand_name
  from public.cable_transactions ct
  join public.drum_cables d on d.id = ct.drum_id
  join public.type ty on ty.id = d.type
  join public.brand b on b.id = d.brand
  where (p_from_date is null or ct.created_at >= p_from_date)
    and (p_to_date is null or ct.created_at < p_to_date + interval '1 day')
    and (nullif(trim(p_search), '') is null
      or to_tsvector('simple', coalesce(ct.ref_no, '')) @@ websearch_to_tsquery('simple', trim(p_search))
      or to_tsvector('simple'::regconfig, coalesce(d.drum_id, '') || ' ' || coalesce(d.size, ''))
        @@ websearch_to_tsquery('simple'::regconfig, trim(p_search))
      or ct.ref_no ilike '%' || trim(p_search) || '%'
      or d.drum_id ilike '%' || trim(p_search) || '%'
      or ty.type_name ilike '%' || trim(p_search) || '%'
      or b.brand_name ilike '%' || trim(p_search) || '%')
), grouped as (
  select ref_no, max(created_at) as max_created_at,
    coalesce(ref_no, '') as ref_sort
  from filtered
  group by ref_no
), page_groups_with_extra as (
  select
    ref_no,
    max_created_at,
    ref_sort,
    row_number() over (
      order by max_created_at desc, ref_sort desc
    ) as row_num
  from grouped
  where p_cursor_created_at is null
    or (max_created_at, ref_sort) < (p_cursor_created_at, coalesce(p_cursor_ref, ''))
  order by max_created_at desc, ref_sort desc
  limit least(greatest(p_page_size, 1) + 1, 101)
), page_groups as (
  select ref_no, max_created_at, ref_sort
  from page_groups_with_extra
  where row_num <= least(greatest(p_page_size, 1), 100)
)
select jsonb_build_object(
  'total_count', (select count(*) from grouped),
  'has_more', exists (
    select 1
    from page_groups_with_extra
    where row_num > least(greatest(p_page_size, 1), 100)
  ),
  'next_cursor', (select jsonb_build_object(
      'created_at', pg.max_created_at,
      'ref_no', pg.ref_no
    ) from page_groups pg
    order by pg.max_created_at desc, pg.ref_sort desc
    offset least(greatest(p_page_size, 1), 100) - 1
    limit 1),
  'groups', coalesce((
    select jsonb_agg(jsonb_build_object(
      'ref_no', pg.ref_no,
      'transactions', (
        select jsonb_agg(jsonb_build_object(
          'id', f.id,
          'created_at', f.created_at,
          'length_cut', f.length_cut,
          'balance_cable', f.balance_cable,
          'ref_no', f.ref_no,
          'drum_id', jsonb_build_object(
            'id', f.drum_pk,
            'drum_id', f.drum_number,
            'size', f.size,
            'testcertificate', f.testcertificate,
            'type', jsonb_build_object('type_name', f.type_name),
            'brand', jsonb_build_object('id', f.brand_pk, 'brand_name', f.brand_name)
          )
        ) order by f.created_at desc)
        from filtered f
        where f.ref_no is not distinct from pg.ref_no
      ),
      'totalCables', (select count(*) from filtered f where f.ref_no is not distinct from pg.ref_no),
      'totalLength', (select coalesce(sum(f.length_cut), 0) from filtered f where f.ref_no is not distinct from pg.ref_no),
      'minDate', (select min(f.created_at)::date from filtered f where f.ref_no is not distinct from pg.ref_no),
      'maxDate', (select max(f.created_at)::date from filtered f where f.ref_no is not distinct from pg.ref_no)
    ) order by pg.max_created_at desc, coalesce(pg.ref_no, '') desc)
    from page_groups pg
  ), '[]'::jsonb)
);
$$;

create or replace function public.reverse_transaction_group(p_transaction_ids text[])
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  transaction_record record;
  reversed_count integer := 0;
begin
  for transaction_record in
    select ct.id, ct.length_cut, ct.drum_id, d.curr_length, d.initial_length
    from public.cable_transactions ct
    join public.drum_cables d on d.id = ct.drum_id
    where ct.id::text = any(p_transaction_ids)
    for update of ct, d
  loop
    update public.drum_cables
    set curr_length = curr_length + transaction_record.length_cut,
        open = case
          when curr_length + transaction_record.length_cut = initial_length then false
          else open
        end
    where id = transaction_record.drum_id;

    delete from public.cable_transactions
    where id::text = transaction_record.id::text;
    reversed_count := reversed_count + 1;
  end loop;

  return reversed_count;
end;
$$;

grant execute on function public.get_transaction_page(timestamptz, text, integer, text, date, date)
  to anon, authenticated;

create or replace function public.get_transaction_export(
  p_search text default null,
  p_from_date date default null,
  p_to_date date default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
select coalesce(jsonb_agg(jsonb_build_object(
  'id', ct.id,
  'created_at', ct.created_at,
  'length_cut', ct.length_cut,
  'balance_cable', ct.balance_cable,
  'ref_no', ct.ref_no,
  'drum_id', jsonb_build_object(
    'id', d.id,
    'drum_id', d.drum_id,
    'size', d.size,
    'testcertificate', d.testcertificate,
    'type', jsonb_build_object('type_name', ty.type_name),
    'brand', jsonb_build_object('id', b.id, 'brand_name', b.brand_name)
  )
) order by ct.created_at desc, ct.id desc), '[]'::jsonb)
from public.cable_transactions ct
join public.drum_cables d on d.id = ct.drum_id
join public.type ty on ty.id = d.type
join public.brand b on b.id = d.brand
where (p_from_date is null or ct.created_at >= p_from_date)
  and (p_to_date is null or ct.created_at < p_to_date + interval '1 day')
  and (nullif(trim(p_search), '') is null
    or ct.ref_no ilike '%' || trim(p_search) || '%'
    or d.drum_id ilike '%' || trim(p_search) || '%'
    or d.size ilike '%' || trim(p_search) || '%'
    or ty.type_name ilike '%' || trim(p_search) || '%'
    or b.brand_name ilike '%' || trim(p_search) || '%');
$$;

grant execute on function public.get_transaction_export(text, date, date)
  to anon, authenticated;
grant execute on function public.reverse_transaction_group(text[])
  to authenticated;

notify pgrst, 'reload schema';