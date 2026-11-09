/* Weiß release albums reuse the existing EN/JP catalogs. No collection writes. */
(function(root){
 'use strict';
 const shared=root.CardRiftSetCore;
 const norm=v=>String(v??'').normalize('NFKC').trim().toLowerCase();
 const nameKey=v=>norm(v).replace(/[^\p{L}\p{N}]+/gu,'');
 function number(v){return String(v??'').normalize('NFKC').trim().toUpperCase()
  .replace(/[−–—]/g,'-').replace(/\s+(?:N|C|U|R|RR|SR|RRR|SP|SSP|SEC|PR|OFR|AGR|CR|CC)\+?$/,'')
  .replace(/\s+/g,'').replaceAll('//','/').replace(/^LRC-WE47-/,'LRC/WE47-')
  .replace(/^(MDE\/SE45)(PE?\d|E\d)/,'$1-$2').replace('LL/28-','LL/W28-');}
 const releaseCode=v=>number(v).match(/^([A-Z0-9@!]+\/(?:EN-[WS]\d+|[WS][A-Z]*\d+))(?=-)/)?.[1]||null;
 const rarityNames={'rare':'R','double rare':'RR','double rare plus':'RR+','super rare':'SR','triple rare':'RRR','triple rare plus':'RRR+','special rare':'SP','super special rare':'SSP','super special plus':'SSP+','secret rare':'SEC','secret rare plus':'SEC+','over-frame rare':'OFR','autograph rare':'AGR','common':'C','uncommon':'U','climax rare':'CR','climax common':'CC','trial deck':'TD','promo':'PR','promo plus':'PR+','normal':'N'};
 const rarity=v=>(rarityNames[norm(v)]||String(root.CardWeiss?.rarity(v)||v||'').trim()).normalize('NFKC').toUpperCase();
 function art(url,base){if(typeof url!=='string'||!url||url.startsWith('data:'))return null;try{const u=new URL(url,base);return u.protocol==='https:'?u.href:null}catch{return null}}
 const imageKey=v=>{const u=art(v);if(!u)return '';const id=u.match(/^https:\/\/tcgplayer-cdn\.tcgplayer\.com\/product\/(\d+)_/)?.[1]||u.match(/^https:\/\/product-images\.tcgplayer\.com\/(?:fit-in\/\d+x\d+\/)?(\d+)\./)?.[1];return id?'tcg:'+id:u.split('?')[0]};
 function add(map,key,value){if(!key)return;if(!map.has(key))map.set(key,value);else if(map.get(key)!==value)map.set(key,null)}
 const rareScore=c=>/SSP|SEC|AGR/.test(c.rarity)?4:/SP|OFR/.test(c.rarity)?3:c.kind==='parallel'?2:c.kind==='base'?1:0;
 function prepare(raw,metadata,language){
  const m=metadata.languages?.[language];
  if(metadata.version!==1||!m?.sets?.length||!Array.isArray(raw.cards)||!raw.cards.length)throw Error('Weiss catalog schema');
  const sets=m.sets.map(s=>({...s,total:0,image:null,fallbackImages:[]})),bySet=new Map(sets.map(s=>[s.id,s]));
  const excluded=new Set(m.excludedIds),cards=[],numberCounts=new Map();let omitted=0;
  if(language==='ja')for(const c of raw.cards){const n=number(c[3]);numberCounts.set(n,(numberCounts.get(n)||0)+1)}
  for(const row of raw.cards){
   const jp=language==='ja',id=jp?'jp-'+row[0]:String(row.id),source=jp?String(row[5]):row.set;
   const n=number(jp?row[3]:row.number),setId=excluded.has(id)?null:m.sourceMap[source]||m.codeMap[releaseCode(n)];
   const set=bySet.get(setId);if(!set){omitted++;continue}
   const r=rarity(jp?row[4]:row.rarity),originalImage=art(jp?row[6]:row.image,jp?raw.imageBase:undefined);
   let image=originalImage?.replace(/_200w\.(jpg|png)$/i,'_1000w.$1')||null;
   const fallbacks=[originalImage];
   const tcg=originalImage?.match(/^https:\/\/tcgplayer-cdn\.tcgplayer\.com\/product\/(\d+)_\d+w\.jpg$/);
   if(tcg){fallbacks.unshift(image);image='https://product-images.tcgplayer.com/fit-in/656x656/'+tcg[1]+'.jpg'}
   // Encore's newer and legacy public image paths; never infer an alternate
   // image for codes shared by different Japanese printings.
   if(jp&&originalImage&&numberCounts.get(n)===1){
    const parts=n.match(/^([A-Z0-9@!]+)\/([WS][A-Z]*\d+)-([A-Z0-9+]+)$/);
    if(parts){fallbacks.push('https://www.encoredecks.com/images/JP/'+parts[1]+'/'+parts[2]+'/'+parts[3]+'.png');
     if(set.codes.length===1)fallbacks.push('https://www.encoredecks.com/images/JP/'+parts[2]+'/'+parts[3]+'.gif');}
   }
   const supplemental=/-(?:PE?|T[E]?)[0-9]/.test(n)||/^(?:PR|TD)/.test(r);
   const kind=supplemental?'extra':/^(?:N|C|U|R|RR|CR|CC)$/.test(r)?'base':'parallel';
   const c={key:'ws:'+language+':'+id,catalogId:id,setId,number:n,code:n,name:jp?row[1]:row.name,
    rarity:r,kind,image,fallbackImages:[...new Set(fallbacks.filter(u=>u&&u!==image))],
    searchNames:jp?[row[2],...(raw.aliases?.[row[0]]||[]),...(raw.searchTerms?.[row[0]]||[])].filter(Boolean):[]};
   cards.push(c);set.total++;
   if(c.image&&(!set.image||rareScore(c)>set._coverScore)){set.image=c.image;set.fallbackImages=c.fallbackImages;set._coverScore=rareScore(c)}
  }
  for(const s of sets)delete s._coverScore;
  return {version:1,game:'weiss',language,sets:sets.filter(s=>s.total),cards,omittedCount:omitted,sourceCount:raw.cards.length};
 }
 let metadataTask;const loaded=new Map();
 async function json(file){const r=await fetch(new URL(file,document.baseURI));if(!r.ok)throw Error('Weiss catalog unavailable');return r.json()}
 async function load(language='en'){
  if(!['en','ja'].includes(language))throw Error('Unsupported Weiss language');
  if(loaded.has(language))return loaded.get(language);
  const task=(async()=>{
   if(!metadataTask)metadataTask=json('weiss-sets.json?v=weiss-sets-1').catch(e=>{metadataTask=null;throw e});
   const game=language==='ja'?'weiss-jp':'weiss';
   const [meta,raw]=await Promise.all([metadataTask,root.CardCatalog?.snapshot?root.CardCatalog.snapshot(game):json('catalog-'+game+'.json?v=maintenance-20261107-1')]);
   return prepare(raw,meta,language);
  })();
  loaded.set(language,task);try{return await task}catch(e){loaded.delete(language);throw e}
 }
 function buildIndex(data){
  const byKey=new Map(),ids=new Map(),numbers=new Map(),prints=new Map(),images=new Map(),bySet=new Map();
  for(const s of data.sets){if(bySet.has(s.id))throw Error('Duplicate Weiss set');bySet.set(s.id,[])}
  for(const c of data.cards){
   if(byKey.has(c.key)||!bySet.has(c.setId))throw Error('Invalid Weiss printing');
   byKey.set(c.key,c);bySet.get(c.setId).push(c);add(ids,norm(c.catalogId),c);
   add(numbers,c.number,c);add(prints,c.number+'|'+c.rarity,c);
   const img=imageKey(c.image);if(img)add(images,c.number+'|'+img,c);
  }
  for(const s of data.sets)if(bySet.get(s.id).length!==s.total)throw Error('Weiss count mismatch');
  return {data,byKey,bySet,ids,numbers,prints,images};
 }
 function languageOf(saved){
  for(const v of [saved.catalogLanguage,saved.language]){
   const l=nameKey(v);if(['ja','jp','japanese','japonski','japoński'].includes(l))return 'ja';
   if(['en','english','angielski'].includes(l))return 'en';
  }
  if(norm(saved.catalogId).startsWith('jp-')||/jp|japanese|japoński/.test(norm(saved.game)))return 'ja';
  if(saved.catalogGame==='weiss-jp')return 'ja';if(saved.catalogGame==='weiss')return 'en';
  const n=number(saved.number||saved.localId);if(/\/(?:EN-|[^/]+-(?:E|PE)\d)/.test(n))return 'en';
  return null;
 }
 function resolve(index,saved){
  const game=nameKey(saved.game);
  if(game?!/^(?:weiss|weiß)schwarz(?:en|jp)?$/.test(game):!['weiss','weiss-jp'].includes(saved.catalogGame))return null;
  const language=languageOf(saved);if(language&&language!==index.data.language)return null;
  const exact=index.ids.get(norm(saved.catalogId));if(exact)return exact;
  if(!language)return null;
  for(const value of [saved.number,saved.localId]){
   const n=number(value);if(!releaseCode(n))continue;
   const r=rarity(saved.rarity||saved.variant),print=index.prints.get(n+'|'+r);if(print)return print;
   // Different illustrations and gold/silver stamps can share code AND rarity.
   for(const url of [saved.artwork,saved.artworkUrl,saved.image,saved.photo]){
    const img=imageKey(url),c=img&&index.images.get(n+'|'+img);if(c&&(!r||['NORMAL','FOIL','NIEUSTALONY','NIEUSTALONA'].includes(r)||c.rarity===r))return c;
   }
   const c=index.numbers.get(n);if(c&&(!r||['NORMAL','FOIL','NIEUSTALONY','NIEUSTALONA'].includes(r)||r===c.rarity))return c;
  }
  return null;
 }
 function ownership(index,list){const own=new Map();for(const s of list||[]){const qty=s.qty==null?1:Math.floor(Number(s.qty));if(!Number.isFinite(qty)||qty<1)continue;const c=resolve(index,s);if(!c)continue;const v=own.get(c.key)||{qty:0,ids:[]};v.qty+=qty;v.ids.push(s.id);own.set(c.key,v)}return own}
 const fingerprint=cards=>JSON.stringify((cards||[]).filter(c=>/weiss|weiß/i.test(c.game||c.catalogGame||'')).map(c=>[c.catalogLanguage,c.language,c.rarity,c.variant,imageKey(c.artwork),imageKey(c.artworkUrl),imageKey(c.image),imageKey(c.photo)]));
 root.CardWeissSetCore={load,prepare,number,releaseCode,rarity,buildIndex,resolve,ownership,fingerprint,summary:shared.summary,filter:shared.filter};
})(globalThis);
