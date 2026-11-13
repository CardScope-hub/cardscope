/* SWU edition-aware concept notes. */
(() => {
 'use strict';
 const data=globalThis.CardSWUPLData;
 const normalizeNumber=n=>String(n||'').normalize('NFKC').toUpperCase().replace(/^(T?)0+(?=\d)/,'$1');
 const gameName=s=>String(s||'').toLowerCase().replace(/[^a-z]/g,'');
 function isCard(card){if(!card)return false;const games=[card.gameKey,card.catalogGame,card.game].filter(Boolean);return games.some(g=>['swu','starwarsunlimited'].includes(gameName(g)))||!games.length&&[card.id,card.catalogId].some(id=>/^swu:/i.test(String(id||'')))}
 function lookup(card){
  if(!data||!card||typeof card!=='object')return null;
  if(!isCard(card))return null;
  const resolve=(set,number)=>{const code=set.toUpperCase()+':'+normalizeNumber(number),key=data.aliases[code],entry=data.cards[key];return entry?{...entry,key,editionCode:code.replace(':','-'),setCode:set.toUpperCase(),setName:data.sets[set.toUpperCase()]?.name||set}:null};
  for(const value of [card.catalogId,card.id,card.localId,card.printedNumber,card.number]){
   if(value==null)continue;const raw=String(value).normalize('NFKC').trim().toUpperCase().replace(/^SWU:/,'');
   const m=raw.match(/^#?\s*([A-Z][A-Z0-9]{1,7})\s*[-:#]\s*(T?\d{1,4}[A-Z]*(?:-[A-Z0-9]+)?)(?:\s*\/\s*T?\d{1,4})?$/);
   if(m){const entry=resolve(m[1],m[2]);if(entry)return entry}
  }
  // Legacy collection entries need an explicit SWU game and set, never name-only matching.
  if(!isCard(card))return null;
  const rawSet=typeof card.set==='object'?card.set?.id||card.set?.name:card.set;
  const set=Object.keys(data.sets).find(s=>[s,data.sets[s].name].some(x=>x.toLowerCase()===String(rawSet||'').trim().toLowerCase()));
  if(set)for(const n of [card.collectorNumber,card.number,card.localId,card.printedNumber]){const m=String(n||'').trim().toUpperCase().match(/^#?(T?\d{1,4}[A-Z]*(?:-[A-Z0-9]+)?)(?:\s*\/\s*T?\d{1,4})?$/);if(m){const entry=resolve(set,m[1]);if(entry)return entry}}
  return null;
 }
 function render(target,card){return globalThis.CardExplanations.render(target,card,lookup(card));}
 const swu=Object.freeze({lookup,render,isCard,version:data?.version||'swu-pl-1'});globalThis.CardSWUPL=swu;
 // Existing result/collection/binder hooks use this historical shared renderer.
 // Invalidate both private render caches on a game switch to prevent stale text.
 const rift=globalThis.CardOriginsPL,families=new WeakMap();
 globalThis.CardOriginsPL=Object.freeze({...rift,lookup:card=>swu.lookup(card)||rift?.lookup(card)||null,render(target,card){const el=typeof target==='string'?document.getElementById(target):target;if(!el)return false;const family=isCard(card)?'swu':'rift';if(families.get(el)!==family){rift?.render(el,null);swu.render(el,null);families.set(el,family)}return family==='swu'?swu.render(el,card):rift?.render(el,card)||false},version:'explanations-1'});
})();
