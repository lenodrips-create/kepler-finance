-- Kepler Finance: PostgreSQL schema (Supabase project "kepler finance").
-- Already applied to the live database; kept here so the schema is versioned with the app.
--
-- Data sources:
--   * Every listed US security: Nasdaq Trader symbol directory (nasdaqlisted.txt + otherlisted.txt)
--   * Annual revenue: SEC EDGAR company_tickers.json + XBRL "frames" API
-- Refresh (run as the database owner, e.g. in the Supabase SQL editor):
--   select public.refresh_stocks();   -- new listings / renames
--   select public.refresh_revenue();  -- latest annual revenue
--   Prices and news (Yahoo Finance) refresh themselves on demand via stock_quote(), price_on() and stock_news().

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
-- New Supabase projects don't grant table access to the API roles by default: read-only for the site.
grant select on public.stocks to anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.stocks from anon, authenticated;

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

-- ---------------------------------------------------------------------------------------------
-- Real prices: Yahoo Finance daily closes, fetched on demand by the functions below and cached.
-- ---------------------------------------------------------------------------------------------
create table if not exists public.price_history (
  symbol text not null references public.stocks(symbol) on delete cascade,
  d      date not null,
  close  numeric not null,
  primary key (symbol, d)
);
create table if not exists public.price_meta (
  symbol       text primary key references public.stocks(symbol) on delete cascade,
  fetched_at   timestamptz not null default now(),
  history_from date,
  price        numeric,
  price_time   timestamptz,
  ok           boolean not null default true
);
-- No policies on purpose: these tables are only reachable through the functions below.
alter table public.price_history enable row level security;
alter table public.price_meta enable row level security;

-- Fetch daily closes for one symbol from `since` onward (internal).
CREATE OR REPLACE FUNCTION public._fetch_prices(sym text, since date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  r extensions.http_response;
  j jsonb;
  start_d date := least(since - 7, current_date - 380);   -- always cover the last year for quotes
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '6000');
  -- period1/period2 keep Yahoo on daily bars (range=max silently switches to monthly)
  r := extensions.http(('GET',
        format('https://query1.finance.yahoo.com/v8/finance/chart/%s?period1=%s&period2=%s&interval=1d',
               replace(sym, '.', '-'), extract(epoch from start_d::timestamp)::bigint, extract(epoch from now())::bigint),
        array[extensions.http_header('User-Agent', 'Mozilla/5.0 (KeplerFinance)')], null, null)::extensions.http_request);
  if r.status <> 200 then
    insert into price_meta(symbol, fetched_at, ok) values (sym, now(), false)
    on conflict (symbol) do update set fetched_at = now(), ok = false;
    return;
  end if;
  j := r.content::jsonb -> 'chart' -> 'result' -> 0;
  if j is null or j->'meta'->>'dataGranularity' <> '1d' then
    insert into price_meta(symbol, fetched_at, ok) values (sym, now(), false)
    on conflict (symbol) do update set fetched_at = now(), ok = false;
    return;
  end if;
  insert into price_history(symbol, d, close)
  select sym, (to_timestamp((t.v)::bigint) at time zone coalesce(j->'meta'->>'exchangeTimezoneName', 'America/New_York'))::date,
         round((c.v)::numeric, 4)
  from jsonb_array_elements_text(j->'timestamp') with ordinality t(v, i)
  join jsonb_array_elements_text(j->'indicators'->'quote'->0->'close') with ordinality c(v, i) using (i)
  where c.v is not null
  on conflict (symbol, d) do update set close = excluded.close;

  insert into price_meta(symbol, fetched_at, history_from, price, price_time, ok)
  values (sym, now(), start_d, round((j->'meta'->>'regularMarketPrice')::numeric, 4),
          to_timestamp((j->'meta'->>'regularMarketTime')::bigint), true)
  on conflict (symbol) do update set fetched_at = excluded.fetched_at,
    history_from = least(coalesce(price_meta.history_from, excluded.history_from), excluded.history_from),
    price = excluded.price, price_time = excluded.price_time, ok = true;
end;
$function$;
revoke all on function public._fetch_prices(text, date) from public, anon, authenticated;

-- Refresh one symbol if its cache is stale (6h) or doesn't reach back to `since`. Globally throttled.
CREATE OR REPLACE FUNCTION public._ensure_prices(sym text, since date)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare m price_meta;
begin
  if not exists (select 1 from stocks where symbol = sym) then return false; end if;
  select * into m from price_meta where symbol = sym;
  if m.symbol is not null and m.fetched_at > now() - interval '6 hours'
     and (m.history_from is not null and m.history_from <= since or not m.ok) then
    return m.ok;
  end if;
  if (select count(*) from price_meta where fetched_at > now() - interval '1 minute') >= 120 then
    return m.symbol is not null and m.ok;   -- throttled: serve whatever is cached
  end if;
  perform _fetch_prices(sym, least(since, coalesce(m.history_from, since)));
  return (select ok from price_meta where symbol = sym);
