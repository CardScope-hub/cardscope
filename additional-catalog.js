// Public, bundled catalogs. No account or collection data is sent to a catalog.
globalThis.CardAdditional=(()=>{
 'use strict';
 const labels={cyberpunk:'Cyberpunk TCG',lorcana:'Disney Lorcana'},books=new Map(),base=new URL('./',document.currentScript?.src||location.href);
 const supports=game=>Object.hasOwn(labels,game);
 const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[’']/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const compact=s=>norm(s).replace(/\s/g,'');
 const number=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/^0+(?=\d)/,'');
 const text=s=>String(s||'').normalize('NFKC').replace(/[‐‑–—−]/g,'-').replace(/[•·●]/g,' ').replace(/\s+/g,' ').trim();
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 function aliases(set,game){
  const all=[set.id,set.code,set.name,...(set.aliases||[])].filter(Boolean).map(String);
  if(game==='cyberpunk'&&/welcome.*night.*city/i.test(all.join(' '))){all.push('WNC','WTNC');if(/beta/i.test(all.join(' ')))all.push('BETA','WNCB','WNC Beta','WTNC Beta');else all.push('RETAIL','WNCR','WNC Retail','WTNC Retail');}
  return [...new Set(all)];
 }
 async function book(game,json){
  if(!books.has(game)){
   const promise=json('catalog-'+game+'.json?v=new-games-1',{ttl:86400000}).then(data=>{
    if(!Array.isArray(data.cards))throw Error('Niepełny katalog '+labels[game]+'.');
    const sets=Array.isArray(data.sets)?data.sets:Object.entries(data.sets||{}).map(([id,s])=>({id,...s}));
    const setMap=new Map(sets.map(s=>[String(s.id),s]));
    const cards=data.cards.map(c=>{
     const set={...(setMap.get(String(c.set?.id))||{}),...c.set};
     return {...c,id:String(c.id),gameKey:game,game:labels[game],set:{cardCount:{},...set},artworkUrl:c.artworkUrl?new URL(c.artworkUrl,base).href:null,catalogLanguage:c.catalogLanguage||'en',variants:c.variants||{},variantsList:c.variantsList?.length?c.variantsList:['Nieustalony'],offers:(c.offers||[]).map(o=>({name:c.name,set:set.name,number:c.localId,...o})),source:c.source||data.source,catalogDate:data.retrievedAt?.slice(0,10)};
    });
    const rows=cards.map(card=>({card,name:norm(card.name),names:[card.name,...(card.aliases||[])].filter(Boolean).map(norm),keys:new Set([card.id,card.localId,card.printedNumber,...(card.aliases||[]),...(card.numberAliases||[])].filter(Boolean).map(compact)),all:norm([card.name,card.localId,card.printedNumber,card.set.name,card.rarity,...(card.aliases||[]),...(card.numberAliases||[])].join(' '))}));
    return {data,sets,cards,rows};
   });books.set(game,promise);promise.catch(()=>books.delete(game));
  }return books.get(game);
 }
 function scopeQuery(q,sets,game){
  const input=text(q),found=[];
  for(const s of sets)for(const a of aliases(s,game)){
   const m=input.match(new RegExp('^'+escape(a)+'(?:\\s*[:#-]\\s*|\\s+)(.+)$','i'));
   if(m)found.push({id:String(s.id),rest:m[1],length:a.length});
  }
  const longest=Math.max(0,...found.map(x=>x.length));return {input,scopes:found.filter(x=>x.length===longest)};
 }
 function lorcanaNumber(q){
  const s=text(q).replace(/^#\s*/,''),m=s.match(/^(\d{1,3}[a-z]?)\s*\/\s*(\d{1,3}|[a-z]{1,4}\d*)(?:\s+(?:EN|ENG))?(?:\s+(\d{1,2}|Q\d))?$/i);
  if(m)return {number:number(m[1]),total:m[2].toLowerCase(),set:m[3]?.toLowerCase()};
  const footer=s.match(/^(\d{1,3}[a-z]?)\s+(?:EN|ENG)\s+(\d{1,2}|Q\d)$/i);
  if(footer)return {number:number(footer[1]),set:footer[2].toLowerCase()};
  return /^\d{1,3}[a-z]?$/i.test(s)?{number:number(s)}:null;
 }
 function cyberNumber(q){const s=text(q).replace(/^#\s*/,'');const m=s.match(/^(β\s*|beta\s*[-:]?\s*)?(\d{1,3}[a-z]?)(?:\s*\/\s*(\d{1,3}))?$/i);return m?{number:number(m[2]),beta:!!m[1],total:m[3]}:null;}
 function cardNumber(c,game){return game==='lorcana'?lorcanaNumber(c.fullIdentifier)||lorcanaNumber(c.printedNumber)||lorcanaNumber(c.localId):cyberNumber(c.localId)||cyberNumber(c.printedNumber);}
 function matches(c,read,game){
  const actual=cardNumber(c,game);if(!actual||actual.number!==read.number)return false;
  if(read.beta&&!(actual.beta||/beta/i.test(c.set.id+' '+c.set.name)))return false;
  if(read.total){const total=actual.total||String(c.set.cardCount?.official||'');if(number(total)!==number(read.total))return false;}
  return !read.set||(actual.set?norm(actual.set)===norm(read.set):aliases(c.set,game).some(a=>norm(a)===norm(read.set)));
 }
 async function search(params,{json}){
  const game=params.game,b=await book(game,json);if(params.id)return {card:b.cards.find(c=>c.id===String(params.id))||null};
  if(params.index==='1')return {names:[...new Set(b.cards.map(c=>c.name))],retrievedAt:b.data.retrievedAt};
  const q=String(params.q||'').trim(),page=Math.max(1,Number(params.page)||1),{input,scopes}=scopeQuery(q,b.sets,game),scoped=new Set(scopes.map(s=>s.id)),rest=scopes[0]?.rest||input,parse=game==='lorcana'?lorcanaNumber:cyberNumber,read=parse(rest),ocr=params.ocr==='1';
  let rows=b.rows.filter(r=>!scopes.length||scoped.has(String(r.card.set.id)));
  if(read)rows=rows.filter(r=>matches(r.card,read,game)).map(r=>({r,score:300}));
  else rows=rows.map(r=>{
   const query=norm(scopes.length?rest:q),words=query.split(' ');let score=0;
   if(r.keys.has(compact(scopes.length?rest:q)))score=320;
   else if(r.names.includes(query))score=220;
   else if(query&&r.name.includes(query))score=180;
   else if(query&&words.every(t=>r.all.includes(t)))score=120;
   else if(ocr&&query.length>=4){const similarity=globalThis.CardScanText?.nameScore(r.card.name,query)||0;if(similarity>=.83)score=similarity*100;}
   return {r,score};
  }).filter(r=>r.score>0);
  rows.sort((a,b)=>b.score-a.score||a.r.card.name.localeCompare(b.r.card.name)||a.r.card.id.localeCompare(b.r.card.id));
  return {cards:rows.slice((page-1)*36,page*36).map(x=>x.r.card),total:rows.length,nextPage:rows.length>page*36?page+1:null,catalogCount:b.cards.length,source:b.data.source,note:'Katalog '+labels[game]+' · '+(b.data.retrievedAt||'').slice(0,10)+'. Porównaj numer, wydanie i ilustrację.'};
 }
 function reads(game,evidence){
  const out=new Map();for(const block of [...(evidence.numbers||[]),...(evidence.names||[]),{text:evidence.full||'',confidence:0}]){
   const s=text(block.text),confidence=(evidence.numbers||[]).includes(block)?block.confidence||0:0,put=(value,read,code)=>{const key=compact(value),row={value,query:value,key,code,...read,confidence,uncertain:confidence<60};const prev=out.get(key);if(!prev||row.confidence>prev.confidence)out.set(key,row);};
   if(game==='lorcana'){
    for(const m of s.matchAll(/\b(\d{1,3}[a-z]?\s*\/\s*(?:\d{1,3}|[a-z]{1,4}\d*)(?:\s+(?:EN|ENG)\s+(?:\d{1,2}|Q\d))?)(?!\w)/gi)){const read=lorcanaNumber(m[1]);if(read)put(m[1],read,!!read.set);}
    for(const m of s.matchAll(/\b(\d{1,3}[a-z]?\s+(?:EN|ENG)\s+(?:\d{1,2}|Q\d))(?!\w)/gi)){if(s.slice(0,m.index).trimEnd().endsWith('/'))continue;const read=lorcanaNumber(m[1]);if(read)put(m[1],read,true);}
   }else{
    for(const m of s.matchAll(/(?:^|\s)((?:β\s*|BETA\s*[-:]?\s*)\d{1,3}[a-z]?)(?!\w)/gi)){const read=cyberNumber(m[1]);if(read)put(m[1],read,true);}
    if((evidence.numbers||[]).includes(block))for(const line of String(block.text).split('\n')){const read=cyberNumber(line);if(read)put(line,read,false);}
   }
  }
  const rows=[...out.values()];return rows.filter(r=>!rows.some(other=>other!==r&&other.number===r.number&&other.set&&!r.set)).sort((a,b)=>b.confidence-a.confidence).slice(0,6);
 }
 function compare(game,c,e){
  const T=CardScanText,title=(e.names||[]).map(x=>x.text).join(' '),names=[c.name,...(c.aliases||[]).filter(x=>!/[\d]/.test(x))];
  const score=Math.max(0,...names.map(n=>T.nameScore(n,title))),name=score===1?'match':score>=.84?'similar':'unread',observed=reads(game,e),matching=observed.filter(r=>matches(c,r,game)),conflict=observed.filter(r=>!matches(c,r,game));
  const num=matching.length?(conflict.length?'ambiguous':matching.some(r=>!r.uncertain)?'match':'similar'):observed.length?'conflict':'unread';
  return {name,number:num,set:matching.some(r=>r.set||r.beta)?'match':'unread',observed:observed.map(r=>r.value),joint:['match','similar'].includes(name)&&num==='match',score:(name==='match'?140:name==='similar'?100:0)+(num==='match'?100:num==='similar'?40:num==='conflict'?-150:0)};
 }
 function codes(game,value){return reads(game,{names:[],numbers:[{text:value,confidence:100}],full:''}).filter(r=>r.code).map(r=>r.value);}
 return Object.freeze({supports,labels,search,reads,compare,codes,lorcanaNumber,cyberNumber,matches});
})();
