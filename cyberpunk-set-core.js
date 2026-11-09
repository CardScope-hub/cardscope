/* Never merge Beta/Retail, starter decks or promotional printings by card name. */
(function(root){
 'use strict';
 const shared=root.CardRiftSetCore;
 const norm=v=>String(v??'').normalize('NFKC').trim().toLowerCase();
 const setName=v=>norm(v).replace(/[—–_:·-]+/g,' ').replace(/\s+/g,' ');
 function number(value){
  const s=norm(value).replace(/^#\s*/,'');
  const m=s.match(/^(?:(β|b|beta)\s*[-:]?\s*)?(\d{1,3})([a-z]?)(?:\s*\/\s*(\d{1,3}))?$/u);
  return m?{key:(m[1]?'β':'')+Number(m[2])+m[3],beta:!!m[1],total:m[4]?Number(m[4]):null}:null;
 }
 function add(map,key,value){
  if(!key)return;
  if(!map.has(key))map.set(key,value);
  else if(map.get(key)!==value)map.set(key,null);
 }
 function buildIndex(data){
  const byKey=new Map(),ids=new Map(),sets=new Map(),bySet=new Map(),numbers=new Map(),marketIds=new Map();
  for(const set of data.sets){
   if(bySet.has(set.id))throw Error('Duplicate Cyberpunk set');
   bySet.set(set.id,[]);
   for(const alias of [set.id,set.code,set.name,...set.aliases||[]])add(sets,setName(alias),set.id);
  }
  for(const c of data.cards){
   if(byKey.has(c.key)||!bySet.has(c.setId))throw Error('Invalid Cyberpunk printing');
   byKey.set(c.key,c);bySet.get(c.setId).push(c);
   for(const id of [c.catalogId,c.printingId])add(ids,norm(id),c);
   if(c.tcgplayerId)add(marketIds,String(c.tcgplayerId),c);
   for(const alias of [c.number,c.code,...c.numberAliases||[]]){
    const parsed=number(alias);if(!parsed)continue;
    add(numbers,c.setId+'|'+parsed.key,c);
    // The explicitly selected Beta set supplies the edition when a legacy record
    // contains only the digits. A Beta prefix is never stripped for a Retail set.
    if(parsed.beta)add(numbers,c.setId+'|'+parsed.key.slice(1),c);
   }
  }
  for(const set of data.sets)if(bySet.get(set.id).length!==set.total)throw Error('Cyberpunk count mismatch');
  return{data,byKey,ids,sets,bySet,numbers,marketIds};
 }
 function resolve(index,saved){
  const game=norm(saved.game).replace(/[\s_-]+/g,'');
  if(game?!['cyberpunk','cyberpunktcg'].includes(game):norm(saved.catalogGame)!=='cyberpunk')return null;
  for(const id of [saved.catalogId,saved.officialPrintingId]){
   const found=index.ids.get(norm(id));if(found)return found;
  }
  // Card-wide IDs (officialCardId) intentionally do not establish a printing.
  const market=index.marketIds.get(String(saved.tcgplayerId||''));if(market)return market;
  const name=typeof saved.set==='object'?saved.set?.id||saved.set?.code||saved.set?.name:saved.set;
  const set=index.sets.get(setName(name));
  const lookup=(set,value)=>{
   const parsed=number(value);if(!parsed||!set)return null;
   const c=index.numbers.get(set+'|'+parsed.key);
   return c&&(!parsed.total||c.officialTotal===parsed.total)?c:null;
  };
  for(const value of [saved.localId,saved.number]){
   if(!value)continue;
   const exact=index.ids.get(norm(value));if(exact)return exact;
   if(set){const c=lookup(set,value);if(c)return c;}
   const full=norm(value).match(/^(.+?)[\s·:#–—-]+((?:(?:β|b|beta)\s*[-:]?\s*)?\d{1,3}[a-z]?(?:\s*\/\s*\d{1,3})?)$/u);
   if(full){const c=lookup(index.sets.get(setName(full[1])),full[2]);if(c)return c;}
  }
  return null;
 }
 function ownership(index,list){
  const owned=new Map();
  for(const saved of list||[]){
   const qty=saved.qty==null?1:Math.floor(Number(saved.qty));if(!Number.isFinite(qty)||qty<1)continue;
   const c=resolve(index,saved);if(!c)continue;
   const item=owned.get(c.key)||{qty:0,ids:[]};item.qty+=qty;item.ids.push(saved.id);owned.set(c.key,item);
  }
  return owned;
 }
 const fingerprint=cards=>JSON.stringify([shared.fingerprint(cards),(cards||[]).map(c=>[c.officialPrintingId,c.tcgplayerId])]);
 root.CardCyberpunkSetCore={number,buildIndex,resolve,ownership,fingerprint,summary:shared.summary,filter:shared.filter};
})(globalThis);
