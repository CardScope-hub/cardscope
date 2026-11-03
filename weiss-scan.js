// Local, number-first recognition for both Weiß Schwarz catalogs.
globalThis.CardWeissScan=(()=>{
 const is=game=>game==='weiss'||game==='weiss-jp',T=CardScanText;
 const nameKey=s=>String(s||'').normalize('NFKC').replace(/\s+\((?:RRR?|SR|SP|SSP|SEC|PR|OFR|R|C|U|TD|N|RE|AGR|ABR|DCR|FBR|KBR|BDR|JJR|HLP|XR|RRR?\+|SEC\+|SSP\+)\)\s*$/i,'').toLowerCase().replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60)).replace(/[^\p{L}\p{N}ー]/gu,'');
 const numberText=s=>String(s||'').normalize('NFKC').replace(/^([A-Z0-9]{2,10})-([SW][A-Z]?\d{1,4}-)/i,'$1/$2');
 const codeKey=s=>T.weissKey(T.weissReads(numberText(s))[0]?.value||numberText(s)).replace(/[⁑＊*]+$/,'');
 const complete=s=>/^[A-Z0-9]{2,10}\/[A-Z0-9]{2,16}-[A-Z]{0,3}[0-9OILSBZ]{2,4}[A-Z0-9@+_]*$/i.test(s)||/^[A-Z0-9]{2,10}\/[SW][A-Z]?[0-9]{1,3}E[0-9]{2,4}[A-Z@+_]*$/i.test(s);
 function reads(evidence){const unique=new Map();
  for(const b of evidence.numbers||[]){const fixed=numberText(b.text).replace(/\/\$/g,'/S'),candidates=T.weissReads(fixed).map(r=>({...r,uncertain:r.uncertain||fixed!==b.text}));
   // R/CR/CC/RR can be a rarity joined to a code. Keep both possibilities;
   // never silently drop a real printing suffix such as R or SP.
   for(const r of [...candidates]){const m=r.value.match(/^(.+-[A-Z]{0,3}\d{2,4})(RR|CR|CC|R|C|U)$/);if(m)candidates.push({value:m[1],uncertain:true});}
   for(const r of candidates)if(complete(r.value)){
   const x={...r,key:codeKey(r.value),confidence:Number(b.confidence)||0,code:true};x.uncertain||=x.confidence<55;
   const old=unique.get(x.key);if(!old||Number(x.uncertain)<Number(old.uncertain)||x.uncertain===old.uncertain&&x.confidence>old.confidence)unique.set(x.key,x);
  }
  }
  return [...unique.values()].sort((a,b)=>Number(a.uncertain)-Number(b.uncertain)||b.confidence-a.confidence).slice(0,5);
 }
 function nameScore(name,text){const a=nameKey(name),b=nameKey(text);if(!a||!b)return 0;if(a===b)return 1;
  if(a.length>=5&&b.includes(a)&&b.length-a.length<=Math.max(3,a.length*.12))return .98;
  if(a.length>=5){let shared=0;for(let i=0;i<a.length-1;i++)if(b.includes(a.slice(i,i+2)))shared++;if(shared/(a.length-1)<.35)return 0;}
  // The title band can include a small icon or logo at either edge.
  // Compare bounded windows, never a short character name inside a long title.
  if(a.length>=5&&b.length>a.length&&b.length-a.length<=Math.max(6,a.length*.22)){
   let best=0;for(let length=Math.max(3,a.length-1);length<=Math.min(b.length,a.length+1);length++)for(let start=0;start+length<=b.length;start++)best=Math.max(best,(1-T.distance(a,b.slice(start,start+length))/Math.max(a.length,length))*.98);return best;
  }
  if(Math.abs(a.length-b.length)>Math.max(2,a.length*.2))return 0;
  return 1-T.distance(a,b)/Math.max(a.length,b.length);
 }
 function titleLines(evidence){const out=[];
  for(const b of evidence.names||[]){const lines=String(b.text||'').normalize('NFKC').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
   for(const line of [...lines,...lines.slice(0,-1).map((x,i)=>x+' '+lines[i+1])]){
    if(line.length>110||T.weissReads(line).length||/©|copyright|bushiroad|all rights|\b(?:POWER|SOUL|LEVEL|COST)\b/i.test(line))continue;
    const text=line.replace(/^\s*\d{3,6}\s+/,'').replace(/\s+\d{3,6}\s*$/,'').trim();if(nameKey(text).length>=2)out.push({...b,text});
   }
  }
  return [...new Map(out.map(x=>[nameKey(x.text),x])).values()];
 }
 const nameCache=new WeakMap();
 const grams=s=>new Set(Array.from({length:Math.max(0,s.length-1)},(_,i)=>s.slice(i,i+2)));
 function suggest(names,evidence){let index=nameCache.get(names);if(!index){const rows=[],postings=new Map(),titles=new Map();for(const name of names){if(typeof name!=='string')continue;const key=nameKey(name);if(!titles.has(key)||name.length<titles.get(key).length)titles.set(key,name)}for(const [key,name]of titles){if(key.length<2)continue;const id=rows.length,g=grams(key);rows.push({name,key,g});for(const gram of g){if(!postings.has(gram))postings.set(gram,[]);postings.get(gram).push(id)}}index={rows,postings};nameCache.set(names,index)}
  const scores=new Map();for(const read of titleLines(evidence)){const key=nameKey(read.text),hits=new Map();for(const g of grams(key))for(const id of index.postings.get(g)||[])hits.set(id,(hits.get(id)||0)+1);
   const ids=[...hits].filter(([id,count])=>count/Math.max(1,index.rows[id].g.size)>=.35).sort((a,b)=>b[1]-a[1]).slice(0,180);
   for(const [id]of ids){const row=index.rows[id],similarity=nameScore(row.name,read.text),min=row.key.length<=4?1:row.key.length<=8?.82:.78;if(similarity<min)continue;const score=similarity+Math.min(100,read.confidence||0)*.0003;const old=scores.get(row.name);if(!old||old.score<score)scores.set(row.name,{name:row.name,similarity,score,read:read.text});}
  }
  const found=[...scores.values()].filter(x=>![...scores.values()].some(y=>y!==x&&y.similarity>=.98&&nameKey(y.name).length>nameKey(x.name).length&&nameKey(y.name).includes(nameKey(x.name)))).sort((a,b)=>b.score-a.score);return found.filter(x=>x.score>=found[0].score-.045).slice(0,3);
 }
 function compare(card,evidence){const observed=reads(evidence),actual=codeKey(card.localId),clear=observed.filter(x=>!x.uncertain),exact=observed.some(x=>x.key===actual),conflict=clear.some(x=>x.key!==actual);
  const similarity=Math.max(0,...[card.name,...(card.aliases||[])].flatMap(n=>titleLines(evidence).map(r=>nameScore(n,r.text))));
  const name=similarity>=.98?'match':similarity>=.8?'similar':'unread',number=exact?(conflict?'ambiguous':observed.some(x=>x.key===actual&&!x.uncertain)?'match':'similar'):observed.some(x=>Number.isFinite(T.weissDistance(x.value,card.localId)))?'similar':observed.length?'conflict':'unread';
  const confirmed=evidence.weissLookup?.mode==='code'&&exact;
  return {name,number,observed:observed.map(x=>x.value),joint:confirmed||number==='match'&&name==='match',score:(confirmed?1000:0)+(number==='match'?300:number==='similar'?50:0)+(name==='match'?120:name==='similar'?95:0)};
 }
 function rank(cards,evidence){return cards.map(card=>({card,evidence:compare(card,evidence)})).sort((a,b)=>b.evidence.score-a.evidence.score||a.card.name.localeCompare(b.card.name));}
 function footerStatus(e){const r=reads(e);return r.length?'Numer: '+r.map(x=>x.value).join(' / '):'Numer: brak pewnego odczytu';}
 async function lookupCode(game,evidence,{search,valid=()=>true,onstage=()=>{}}={}){
  const observed=reads(evidence),sources=[];let failure;
  for(const r of observed.slice(0,3)){if(!valid())return null;onstage('Szukam numeru '+r.value+'…');try{const data=await search({game,q:r.value,ocr:'0'});if(!valid())return null;const cards=(data.cards||[]).filter(c=>codeKey(c.localId)===r.key);if(cards.length)sources.push({q:r.value,ocr:'0',data:{...data,cards}})}catch(e){if(!valid())return null;failure=e}}
  const clear=observed.filter(x=>!x.uncertain);if(sources.length&&observed.length===1&&clear.length===1){evidence.weissLookup={mode:'code'};return {sources,query:clear[0].value,mode:'code'};}
  // Confusable characters may retrieve candidates but cannot prove a printing.
  if(!sources.length)for(const r of observed.slice(0,2)){if(!valid())return null;try{const data=await search({game,q:r.value,ocr:'1'});if(!valid())return null;const cards=(data.cards||[]).filter(c=>Number.isFinite(T.weissDistance(r.value,c.localId)));if(cards.length)sources.push({q:r.value,ocr:'1',data:{...data,cards}})}catch(e){if(!valid())return null;failure=e}}
  return {sources,query:observed[0]?.value||'',mode:'uncertain',failure};
 }
 async function lookup(game,evidence,names,{search,valid=()=>true,onstage=()=>{},getNames,readNames,codeResult}={}){
  const code=codeResult||await lookupCode(game,evidence,{search,valid,onstage});if(!code||!valid())return null;if(code.mode==='code')return code;
  onstage('Numer niepotwierdzony — sprawdzam pełną nazwę karty…');
  if(!names?.length&&getNames)try{names=await getNames()}catch{}if(!valid())return null;names=names||[];
  if(readNames)try{await readNames(names)}catch(e){if(!valid()||e.name==='AbortError')return null;evidence.nameReadFailed=true}if(!valid())return null;
  const matches=suggest(names,evidence),queries=matches.map(x=>x.name);if(!queries.length)queries.push(...titleLines(evidence).filter(x=>x.confidence>=35).slice(0,2).map(x=>x.text));
  const sources=[...code.sources];let failure=code.failure;
  for(const q of [...new Set(queries)].slice(0,3)){if(!valid())return null;try{const data=await search({game,q,ocr:'1'});if(!valid())return null;if(data.cards?.length)sources.push({q,ocr:'1',data})}catch(e){if(!valid())return null;failure=e}}
  evidence.weissLookup={mode:'name'};return {sources,query:queries[0]||code.query,mode:'name',note:failure?.message||'Nie udało się odczytać numeru ani nazwy. Ustaw kartę prosto lub wpisz dane ręcznie.'};
 }
 const numberPasses=[
  {region:[.105,.886,.168,.018],psm:'7',width:900,freeText:true}, {region:[.085,.882,.22,.025],psm:'7',width:900},
  {region:[0,.84,1,.12],psm:'11'}, {region:[.085,.884,.22,.018],psm:'7',enhance:true,width:900}, {region:[0,.92,1,.08],psm:'11'}
 ].map(p=>({...p,kind:'numbers',latin:true}));
 const namePasses=[{region:[.27,.895,.65,.05],psm:'7'}, {region:[.26,.88,.68,.07],psm:'6'}, {region:[.26,.88,.68,.07],psm:'7',enhance:true}, {region:[.08,.83,.86,.12],psm:'11'}].map(p=>({...p,kind:'names',latin:false}));
 function createReader(game,valid=()=>true){const workers=new Map();let closed=false;
  const check=()=>{if(closed||!valid())throw new DOMException('Anulowano','AbortError')};
  async function close(){if(closed)return;closed=true;const old=[...workers.values()];workers.clear();for(const w of old){CardScanRuntime.untrack(w);await w.terminate().catch(()=>{})}}
  async function worker(lang){check();if(workers.has(lang))return workers.get(lang);await loadOCR();check();const w=await Tesseract.createWorker(lang,1,{},lang==='eng'?{load_system_dawg:'0',load_freq_dawg:'0'}:{});if(closed||!valid()){await w.terminate().catch(()=>{});check()}CardScanRuntime.track(w);workers.set(lang,w);return w;}
  async function pass(image,p,evidence){check();const w=await worker(p.kind==='numbers'||game==='weiss'?'eng':'jpn');const r=await readScanPass(w,image,p);check();evidence[p.kind].push({...r,source:'weiss-'+p.kind});return r;}
  return {close,async scan(image,{search,getNames,onstage=()=>{},onread=()=>{}}={}){check();const evidence={names:[],numbers:[],full:'',engine:'Tesseract · Weiss number-first'},attempts=new Map();let code;
   const memo=async params=>{const key=JSON.stringify(params);if(!attempts.has(key))attempts.set(key,search(params));return attempts.get(key)};
   for(const p of numberPasses){check();onstage('Odczytuję numer Weiß Schwarz…');try{await pass(image,p,evidence);onread(evidence)}catch(e){check();evidence.numberReadFailed=true;break}check();if(!reads(evidence).length)continue;code=await lookupCode(game,evidence,{search:memo,valid:()=>!closed&&valid(),onstage});check();if(code?.mode==='code')return {evidence,result:code};}
   const result=await lookup(game,evidence,[],{search:memo,valid:()=>!closed&&valid(),onstage,getNames,codeResult:code,readNames:async names=>{
    for(const p of namePasses){check();onstage(game==='weiss-jp'?'Odczytuję japońską nazwę karty…':'Odczytuję pełną angielską nazwę…');await pass(image,p,evidence);onread(evidence);if(suggest(names,evidence).some(x=>x.similarity>=.98))break;}
   }});check();return {evidence,result};
  }};
 }
 return Object.freeze({is,numberText,nameKey,nameScore,titleLines,suggest,reads,compare,rank,footerStatus,lookupCode,lookup,createReader,numberPasses,namePasses});
})();
