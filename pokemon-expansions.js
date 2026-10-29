// Verified additions augment the public catalog; collection data is never read.
globalThis.CardPokemon = (() => {
 let pending;
 const raw = (url, options) => CardCatalog.json(url, options);
 function additions() {
  if (!pending) pending = raw('catalog-pokemon-latest.json?v=expansions-1', {ttl:86400000}).then(d => {
   if(d.schema!==1||!Array.isArray(d.cards)||!Array.isArray(d.sets))throw Error('Nieprawidłowy katalog dodatków.');
   return {...d, byId:new Map(d.cards.map(c=>[c.id,c]))};
  }).catch(e=>{pending=null;throw e});
  return pending;
 }
 async function index(lang) {
  const extra = lang==='en' ? await additions().catch(()=>null) : null;
  let cards, sets, note='';
  try {
   [cards,sets]=await Promise.all(['cards','sets'].map(kind=>raw('https://api.tcgdex.net/v2/'+lang+'/'+kind)));
   if(!Array.isArray(cards)||!Array.isArray(sets))throw Error('Nie udało się odczytać katalogu.');
  } catch(e) {
   if(!extra)throw e;
   cards=[];sets=[];note='Katalog częściowy: 30th Celebration i Classic Collection. Pełna baza chwilowo niedostępna.';
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
 return Object.freeze({index,card,additions});
})();
