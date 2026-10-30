// Verified additions augment the public catalog; collection data is never read.
globalThis.CardPokemon = (() => {
 let pending;const snapshots=new Map();
 const provider=lang=>lang==='pt-br'?'pt':lang;
 function snapshot(lang){
  lang=provider(lang);if(!['en','ja','de','fr','es','it','pt'].includes(lang))return Promise.reject(Error('Nieobsługiwany język.'));
  if(!snapshots.has(lang))snapshots.set(lang,raw('catalog-pokemon-'+lang+'.json?v=pokemon-lang-1',{ttl:86400000}).then(d=>{
   if(d.schema!==1||!Array.isArray(d.cards)||!Array.isArray(d.sets))throw Error('Nieprawidłowy katalog językowy.');
   return {...d,byId:new Map(d.cards.map(c=>[c.id,c])),bySet:new Map(d.sets.map(s=>[s.id,s]))};
  }).catch(e=>{snapshots.delete(lang);throw e}));return snapshots.get(lang);
 }
 const raw = (url, options) => CardCatalog.json(url, options);
 function additions() {
  if (!pending) pending = raw('catalog-pokemon-latest.json?v=expansions-1', {ttl:86400000}).then(d => {
   if(d.schema!==1||!Array.isArray(d.cards)||!Array.isArray(d.sets))throw Error('Nieprawidłowy katalog dodatków.');
   return {...d, byId:new Map(d.cards.map(c=>[c.id,c]))};
  }).catch(e=>{pending=null;throw e});
  return pending;
 }
 async function index(lang) {
  const requested=lang;lang=provider(lang);
  const bundled=lang!=='en'?await snapshot(lang).catch(()=>null):null;
  const extra = lang==='en' ? await additions().catch(()=>null) : null;
  let cards, sets, note='';
  try {
   [cards,sets]=await Promise.all(['cards','sets'].map(kind=>raw('https://api.tcgdex.net/v2/'+lang+'/'+kind,{ttl:3600000,timeout:4500})));
   if(!Array.isArray(cards)||!Array.isArray(sets))throw Error('Nie udało się odczytać katalogu.');
  } catch(e) {
   if(bundled){cards=bundled.cards;sets=bundled.sets;note='Katalog językowy: '+bundled.preparedAt+'.';}
   else {if(!extra)throw e;
   cards=[];sets=[];note='Katalog częściowy: 30th Celebration i Classic Collection. Pełna baza chwilowo niedostępna.';}
  }
  if(bundled){
   const rows=new Map(bundled.cards.map(c=>[c.id,c]));for(const c of cards)rows.set(c.id,{...rows.get(c.id),...c,image:c.image||rows.get(c.id)?.image});cards=[...rows.values()].map(c=>({...c,catalogLanguage:requested}));
   const setMap=new Map(bundled.sets.map(s=>[s.id,s]));for(const s of sets)setMap.set(s.id,{...setMap.get(s.id),...s});sets=[...setMap.values()];
  }
  if(extra) {
   const hidden=new Set(extra.replacedIndexIds||[]), byId=new Map(cards.filter(c=>!hidden.has(c.id)).map(c=>[c.id,c]));
   for(const c of extra.cards)byId.set(c.id,{...byId.get(c.id),...c});
   cards=[...byId.values()];const setMap=new Map(sets.map(s=>[s.id,s]));
   for(const s of extra.sets)setMap.set(s.id,{...setMap.get(s.id),...s});
   sets=[...setMap.values()];
  }
  sets=sets.filter(s=>!s.id.match(/^[AB]\d[a-z]?$|^P-[AB]$/i));const ids=new Set(sets.map(s=>s.id));
  return {cards:cards.filter(c=>!c.image?.includes('/tcgp/')&&ids.has(c.setId||c.id.slice(0,c.id.lastIndexOf('-')))),sets,note};
 }
 async function card(url) {
  const localized=String(url).match(/^https:\/\/api\.tcgdex\.net\/v2\/(ja|de|fr|es|it|pt-br|pt)\/cards\/([^/?]+)$/);
  if(localized){
   const requested=localized[1],lang=provider(requested),id=decodeURIComponent(localized[2]);
   const bundled=await snapshot(lang).catch(()=>null),brief=bundled?.byId.get(id);
   let live;try{live=await raw('https://api.tcgdex.net/v2/'+lang+'/cards/'+encodeURIComponent(id),{ttl:300000,timeout:6500,fallback:true})}catch(e){if(!brief)throw e}
   if(live?.id&&live.id!==id)throw Error('Katalog zwrócił inne wydanie karty.');
   if(!live&&!brief)throw Error('Nie znaleziono tego wydania.');
   const set=bundled?.bySet.get(id.slice(0,id.lastIndexOf('-')));
   return {...brief,...live,image:live?.image||brief?.image,catalogLanguage:requested,set:{name:set?.name||id.slice(0,id.lastIndexOf('-')),cardCount:{},...set,...live?.set},...(!live?{variants:{},variantsList:['Nieustalony']}:{} )};
  }
  const match=String(url).match(/^https:\/\/api\.tcgdex\.net\/v2\/en\/cards\/([^/?]+)$/);
  const extra=match ? await additions().catch(()=>null) : null;
  const patch=extra?.byId.get(decodeURIComponent(match?.[1]||''));
  if(!patch)return raw(url,{ttl:300000,fallback:false});
  let live={};
  if(!patch.syntheticId)try{live=await raw(url,{ttl:300000,timeout:4500,fallback:true})}catch{}
  // Keep real provider pricing IDs when available, discard generated Normal metadata
  // for this all-foil set. The patch's exact product ID is an independent fallback.
  const details=(live.variants_detailed||[]).filter(v=>/^(holo|holofoil)$/i.test(v.type)&&(!v.size||v.size==='standard'));
  return {...live,...patch,set:{...live.set,...patch.set},variants_detailed:details};
 }
 return Object.freeze({index,card,additions,snapshot,provider});
})();
