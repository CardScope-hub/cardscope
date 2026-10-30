// MTG editions: public catalog snapshot plus live Scryfall prices.
// Images remain at their source. No login, collection or scan data are sent here.
globalThis.CardMTG=(()=>{
 const VERSION='mtg-expansions-1', localPages=new Map();
 const families={fra:['fra','frc','pfra','tfra','tfrc'],ltr:['ltr','ltc','pltr','pltc','tltr','tltc']};
 const normalize=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/ł/g,'l').replace(/[^a-z0-9]+/g,' ').trim();
 const aliases=new Map([
  ['reality fracture',families.fra],['reality fracture commander',['frc']],
  ['lord of the rings',families.ltr],['the lord of the rings',families.ltr],['lotr',families.ltr],['wladca pierscieni',families.ltr],
  ['tales of middle earth',families.ltr],['the lord of the rings tales of middle earth',families.ltr],
  ['tales of middle earth commander',['ltc']],['lord of the rings commander',['ltc']]
 ]);
 const codes=new Set(Object.values(families).flat());
 function query(value){
  const q=String(value||'').trim(), key=normalize(q), group=aliases.get(key);
  if(group)return group.length===1?'set:'+group[0]:'('+group.map(c=>'set:'+c).join(' or ')+')';
  if(codes.has(key))return 'set:'+key;
  const code=q.match(/^([a-z\d]{2,6})\s*[:#/]\s*(\d+[a-z★*]?)$/i);
  return code?`set:${code[1].toLowerCase()} cn:${code[2]}`:q;
 }
 const number=s=>String(s||'').toLowerCase().replace(/^0+(?=\d)/,'');
 function select(rows,q,ocr){
  let rest=q.replace(/\s+game:paper\s*$/i,'').trim(),setCodes=null,cn=null,exact=null;
  const group=rest.match(/^\((set:[a-z0-9]+(?: or set:[a-z0-9]+)+)\)(?:\s+|$)/i);
  if(group){setCodes=group[1].toLowerCase().split(' or ').map(s=>s.slice(4));rest=rest.slice(group[0].length).trim()}
  rest=rest.replace(/(?:^|\s)(?:set|e):([a-z0-9]+)(?=\s|$)/gi,(_,c)=>{setCodes=[c.toLowerCase()];return ' '});
  rest=rest.replace(/(?:^|\s)(?:cn|number):([0-9]+[a-z★*]?)(?=\s|$)/gi,(_,n)=>{cn=number(n);return ' '}).trim();
  const quoted=rest.match(/^!("(?:[^"\\]|\\.)*")$/);
  if(quoted){try{exact=normalize(JSON.parse(quoted[1]));rest=''}catch{return null}}
  // Do not silently reinterpret unsupported Scryfall operators offline.
  if(/[!:<>=(|)]/.test(rest))return null;
  const key=normalize(rest),terms=key.split(' ').filter(Boolean),T=globalThis.CardScanText;
  return rows.map(c=>{
   if(setCodes&&!setCodes.includes(c.set)||cn!==null&&number(c.collector_number)!==cn)return null;
   const names=[c.name,c.printed_name,c.flavor_name,...(c.card_faces||[]).flatMap(f=>[f.name,f.printed_name,f.flavor_name])].filter(Boolean);
   const normalized=names.map(normalize);
   if(exact&&!normalized.includes(exact))return null;
   let score=0;
   if(!key||exact)score=200;
   else if(normalized.includes(key))score=180;
   else if(normalized.some(n=>terms.every(t=>n.includes(t))))score=120;
   else if(ocr&&T&&key.length>=4){const sim=Math.max(...names.map(n=>T.nameScore(n,rest)));if(sim>=(key.length<8?.8:.76))score=sim*100}
   return score?{c,score}:null;
  }).filter(Boolean).sort((a,b)=>b.score-a.score||b.c.released_at.localeCompare(a.c.released_at)||a.c.set.localeCompare(b.c.set)||a.c.collector_number.localeCompare(b.c.collector_number,undefined,{numeric:true})||a.c.id.localeCompare(b.c.id)).map(x=>x.c);
 }
 function localCard(raw,api,date){const card=api.mtgCard(raw);card.catalogDate=date;card.catalogSnapshot=true;return card}
 function localResult(rows,page,q,api,date){const size=36;return {cards:rows.slice((page-1)*size,page*size).map(c=>localCard(c,api,date)),total:rows.length,nextPage:rows.length>page*size?page+1:null,resolvedQuery:q,source:'Scryfall · katalog w aplikacji',note:'Kopia katalogu: '+date+'. Aktualna cena wymaga połączenia ze Scryfall.'}}
 async function search(params,api){
  const {json,snapshot}=api,page=Math.max(1,Number(params.page)||1),ocr=params.ocr==='1',offline=globalThis.navigator?.onLine===false;
  if(params.index==='1'){
   const reads=await Promise.allSettled([snapshot('mtg-names'),...(offline?[]:[json('https://api.scryfall.com/catalog/card-names',{timeout:4000})])]);
   const names=[...new Set(reads.flatMap(r=>r.status==='fulfilled'?(r.value.names||r.value.data||[]):[]))];
   if(!names.length)throw Error('Nie udało się wczytać słownika nazw MTG.');return {names};
  }
  if(params.id){
   if(!offline)try{return {card:api.mtgCard(await json('https://api.scryfall.com/cards/'+encodeURIComponent(params.id),{ttl:300000,timeout:7000,fallback:false}))}}catch{}
   const d=await snapshot('mtg-expanded'),c=d.cards.find(x=>x.id===params.id);
   if(!c)throw Error('Nie udało się pobrać tego wydania MTG. Sprawdź połączenie.');return {card:localCard(c,api,d.snapshotDate)};
  }
  let q=query(params.q),key=q+'|'+ocr;
  if(page>1&&localPages.has(key)){const saved=localPages.get(key);return localResult(saved.rows,page,q,api,saved.date)}
  if(page===1)localPages.delete(key);
  if(!offline)try{
   if(ocr&&page===1&&!q.startsWith('!')&&!q.includes('set:'))try{const named=await json('https://api.scryfall.com/cards/named?'+new URLSearchParams({fuzzy:q}),{timeout:5000});q='!'+JSON.stringify(named.name)}catch{}
   const d=await json('https://api.scryfall.com/cards/search?'+new URLSearchParams({q:q+' game:paper',unique:'prints',order:'released',page:String(page),include_extras:'true',include_variations:'true'}),{ttl:300000,timeout:7000,fallback:false});
   return {cards:(d.data||[]).map(api.mtgCard),total:d.total_cards||0,nextPage:d.has_more?page+1:null,resolvedQuery:q,source:'Scryfall'};
  }catch{}
  // Never switch pagination from 175 live rows to 36 local rows mid-search.
  if(page>1)throw Error('Nie udało się pobrać kolejnej strony. Spróbuj ponownie po połączeniu z internetem.');
  const d=await snapshot('mtg-expanded'),rows=select(d.cards,q,ocr);
  if(!rows)throw Error('To zapytanie wymaga dostępu do Scryfall. Wpisz nazwę, serię lub kod, np. fra:43.');
  key=q+'|'+ocr;localPages.set(key,{rows,date:d.snapshotDate});if(localPages.size>25)localPages.delete(localPages.keys().next().value);
  const result=localResult(rows,page,q,api,d.snapshotDate);
  if(!rows.length)result.note='Brak dopasowania w lokalnej bazie Reality Fracture i The Lord of the Rings. Pozostałe wydania są wyszukiwane online.';
  return result;
 }
 return Object.freeze({version:VERSION,search,query,select});
})();
