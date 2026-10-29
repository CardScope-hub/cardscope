#!/usr/bin/env python3
"""Refresh public prices once per source build. No keys or account data required."""
import argparse, json, math, os, re, time
from pathlib import Path
from urllib.request import Request, urlopen
from datetime import datetime, timezone

BASE=Path(__file__).resolve().parent
UA='CardScope/2.1 (+https://cardscope-hub.github.io/cardscope/)'
LAST_REQUEST=0
FAILURES=[]
def load(path,default=None):
 try:return json.loads(path.read_text())
 except (OSError,ValueError):return default

def fetch(url,*,text=False):
 global LAST_REQUEST
 time.sleep(max(0,.15-(time.monotonic()-LAST_REQUEST)))
 LAST_REQUEST=time.monotonic()
 with urlopen(Request(url,headers={'User-Agent':UA,'Accept':'application/json'}),timeout=25) as response:
  data=response.read()
 return data.decode().strip() if text else json.loads(data)

def save(name,data):
 p=BASE/name;temp=p.with_suffix('.tmp');temp.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')));os.replace(temp,p)

def positive(x):return isinstance(x,(int,float)) and not isinstance(x,bool) and math.isfinite(x) and 0<x<=10000000

def compact_guide(d):
 if not isinstance(d.get('priceGuides'),list) or not d.get('createdAt'):raise ValueError('Invalid Cardmarket guide')
 fields=['trend','avg1','avg7','avg30','avg','low']
 out={}
 for row in d['priceGuides']:
  x={k:row[k] for s in ['', '-holo','-foil'] for k in [f+s for f in fields] if positive(row.get(k))}
  if x:out[str(row['idProduct'])]=x
 if len(out)<100:raise ValueError('Incomplete Cardmarket guide')
 return {'updated':d['createdAt'],'rows':out}

def tcg_groups(category,old,stamp,selected=None):
 if not stamp:raise ValueError('Missing TCGCSV source date')
 groups=fetch(f'https://tcgcsv.com/tcgplayer/{category}/groups')['results']
 result=dict(old or {})
 for i,g in enumerate(groups):
  gid=str(g['groupId'])
  if selected is not None and gid not in selected:continue
  previous=result.get(gid,{}).get('updated')
  if previous==stamp:continue
  try:
   if previous and datetime.fromisoformat(previous.replace('Z','+00:00'))>=datetime.fromisoformat(stamp.replace('Z','+00:00')):continue
  except (ValueError,TypeError):pass
  try:
   d=fetch(f'https://tcgcsv.com/tcgplayer/{category}/{gid}/prices')
   if d.get('success') is not True or not isinstance(d.get('results'),list):raise ValueError('Invalid TCGCSV response')
   rows={}
   for p in d['results']:
    amount=p.get('marketPrice');metric='market'
    if not positive(amount):amount=p.get('midPrice');metric='mid'
    if positive(amount):rows.setdefault(str(p['productId']),{})[p.get('subTypeName') or 'Nieustalony']={'amount':amount,'metric':metric}
   result[gid]={'updated':stamp,'name':g['name'],'rows':rows}
   print('TCGCSV',category,gid,len(rows),'prices',flush=True)
  except Exception as e:FAILURES.append(f'TCGCSV {category}/{gid}: {type(e).__name__}');print(FAILURES[-1],flush=True)
 return result

def refresh_rift(stamp,guide=None,bridge=None):
 old=load(BASE/'prices-riftbound.json',{})
 try:
  guide=compact_guide(guide or fetch('https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_22.json'))
 except Exception as e:FAILURES.append('Cardmarket Riftbound: '+type(e).__name__);guide=old.get('cardmarket')
 try:
  bridge=bridge or fetch('https://api.dotgg.gg/cgfw/getcards?game=riftbound&mode=indexed')
  rows=[dict(zip(bridge['names'],r)) for r in bridge['data']];mapping={};ambiguous=set()
  for r in rows:
   tid=str(r.get('marketIds') or '')
   if not tid.isdigit() or not str(r.get('cmid') or '').isdigit():continue
   item={k:r.get(k) for k in ['id','name','cmid','cmurl','hasNormal','hasFoil']}
   if tid in mapping and mapping[tid]!=item:ambiguous.add(tid)
   else:mapping[tid]=item
  for tid in ambiguous:mapping.pop(tid,None)
  if len(mapping)<500:raise ValueError('Incomplete identifier mapping')
 except Exception as e:FAILURES.append('Riftbound mapping: '+type(e).__name__);mapping=old.get('mapping',{})
 try:groups=tcg_groups(89,old.get('tcgGroups'),stamp)
 except Exception as e:FAILURES.append('TCGCSV Riftbound: '+type(e).__name__);groups=old.get('tcgGroups',{})
 save('prices-riftbound.json',{'schema':1,'cardmarket':guide,'mapping':mapping,'tcgGroups':groups})

