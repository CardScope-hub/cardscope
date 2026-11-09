/* Lorcana printings: catalog IDs first; only unambiguous set/number matches. */
(function(root){
 'use strict';
 const shared=root.CardRiftSetCore;
 const norm=v=>String(v??'').normalize('NFKC').trim().toLowerCase();
 const setName=v=>norm(v).normalize('NFKD').replace(/\p{M}/gu,'').replace(/[’']/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const token=v=>String(v).toUpperCase().replace(/^0+(?=\d)/,'');
 function number(value){
  const s=String(value??'').normalize('NFKC').trim().replace(/^#\s*/,'').replace(/[•·●]/g,' ').replace(/\s+/g,' ');
  const early=s.match(/^(\d{1,2})\s+[a-z]{2,5}\s+([a-z]{2,3})\s+(\d{1,3}[a-z]?)\s*\/\s*([a-z]{1,4}\d*)$/i);
  if(early)return {number:token(early[3]),group:token(early[4]),language:early[2].toLowerCase(),set:token(early[1])};
  const m=s.match(/^(\d{1,3}[a-z]?)(?:\s*\/\s*(\d{1,3}|[a-z]{1,4}\d*))?(?:\s+([a-z]{2,3})\s+(\d{1,2}|Q\d|CC\d))?$/i);
  return m?{number:token(m[1]),group:m[2]?token(m[2]):null,language:m[3]?.toLowerCase(),set:m[4]?token(m[4]):null}:null;
 }
 function add(map,key,c){
  if(!key)return;
  if(!map.has(key))map.set(key,c);
  else if(map.get(key)!==c)map.set(key,null);
 }
 const printKey=p=>p.number+'/'+(p.group||'');
 const footerKey=p=>printKey(p)+'|'+p.set;
 function buildIndex(data){
  const byKey=new Map(),ids=new Map(),sets=new Map(),bySet=new Map(),numbers=new Map(),footers=new Map(),promos=new Map(),sourceIds=new Map(),markets=new Map();
  for(const s of data.sets){
   if(bySet.has(s.id))throw Error('Duplicate Lorcana set');bySet.set(s.id,[]);
   for(const a of [s.id,s.code,s.name,...s.aliases||[]])add(sets,setName(a),s.id);
  }
  for(const c of data.cards){
   if(byKey.has(c.key)||!bySet.has(c.setId))throw Error('Invalid Lorcana printing');
   byKey.set(c.key,c);bySet.get(c.setId).push(c);add(ids,norm(c.catalogId),c);
   if(c.sourceId!=null)add(sourceIds,String(c.sourceId),c);
   for(const field of ['tcgplayerId','cardmarketId','lorcastId'])if(c[field])add(markets,field+':'+c[field],c);
   const full=number(c.fullIdentifier),printed=number(c.printedNumber),local=number(c.number),p=full||printed||local;
   // Unnumbered tokens have IDs, not fabricated collector numbers.
   if(!p)continue;
   if(full?.set&&full.group)add(footers,footerKey(full),c);
   if(p.group&&!/^\d+$/.test(p.group))add(promos,printKey(p),c);
   const scopes=new Set([c.setId]);if(full?.set){const sourceSet=sets.get(setName(full.set));if(sourceSet)scopes.add(sourceSet)}
   for(const sid of scopes){add(numbers,sid+'|'+p.number,c);if(p.group)add(numbers,sid+'|'+printKey(p),c);}
  }
  for(const s of data.sets)if(s.total!==bySet.get(s.id).length)throw Error('Lorcana count mismatch');
  return{data,byKey,ids,sets,bySet,numbers,footers,promos,sourceIds,markets};
 }
 function resolve(index,saved){
  const game=setName(saved.game).replace(/ /g,'');
  if(game?!['lorcana','disneylorcana'].includes(game):norm(saved.catalogGame)!=='lorcana')return null;
  const direct=index.ids.get(norm(saved.catalogId));if(direct)return direct;
  const source=saved.lorcanaId??saved.sourceId;if(source!=null){const c=index.sourceIds.get(String(source));if(c)return c}
  for(const field of ['tcgplayerId','cardmarketId','lorcastId'])if(saved[field]){const c=index.markets.get(field+':'+saved[field]);if(c)return c}
  const setValue=typeof saved.set==='object'?saved.set?.id||saved.set?.code||saved.set?.name:saved.set;
  const chosen=index.sets.get(setName(setValue));
  const lookup=(sid,p)=>{
   if(!p)return null;
   if(p.set&&p.group)return index.footers.get(footerKey(p))||null;
   if(p.set)sid=index.sets.get(setName(p.set));
   if(sid)return index.numbers.get(sid+'|'+(p.group?printKey(p):p.number))||null;
   return p.group&&!/^\d+$/.test(p.group)?index.promos.get(printKey(p))||null:null;
  };
  // An explicit full footer or fraction outranks a truncated local number. A
  // conflicting/ambiguous precise value must not fall through to a base card.
  const values=[saved.fullIdentifier,saved.printedNumber,saved.number,saved.localId].filter(v=>v!=null&&String(v).trim());
  for(const value of values){
   const id=index.ids.get(norm(value));if(id)return id;
   const p=number(value);if(p&&(p.group||p.set))return lookup(chosen,p);
  }
  for(const value of values){
   const p=number(value);if(p&&chosen)return lookup(chosen,p);
   const full=String(value).normalize('NFKC').trim().match(/^(.+?)[\s·:#–—-]+(\d{1,3}[a-z]?(?:\s*\/\s*(?:\d{1,3}|[a-z]{1,4}\d*))?)$/i);
   if(full){const sid=index.sets.get(setName(full[1]));if(sid)return lookup(sid,number(full[2]));}
  }
  return null;
 }
 function ownership(index,list){
  const owned=new Map();
  for(const saved of list||[]){const qty=saved.qty==null?1:Math.floor(Number(saved.qty));if(!Number.isFinite(qty)||qty<1)continue;const c=resolve(index,saved);if(!c)continue;const v=owned.get(c.key)||{qty:0,ids:[]};v.qty+=qty;v.ids.push(saved.id);owned.set(c.key,v)}
  return owned;
 }
 const fingerprint=cards=>JSON.stringify([shared.fingerprint(cards),(cards||[]).map(c=>[c.fullIdentifier,c.printedNumber,c.sourceId,c.lorcanaId,c.cardmarketId,c.tcgplayerId,c.lorcastId])]);
 root.CardLorcanaSetCore={number,buildIndex,resolve,ownership,fingerprint,summary:shared.summary,filter:shared.filter};
})(globalThis);
