/* Exact-printing image and catalog supplement. No collection writes or name-based image guesses. */
(function(root){
 'use strict';
 const VERSION='pokemon-repair-1',western=['de','fr','es','it','pt'];
 let data,pending;const successful=new Map(),jobs=new WeakMap();
 const language=value=>value==='pt-br'?'pt':value;
 const full=url=>url&&/^https:\/\/assets\.tcgdex\.net\//.test(url)&&!(/\.(webp|png|jpg)(?:[?#]|$)/i.test(url))?url.replace(/\/$/,'')+'/high.webp':url;
 const setId=c=>c.setId||c.set?.id||c.id.slice(0,c.id.lastIndexOf('-'));
 function load(){
  if(!pending)pending=fetch(new URL('pokemon-repair-data.json?v='+VERSION,document.baseURI)).then(r=>{if(!r.ok)throw Error('Pokémon supplement unavailable');return r.json()}).then(d=>{
   if(d.schema!==1||!d.languages||!d.englishReferences)throw Error('Invalid Pokémon supplement');data=d;return d;
  }).catch(e=>{pending=null;throw e});return pending;
 }
 function choices(lang,id,base){
  lang=language(lang);const result=[],seen=new Set();
  const add=(url,l,source)=>{url=full(url);if(!/^https:\/\//.test(url||'')||seen.has(url))return;seen.add(url);result.push({url,language:l,source})};
  const native=data?.languages[lang]?.images[id]||[];
  for(const url of native.filter(u=>u.startsWith('https://assets.tcgdex.net/')))add(url,lang,'TCGdex');
  add(base,lang,'Katalog');
  for(const url of native)add(url,lang,'Zweryfikowany katalog');
  if(western.includes(lang)&&data?.englishReferences[id]){
   for(const u of data.languages.en?.images[id]||[])add(u,'en','Podgląd EN');
   add(data.englishReferences[id],'en','Podgląd EN');
  }
  return result;
 }
 async function prepareIndex(original){
  await load();const lang=original.language,patch=data.languages[lang];if(!patch)return original;
  const sets=original.sets.map(s=>({...s})),entries=original.entries.map(e=>[...e]),ids=new Set(entries.map(e=>e[1]));
  const bySet=new Map(sets.map(s=>[s.id,s]));
  for(const c of patch.cards){
   if(ids.has(c.id))continue;const sid=setId(c),key=lang+':'+sid;
   if(!bySet.has(key)){
    const m=patch.sets.find(s=>s.id===sid);if(!m)continue;
    const set={id:key,code:sid.toUpperCase(),name:m.name,aliases:[sid,m.name,...m.aliases||[]],total:0,image:null,language:lang,repairOnly:true,...(m.releaseDate?{releaseDate:m.releaseDate}:{})};
    bySet.set(key,set);sets.push(set);
   }
   const n=String(c.localId||c.id.slice(c.id.lastIndexOf('-')+1));entries.push([key,c.id,n,...c.printedNumber?[c.printedNumber]:[]]);ids.add(c.id);
  }
  const counts=new Map();for(const e of entries)counts.set(e[0],(counts.get(e[0])||0)+1);
  for(const s of sets){s.total=counts.get(s.id)||0;const cover=patch.covers[s.id.slice(lang.length+1)];if(cover){s.catalogId=cover.catalogId;s.image=cover.image||null;}}
  return {...original,sets,entries,preparedAt:data.preparedAt};
 }
 function row(c,lang){
  const sid=setId(c),n=String(c.localId||c.id.slice(c.id.lastIndexOf('-')+1));
  return {key:lang+':'+c.id,setId:lang+':'+sid,catalogId:c.id,number:n,code:sid.toUpperCase()+' · '+(c.printedNumber||n),name:c.name,image:c.artworkUrl||c.image||null,kind:'base',rarity:c.rarity||'',searchNames:c.aliases||[],language:lang};
 }
 function mergeRows(original,id){
  const [lang,...rest]=id.split(':'),sid=rest.join(':'),patch=data?.languages[lang];if(!patch)return original;
  const rows=(original||[]).map(c=>({...c})),ids=new Set(rows.map(c=>c.catalogId));
  for(const c of patch.cards)if(setId(c)===sid&&!ids.has(c.id)){rows.push(row(c,lang));ids.add(c.id)}
  for(const c of rows){if(patch.names[c.catalogId]){c.searchNames=[...c.searchNames||[],c.name];c.name=patch.names[c.catalogId]}if(!c.image&&patch.images[c.catalogId]?.length)c.image=patch.images[c.catalogId][0];}
  return rows;
 }
 async function snapshot(original,lang){
  await load();lang=language(lang);const patch=data.languages[lang];if(!patch)return original;
  const rows=new Map(original.cards.map(c=>[c.id,{...c}]));
  for(const c of patch.cards)if(!rows.has(c.id))rows.set(c.id,{...c});
  for(const c of rows.values()){
   if(patch.names[c.id]){c.aliases=[...c.aliases||[],c.name];c.name=patch.names[c.id]}
   if(patch.images[c.id]?.length&&(patch.images[c.id][0].startsWith('https://assets.tcgdex.net/')||(!c.artworkUrl&&!c.image))){c.artworkUrl=patch.images[c.id][0];c.artworkLanguage=lang;}
  }
  const sets=new Map(original.sets.map(s=>[s.id,s]));for(const s of patch.sets)if(!sets.has(s.id))sets.set(s.id,s);
  return {...original,cards:[...rows.values()],sets:[...sets.values()]};
 }
 // Load only visible tiles. Separate loaders prevent late events from a previous URL/card taking over.
 function image(card,cls=''){
  const wrap=document.createElement('span');wrap.className='rs-pokemon-image';
  const img=document.createElement('img');img.className=cls;img.alt=card.name;img.decoding='async';img.hidden=true;
  const note=document.createElement('small');note.className='rs-image-note';note.hidden=true;
  const placeholder=document.createElement('span');placeholder.className='rs-no-image';placeholder.textContent='Wczytuję ilustrację…';
  wrap.append(img,placeholder,note);
  const lang=language(card.language||card.catalogLanguage||'en'),id=card.catalogId||card.id,cacheKey=lang+'|'+id;
  let token,timer,disposed=false;
  const valid=()=>!disposed&&jobs.get(img)===token;
  async function start(){
   token={};jobs.set(img,token);await load().catch(()=>null);if(!valid())return;
   let list=choices(lang,id,card.image),cached=successful.get(cacheKey);
   if(cached&&list.some(c=>c.url===cached.url))list=[cached,...list.filter(c=>c.url!==cached.url)];
   let nextIndex=0;
   const next=()=>{
    clearTimeout(timer);if(!valid())return;
    const entry=list[nextIndex++];
    if(!entry){img.hidden=true;img.removeAttribute('src');placeholder.hidden=false;placeholder.textContent='Zdjęcie tego wydania niedostępne';note.hidden=true;return}
    const probe=new Image();let settled=false;
    const done=()=>{if(settled)return false;settled=true;clearTimeout(timer);probe.onload=null;probe.onerror=null;return valid()};
    probe.onload=()=>{if(!done())return;img.onerror=()=>{if(valid())next()};img.src=entry.url;img.hidden=false;placeholder.hidden=true;note.hidden=entry.language===lang;note.textContent=note.hidden?'':'Podgląd EN';img.alt=card.name+(note.hidden?'':' — podgląd angielskiego wydania');successful.set(cacheKey,entry)};
    const fail=()=>{if(done())next()};probe.onerror=fail;timer=setTimeout(fail,6500);probe.src=entry.url;
   };next();
  }
  wrap._disposeImage=()=>{disposed=true;clearTimeout(timer);jobs.delete(img)};
  if(typeof IntersectionObserver==='function'){
   const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();void start()}},{rootMargin:'160px'});observer.observe(wrap);
   const dispose=wrap._disposeImage;wrap._disposeImage=()=>{observer.disconnect();dispose()};
  }else void start();
  return wrap;
 }
 // Dispose observers/timeouts for panels removed while the user navigates or filters.
 if(typeof MutationObserver==='function'&&document.body)new MutationObserver(records=>{
  for(const r of records)for(const node of r.removedNodes){if(node.nodeType!==1||node.isConnected)continue;node._disposeImage?.();for(const child of node.querySelectorAll('.rs-pokemon-image'))child._disposeImage?.()}
 }).observe(document.body,{childList:true,subtree:true});
 root.CardPokemonRepair=Object.freeze({load,choices,prepareIndex,mergeRows,snapshot,image});
})(globalThis);
