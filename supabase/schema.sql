-- Kepler Finance: PostgreSQL schema (Supabase project "kepler finance").
-- Already applied to the live database; kept here so the schema is versioned with the app.
--
-- Data sources:
--   * Every listed US security: Nasdaq Trader symbol directory (nasdaqlisted.txt + otherlisted.txt)
--   * Annual revenue: SEC EDGAR company_tickers.json + XBRL "frames" API
-- Refresh (run as the database owner, e.g. in the Supabase SQL editor):
--   select public.refresh_stocks();   -- new listings / renames
--   select public.refresh_revenue();  -- latest annual revenue

create extension if not exists pg_trgm with schema extensions;
create extension if not exists http with schema extensions;

create table if not exists public.stocks (
  symbol      text primary key,
  name        text not null,
  exchange    text not null,            -- NASDAQ, NYSE, NYSE American, NYSE Arca, Cboe BZX, IEX, Other
  is_etf      boolean not null default false,
  cik         bigint,                   -- SEC company id
  revenue_usd numeric,                  -- latest annual revenue from SEC filings (null if unknown)
  revenue_fy  int,
  updated_at  timestamptz not null default now()
);

create index if not exists stocks_symbol_trgm on public.stocks using gin (symbol extensions.gin_trgm_ops);
create index if not exists stocks_name_trgm   on public.stocks using gin (name extensions.gin_trgm_ops);

alter table public.stocks enable row level security;
drop policy if exists "stocks are publicly readable" on public.stocks;
create policy "stocks are publicly readable" on public.stocks for select to anon, authenticated using (true);

-- Ranked company search: exact ticker > ticker prefix > name prefix > stocks before ETFs > bigger revenue > fuzzy
create or replace function public.search_stocks(q text, lim int default 20)
returns setof public.stocks
language sql stable
set search_path = public, extensions
as $$
  select s.*
  from public.stocks s
  where length(trim(q)) > 0
    and (s.symbol ilike trim(q) || '%' or s.name ilike '%' || trim(q) || '%' or s.name % trim(q))
  order by
    (upper(s.symbol) = upper(trim(q))) desc,
    (s.symbol ilike trim(q) || '%') desc,
    (s.name ilike trim(q) || '%') desc,
    s.is_etf asc,
    s.revenue_usd desc nulls last,
    similarity(s.name, trim(q)) desc,
    s.symbol
  limit least(greatest(lim, 1), 50);
$$;
grant execute on function public.search_stocks(text, int) to anon, authenticated;

-- One row per company (share classes share a CIK), biggest revenue first.
create or replace function public.largest_companies(lim int default 20)
returns setof public.stocks
language sql stable
set search_path = public
as $$
  select * from (
    select distinct on (cik) * from public.stocks
    where not is_etf and revenue_usd is not null and cik is not null
    order by cik, length(symbol), symbol
  ) t
  order by revenue_usd desc
  limit least(greatest(lim, 1), 100);
$$;
grant execute on function public.largest_companies(int) to anon, authenticated;

-- Display-name cleanup: strip share-class / depositary boilerplate, "X (The)" -> "The X".
create or replace function public.clean_security_name(n text)
returns text language sql immutable
set search_path = public
as $$
  select regexp_replace(
           trim(regexp_replace(regexp_replace(
             split_part(n, ' - ', 1),
             '\s+American Depositary (Shares|Receipts).*$', '', 'i'),
             '\s+(Class [A-Z] )?(Common Stock|Common Shares|Ordinary Shares|Subordinate Voting Shares)\y.*$', '', 'i')),
           '^(.*) \(The\)$', 'The \1');
$$;

create or replace function public.refresh_stocks()
returns int
language plpgsql
security definer
set search_path = public, extensions
as $$
declare n int;
begin
  with nas as (
    select string_to_array(line, '|') f
    from regexp_split_to_table((select content from extensions.http_get('https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt')), E'\r?\n') line
    where line <> '' and line not like 'Symbol|%' and line not like 'File Creation Time%'
  ), oth as (
    select string_to_array(line, '|') f
    from regexp_split_to_table((select content from extensions.http_get('https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt')), E'\r?\n') line
    where line <> '' and line not like 'ACT Symbol|%' and line not like 'File Creation Time%'
  ), rows as (
    select f[1] as symbol, public.clean_security_name(f[2]) as name, 'NASDAQ' as exchange, f[7] = 'Y' as is_etf
    from nas where f[4] = 'N'
    union all
    select f[1], public.clean_security_name(f[2]),
           case f[3] when 'N' then 'NYSE' when 'A' then 'NYSE American' when 'P' then 'NYSE Arca'
                     when 'Z' then 'Cboe BZX' when 'V' then 'IEX' else 'Other' end,
           f[5] = 'Y'
    from oth where f[7] = 'N'
  )
  insert into public.stocks (symbol, name, exchange, is_etf, updated_at)
  select distinct on (symbol) symbol, name, exchange, is_etf, now() from rows
  where symbol <> '' and name <> ''
  on conflict (symbol) do update
    set name = excluded.name, exchange = excluded.exchange, is_etf = excluded.is_etf, updated_at = now();
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.refresh_stocks() from public, anon, authenticated;

create or replace function public.refresh_revenue()
returns int
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  ua extensions.http_header := extensions.http_header('User-Agent', 'KeplerFinance dashboard research admin@keplerfinance.example');
  y int; tag text; body jsonb; n int;
begin
  body := (select content::jsonb from extensions.http(('GET','https://www.sec.gov/files/company_tickers.json',array[ua],null,null)::extensions.http_request));
  update public.stocks s set cik = (v->>'cik_str')::bigint
  from jsonb_each(body) e(k, v)
  where s.symbol = replace(v->>'ticker', '-', '.');

  create temp table if not exists rev_tmp (cik bigint, val numeric, fy int) on commit drop;
  foreach y in array array[extract(year from now())::int - 1, extract(year from now())::int - 2] loop
    foreach tag in array array['Revenues','RevenueFromContractWithCustomerExcludingAssessedTax','RevenueFromContractWithCustomerIncludingAssessedTax','SalesRevenueNet'] loop
      select case when status = 200 then content::jsonb end into body
      from extensions.http(('GET', format('https://data.sec.gov/api/xbrl/frames/us-gaap/%s/USD/CY%s.json', tag, y), array[ua], null, null)::extensions.http_request);
      if body is not null then
        insert into rev_tmp select (d->>'cik')::bigint, (d->>'val')::numeric, extract(year from (d->>'end')::date)::int
        from jsonb_array_elements(body->'data') d;
      end if;
    end loop;
  end loop;

  with best as (
    select distinct on (r.cik) r.cik, r.val, r.fy from rev_tmp r where r.val > 0 order by r.cik, r.fy desc, r.val desc
  )
  update public.stocks s set revenue_usd = b.val, revenue_fy = b.fy, updated_at = now()
  from best b where s.cik = b.cik;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.refresh_revenue() from public, anon, authenticated;
