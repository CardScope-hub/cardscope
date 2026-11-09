/* Pokémon checklist: language + exact catalog ID, then unambiguous set/number. */
(function(root){
 'use strict';
 const shared=root.CardRiftSetCore;
 const norm=v=>String(v??'').normalize('NFKC').trim().toLowerCase();
 const number=v=>norm(v).toUpperCase().replace(/^0+(?=\d)/,'');
 const languages={en:'en',english:'en','angielski':'en',ja:'ja',jp:'ja',japanese:'ja','japoński':'ja',
  de:'de',german:'de','niemiecki':'de',fr:'fr',french:'fr','francuski':'fr',es:'es',spanish:'es','hiszpański':'es',
  it:'it',italian:'it','włoski':'it',pt:'pt','pt-br':'pt',portuguese:'pt','portugalski':'pt',ko:'ko',kr:'ko',korean:'ko','koreański':'ko',
  'zh-cn':'zh-cn','zh-hans':'zh-cn','chiński uproszczony':'zh-cn','zh-tw':'zh-tw','zh-hant':'zh-tw','chiński tradycyjny':'zh-tw'};
 function language(saved){
  const explicit=norm(saved.catalogLanguage||saved.artworkLanguage||saved.language);
  return explicit ? languages[explicit]||null : 'en';
 }
 function add(map,key,card){
  if(!key)return;
  if(!map.has(key))map.set(key,card);
  else if(map.get(key)!==card)map.set(key,null);
 }
 function buildIndex(data){
  if(!languages[data.language])throw Error('Invalid Pokémon language');
  const byKey=new Map(),ids=new Map(),numbers=new Map(),sets=new Map(),bySet=new Map(),ready=new Set(),cards=[];
  for(const s of data.sets){
   if(s.language!==data.language||bySet.has(s.id))throw Error('Invalid Pokémon set');
   bySet.set(s.id,[]);
   for(const a of [s.id,s.code,s.name,...s.aliases||[]])add(sets,norm(a),s.id);
  }
  for(const [set,id,cn,printed] of data.entries){
   const key=data.language+':'+id,c={key,setId:set,catalogId:id};
   if(!bySet.has(set)||byKey.has(key))throw Error('Duplicate Pokémon identity');
   byKey.set(key,c);ids.set(norm(id),c);bySet.get(set).push(c);cards.push(c);
   add(numbers,set+'|'+number(cn),c);if(printed)add(numbers,set+'|'+number(printed),c);
  }
  for(const s of data.sets)if(bySet.get(s.id).length!==s.total)throw Error('Pokémon count mismatch');
  return{data:{...data,entries:undefined,cards},byKey,ids,numbers,sets,bySet,ready};
 }
 function hydrate(index,setId,rows){
  const expected=index.bySet.get(setId),keys=new Set();
  if(!Array.isArray(rows)||rows.length!==expected?.length)throw Error('Incomplete Pokémon pack');
  for(const c of rows){
   if(c.setId!==setId||c.language!==index.data.language||!index.byKey.has(c.key)||keys.has(c.key)||typeof c.name!=='string')throw Error('Invalid Pokémon pack');
   keys.add(c.key);
  }
  for(const c of rows)Object.assign(index.byKey.get(c.key),c);
  index.ready.add(setId);
 }
 function resolve(index,saved){
  const game=norm(saved.game).normalize('NFD').replace(/\p{M}/gu,'');
  if(game?!['pokemon','pokemon tcg'].includes(game):norm(saved.catalogGame)!=='pokemon')return null;
  if(language(saved)!==index.data.language)return null;
  const id=norm(saved.catalogId).replace(/^pokemon:/,'');
  if(index.ids.has(id))return index.ids.get(id);
  const setName=typeof saved.set==='object'?saved.set?.id||saved.set?.code||saved.set?.name:saved.set;
  const set=index.sets.get(norm(setName));
  function find(s,n){
   const key=s+'|'+number(n);
   // A known ambiguity must never fall through to an arbitrary card.
   if(index.numbers.has(key))return index.numbers.get(key);
   const fraction=number(n).match(/^(\d+[A-Z]?)\/\d+$/);
   return fraction?index.numbers.get(s+'|'+number(fraction[1]))||null:null;
  }
  for(const value of [saved.localId,saved.number]){
   if(!value)continue;
   if(set){const found=find(set,value);if(found)return found;}
   const raw=norm(value);
   // Full catalog code can be typed manually, but only within the selected language.
   if(index.ids.has(raw))return index.ids.get(raw);
   const full=raw.match(/^(.+?)[\s:·]+([^\s]+)$/);
   if(full){const s=index.sets.get(norm(full[1]));if(s){const found=find(s,full[2]);if(found)return found;}}
  }
  return null;
 }
 function ownership(index,list){
  const owned=new Map();
  for(const saved of list||[]){
   const qty=saved.qty==null?1:Math.floor(Number(saved.qty));if(!Number.isFinite(qty)||qty<1)continue;
   const card=resolve(index,saved);if(!card)continue;
   const item=owned.get(card.key)||{qty:0,ids:[]};item.qty+=qty;item.ids.push(saved.id);owned.set(card.key,item);
  }
  return owned;
 }
 // Language changes are ownership changes even when card name/ID stay the same.
 const fingerprint=cards=>JSON.stringify([shared.fingerprint(cards),(cards||[]).map(c=>[c.catalogLanguage,c.artworkLanguage,c.language])]);
 root.CardPokemonSetCore={buildIndex,hydrate,resolve,ownership,language,summary:shared.summary,filter:shared.filter,fingerprint};
})(globalThis);
