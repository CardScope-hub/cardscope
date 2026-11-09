// Verified additions augment the public catalog; collection data is never read.
globalThis.CardPokemon = (() => {
 let pending;const snapshots=new Map();
 const provider=lang=>lang==='pt-br'?'pt':lang;
 function snapshot(lang){
  lang=provider(lang);if(!['en','ja','de','fr','es','it','pt','ko','zh-cn','zh-tw'].includes(lang))return Promise.reject(Error('Nieobsługiwany język.'));
  if(!snapshots.has(lang))snapshots.set(lang,raw('catalog-pokemon-'+lang+'.json?v='+(['ko','zh-cn','zh-tw'].includes(lang)?'pokemon-asian-1':'pokemon-hd-1'),{ttl:86400000}).then(async d=>{
   if(d.schema!==1||!Array.isArray(d.cards)||!Array.isArray(d.sets))throw Error('Nieprawidłowy katalog językowy.');
   if(globalThis.CardPokemonRepair)d=await CardPokemonRepair.snapshot(d,lang).catch(()=>d);
   return {...d,byId:new Map(d.cards.map(c=>[c.id,c])),bySet:new Map(d.sets.map(s=>[s.id,s]))};
  }).catch(e=>{snapshots.delete(lang);throw e}));return snapshots.get(lang);
 }
 const raw = (url, options) => CardCatalog.json(url, options);
 function additions() {
  if (!pending) pending = raw('catalog-pokemon-latest.json?v=pokemon-hd-1', {ttl:86400000}).then(d => {
   if(d.schema!==1||!Array.isArray(d.cards)||!Array.isArray(d.sets))throw Error('Nieprawidłowy katalog dodatków.');
   return {...d, byId:new Map(d.cards.map(c=>[c.id,c]))};
  }).catch(e=>{pending=null;throw e});
  return pending;
 }
 async function index(lang) {
  const requested=lang;lang=provider(lang);
  const bundled=await snapshot(lang).catch(()=>null);
  if(['ko','zh-cn','zh-tw'].includes(lang)){
   if(!bundled)throw Error('Nie udało się wczytać katalogu tego języka. Sprawdź połączenie i pliki aktualizacji.');
   return {cards:bundled.cards,sets:bundled.sets,note:'Katalog regionalny · '+bundled.preparedAt+'.'};
  }
  const extra = lang==='en' ? await additions().catch(()=>null) : null;
  let cards, sets, note='',liveIndex=true;
  try {
   [cards,sets]=await Promise.all(['cards','sets'].map(kind=>raw('https://api.tcgdex.net/v2/'+lang+'/'+kind,{ttl:3600000,timeout:4500})));
   if(!Array.isArray(cards)||!Array.isArray(sets))throw Error('Nie udało się odczytać katalogu.');
  } catch(e) {
   liveIndex=false;
   if(bundled){cards=bundled.cards;sets=bundled.sets;note='Katalog językowy: '+bundled.preparedAt+'.';}
   else {if(!extra)throw e;
   cards=[];sets=[];note='Katalog częściowy: 30th Celebration i Classic Collection. Pełna baza chwilowo niedostępna.';}
  }
  if(bundled){
   const rows=new Map(bundled.cards.map(c=>[c.id,c]));for(const c of cards){const id=(liveIndex&&bundled.sourceAliases?.[c.id])||c.id;rows.set(id,{...rows.get(id),...c,id,image:c.image||rows.get(id)?.image});}cards=[...rows.values()].map(c=>({...c,catalogLanguage:requested}));
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
  const asian=String(url).match(/^https:\/\/api\.tcgdex\.net\/v2\/(ko|zh-cn|zh-tw)\/cards\/([^/?]+)$/);
  if(asian){
   const lang=asian[1],id=decodeURIComponent(asian[2]),d=await snapshot(lang),c=d.byId.get(id);
   if(!c)throw Error('Nie znaleziono tego numeru w wybranym wydaniu językowym.');
   return {...c,gameKey:'pokemon',game:'Pokémon',catalogLanguage:lang,set:d.bySet.get(c.setId)||{id:c.setId,name:c.setId,cardCount:{}},variants:c.variants||{},variantsList:c.variantsList||['Nieustalony'],catalogSnapshot:true};
  }
  const localized=String(url).match(/^https:\/\/api\.tcgdex\.net\/v2\/(ja|de|fr|es|it|pt-br|pt)\/cards\/([^/?]+)$/);
  if(localized){
   const requested=localized[1],lang=provider(requested),id=decodeURIComponent(localized[2]);
   const bundled=await snapshot(lang).catch(()=>null),brief=bundled?.byId.get(id);
   const sourceId=brief?.sourceId||id;
   let live;if(!brief?.catalogIdentityLegacy)try{live=await raw('https://api.tcgdex.net/v2/'+lang+'/cards/'+encodeURIComponent(sourceId),{ttl:300000,timeout:6500,fallback:true})}catch(e){if(!brief)throw e}
   if(live?.id&&live.id!==sourceId)throw Error('Katalog zwrócił inne wydanie karty.');
   if(!live&&!brief)throw Error('Nie znaleziono tego wydania.');
   const set=bundled?.bySet.get(brief?.setId||id.slice(0,id.lastIndexOf('-')));
   return {...brief,...live,id,image:live?.image||brief?.image,catalogLanguage:requested,set:{name:set?.name||id.slice(0,id.lastIndexOf('-')),cardCount:{},...set,...live?.set},...(!live?{variants:{},variantsList:['Nieustalony']}:{} )};
  }
  const match=String(url).match(/^https:\/\/api\.tcgdex\.net\/v2\/en\/cards\/([^/?]+)$/);
  const extra=match ? await additions().catch(()=>null) : null;
  const patch=extra?.byId.get(decodeURIComponent(match?.[1]||''));
  if(!patch){try{return await raw(url,{ttl:300000,timeout:6500,fallback:false})}catch(e){
   if(!match)throw e;const bundled=await snapshot('en').catch(()=>null),id=decodeURIComponent(match[1]),brief=bundled?.byId.get(id);if(!brief)throw e;
   const set=bundled.bySet.get(brief.setId||id.slice(0,id.lastIndexOf('-')));return {...brief,catalogLanguage:'en',set:{name:set?.name||brief.setId,cardCount:{},...set},variants:{},variantsList:['Nieustalony'],catalogSnapshot:true};
  }}
  let live={};
  if(!patch.syntheticId)try{live=await raw(url,{ttl:300000,timeout:4500,fallback:true})}catch{}
  // Keep real provider pricing IDs when available, discard generated Normal metadata
  // for this all-foil set. The patch's exact product ID is an independent fallback.
  const details=(live.variants_detailed||[]).filter(v=>/^(holo|holofoil)$/i.test(v.type)&&(!v.size||v.size==='standard'));
  return {...live,...patch,set:{...live.set,...patch.set},variants_detailed:details};
 }
 return Object.freeze({index,card,additions,snapshot,provider});
})();
