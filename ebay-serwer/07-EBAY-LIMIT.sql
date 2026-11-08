begin;
create schema if not exists cardscope_ebay_private;
revoke all on schema cardscope_ebay_private from public,anon,authenticated;
create table if not exists cardscope_ebay_private.budget (
 scope text not null, bucket text not null, hits integer not null default 0,
 expires_at timestamptz not null, primary key(scope,bucket)
);
alter table cardscope_ebay_private.budget enable row level security;
revoke all on cardscope_ebay_private.budget from public,anon,authenticated;
create or replace function public.cardscope_ebay_allow_v1() returns boolean
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); stamp timestamptz:=now(); m text; d text; n integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED' using errcode='28000';end if;
 m:=to_char(stamp at time zone 'UTC','YYYY-MM-DD HH24:MI');
 d:=to_char(stamp at time zone 'UTC','YYYY-MM-DD');
 perform pg_catalog.pg_advisory_xact_lock(721039501);
 delete from cardscope_ebay_private.budget where expires_at<stamp;
 select hits into n from cardscope_ebay_private.budget where scope=u::text and bucket=m;
 if coalesce(n,0)>=12 then return false;end if;
 select hits into n from cardscope_ebay_private.budget where scope=u::text and bucket=d;
 if coalesce(n,0)>=200 then return false;end if;
 select hits into n from cardscope_ebay_private.budget where scope='app' and bucket=d;
 if coalesce(n,0)>=4000 then return false;end if;
 insert into cardscope_ebay_private.budget values
  (u::text,m,1,stamp+interval '2 minutes'),(u::text,d,1,stamp+interval '2 days'),('app',d,1,stamp+interval '2 days')
 on conflict(scope,bucket) do update set hits=cardscope_ebay_private.budget.hits+1;
 return true;
end $$;
revoke all on function public.cardscope_ebay_allow_v1() from public,anon;
grant execute on function public.cardscope_ebay_allow_v1() to authenticated;
commit;
