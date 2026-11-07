-- CardScope: linki do binderów. Uruchom CAŁY skrypt w Supabase → SQL Editor.
-- Wymaga działającej synchronizacji cardscope_sync_items. Nie usuwa jej danych.
begin;
create table if not exists public.cardscope_binder_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  binder_id text not null,
  token uuid not null unique default gen_random_uuid(),
  owner_name text not null check (length(btrim(owner_name)) between 1 and 50),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id,binder_id)
);
alter table public.cardscope_binder_links enable row level security;
revoke all on public.cardscope_binder_links from public, anon, authenticated;
-- Brak publicznego listowania tabeli. Odczyt wyłącznie przez konkretny losowy token.
create or replace function public.cardscope_binder_share_manage_v1(
  p_binder_id text, p_action text default 'status', p_owner_name text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_link public.cardscope_binder_links%rowtype;
begin
  if v_user is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if p_binder_id is null or p_binder_id !~ '^[A-Za-z0-9_-]{1,100}$'
     or p_action is null or p_action not in ('status','publish','revoke') then
    raise exception 'Invalid share request' using errcode='22023';
  end if;
  if p_action='publish' then
    if coalesce(length(btrim(p_owner_name)),0) not between 1 and 50 then
      raise exception 'Owner name required' using errcode='22023';
    end if;
    if not exists(select 1 from public.cardscope_sync_items
      where user_id=v_user and kind='binder' and id=p_binder_id and not deleted) then
      raise exception 'Sync binder first' using errcode='22023';
    end if;
    insert into public.cardscope_binder_links(user_id,binder_id,owner_name)
      values(v_user,p_binder_id,btrim(p_owner_name))
      on conflict(user_id,binder_id) do update set
        owner_name=excluded.owner_name,enabled=true,updated_at=now(),
        token=case when public.cardscope_binder_links.enabled then public.cardscope_binder_links.token else gen_random_uuid() end;
  elsif p_action='revoke' then
    update public.cardscope_binder_links set enabled=false,token=gen_random_uuid(),updated_at=now()
      where user_id=v_user and binder_id=p_binder_id;
  end if;
  select * into v_link from public.cardscope_binder_links where user_id=v_user and binder_id=p_binder_id;
  if not found or not v_link.enabled then return jsonb_build_object('enabled',false); end if;
  return jsonb_build_object('enabled',true,'token',v_link.token,'ownerName',v_link.owner_name,'updatedAt',v_link.updated_at);
end $$;

create or replace function public.cardscope_binder_public_v1(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_link public.cardscope_binder_links%rowtype;
  v_binder jsonb;
  v_cards jsonb;
  v_updated timestamptz;
begin
  select * into v_link from public.cardscope_binder_links where token=p_token and enabled;
  if not found then return null; end if;
  select payload,updated_at into v_binder,v_updated from public.cardscope_sync_items
    where user_id=v_link.user_id and kind='binder' and id=v_link.binder_id and not deleted;
  if not found or jsonb_typeof(v_binder->'slots') <> 'array' then return null; end if;
  -- Whitelist: only cards physically placed in this binder, never the whole collection,
  -- account e-mail, purchase baselines, quantities, notes or authentication metadata.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'name',c.payload->'name','game',c.payload->'game',
    'number',c.payload->'number','set',c.payload->'set','rarity',c.payload->'rarity',
    'language',c.payload->'language','variant',c.payload->'variant',
    'artwork',coalesce(nullif(c.payload->>'artwork',''),nullif(c.payload->>'photo','')),
    'backArtwork',c.payload->'backArtwork',
    'price',c.payload->'price','priceCurrency',c.payload->'priceCurrency',
    'priceUpdated',c.payload->'priceUpdated','priceSource',c.payload->'priceSource',
    'priceUrl',c.payload->'priceUrl','createdAt',c.payload->'createdAt',
    'quote',case when jsonb_typeof(v_binder->'quotes'->c.id)='object' then jsonb_build_object(
      'amount',v_binder->'quotes'->c.id->'amount','currency',v_binder->'quotes'->c.id->'currency',
      'at',v_binder->'quotes'->c.id->'at','source',v_binder->'quotes'->c.id->'source') else null end
  ) order by c.id),'[]'::jsonb),greatest(v_updated,max(c.updated_at)) into v_cards,v_updated
  from public.cardscope_sync_items c
  where c.user_id=v_link.user_id and c.kind='card' and not c.deleted
    and c.id in (select jsonb_array_elements_text(v_binder->'slots'));
  return jsonb_build_object('schema',1,'ownerName',v_link.owner_name,'updatedAt',v_updated,
    'binder',jsonb_build_object('name',v_binder->'name','subtitle',v_binder->'subtitle',
      'columns',v_binder->'columns','rows',v_binder->'rows','pages',v_binder->'pages',
      'theme',v_binder->'theme','pattern',v_binder->'pattern','emblem',v_binder->'emblem','slots',v_binder->'slots'),
    'cards',v_cards);
end $$;
revoke all on function public.cardscope_binder_share_manage_v1(text,text,text) from public,anon,authenticated;
grant execute on function public.cardscope_binder_share_manage_v1(text,text,text) to authenticated;
revoke all on function public.cardscope_binder_public_v1(uuid) from public,anon,authenticated;
grant execute on function public.cardscope_binder_public_v1(uuid) to anon,authenticated;
notify pgrst, 'reload schema';
commit;