end;
$function$;
revoke all on function public._ensure_prices(text, date) from public, anon, authenticated;

-- Quote for one symbol: price, day change, 52-week range, 30 daily closes, 12 month-end closes.
CREATE OR REPLACE FUNCTION public.stock_quote(sym text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare ok boolean; res json;
begin
  ok := _ensure_prices(upper(sym), current_date - 365);
  if not ok then return null; end if;
  with h as (select d, close from price_history where symbol = upper(sym) and d > current_date - 380),
  m as (select price, price_time from price_meta where symbol = upper(sym)),
  last2 as (select d, close from h order by d desc limit 2),
  months as (
    select distinct on (date_trunc('month', d)) date_trunc('month', d) mon, close
    from h where d >= date_trunc('month', current_date) - interval '11 months'
    order by date_trunc('month', d), d desc
  )
  select json_build_object(
    'symbol', upper(sym),
    'price', coalesce((select price from m), (select close from last2 order by d desc limit 1)),
    'as_of', (select price_time from m),
    'prev_close', (select close from last2 order by d asc limit 1),
    'lo52', (select min(close) from h where d > current_date - 365),
    'hi52', (select max(close) from h where d > current_date - 365),
    'spark', (select json_agg(close order by d) from (select d, close from h order by d desc limit 30) s),
    'months', (select json_agg(to_char(mon, 'Mon') order by mon) from months),
    'monthly', (select json_agg(close order by mon) from months)
  ) into res;
  return res;
end;
$function$;
grant execute on function public.stock_quote(text) to anon, authenticated;

-- Closing price on the day you bought (first trading day on/after `on_date`).
CREATE OR REPLACE FUNCTION public.price_on(sym text, on_date date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare ok boolean;
begin
  if on_date > current_date then return null; end if;
  ok := _ensure_prices(upper(sym), on_date);
  if not ok then return null; end if;
  return (
    select json_build_object('symbol', upper(sym), 'date', d, 'close', close)
    from (
      (select d, close from price_history where symbol = upper(sym) and d >= on_date order by d asc limit 1)
      union all
      (select d, close from price_history where symbol = upper(sym) and d < on_date order by d desc limit 1)
    ) x order by (d >= on_date) desc limit 1
  );
end;
$function$;
grant execute on function public.price_on(text, date) to anon, authenticated;

-- First-time price fetches can take a few seconds; give anonymous API calls a little more room.
alter role anon set statement_timeout = '12s';
notify pgrst, 'reload config';

-- ---------------------------------------------------------------------------------------------
-- News: Yahoo Finance search feed (with images), falling back to the ticker's Yahoo Finance RSS
-- feed. Fetched on demand by stock_news() and cached 15 minutes; stories older than 30 days are dropped.
-- ---------------------------------------------------------------------------------------------
create table if not exists public.news_items (
  uuid         text primary key,
  title        text not null,
  publisher    text,
  link         text not null,
  published_at timestamptz not null,
  thumbnail    text,                     -- small square (140px)
  image        text,                     -- original size
  tickers      text[] not null default '{}',
  fetched_at   timestamptz not null default now()
);
create index if not exists news_items_published on public.news_items (published_at desc);
create table if not exists public.news_queries (
  query text not null,                   -- ticker, or '' for general market news (S&P 500 feed)
  uuid  text not null references public.news_items(uuid) on delete cascade,
  primary key (query, uuid)
);
create table if not exists public.news_fetches (
  query      text primary key,
  fetched_at timestamptz not null default now(),
  ok         boolean not null default true
);
-- No policies on purpose: only reachable through stock_news().
alter table public.news_items enable row level security;
alter table public.news_queries enable row level security;
alter table public.news_fetches enable row level security;

CREATE OR REPLACE FUNCTION public._fetch_news(q text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare r extensions.http_response; j jsonb; got int := 0; ua extensions.http_header := extensions.http_header('User-Agent', 'Mozilla/5.0 (KeplerFinance)');
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '6000');
  -- 1) Yahoo Finance search feed (has images)
  r := extensions.http(('GET',
        format('https://query1.finance.yahoo.com/v1/finance/search?q=%s&quotesCount=0&newsCount=12&enableFuzzyQuery=false',
               extensions.urlencode(case when q = '' then '^GSPC' else replace(q, '.', '-') end)),
        array[ua], null, null)::extensions.http_request);
  if r.status = 200 then
    j := r.content::jsonb;
    with items as (
      select n->>'uuid' uuid, n->>'title' title, n->>'publisher' publisher, n->>'link' link,
             to_timestamp((n->>'providerPublishTime')::bigint) published_at,
             coalesce(array(select jsonb_array_elements_text(n->'relatedTickers')), '{}') tickers,
             (select t->>'url' from jsonb_array_elements(n->'thumbnail'->'resolutions') t
               where t->>'tag' <> 'original' order by (t->>'width')::int desc limit 1) thumbnail,
             (select t->>'url' from jsonb_array_elements(n->'thumbnail'->'resolutions') t
               where t->>'tag' = 'original' limit 1) image
      from jsonb_array_elements(j->'news') n
      where n->>'uuid' is not null and n->>'title' is not null
        and n->>'link' like 'https://%' and n->>'providerPublishTime' is not null
    ), up as (
      insert into news_items(uuid, title, publisher, link, published_at, thumbnail, image, tickers, fetched_at)
      select uuid, title, publisher, link, published_at,
             case when thumbnail like 'https://%' then thumbnail end,
             case when image like 'https://%' then image end, tickers, now()
      from items
      on conflict (uuid) do update set title = excluded.title,
        thumbnail = coalesce(excluded.thumbnail, news_items.thumbnail), image = coalesce(excluded.image, news_items.image),
        tickers = excluded.tickers, fetched_at = now()
      returning uuid
    ), ins as (
      insert into news_queries(query, uuid) select q, uuid from up on conflict do nothing returning 1
    )
    select count(*) into got from up;
  end if;

  -- 2) Some tickers (e.g. BRK.B) have no tagged stories in search: fall back to the ticker's Yahoo Finance RSS feed.
  if got = 0 and q <> '' then
    r := extensions.http(('GET',
          format('https://feeds.finance.yahoo.com/rss/2.0/headline?s=%s&region=US&lang=en-US', extensions.urlencode(replace(q, '.', '-'))),
          array[ua], null, null)::extensions.http_request);
    if r.status = 200 then
      with items as (
        select (xpath('/item/guid/text()', x))[1]::text uuid,
               (xpath('/item/title/text()', x))[1]::text title,
               regexp_replace((xpath('/item/link/text()', x))[1]::text, '[?&]\.tsrc=rss$', '') link,
               to_timestamp((xpath('/item/pubDate/text()', x))[1]::text, 'Dy, DD Mon YYYY HH24:MI:SS') at time zone 'UTC' published_at
        from unnest(xpath('/rss/channel/item', r.content::xml)) x
      ), up as (
        insert into news_items(uuid, title, publisher, link, published_at, tickers, fetched_at)
        select uuid, title,
               case when link like 'https://finance.yahoo.com/%' then 'Yahoo Finance'
                    else regexp_replace(substring(link from '^https://([^/]+)'), '^www\.', '') end,
               link, published_at, array[q], now()
        from items
        where uuid is not null and title is not null and link like 'https://%' and published_at is not null
        on conflict (uuid) do update set fetched_at = now()
        returning uuid
      )
      insert into news_queries(query, uuid) select q, uuid from up on conflict do nothing;
    end if;
  end if;

  insert into news_fetches(query, fetched_at, ok) values (q, now(), r.status = 200)
  on conflict (query) do update set fetched_at = now(), ok = excluded.ok;
  delete from news_items where published_at < now() - interval '30 days';
