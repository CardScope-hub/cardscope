/* One Piece printing identities. Reprints and parallel illustrations stay separate. */
(function(root){
 'use strict';
 const shared=root.CardRiftSetCore;
 const norm=v=>String(v??'').normalize('NFKC').trim().toLowerCase();
 const setName=v=>norm(v).replace(/[^\p{L}\p{N}]+/gu,'');
 function number(value){
  const s=String(value??'').normalize('NFKC').trim().toUpperCase();
  const m=s.match(/^(OP|ST|EB|PRB|P)[\s-]?(\d{1,2})?[\s-]+(\d{1,3})(?:_([PR]\d+))?$/);
  if(!m||m[1]!=='P'&&!m[2]||m[1]==='P'&&m[2])return null;
  return m[1]+(m[2]?m[2].padStart(2,'0'):'')+'-'+m[3].padStart(3,'0')+(m[4]?'_'+m[4].toLowerCase():'');
 }
 function add(map,key,value){if(!key)return;if(!map.has(key))map.set(key,value);else if(map.get(key)!==value)map.set(key,null)}
 function buildIndex(data){
  const byKey=new Map(),ids=new Map(),sets=new Map(),bySet=new Map(),numbers=new Map(),baseNumbers=new Map(),marketIds=new Map();
  for(const s of data.sets){if(bySet.has(s.id))throw Error('Duplicate One Piece set');bySet.set(s.id,[]);for(const a of [s.id,s.code,s.name,...s.aliases||[]])add(sets,setName(a),s.id)}
  for(const c of data.cards){
   if(byKey.has(c.key)||!bySet.has(c.setId))throw Error('Invalid One Piece printing');byKey.set(c.key,c);bySet.get(c.setId).push(c);
   for(const id of [c.catalogId,...c.catalogAliases||[]])add(ids,norm(id),c);
   if(c.tcgplayerId)add(marketIds,String(c.tcgplayerId),c);
   const n=number(c.number);if(n){add(numbers,c.setId+'|'+n,c);if(c.kind==='base')add(baseNumbers,c.setId+'|'+n,c)}
  }
  for(const s of data.sets)if(bySet.get(s.id).length!==s.total)throw Error('One Piece count mismatch');
  return{data,byKey,ids,sets,bySet,numbers,baseNumbers,marketIds};
 }
 function resolve(index,saved){
  const game=setName(saved.game);
  if(game?!['onepiece','onepiececardgame','onepiecetcg'].includes(game):norm(saved.catalogGame)!=='onepiece')return null;
  const exact=index.ids.get(norm(saved.catalogId));if(exact)return exact;
  const market=index.marketIds.get(String(saved.tcgplayerId||''));if(market)return market;
  const setValue=typeof saved.set==='object'?saved.set?.id||saved.set?.code||saved.set?.name:saved.set;
  const sid=index.sets.get(setName(setValue));
  for(const value of [saved.number,saved.localId]){
   const n=number(value);
   // Full printing IDs (including suffix) can identify a card; a plain printed
   // code shared with reprints needs a set and cannot silently select an art.
   if(!n||/_[pr]\d+$/i.test(n)){
    const c=index.ids.get(norm(n||value));if(c&&(!sid||c.setId===sid))return c;
    continue;
   }
   if(!sid)continue;
   const c=index.numbers.get(sid+'|'+n);if(c)return c;
  }
  return null;
 }
 function ownership(index,list){const own=new Map();for(const s of list||[]){const qty=s.qty==null?1:Math.floor(Number(s.qty));if(!Number.isFinite(qty)||qty<1)continue;const c=resolve(index,s);if(!c)continue;const v=own.get(c.key)||{qty:0,ids:[]};v.qty+=qty;v.ids.push(s.id);own.set(c.key,v)}return own}
 const fingerprint=cards=>JSON.stringify([shared.fingerprint(cards),(cards||[]).map(c=>c.tcgplayerId)]);
 root.CardOnePieceSetCore={number,buildIndex,resolve,ownership,fingerprint,summary:shared.summary,filter:shared.filter};
})(globalThis);
