// Printed set + collector number first. No rules text is used to infer a title.
globalThis.CardSWUScan=(()=>{
 const T=()=>CardScanText,key=n=>String(n||'').toUpperCase().replace(/^(T?)0+(?=\d)/,'$1');
 const sets=new Set('LOF HMWP PSHD SHDOP SS1 SOROPJ PTWIJ IC27 P26 J25 ESHD TWISSJ JTLOP LOFOP PTWI PSORJ TWIOP SOR P25 SECOP SHDPQJ LAW SS2J IBH TWIPQ CST GG C25 TWISS PSHDJ SHDPQ TWIPQJ G25 ASHOP C24 C26 LAWP TWI SS1J J24 SEC SS2 SHD PSOR TS26 JTL MV26 ASH ESOR SOROP HMW'.split(' '));
 const footerPasses=[{kind:'numbers',region:[0,.90,1,.10],enhance:false},{kind:'numbers',region:[.58,.88,.42,.12],enhance:true}];
 const portraitPasses=[
  {kind:'numbers',region:[.70,.93,.285,.065],enhance:false,psm:'7'},
  {kind:'numbers',region:[.70,.93,.285,.065],enhance:true,psm:'7'},
  {kind:'numbers',region:[.58,.895,.41,.10],enhance:true,psm:'11'}
 ];
 const isPortrait=image=>{const w=image?.naturalWidth||image?.width,h=image?.naturalHeight||image?.height;return w>0&&h>w};
 const getFooterPasses=image=>isPortrait(image)?portraitPasses:footerPasses;
 const classicPasses=image=>isPortrait(image)?[...portraitPasses,...CardScanText.layouts.swu.filter(p=>p.kind!=='numbers')]:CardScanText.layouts.swu;
 const markFooter=(e,rows)=>e.swuPortrait?rows.map(r=>({...r,source:'swu-portrait-footer'})):rows;
 const fusedLanguage=new RegExp('\\b('+[...sets].sort((a,b)=>b.length-a.length).join('|')+')\\s*[-·•.]?\\s*EN(?=[CURSLB]?\\s*T?\\d)','g');
 function portraitText(text){
  // Repair spacing and separators, not the observed digits. EN118 and ENB127
  // are common OCR merges; B can be the adjacent rarity icon.
  return text.replace(/[∕⁄|]/g,'/').replace(fusedLanguage,'$1 EN ')
   .replace(/\bEN\s*([CURSLB])(?=T?\d{2,4}(?:\s*\/|\b))/g,'EN $1 ')
   .replace(/\b((?:\d\s+){1,3}\d)\s*\//g,(_,n)=>n.replace(/\s/g,'')+'/');
 }
 function reads(e){
  const pairs=new Map(),blocks=(e.numbers||[]).filter(b=>String(b.text||'').trim()),normalized=blocks.map(b=>{const text=String(b.text).normalize('NFKC').toUpperCase().replace(/[–—−]/g,'-');return {text:e.swuPortrait?portraitText(text):text,confidence:Number(b.confidence)||0,source:b.source}});
  const add=(set,number,confidence)=>{if(!sets.has(set))return;const k=set+':'+key(number),old=pairs.get(k);if(!old||old.confidence<confidence)pairs.set(k,{set,number,key:k,value:set+'-'+number,confidence,uncertain:confidence<60,code:true})};
  // Keep observations from each pass separate; contradictory clear reads cannot auto-open.
  for(const b of normalized){
   for(const m of b.text.matchAll(/\b([A-Z][A-Z0-9]{1,7})\s*[-:#]\s*(T?\d{1,4}[A-Z]?(?:-\d+)?)(?![A-Z0-9])/g))add(m[1],m[2],b.confidence);
   const codes=[...new Set(b.text.match(/\b[A-Z][A-Z0-9]{1,7}\b/g)?.filter(s=>sets.has(s))||[])];
   const nums=[...b.text.matchAll(/\b(T?\d{1,4}[A-Z]?(?:-\d+)?)\s*\/\s*(?:T\d{1,4}|\d{2,4})\b/g)].map(m=>m[1]);
   if(codes.length===1)for(const number of nums)add(codes[0],number,b.confidence);
   // Some close-ups lose the slash/total. Only an isolated, explicitly read
   // set + EN + number from a portrait footer crop can be used without it.
   if(e.swuPortrait&&b.source==='swu-portrait-footer'&&b.confidence>=70&&!nums.length)for(const m of b.text.matchAll(/\b([A-Z][A-Z0-9]{1,7})\s*[-·•.]?\s*EN\s+(?:[CURSLB]\s+)?(T\d{2,3}|\d{3,4})\s*$/gm))if(!/^(19|20)\d\d$/.test(m[2]))add(m[1],m[2],b.confidence);
  }
  // Paddle may split the footer into its set and fraction, even on the same line.
  if(!pairs.size){const codes=new Map(),nums=new Map();for(const b of normalized){for(const s of b.text.match(/\b[A-Z][A-Z0-9]{1,7}\b/g)||[])if(sets.has(s))codes.set(s,Math.max(codes.get(s)||0,b.confidence));for(const m of b.text.matchAll(/\b(T?\d{1,4}[A-Z]?(?:-\d+)?)\s*\/\s*(?:T\d{1,4}|\d{2,4})\b/g))nums.set(m[1],Math.max(nums.get(m[1])||0,b.confidence));}if(codes.size===1&&nums.size===1){const [s,sc]=[...codes][0],[n,nc]=[...nums][0];add(s,n,Math.min(sc,nc))}}
  const observations=[...pairs.values()].sort((a,b)=>b.confidence-a.confidence),clear=observations.filter(x=>!x.uncertain);
  return {observations,reliable:clear.length===1?clear[0]:null,ambiguous:clear.length>1};
 }
 const hasReliable=e=>!!reads(e).reliable;
 function title(e){return (e.names||[]).filter(b=>(b.confidence??100)>=40).map(b=>String(b.text).normalize('NFKC').replace(/[^\p{L}\p{N}\s.'’!,:–—-]/gu,' ').replace(/\s+/g,' ').trim()).filter(s=>s.length>=3&&!/copyright|lucasfilm|disney|fantasy flight/i.test(s)).join(' ')}
 function compare(card,e){const r=reads(e),actual=String(card.set?.id||'').toUpperCase()+':'+key(card.collectorNumber||String(card.localId).split('-').slice(1).join('-')),s=T().nameScore(card.name,title(e)),main=T().nameScore(card.primaryName||card.name,title(e));const matching=r.observations.some(x=>x.key===actual),number=r.ambiguous?'ambiguous':r.reliable?r.reliable.key===actual?'match':'conflict':matching?'similar':'unread',set=r.ambiguous?'ambiguous':r.reliable?r.reliable.set===card.set?.id?'match':'conflict':'unread',name=s===1?'match':s>=.82||main>=.88?'similar':'unread';return {name,number,set,observed:r.observations.map(x=>x.value),score:(number==='match'?1000:number==='conflict'?-100:0)+s*200+main*30,joint:number==='match'&&name!=='unread'}}
 const rank=(cards,e)=>cards.map(card=>({card,evidence:compare(card,e)})).sort((a,b)=>b.evidence.score-a.evidence.score||a.card.name.localeCompare(b.card.name));
 function footerStatus(e){const r=reads(e);return r.reliable?'Seria i numer: '+r.reliable.value:r.ambiguous?'Sprzeczne odczyty numeru — porównaj wydanie.':'Seria i numer: niepotwierdzone'}
 async function lookup(e,names=[],{search,valid=()=>true,getNames=async()=>[],onstage=()=>{}}={}){
  const r=reads(e);let failure;e.swuLookup={mode:'name'};
  if(!valid())return null;
  if(r.reliable){const q=r.reliable.value;onstage('Sprawdzam serię i numer: '+q+'…');try{const data=await search({game:'swu',q,ocr:'0'});if(!valid())return null;const cards=(data.cards||[]).filter(c=>String(c.set?.id).toUpperCase()+':'+key(c.collectorNumber)===r.reliable.key);if(cards.length){const sources=[{q,ocr:'0',data:{...data,cards}}];e.swuLookup={mode:'code'};return {mode:'code',query:q,sources}}}catch(err){failure=err}}
  if(!valid())return null;onstage('Sprawdzam nazwę i podtytuł karty…');if(!names.length)try{names=await getNames()}catch(err){failure=err}if(!valid())return null;
  const text=title(e),scored=names.map(name=>({name,score:T().nameScore(name,text)})).filter(x=>x.score>=.84).sort((a,b)=>b.score-a.score),queries=[];
  if(scored.length)queries.push(...scored.filter(x=>x.score>=scored[0].score-.025).slice(0,2).map(x=>x.name));
  else {const primary=[...new Set(names.map(n=>n.split(' — ')[0]))],suggested=CardScanIndex.suggest(primary,{names:e.names||[],numbers:[],full:''});queries.push(...suggested.slice(0,2).map(x=>x.name));if(!queries.length)queries.push(...T().names({names:e.names||[],full:''}).slice(0,2))}
  const sources=[];for(const q of [...new Set(queries)]){if(!valid())return null;try{const data=await search({game:'swu',q,ocr:'1'});if(!valid())return null;if(data.cards?.length)sources.push({q,ocr:'1',data})}catch(err){failure=err}}
  return {mode:'name',query:queries[0]||r.observations[0]?.value||'',sources,note:failure?.message||'Nie potwierdzono karty. Zbliż dolny prawy róg lub wpisz nazwę i podtytuł.'};
 }
 return Object.freeze({reads,hasReliable,compare,rank,footerStatus,title,lookup,footerPasses,isPortrait,getFooterPasses,classicPasses,markFooter});
})();