def refresh_weiss(stamp):
 old=load(BASE/'prices-weiss.json',{})
 cat=load(BASE/'catalog-weiss.json')
 if not cat:raise ValueError('Missing catalog-weiss.json')
 groups=set(str(c['groupId']) for c in cat['cards'] if c.get('groupId'))
 save('prices-weiss.json',{'schema':1,'japanese':old.get('japanese'),'tcgGroups':tcg_groups(20,old.get('tcgGroups'),stamp,groups)})

def refresh_weiss_jp():
 import importlib.util
 spec=importlib.util.spec_from_file_location('weiss_jp_prices',BASE/'update-weiss-jp.py')
 module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);module.BASE=BASE;module.refresh()

def refresh_onepiece():
 old=load(BASE/'prices-onepiece.json',{});sections=dict(old.get('sections',{}))
 for endpoint in ['allSetCards','allSTCards','allPromos','allDonCards']:
  try:
   data=fetch('https://optcgapi.com/api/'+endpoint+'/')
   if not isinstance(data,list) or not data:raise ValueError('Invalid OPTCG response')
   rows={}
   for c in data:
    amount=c.get('market_price')
    if isinstance(amount,str):
     try:amount=float(amount)
     except ValueError:continue
    if positive(amount) and c.get('card_image_id'):rows[str(c['card_image_id'])]={'amount':amount,'name':c.get('card_name'),'number':c.get('card_set_id'),'set':c.get('set_name'),'image':c.get('card_image'),'updated':c.get('date_scraped')}
   sections[endpoint]={'retrievedAt':datetime.now(timezone.utc).isoformat(),'rows':rows}
  except Exception as e:FAILURES.append('OPTCG '+endpoint+': '+type(e).__name__)
 save('prices-onepiece.json',{'schema':1,'sections':sections})

def refresh_pokemon(guide=None,stamp=None):
 old=load(BASE/'prices-pokemon.json',{});data=dict(old);data['schema']=1
 try:data['cardmarket']=compact_guide(guide or fetch('https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json'))
 except Exception as e:FAILURES.append('Cardmarket Pokemon: '+type(e).__name__)
 if stamp:
  try:data['tcgGroups']=tcg_groups(3,old.get('tcgGroups'),stamp,{'24722','24837'})
  except Exception as e:FAILURES.append('TCGCSV Pokemon: '+type(e).__name__)
 if not data.get('cardmarket') and not data.get('tcgGroups'):raise ValueError('No Pokemon prices available')
 save('prices-pokemon.json',data)
def refresh_fx(table=None):
 d=(table or fetch('https://api.nbp.pl/api/exchangerates/tables/A/?format=json'))[0]
 rates={'PLN':1,**{r['code']:r['mid'] for r in d['rates'] if r['code'] in ['EUR','USD']}}
 if not all(positive(rates.get(k)) for k in ['PLN','EUR','USD']):raise ValueError('Invalid NBP table')
 save('prices-fx.json',{'date':d['effectiveDate'],'source':'NBP · tabela A','rates':rates})

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--only',default='pokemon,riftbound,weiss,weiss-jp,onepiece,fx');parser.add_argument('--seed',type=Path);args=parser.parse_args();wanted=args.only.split(',')
 seed=lambda n:load(args.seed/n) if args.seed else None
 stamp=None
 if any(x in wanted for x in ['pokemon','riftbound','weiss']):
  p=args.seed/'tcg-updated.json' if args.seed else None
  try:
   stamp=p.read_text().strip() if p and p.exists() else fetch('https://tcgcsv.com/last-updated.txt',text=True)
   datetime.fromisoformat(stamp.replace('Z','+00:00'))
  except Exception as e:FAILURES.append('TCGCSV source date: '+type(e).__name__);stamp=None
 for name in wanted:
  try:
   if name=='pokemon':refresh_pokemon(seed('cm6.json'),stamp)
   elif name=='riftbound':refresh_rift(stamp,seed('cm22.json'),seed('dotgg-rift.json'))
   elif name=='weiss':refresh_weiss(stamp)
   elif name=='weiss-jp':refresh_weiss_jp()
   elif name=='onepiece':refresh_onepiece()
   elif name=='fx':refresh_fx(seed('nbp.json'))
   print('Updated',name,flush=True)
  except Exception as e:FAILURES.append(name+': '+type(e).__name__);print('Retained previous data:',name,type(e).__name__,flush=True)
 if FAILURES:print('Some sources failed; prior dated quotes retained:',*FAILURES,sep='\n')
 # Partial outages must not discard successful updates; source dates disclose age.
 for name in wanted:
  if not (BASE/('prices-'+('weiss' if name=='weiss-jp' else name)+'.json')).exists():raise SystemExit('No price file for '+name)
if __name__=='__main__':main()
