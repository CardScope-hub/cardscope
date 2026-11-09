/* MTG: a printing UUID or an exact set + collector number, never oracle_id/name. */
(function(root){
 'use strict';
 const shared = root.CardRiftSetCore;
 const norm = value => String(value ?? '').normalize('NFKC').trim().toLowerCase();
 const number = value => String(value ?? '').normalize('NFKC').trim().toUpperCase().replace(/(^|-)0+(?=[1-9])/g, '$1');
 function canonical(value) {
  const text = String(value ?? '').normalize('NFKC').trim().toUpperCase().replace(/^MTG:/,'');
  const m = text.match(/^([A-Z0-9]{2,8})\s*[-:#· ]\s*(\S+)$/);
  return m ? m[1] + '-' + number(m[2]) : null;
 }
 function buildIndex(data) {
  const byKey=new Map(), ids=new Map(), bySet=new Map(), sets=new Map(), ready=new Set();
  for(const set of data.sets){
   sets.set(norm(set.id),set.id);sets.set(norm(set.name),set.id);bySet.set(set.id,[]);
  }
  const cards=[];
  for(const [set,cn,id] of data.entries){
   const key=set+'-'+number(cn), card={key,setId:set};
   if(!bySet.has(set)||byKey.has(key)||ids.has(id))throw Error('Duplicate or invalid MTG identity');
   byKey.set(key,card);ids.set(norm(id),card);bySet.get(set).push(card);cards.push(card);
  }
  for(const set of data.sets)if(bySet.get(set.id).length!==set.total)throw Error('MTG set count mismatch');
  return {data:{...data,entries:undefined,cards},byKey,ids,bySet,sets,ready};
 }
 function hydrate(index,setId,rows) {
  const expected=index.bySet.get(setId);
  if(!Array.isArray(rows)||rows.length!==expected?.length)throw Error('Incomplete MTG pack');
  const keys=new Set();
  for(const c of rows){
   if(c.setId!==setId||!index.byKey.has(c.key)||keys.has(c.key)||typeof c.name!=='string')throw Error('Invalid MTG pack');
   keys.add(c.key);
  }
  for(const c of rows)Object.assign(index.byKey.get(c.key),c);
  index.ready.add(setId);
 }
 function resolve(index,saved) {
  const game=norm(saved.game).replace(/[^a-z]/g,''), catalogGame=norm(saved.catalogGame);
  if(game?!['mtg','magic','magicthegathering'].includes(game):catalogGame!=='mtg')return null;
  const byId=index.ids.get(norm(saved.catalogId).replace(/^(?:mtg|scryfall):/,''));
  if(byId)return byId;
  const setName=typeof saved.set==='object'?saved.set?.id||saved.set?.code||saved.set?.name||saved.set?.label:saved.set;
  const set=index.sets.get(norm(setName));
  for(const value of [saved.localId,saved.number]){
   if(!value)continue;
   const full=canonical(value), local=set?set+'-'+number(value):null;
   // A number such as XLN-217 can itself be a collector number in The List (PLST).
   for(const key of [local,full]){
    if(!key)continue;
    const match=index.byKey.get(key);if(match)return match;
    const fraction=key.match(/^([A-Z0-9]{2,8}-\d+[A-Z★*†]?)\/\d+$/);
    if(fraction&&index.byKey.has(fraction[1]))return index.byKey.get(fraction[1]);
   }
  }
  return null;
 }
 function ownership(index,savedCards){
  const map=new Map();
  for(const saved of savedCards||[]){
   const qty=saved.qty==null?1:Number(saved.qty);
   if(!Number.isFinite(qty)||Math.floor(qty)<1)continue;
   const card=resolve(index,saved);if(!card)continue;
   const item=map.get(card.key)||{qty:0,ids:[]};item.qty+=Math.floor(qty);item.ids.push(saved.id);map.set(card.key,item);
  }
  return map;
 }
 root.CardMTGSetCore={canonical,buildIndex,hydrate,resolve,ownership,summary:shared.summary,filter:shared.filter,fingerprint:shared.fingerprint};
})(globalThis);
