// Image recovery is separate from card identity, language, pricing and account data.
globalThis.CardPokemonArt=(()=>{
 'use strict';
 const VERSION='pokemon-lang-1',bindings=new WeakMap(),successful=new Map();
 const languages={en:'Angielski',ja:'Japoński',de:'Niemiecki',fr:'Francuski',es:'Hiszpański',it:'Włoski','pt-br':'Portugalski',pt:'Portugalski'};
 let manifest;
 const language=c=>c?.catalogLanguage||Object.keys(languages).find(k=>languages[k]===c?.language)||'en';
 const provider=lang=>lang==='pt-br'?'pt':lang;
 function identity(c){
  if(!c)return null;
  const game=c.catalogGame||c.gameKey||c.game;
  if(game&&!['pokemon','Pokémon','Pokemon'].includes(game))return null;
  const id=c.catalogId||c.id;
  if(typeof id!=='string'||!/^[a-zA-Z0-9.+]+(?:-[A-Z])?-[a-zA-Z0-9!?%]+$/.test(id))return null;
  return {id,lang:language(c)};
 }
 function data(){
  if(!manifest)manifest=CardCatalog.json('pokemon-artwork.json?v='+VERSION,{ttl:86400000}).then(d=>{
   if(d.schema!==1||!d.japanese||!d.english)throw Error('Nieprawidłowy katalog zdjęć.');return d;
  }).catch(e=>{manifest=null;throw e});
  return manifest;
 }
 function imageLanguage(url,fallback){
  const u=String(url||'');return u.match(/assets\.tcgdex\.net\/([a-z-]+)\//)?.[1]||(/images\.pokemontcg\.io\//.test(u)?'en':null)||(/_JP(?:_|\.)/.test(u)?'ja':null)||(u.match(/_(EN|DE|FR|ES|IT|PT-BR)_/)?.[1]?.toLowerCase())||fallback;
 }
 const imageURL=(value,size='high',format='webp')=>!value?null:/\.(?:png|jpe?g|webp)(?:[?#]|$)/i.test(value)||/^(data:|blob:)/.test(value)?value:value.replace(/\/$/,'')+'/'+size+'.'+format;
 function baseSources(c,size='high'){
  if(!c)return [];
  const lang=language(c),out=[];
  const add=(url,source,known)=>{if(url)out.push({url,language:known||imageLanguage(url,lang),source})};
  add(c.artworkUrl||c.artwork,'saved',c.artworkLanguage);
  if(c.image){add(imageURL(c.image,size),'TCGdex');add(imageURL(c.image,size,'png'),'TCGdex');if(size==='low')add(imageURL(c.image,'high'),'TCGdex')}
  if(c.photo&&(c.photo!==c.artwork))add(c.photo,'scan',c.artworkLanguage);
  return out;
 }
 function official(id,lang){
  const locale={de:'de-de',fr:'fr-fr',es:'es-es',it:'it-it',pt:'pt-br','pt-br':'pt-br'}[lang];
  if(!locale)return null;
  const cut=id.lastIndexOf('-'),set=id.slice(0,cut),number=id.slice(cut+1);
  // These families share printed set/collector identifiers across western languages.
  let code;
  if(/^(dp|pl|hgss|bw|xy|sm|swsh)\d+(?:\.5)?$/i.test(set))code=set.toUpperCase().replace('.','');
  if(/^sv\d{2}$/i.test(set))code=set.toUpperCase();
  if(!code||!/^\d+$/.test(number))return null;
  const tag=lang==='pt'||lang==='pt-br'?'PT-BR':lang.toUpperCase();
  return 'https://assets.pokemon.com/static-assets/content-assets/cms2-'+locale+'/img/cards/web/'+code+'/'+code+'_'+tag+'_'+Number(number)+'.png';
 }
 async function sources(c,size='high'){
  const who=identity(c),base=baseSources(c,size);if(!who)return base;
  const [art,snapshot]=await Promise.all([data().catch(()=>null),CardPokemon.snapshot(who.lang).catch(()=>null)]);
  const exact=snapshot?.byId.get(who.id);
  const out=[];const add=(url,lang,source)=>{if(url)out.push({url,language:lang,source})};
  // Confirm the catalog ID. Never search by name or copy a Japanese card's number into an English set.
  if(exact){
   if(exact.image){add(imageURL(exact.image,size),who.lang,'TCGdex');add(imageURL(exact.image,size,'png'),who.lang,'TCGdex')}
   const jp=provider(who.lang)==='ja'&&art?.japanese[who.id];
   if(jp){add(size==='low'?jp:jp.replace('_SM.png','_LG.png'),who.lang,'Limitless');add(jp,who.lang,'Limitless')}
   add(official(who.id,who.lang),who.lang,'Pokémon');
  }
  // An earlier English reference must not outrank available native-language art.
  const same=base.filter(x=>x.source!=='scan'&&provider(x.language)===provider(who.lang));
  out.unshift(...same);
  out.push(...base.filter(x=>!same.includes(x)));
  if(exact&&provider(who.lang)!=='ja'&&provider(who.lang)!=='en'&&art?.english[who.id]){
   add(imageURL(art.english[who.id],size),'en','TCGdex');
   add(imageURL(art.english[who.id],size,'png'),'en','TCGdex');
  }
  const seen=new Set();return out.filter(x=>x.url&&!seen.has(x.url)&&seen.add(x.url));
 }
 function caption(result,c){return result&&provider(result.language)!==provider(language(c))?'Podgląd wydania angielskiego — brak zdjęcia w języku tej karty.':''}
 function bind(img,c,{placeholder=null,note=null,size='high',onResolve=null,compact=false}={}){
  bindings.get(img)?.cancel?.();const token={};bindings.set(img,token);img.onload=null;img.onerror=null;img.hidden=true;img.removeAttribute('src');
  const valid=()=>bindings.get(img)===token;
  const say=(text)=>{if(note){note.textContent=compact&&text?(text.startsWith('Podgląd')?'Podgląd EN':'Brak zdjęcia'):text;note.hidden=!text}};
  say('');if(placeholder){placeholder.hidden=false;placeholder.textContent='Wczytuję obraz karty…'}
  let timer;token.cancel=()=>clearTimeout(timer);
  const key=identity(c),cacheKey=key?provider(key.lang)+'|'+key.id+'|'+size:null;
  const show=entry=>{if(!valid())return;clearTimeout(timer);img.hidden=false;if(placeholder)placeholder.hidden=true;img.alt=(c?.name||'Karta')+(caption(entry,c)?' — podgląd EN':'');img.title=caption(entry,c);say(caption(entry,c));if(cacheKey)successful.set(cacheKey,entry);onResolve?.(entry)};
  const fail=()=>{if(!valid())return;clearTimeout(timer);img.hidden=true;img.removeAttribute('src');img.onload=null;img.onerror=null;if(placeholder){placeholder.hidden=false;placeholder.textContent='Brak dostępnego zdjęcia tego wydania.'}say('Zdjęcie tego wydania jest chwilowo niedostępne.');};
  async function run(){
   let choices;try{choices=await sources(c,size)}catch{choices=baseSources(c,size)}
   if(!valid())return;
   const cached=cacheKey&&successful.get(cacheKey);
   if(cached)choices=[cached,...choices.filter(x=>x.url!==cached.url)];
   let i=0;
   const next=()=>{
    if(!valid())return;clearTimeout(timer);
    const entry=choices[i++];if(!entry){fail();return}
    // A fresh loader isolates late events from an earlier URL or a different card.
    const probe=new Image();let settled=false;
    const advance=()=>{if(settled)return;settled=true;clearTimeout(timer);probe.onload=null;probe.onerror=null;next()};
    probe.onload=()=>{if(settled||!valid())return;settled=true;clearTimeout(timer);img.onload=()=>show(entry);img.onerror=()=>{if(valid())next()};img.src=entry.url;show(entry)};
    probe.onerror=advance;timer=setTimeout(advance,6500);probe.src=entry.url;
   };next();
  }
  void run();return ()=>{if(valid()){bindings.delete(img);clearTimeout(timer);img.onload=null;img.onerror=null}};
 }
 function thumbnail(parent,c,size='low',className=''){
  const img=document.createElement('img');if(className)img.className=className;img.loading='lazy';img.draggable=false;
  const note=document.createElement('small');note.className='pokemon-art-note';note.hidden=true;
  parent.append(img,note);bind(img,c,{size,note,compact:true});return img;
 }
 return Object.freeze({identity,language,provider,imageURL,sources,bind,thumbnail,official,caption});
})();