end;
$function$;
revoke all on function public._fetch_news(text) from public, anon, authenticated;

-- Latest news for up to 5 tickers (empty = general market news), newest first.
CREATE OR REPLACE FUNCTION public.stock_news(syms text[] DEFAULT '{}'::text[], lim integer DEFAULT 6)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare qs text[]; q text; f news_fetches;
begin
  select coalesce(array_agg(s.symbol), '{}') into qs
  from (select distinct upper(x) symbol from unnest(coalesce(syms, '{}')) x) u
  join stocks s on s.symbol = u.symbol;
  qs := qs[1:5];
  if cardinality(qs) = 0 then qs := array['']; end if;

  foreach q in array qs loop
    select * into f from news_fetches where query = q;
    if (f.query is null or f.fetched_at < now() - interval '15 minutes')
       and (select count(*) from news_fetches where fetched_at > now() - interval '1 minute') < 60 then
      perform _fetch_news(q);
    end if;
  end loop;

  return coalesce((
    select json_agg(json_build_object('uuid', uuid, 'title', title, 'publisher', publisher, 'link', link,
                                      'published_at', published_at, 'thumbnail', thumbnail, 'image', image, 'tickers', tickers)
                    order by published_at desc)
    from (
      select i.* from news_items i
      where i.uuid in (select nq.uuid from news_queries nq where nq.query = any(qs))
      order by i.published_at desc
      limit least(greatest(lim, 1), 24)
    ) x
  ), '[]'::json);
end;
$function$;
grant execute on function public.stock_news(text[], int) to anon, authenticated;

-- The public API roles never need these on the cache tables (functions above run as the owner).
revoke all on public.price_history, public.price_meta, public.news_items, public.news_queries, public.news_fetches
  from anon, authenticated;
