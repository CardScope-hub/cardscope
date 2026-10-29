// Exact printing/finish quotes. Public snapshots are updated by the optional daily job.
globalThis.CardPrices=(()=>{
 const base=new URL('./',document.currentScript?.src||location.href),pending=new Map();
 const remote='https://raw.githubusercontent.com/CardScope-hub/cardscope/main/';
 const positive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0&&x<=10000000;
 const stamp=x=>{const d=new Date(typeof x==='string'?x.replace(/([+-]\d{2})(\d{2})$/,'$1:$2'):x);return x&&Number.isFinite(d.getTime())?d.toISOString():null};
 const norm=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
 function variant(v){const k=norm(v);return ({normal:'Normal',nonfoil:'Normal',holo:'Holo',holofoil:'Holo',foil:'Foil',reverse:'Reverse Holo',reverseholo:'Reverse Holo',reverseholofoil:'Reverse Holo',etched:'Etched','1stedition':'1st Edition',firstedition:'1st Edition','1steditionholofoil':'1st Edition Holo','1steditionholo':'1st Edition Holo',unlimited:'Unlimited',unlimitedholofoil:'Unlimited Holo',unlimitedholo:'Unlimited Holo'})[k]||String(v||'Nieustalony')}
 const metricLabel=k=>({trend:'Trend',avg1:'Średnia 1 dnia',avg7:'Średnia 7 dni',avg30:'Średnia 30 dni',avg:'Średnia sprzedaży',market:'Cena rynkowa',mid:'Mediana ofert',retail:'Cena sklepu · odczyt','retail-unavailable':'Cena katalogowa · brak w sprzedaży'})[k]||'Wycena źródłowa';
 function chooseMetric(row,suffix=''){for(const key of ['trend','avg7','avg30','avg1','avg'])if(positive(row?.[key+suffix]))return {amount:row[key+suffix],metric:key};return null}
 const freshness=d=>Math.max(0,...[d?.japanese?.observedAt,d?.cardmarket?.updated,...Object.values(d?.tcgGroups||{}).map(g=>g.updated),...Object.values(d?.sections||{}).map(g=>g.retrievedAt)].map(x=>Date.parse(stamp(x))||0));
 async function snapshot(game,force=false){const file='prices-'+game+'.json',now=Date.now(),hit=pending.get(file);if(hit&&(hit.loading||!force&&now-hit.at<300000))return hit.promise;
  const state={at:now,loading:true};state.promise=(async()=>{let cache,saved;const key=new URL(file,base).href;
   try{cache=await caches.open('cardscope-public-prices-v1');const r=await cache.match(key);if(r)saved=await r.json();if(!force&&saved?.schema===1&&(game!=='weiss'||saved.japanese)&&now-Number(r.headers.get('x-cardscope-saved'))<300000)return saved}catch{}
   for(const url of [remote+file+(game==='weiss'?'?v=weiss-1':''),key]){const c=new AbortController(),t=setTimeout(()=>c.abort(),15000);try{const r=await fetch(url,{signal:c.signal,cache:'no-cache',credentials:'omit'});if(!r.ok)continue;const d=await r.json();if(d.schema!==1)continue;if(game==='weiss'&&!d.japanese){if(!saved?.japanese)saved=d;continue}if(saved?.schema===1&&freshness(saved)>freshness(d))return saved;if(cache)try{await cache.put(key,new Response(JSON.stringify(d),{headers:{'Content-Type':'application/json','x-cardscope-saved':String(now)}}))}catch{}return d}catch{}finally{clearTimeout(t)}}
   if(saved?.schema===1)return saved;throw Error('Baza cen jest chwilowo niedostępna. Ponów odświeżenie.');
  })();pending.set(file,state);state.promise.then(()=>{state.loading=false},()=>pending.delete(file));return state.promise;
 }
 function cmOffer(c,v,row,updated,suffix='',url,via='TCGdex',pid){const m=chooseMetric(row,suffix);if(!m)return null;return {...m,source:'Cardmarket',via,currency:'EUR',variant:v,name:c.name,set:c.set?.name||'',number:c.localId,updated:stamp(updated),productId:pid?String(pid):null,url:url||'https://www.cardmarket.com/en/'+({mtg:'Magic',riftbound:'Riftbound',weiss:'WeissSchwarz',onepiece:'OnePiece'}[c.gameKey]||'Pokemon')+'/Products/Search?searchString='+encodeURIComponent(c.name+' '+c.localId),match:'exact',low:positive(row['low'+suffix])?row['low'+suffix]:null,avg7:positive(row['avg7'+suffix])?row['avg7'+suffix]:null}}
 function nativeVariants(c){if(globalThis.CardWeiss?.is(c))return [CardWeiss.rarity(c.rarity)];const list=(c.variantsList||[]).filter(x=>x!=='Nieustalony').map(variant);for(const [k,v] of Object.entries(c.variants||{}))if(v&&['normal','holo','reverse'].includes(k))list.push(c.gameKey==='mtg'&&k==='holo'?'Foil':variant(k));for(const d of c.variants_detailed||[])if(!d.size||d.size==='standard')list.push(variant(d.type));return [...new Set(list)]}
 function detail(c,v){const d=(c.variants_detailed||[]).filter(x=>(!x.size||x.size==='standard')&&variant(x.type)===v);return d.length===1?d[0]:null}
 function cmSuffix(c,v){if(v==='Reverse Holo')return '-holo';if(v==='Foil')return c.gameKey==='mtg'?'-holo':'-foil';if(v==='Holo')return c.variants?.normal?'-holo':'';if(v==='Normal')return '';return null}
 function native(c,guide){const offers=[];for(const v of nativeVariants(c)){const d=detail(c,v),raw=d?.pricing?.cardmarket||c.pricing?.cardmarket;if(raw?.unit&&raw.unit!=='EUR')continue;const pid=d?.thirdParty?.cardmarket||raw?.idProduct,suffix=cmSuffix(c,v);if(suffix===null)continue;
   let row=raw,updated=raw?.updated,via=c.gameKey==='mtg'?'Scryfall':'TCGdex';const fresh=pid&&guide?.rows?.[pid];if(fresh&&(!row||!stamp(updated)||Date.parse(guide.updated)>=Date.parse(updated))){row=fresh;updated=guide.updated;via='Cardmarket · plik cen'}
   // If both secondary finishes coexist, generic foil fields cannot prove which one is priced.
   if(c.gameKey!=='mtg'&&c.variants?.holo&&c.variants?.reverse&&['Holo','Reverse Holo'].includes(v)){const other=detail(c,v==='Holo'?'Reverse Holo':'Holo'),otherId=other?.thirdParty?.cardmarket||other?.pricing?.cardmarket?.idProduct;if(!d?.thirdParty?.cardmarket||!otherId||String(pid)===String(otherId))continue;}
   const o=cmOffer(c,v,row,updated,suffix,c.marketUrl,via,pid);if(o)offers.push(c.gameKey==='mtg'?{...o,metric:'source'}:o);
  }
  const pricingSources=[c.pricing?.tcgplayer,...(c.variants_detailed||[]).filter(x=>!x.size||x.size==='standard').map(x=>x.pricing?.tcgplayer)];
  for(const tcg of pricingSources){if(!tcg||tcg.unit&&tcg.unit!=='USD')continue;for(const [key,q] of Object.entries(tcg)){if(!q||typeof q!=='object')continue;const amount=positive(q.marketPrice)?q.marketPrice:positive(q.midPrice)?q.midPrice:null;if(amount===null)continue;offers.push({source:'TCGplayer',via:'TCGdex',amount,currency:'USD',variant:variant(key),metric:positive(q.marketPrice)?'market':'mid',name:c.name,set:c.set?.name||'',number:c.localId,updated:stamp(tcg.updated),productId:q.productId?String(q.productId):null,url:q.productId?'https://www.tcgplayer.com/product/'+q.productId:'https://www.tcgplayer.com/search/pokemon/product?q='+encodeURIComponent(c.name+' '+c.localId),match:'exact'})}}
  for(const o of c.offers||[])if(positive(o.amount))offers.push({...o,variant:variant(o.variant),metric:o.metric||'market',updated:stamp(o.updated)});
  return unique(offers);
 }
 function tcgOffers(c,groups,id){const out=[];for(const g of Object.values(groups||{}))for(const [finish,q] of Object.entries(g.rows?.[String(id)]||{}))if(positive(q.amount))out.push({source:'TCGplayer',via:'TCGCSV · plik dzienny',amount:q.amount,currency:'USD',variant:globalThis.CardWeiss?.is(c)?CardWeiss.rarity(c.rarity):variant(finish),metric:q.metric||'market',name:c.name,set:c.set?.name||g.name,number:c.localId,updated:stamp(g.updated),productId:String(id),url:'https://www.tcgplayer.com/product/'+id,match:'exact'});return out}
 function unique(offers){const m=new Map();for(const o of offers){const key=[o.source,o.currency,o.variant,o.productId||'',o.metric].join('|'),old=m.get(key);if(!old||Date.parse(o.updated||0)>Date.parse(old.updated||0))m.set(key,o)}return [...m.values()]}
 function riftCode(code){const m=String(code||'').toUpperCase().match(/^([A-Z]{2,6})-(\d+)([A-Z*]?)(?:-\d+)?$/);return m?m[1]+'-'+m[2].padStart(3,'0')+(m[3]==='*'?'-STAR':m[3]):String(code||'').toUpperCase()}
 function riftOffers(c,data){const id=String(c.tcgplayerId||''),map=data.mapping?.[id],out=tcgOffers(c,data.tcgGroups,id);
  if(map&&riftCode(c.localId)===String(map.id).toUpperCase()){
   const row=data.cardmarket?.rows?.[map.cmid];for(const v of ['Normal','Foil']){if(String(map[v==='Normal'?'hasNormal':'hasFoil'])!=='1')continue;let suffix=v==='Foil'?'-foil':'';if(v==='Foil'&&String(map.hasNormal)==='0'&&!chooseMetric(row,suffix))suffix='';const o=cmOffer(c,v,row,data.cardmarket?.updated,suffix,map.cmurl,'Cardmarket · plik cen',map.cmid);if(o)out.push(o)}
  }return unique(out);
 }
 function sameFinish(a,b,game){a=variant(a);b=variant(b);return a===b||game!=='pokemon'&&['Holo','Foil'].includes(a)&&['Holo','Foil'].includes(b)}
 function best(offers,v,game){const rows=offers.filter(o=>o.match==='exact'&&positive(o.amount)&&sameFinish(o.variant,v,game));rows.sort((a,b)=>(a.source==='Cardmarket'?0:1)-(b.source==='Cardmarket'?0:1)||(Date.parse(b.updated||0)||0)-(Date.parse(a.updated||0)||0));return rows[0]||null}
 function isStale(o){return !stamp(o?.updated)||Date.now()-Date.parse(o.updated)>3*86400000}
 async function offers(c,{force=false}={}){const game=c.gameKey||'pokemon';if(c.catalogLanguage==='ja'&&!['pokemon','weiss-jp'].includes(game))return {offers:[],note:'Brak potwierdzonej ceny japońskiego wydania.'};let out=native(c),warning='';
  try{
   if(game==='pokemon'){const d=await snapshot('pokemon',force);out=native(c,d.cardmarket)}
   else if(game==='riftbound')out=riftOffers(c,await snapshot('riftbound',force));
   else if(game==='weiss-jp'){out=CardWeiss.japaneseOffer(c,await snapshot('weiss',force));warning=out.length?'NovaTCG: cena konkretnego wydania JP w sklepie, przeliczana z USD. Brak w sprzedaży oznacza wyłącznie cenę katalogową.':'Brak ceny tej rzadkości i numeru JP w źródle. Sprawdź inne dostępne wydania lub wpisz cenę ręcznie.';}
   else if(game==='weiss')out=tcgOffers(c,(await snapshot('weiss',force)).tcgGroups,c.tcgplayerId||c.id);
   else if(game==='onepiece'){
    const d=await snapshot('onepiece',force);for(const s of Object.values(d.sections||{})){const r=s.rows?.[c.id];if(!r||!positive(r.amount))continue;out.push({source:'OPTCG API',via:'Rynek angielski',amount:r.amount,currency:'USD',variant:'Wydanie z ilustracji',metric:'market',name:c.name,set:c.set?.name,number:c.localId,updated:stamp(r.updated),productId:c.id,url:'https://optcgapi.com/',match:'exact'})}
   }
  }catch(e){warning=e.message}
  return {offers:unique(out),note:warning};
 }
 async function savedCard(card){const game=card.catalogGame||'pokemon';if(!card.catalogId)return null;
  if(game==='pokemon')return {...await catalogJSON('https://api.tcgdex.net/v2/'+(card.catalogLanguage||'en')+'/cards/'+encodeURIComponent(card.catalogId)),catalogLanguage:card.catalogLanguage||'en'};
  return (await otherJSON({game,id:card.catalogId})).card;
 }
 async function lookup(card,{force=false}={}){const c=await savedCard(card);if(!c)return null;const result=await offers(c,{force});let v=globalThis.CardWeiss?CardWeiss.selectedVariant(card,c):card.variant;const variants=[...new Set(result.offers.map(o=>o.variant))];if((!v||v==='Nieustalony')&&variants.length===1)v=variants[0];const offer=best(result.offers,v,card.catalogGame||'pokemon');return offer?{offer,card:c,amount:offer.amount,currency:offer.currency,at:offer.updated||new Date().toISOString(),source:offer.source+' · '+metricLabel(offer.metric)+(offer.updated?'':' · data pobrania')}:null}
 return Object.freeze({positive,variant,nativeVariants,native,cmOffer,chooseMetric,riftOffers,tcgOffers,best,offers,lookup,savedCard,snapshot,isStale,metricLabel,sameFinish});
})();
