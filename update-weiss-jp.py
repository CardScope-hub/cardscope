#!/usr/bin/env python3
"""Public Japanese single-card retail quotes. No API keys, account or cart calls."""
import argparse,concurrent.futures,datetime,html,json,os,re,threading,time
from pathlib import Path
from urllib.parse import urlencode,urlparse
from urllib.request import Request,urlopen
BASE=Path(__file__).resolve().parent
API='https://novatcg.com/wp-json/wc/store/v1/products'
FIELDS='id,type,parent,sku,permalink,prices,attributes,categories,is_in_stock'
LOCK=threading.Lock();LAST=0
def norm(x):return str(x or '').strip().upper().replace('／','/').replace('－','-').replace('−','-')
def attr(p,name):
 values=[t['name'] for a in p.get('attributes',[]) if a.get('taxonomy')==name for t in a.get('terms',[]) if t.get('name')]
 return norm(html.unescape(values[0])) if len(values)==1 else None
def quote(p,at):
 at=datetime.datetime.fromisoformat(at.replace('Z','+00:00')).isoformat(timespec='milliseconds')
 code=attr(p,'pa_card-number');rarity=attr(p,'pa_rarity');prices=p.get('prices',{});url=p.get('permalink','')
 if p.get('type')!='simple' or p.get('parent') or not code or not rarity or norm(p.get('sku'))!=code:return None
 if not re.fullmatch(r'[A-Z0-9@!]+/[A-Z0-9]+-[A-Z]*\d+[A-Z0-9+*⁂⁑＊-]*',code):return None
 if not any('/weiss-schwarz-japanese/' in c.get('link','') for c in p.get('categories',[])):return None
 if urlparse(url).scheme!='https' or urlparse(url).hostname not in ['novatcg.com','www.novatcg.com']:return None
 if prices.get('currency_code')!='USD' or prices.get('currency_minor_unit')!=2 or prices.get('price_range'):return None
 raw=prices.get('price','')
 if not isinstance(raw,str) or not re.fullmatch(r'\d+',raw):return None
 amount=int(raw)/100
 if not 0<amount<=10000000:return None
 return code+'|'+rarity,{'amount':amount,'currency':'USD','number':code,'rarity':rarity,'url':url,'productId':str(p['id']),'inStock':p.get('is_in_stock') is True,'observedAt':at}
def request(page,cache=None):
 global LAST
 path=cache/f'page-{page}.json' if cache else None
 if path and path.exists():
  cached=json.loads(path.read_text());cached.setdefault('observedAt',datetime.datetime.fromtimestamp(path.stat().st_mtime,datetime.timezone.utc).isoformat());return cached
 with LOCK:
  time.sleep(max(0,.5-(time.monotonic()-LAST)));LAST=time.monotonic()
 url=API+'?'+urlencode({'per_page':100,'page':page,'orderby':'id','order':'asc','_fields':FIELDS})
 with urlopen(Request(url,headers={'User-Agent':'CardScope/2.2 (+https://cardscope-hub.github.io/cardscope/)','Accept':'application/json'}),timeout=30) as r:
  data={'rows':json.load(r),'pages':int(r.headers['X-WP-TotalPages']),'total':int(r.headers['X-WP-Total']),'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 if not isinstance(data['rows'],list) or not 1<=data['pages']<=2000:raise ValueError('Unexpected shop response')
 if path:
  temp=path.with_suffix('.tmp');temp.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')));os.replace(temp,path)
 print('JP page',page,'of',data['pages'],flush=True);return data
def refresh(cache=None):
 path=BASE/'prices-weiss.json';old=json.loads(path.read_text());now=datetime.datetime.now(datetime.timezone.utc)
 if cache:cache.mkdir(parents=True,exist_ok=True)
 first=request(1,cache);pages={1:first};failures=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  tasks={pool.submit(request,n,cache):n for n in range(2,first['pages']+1)}
  for task in concurrent.futures.as_completed(tasks):
   try:pages[tasks[task]]=task.result()
   except Exception as e:failures.append((tasks[task],type(e).__name__,getattr(e,'code',None)));print('JP page failed',failures[-1],flush=True)
 at=now.isoformat(timespec='milliseconds');rows={};ambiguous=set();seen=set()
 for page in pages.values():
  for p in page['rows']:
   if p.get('id') in seen:continue
   seen.add(p.get('id'));q=quote(p,page.get('observedAt') or at)
   if not q:continue
   key,row=q
   if key in rows and rows[key]['productId']!=row['productId']:ambiguous.add(key)
   else:rows[key]=row
 for key in ambiguous:rows.pop(key,None)
 if len(rows)<1000:raise ValueError('Incomplete JP source; prior quotes retained')
 # A partial outage keeps older dated rows. Successful full updates remove delisted rows.
 if failures:rows={**old.get('japanese',{}).get('rows',{}),**rows}
 for key in ambiguous:rows.pop(key,None)
 old['japanese']={'source':'NovaTCG','currency':'USD','kind':'retail','observedAt':at,'rows':rows,'incomplete':bool(failures),'failedPages':len(failures),'ambiguous':len(ambiguous)}
 temp=path.with_suffix('.tmp');temp.write_text(json.dumps(old,ensure_ascii=False,separators=(',',':')));os.replace(temp,path)
 print('Japanese quotes',len(rows),'ambiguous excluded',len(ambiguous),'failed pages',len(failures),flush=True)
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--cache',type=Path);args=parser.parse_args();refresh(args.cache)
