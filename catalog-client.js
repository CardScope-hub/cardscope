// Public catalog data only. No session, tokens or collection records enter this cache.
globalThis.CardCatalog=(()=>{
 const base=new URL('./',document.currentScript?.src||location.href),memory=new Map(),snapshots=new Map();
 const cacheName='cardscope-public-catalog-v3',maxAge=6*60*60*1000;
 async function json(url,{ttl=maxAge,timeout=18000,fallback=true}={}){
  url=new URL(url,base).href;const hit=memory.get(url);if(hit&&Date.now()-hit.at<ttl)return hit.promise;
  const promise=(async()=>{let cache,cached;
   try{cache=await caches.open(cacheName);cached=await cache.match(url);if(cached&&Date.now()-Number(cached.headers.get('x-cardscope-saved'))<ttl)return await cached.json()}catch{}
   let last;for(let attempt=0;attempt<2;attempt++){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
    try{const r=await fetch(url,{signal:controller.signal,credentials:'omit',cache:'no-cache'});
     if(!r.ok){const e=Error('Katalog nie odpowiedział (HTTP '+r.status+').');e.status=r.status;throw e}
     const d=await r.json();if(cache)try{await cache.put(url,new Response(JSON.stringify(d),{headers:{'Content-Type':'application/json','x-cardscope-saved':String(Date.now())}}))}catch{}
     return d;
    }catch(e){last=e;if(e.status&&e.status<500&&e.status!==429)break;if(attempt===0)await new Promise(r=>setTimeout(r,350))}finally{clearTimeout(timer)}
   }
   if(fallback&&cached)return cached.json();
   throw Error(last?.name==='AbortError'?'Katalog odpowiada zbyt długo. Sprawdź połączenie i spróbuj ponownie.':'Nie udało się pobrać katalogu. Sprawdź połączenie z internetem.');
  })();memory.set(url,{at:Date.now(),promise});promise.catch(()=>memory.delete(url));return promise;
 }
 async function snapshot(game){if(!snapshots.has(game))snapshots.set(game,json('catalog-'+game+'.json?v=maintenance-20261107-1',{ttl:86400000}).then(d=>{if(game==='weiss-jp'){const editions=new Map();for(const r of d.cards){const key=CardWeiss.number(r[3])+'|'+CardWeiss.rarity(r[4]);if(!editions.has(key))editions.set(key,new Set());editions.get(key).add(r[6]);}d.wsAmbiguous=new Set([...editions].filter(([,images])=>images.size>1).map(([key])=>key));}return d;}).catch(e=>{snapshots.delete(game);throw e}));return snapshots.get(game)}
 const num=n=>n!=null&&Number.isFinite(Number(n))&&Number(n)>0?Number(n):null;
 const baseCard=(key,game,id,name,number,set,image,source)=>({gameKey:key,game,id:String(id),name,localId:String(number||''),set:{name:set||'',cardCount:{}},artworkUrl:image||null,catalogLanguage:'en',variantsList:['Nieustalony'],variants:{},source});
 function riftCard(c){const x=baseCard('riftbound','Riftbound',c.id,c.name,c.set?.catalogCodeIsSynthetic?c.sourceNumber:c.riftbound_id,c.set?.label,c.media?.image_url,c.source||'Riftcodex');x.tcgplayerId=c.tcgplayer_id;x.sourceUrl=c.sourceUrl||'https://riftcodex.com/';x.aliases=c.aliases||[];x.rarity=c.rarity||'';x.rulesText=c.rulesText;x.marketUrl='https://www.cardmarket.com/en/Riftbound/Products/Search?searchString='+encodeURIComponent(c.name+' '+x.localId);return x}
 function mtgCard(c){const x=baseCard('mtg','Magic: The Gathering',c.id,c.printed_name||c.name,c.collector_number,c.set_name,c.image_uris?.large||c.card_faces?.[0]?.image_uris?.large,'Scryfall');x.set.id=c.set;x.rarity=c.rarity||'';x.catalogLanguage=c.lang==='pt'?'pt-br':['en','ja','de','fr','es','it','pt-br','qya'].includes(c.lang)?c.lang:'other';x.backArtwork=c.card_faces?.[1]?.image_uris?.large;x.variantsList=[...(c.nonfoil?['Normal']:[]),...(c.foil?['Foil']:[]),...(c.finishes?.includes('etched')?['Etched']:[])];if(!x.variantsList.length)x.variantsList=['Nieustalony'];x.variants={normal:c.nonfoil,holo:c.foil};x.pricing={cardmarket:{unit:'EUR',trend:num(c.prices?.eur),'trend-holo':num(c.prices?.eur_foil)}};x.priceSource='scryfall-cardmarket';x.marketUrl=c.purchase_uris?.cardmarket;x.sourceUrl=c.scryfall_uri;x.tcgplayerId=c.tcgplayer_id;x.offers=[['Normal','usd'],['Foil','usd_foil'],['Etched','usd_etched']].filter(([,k])=>num(c.prices?.[k])).map(([variant,k])=>({source:'TCGplayer',via:'Scryfall',metric:'source',amount:num(c.prices[k]),currency:'USD',variant,match:'exact',name:c.name,set:c.set_name,productId:c.tcgplayer_id,url:c.purchase_uris?.tcgplayer||c.scryfall_uri,updated:null}));return x}
 function entry(game,c,d){
  if(game==='riftbound')return riftCard(c);
  if(game==='onepiece'){const x=baseCard(game,'One Piece',c.card_image_id,c.card_name,c.card_set_id||c.card_image_id,c.set_name,c.card_image,c.source||'OPTCG API');x.catalogLanguage=c.catalogLanguage||'en';x.sourceUrl=c.sourceUrl||null;x.tcgplayerId=c.tcgplayerId;x.tcgplayerGroupId=c.tcgplayerGroupId;x.aliases=c.aliases||[];x.rarity=c.rarity||'';x.marketUrl='https://www.cardmarket.com/en/OnePiece/Products/Search?searchString='+encodeURIComponent(x.localId);return x}
  if(game==='weiss-jp'){const provenance=d.cardSources?.[c[0]];return {...baseCard(game,'Weiß Schwarz','jp-'+c[0],c[1],c[3],d.sets[c[5]],c[6]?new URL(c[6],d.imageBase).href:null,provenance?.source||d.source),aliases:[c[2],...(d.aliases?.[c[0]]||[])].filter(Boolean),searchTerms:d.searchTerms?.[c[0]]||[],catalogLanguage:'ja',rarity:c[4],priceIdentityAmbiguous:d.wsAmbiguous?.has(CardWeiss.number(c[3])+'|'+CardWeiss.rarity(c[4]))||false,variantsList:[CardWeiss.rarity(c[4])],sourceUrl:provenance?.url||d.sourceUrl,marketUrl:'https://www.cardmarket.com/en/WeissSchwarz/Products/Search?searchString='+encodeURIComponent(c[3]),catalogDate:d.snapshotDate};}
  return {...baseCard(game,'Weiß Schwarz',c.id,c.name,c.number,c.set,c.image,c.source||d.source),aliases:c.aliases||[],searchTerms:c.searchTerms||[],rarity:c.rarity,variantsList:[CardWeiss.rarity(c.rarity)],backArtwork:c.back||null,sourceUrl:c.sourceUrl||'https://www.tcgplayer.com/product/'+c.id,marketUrl:'https://www.cardmarket.com/en/WeissSchwarz/Products/Search?searchString='+encodeURIComponent(c.number)};
 }
 function score(c,q,ocr){const T=CardScanText,read=T.weissReads(globalThis.CardWeissScan?.is(c.gameKey)?CardWeissScan.numberText(q):q)[0],actual=T.weissReads(globalThis.CardWeissScan?.is(c.gameKey)?CardWeissScan.numberText(c.localId):c.localId)[0];
  if(read&&actual&&(read.value.includes('-')||/\d+[A-Z]+\d/.test(read.value.split('/')[1]))){const distance=T.weissDistance(read.value,actual.value);return distance===0?200:ocr&&Number.isFinite(distance)?180-distance*10:0}
  if(ocr&&globalThis.CardWeissScan?.is(c.gameKey)){const score=Math.max(...[c.name,...(c.aliases||[])].map(n=>CardWeissScan.nameScore(n,q)));return score>=.98?160:CardWeissScan.nameKey(q).length>=5&&score>=.8?Math.round(score*100):0;}
  const key=T.norm(q),name=T.norm(c.name),number=T.norm(c.localId),aliases=[number,...(c.aliases||[]).map(T.norm)];
  if(aliases.some(x=>x.replace(/ /g,'')===key.replace(/ /g,'')))return 200;
  if(name===key)return 160;if(name.includes(key))return 120;if(key.split(' ').every(x=>name.includes(x)))return 100;
  if(key.length>2&&aliases.some(x=>x.includes(key)))return 90;
  if(ocr){const sim=Math.max(...[c.name,...CardScanIndex.aliases(c.name)].map(n=>T.nameScore(n,q)));return key.length>=4&&sim>=(key.length<8?.79:.74)?Math.round(sim*100):0}
  return key.split(' ').every(x=>T.norm([c.name,c.localId,c.set.name,c.rarity,...(c.aliases||[]),...(c.searchTerms||[])].join(' ')).includes(x))?45:0;
 }
 // Build a lightweight code/name index once; map only the requested page to UI cards.
 // This avoids re-creating 66k Japanese card objects for every OCR attempt.
 const weissIndexes=new Map();
 async function weissScanIndex(game){
  if(weissIndexes.has(game))return weissIndexes.get(game);
  const pending=(async()=>{const data=await snapshot(game),codes=new Map(),names=new Map(),series=new Map(),records=[];const W=globalThis.CardWeissScan;
   for(const raw of data.cards){const jp=game==='weiss-jp',name=jp?raw[1]:raw.name,number=jp?raw[3]:raw.number,aliases=jp?[raw[2],...(data.aliases?.[raw[0]]||[])]:raw.aliases||[],key=W.codeKey(number),set=W.seriesKey(number),record={raw,name,number,key,set,aliases};records.push(record);
    if(!codes.has(key))codes.set(key,[]);codes.get(key).push(record);if(!series.has(set))series.set(set,[]);series.get(set).push(record);
    for(const n of [name,...aliases].filter(Boolean)){const nk=W.nameKey(n);if(!names.has(nk))names.set(nk,[]);names.get(nk).push(record);}
   }
   return {data,records,codes,names,series,codeList:[...codes.values()].map(a=>({key:a[0].key,value:a[0].number.split(' ')[0]})),nameList:[...new Set(records.flatMap(r=>[r.name,...r.aliases]).filter(Boolean))]};
  })();weissIndexes.set(game,pending);pending.catch(()=>weissIndexes.delete(game));return pending;
 }
 async function searchWeiss(params){const {game,id}=params,book=await weissScanIndex(game),d=book.data,W=CardWeissScan,q=String(params.q||'').trim(),page=Math.max(1,Number(params.page)||1),ocr=params.ocr==='1',date=(d.snapshotDate||d.retrievedAt||'').slice(0,10);
  if(params.index==='1')return {names:book.nameList,retrievedAt:date};
  let selected=book.records,weissSeriesApplied;
  if(params.weissSeries){const subset=book.series.get(params.weissSeries);weissSeriesApplied=!!subset?.length;if(weissSeriesApplied)selected=subset;}
  if(id){const r=selected.find(r=>String(game==='weiss-jp'?'jp-'+r.raw[0]:r.raw.id)===id);return {card:r?entry(game,r.raw,d):null};}
  let found;const exact=book.codes.get(W.codeKey(q)),title=book.names.get(W.nameKey(q));
  if(exact?.length)found=exact;
  else if(ocr&&title?.length)found=[...new Set(title)];
  else found=selected.map(r=>({r,s:score({gameKey:game,name:r.name,localId:r.number,aliases:r.aliases,set:{name:game==='weiss-jp'?d.sets[r.raw[5]]:r.raw.set},rarity:game==='weiss-jp'?r.raw[4]:r.raw.rarity,searchTerms:game==='weiss-jp'?d.searchTerms?.[r.raw[0]]:r.raw.searchTerms},q,ocr)})).filter(r=>r.s>0).sort((a,b)=>b.s-a.s||a.r.name.localeCompare(b.r.name)).map(x=>x.r);
  if(weissSeriesApplied)found=found.filter(r=>r.set===params.weissSeries);
  return {cards:found.slice((page-1)*36,page*36).map(r=>entry(game,r.raw,d)),total:found.length,catalogCount:book.records.length,nextPage:found.length>page*36?page+1:null,weissSeriesApplied,source:d.source,note:'Kopia katalogu: '+date+'. Porównaj numer i ilustrację.'};
 }
 async function search(params){if(['weiss','weiss-jp'].includes(params.game)&&globalThis.CardWeissScan?.codeKey)return searchWeiss(params);const {game,id}=params,q=String(params.q||'').trim(),page=Math.max(1,Number(params.page)||1),ocr=params.ocr==='1';
  if(!['mtg','swu','riftbound','onepiece','weiss','weiss-jp'].includes(game))throw Error('Wybierz obsługiwaną grę.');
  if(game==='swu')return CardSWU.search(params,{snapshot});
  if(game==='mtg')return CardMTG.search(params,{json,snapshot,mtgCard});
  const d=await snapshot(game),date=(d.snapshotDate||d.retrievedAt||'').slice(0,10);
  if(params.index==='1'&&['weiss','weiss-jp'].includes(game))return {names:[...new Set(d.cards.flatMap(c=>game==='weiss-jp'?[c[1],c[2],...(d.aliases?.[c[0]]||[])]:[c.name,...(c.aliases||[])]).filter(Boolean))],retrievedAt:date};
  if(params.index==='1')return {names:[...new Set(d.cards.map(c=>game==='weiss-jp'?c[1]:game==='onepiece'?c.card_name:c.name))],retrievedAt:date};
  let rows=d.cards.map(c=>entry(game,c,d));
  // Apply the scanned series before pagination, so name fallback cannot mix
  // another release into later pages of the same title.
  let weissSeriesApplied;
  if(params.weissSeries&&globalThis.CardWeissScan?.is(game)){const matches=rows.filter(c=>CardWeissScan.seriesKey(c.localId)===params.weissSeries);weissSeriesApplied=matches.length>0;if(weissSeriesApplied)rows=matches;}
  // The bundled catalog works without a login or an external proxy. Network refresh is optional.
  if(game==='riftbound'&&params.fresh==='1')try{const url=/^[a-z]{2,6}-\d+/i.test(q)?'https://api.riftcodex.com/cards/riftbound/'+encodeURIComponent(q):'https://api.riftcodex.com/cards/name?'+new URLSearchParams({fuzzy:q,size:'100'});const fresh=await json(url,{timeout:7000});const map=new Map(rows.map(c=>[c.id,c]));for(const c of Array.isArray(fresh)?fresh:fresh.items||[])map.set(c.id,riftCard(c));rows=[...map.values()]}catch{}
  if(id)return {card:rows.find(c=>c.id===id)||null};
  const code=game==='riftbound'&&q.match(/^([a-z]{2,6})\s*[- ]\s*(\d+[a-z*]?)(?:-(\d+))?$/i);
  const number=game==='riftbound'&&q.match(/^(\d{1,4})([a-z*]?)\s*\/\s*(\d{2,4})$/i);
  const found=rows.map(c=>{let s=score(c,q,ocr);if(code){const key=(code[1]+'-'+code[2]).toLowerCase().replace(/-0+(?=\d)/,'-'),actual=c.localId.toLowerCase().replace(/-0+(?=\d)/,'-');s=(actual===key||actual.startsWith(key+'-'))&&(!code[3]||c.localId.endsWith('-'+code[3]))?200:0}if(number){const m=c.localId.match(/-(\d+)([a-z*]?)-(\d+)$/i);s=m&&Number(m[1])===Number(number[1])&&m[2].toLowerCase()===number[2].toLowerCase()&&Number(m[3])===Number(number[3])?200:0}return {c,s}}).filter(x=>x.s>0).sort((a,b)=>b.s-a.s||a.c.name.localeCompare(b.c.name));
  if(game==='riftbound'&&!found.length&&params.fresh!=='1')return search({...params,fresh:'1'});
  return {cards:found.slice((page-1)*36,page*36).map(x=>x.c),total:found.length,catalogCount:rows.length,nextPage:found.length>page*36?page+1:null,weissSeriesApplied,source:game==='riftbound'?(d.displaySource||'Riftcodex'):game==='onepiece'?(d.displaySource||'OPTCG API'):d.source,note:'Kopia katalogu: '+date+'. Porównaj numer i ilustrację. Nowsze wydania mogą nie być dostępne.'};
 }
 async function weissVariants(c){
  const game=c.gameKey||c.catalogGame;if(!['weiss','weiss-jp'].includes(game))return [c];
  const d=await snapshot(game),key=CardWeiss.family(c.localId||c.number);
  const rows=d.cards.filter(r=>CardWeiss.family(game==='weiss-jp'?r[3]:r.number)===key).map(r=>entry(game,r,d));
  return rows.sort((a,b)=>CardWeiss.rarity(a.rarity).localeCompare(CardWeiss.rarity(b.rarity))||a.localId.localeCompare(b.localId)||a.id.localeCompare(b.id));
 }
 return Object.freeze({json,search,snapshot,riftCard,mtgCard,score,weissVariants,weissScanIndex});
})();
