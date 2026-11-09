// Local, number-first recognition for both Weiß Schwarz catalogs.
globalThis.CardWeissScan=(()=>{
 const is=game=>game==='weiss'||game==='weiss-jp',T=CardScanText;
 const nameKey=s=>String(s||'').normalize('NFKC').replace(/\s+\((?:RRR?|SR|SP|SSP|SEC|PR|OFR|R|C|U|TD|N|RE|AGR|ABR|DCR|FBR|KBR|BDR|JJR|HLP|XR|RRR?\+|SEC\+|SSP\+)\)\s*$/i,'').toLowerCase().replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60)).replace(/[^\p{L}\p{N}ー]/gu,'');
 const numberText=s=>String(s||'').normalize('NFKC').toUpperCase().replace(/[–—−]/g,'-').replace(/[\\|∕⁄]/g,'/').replace(/\/{2,}/g,'/').replace(/\/\$/g,'/S').replace(/\b([A-Z0-9]{2,10})-([SW][A-Z]?\d{1,4}-)/g,'$1/$2').replace(/([SW][A-Z]?)\s+([0-9OILSBZ]{1,4})(?=\s*-)/g,'$1$2').replace(/-\s*([A-Z]{1,3})\s+([0-9OILSBZ]{1,4})/g,'-$1$2').replace(/(\/[SW][A-Z]?[0-9OILSBZ]{1,4})[ \t]*\n[ \t]*([A-Z]{0,3}\d{1,4}\b)/g,'$1-$2');
 const codeKey=s=>T.weissKey(T.weissReads(numberText(s))[0]?.value||numberText(s)).replace(/[⁑＊*]+$/,'');
 const complete=s=>/^[A-Z0-9]{2,10}\/[A-Z0-9]{2,16}-[A-Z]{0,3}[0-9OILSBZ]{1,4}[A-Z0-9@+_]*$/i.test(s)||/^[A-Z0-9]{2,10}\/[SW][A-Z]?[0-9]{1,3}(?:PE|TE|E)[0-9]{1,4}[A-Z@+_]*$/i.test(s);
 function reads(evidence){const unique=new Map();
  for(const b of evidence.numbers||[]){const fixed=numberText(b.text),candidates=T.weissReads(fixed).map(r=>({...r,uncertain:r.uncertain||/\/\$/.test(b.text)}));
   // R/CR/CC/RR can be a rarity joined to a code. Keep both possibilities;
   // never silently drop a real printing suffix such as R or SP.
   for(const r of [...candidates]){const m=r.value.match(/^(.+-[A-Z]{0,3}\d{1,4})(RR|CR|CC|R|C|U)$/);if(m)candidates.push({value:m[1],uncertain:true,rarityJoined:true});}
   for(const r of candidates)if(complete(r.value)){
   const x={...r,key:codeKey(r.value),confidence:Number(b.confidence)||0,source:b.source,code:true};x.uncertain||=x.confidence<55;
   const old=unique.get(x.key);if(!old||Number(x.uncertain)<Number(old.uncertain)||x.uncertain===old.uncertain&&x.confidence>old.confidence)unique.set(x.key,x);
  }
  }
  return [...unique.values()].sort((a,b)=>Number(a.uncertain)-Number(b.uncertain)||b.confidence-a.confidence).slice(0,5);
 }
 const seriesKey=s=>numberText(s).match(/\b([A-Z0-9]{2,10}\s*\/\s*[SW][A-Z]?[0-9OILSBZ]{1,4})/)?.[1].replace(/\s/g,'')||'';
 function seriesReads(e){const by=new Map();for(const r of e.numbers||[]){if((r.confidence||0)<60)continue;for(const m of numberText(r.text).matchAll(/\b[A-Z0-9]{2,10}\s*\/\s*[SW][A-Z]?[0-9OILSBZ]{1,4}/g)){const s=seriesKey(m[0]);if(s)by.set(s,{value:s,confidence:r.confidence})}}return [...by.values()]}
 function nameScore(name,text){const a=nameKey(name),b=nameKey(text);if(!a||!b)return 0;if(a===b)return 1;
  if(a.length>=5&&b.includes(a)&&b.length-a.length<=Math.max(3,Math.min(14,a.length*(a.length>=12?.4:.12))))return .98;
  if(a.length>=5){let shared=0;for(let i=0;i<a.length-1;i++)if(b.includes(a.slice(i,i+2)))shared++;if(shared/(a.length-1)<.35)return 0;}
  // The title band can include a small icon or logo at either edge.
  // Compare bounded windows, never a short character name inside a long title.
  if(a.length>=5&&b.length>a.length&&b.length-a.length<=Math.max(6,Math.min(14,a.length*.4))){
   let best=0;for(let length=Math.max(3,a.length-1);length<=Math.min(b.length,a.length+1);length++)for(let start=0;start+length<=b.length;start++)best=Math.max(best,(1-T.distance(a,b.slice(start,start+length))/Math.max(a.length,length))*.98);return best;
  }
  if(Math.abs(a.length-b.length)>Math.max(2,a.length*.2))return 0;
  return 1-T.distance(a,b)/Math.max(a.length,b.length);
 }
 function titleLines(evidence){const out=[];
  for(const b of evidence.names||[]){if((b.confidence??0)<40)continue;const lines=String(b.text||'').normalize('NFKC').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
   for(const line of [...lines,...lines.slice(0,-1).map((x,i)=>x+' '+lines[i+1])]){
    if(line.length>110||T.weissReads(line).length||/©|copyright|bushiroad|all rights|\b(?:POWER|SOUL|LEVEL|COST)\b/i.test(line))continue;
    const text=line.replace(/^\s*\d{3,6}\s+/,'').replace(/\s+\d{3,6}\s*$/,'').trim();const letters=text.match(/\p{L}/gu)||[];if(nameKey(text).length>=2&&letters.length>=2&&letters.length/Math.max(1,text.replace(/\s/g,'').length)>=.45)out.push({...b,text});
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
  const confirmed=evidence.weissLookup?.mode==='code'&&(evidence.weissLookup.key?evidence.weissLookup.key===actual:exact),series=seriesReads(evidence),set=evidence.weissRejectedSeries?'unread':series.length===1?(seriesKey(card.localId)===series[0].value?'match':'conflict'):series.length>1?'ambiguous':'unread';
  return {name,number:confirmed?'match':number,set,observed:observed.map(x=>x.value),joint:confirmed||number==='match'&&name==='match',score:(confirmed?1000:0)+(number==='match'?300:number==='similar'?50:0)+(set==='match'?25:set==='conflict'?-100:0)+(name==='match'?120:name==='similar'?95:0)};
 }
 function rank(cards,evidence){return cards.map(card=>({card,evidence:compare(card,evidence)})).sort((a,b)=>b.evidence.score-a.evidence.score||a.card.name.localeCompare(b.card.name));}
 function footerStatus(e){const r=reads(e),s=seriesReads(e);return e.weissLookup?.mode==='code'?'Seria i numer: '+(e.weissLookup.value||r[0]?.value):r.length?'Seria i numer: '+r.map(x=>x.value).join(' / '):s.length?'Seria: '+s.map(x=>x.value).join(' / ')+' · numer nieodczytany':'Seria i numer: brak pewnego odczytu';}
 async function lookupCode(game,evidence,{search,valid=()=>true,onstage=()=>{}}={}){
  let observed=reads(evidence),failure;const sources=[];
  try{if(globalThis.CardCatalog?.weissScanIndex&&globalThis.CardWeissCodebook){const book=await CardCatalog.weissScanIndex(game);if(!valid())return null;const direct=[];
    // Retain every independent pass for consensus, not just its highest score.
    for(const r of evidence.numbers||[])for(const read of reads({numbers:[r]}))if(book.codes.has(read.key))direct.push(read);
    observed=CardWeissCodebook.aggregate([...direct,...CardWeissCodebook.observe(book,evidence)]);
  }}catch(e){failure=e;}
  evidence.weissCodeCandidates=observed.slice(0,8).map(r=>({value:r.value,key:r.key,confidence:r.confidence,support:r.support||1,uncertain:r.uncertain}));
  for(const r of observed.slice(0,6)){if(!valid())return null;onstage('Sprawdzam numer '+r.value+'…');try{const data=await search({game,q:r.value,ocr:'0'});if(!valid())return null;const cards=(data.cards||[]).filter(c=>codeKey(c.localId)===r.key);if(cards.length)sources.push({q:r.value,ocr:'0',data:{...data,cards}})}catch(e){if(!valid())return null;failure=e}}
  const keys=new Set(sources.flatMap(s=>s.data.cards.map(c=>codeKey(c.localId)))),hits=observed.filter(r=>keys.has(r.key)),top=hits[0];
  // Two consistent observations from different crops protect against a single
  // mistaken digit. One code shared by multiple variants still requires a choice.
  const confirmed=top&&!failure&&top.support>=2&&top.confidence>=65&&hits.length===1;
  if(confirmed){evidence.weissLookup={mode:'code',key:top.key,value:top.value};return {sources,query:top.value,mode:'code'};}
  // Exact typed/test evidence without the local codebook retains legacy semantics.
  if(!globalThis.CardWeissCodebook&&sources.length&&observed.length===1&&!observed[0].uncertain){evidence.weissLookup={mode:'code',key:observed[0].key,value:observed[0].value};return {sources,query:observed[0].value,mode:'code'};}
  if(!sources.length)for(const r of observed.slice(0,2)){if(!valid())return null;try{const data=await search({game,q:r.value,ocr:'1'});if(!valid())return null;const cards=(data.cards||[]).filter(c=>Number.isFinite(T.weissDistance(r.value,c.localId)));if(cards.length)sources.push({q:r.value,ocr:'1',data:{...data,cards}})}catch(e){failure=e}}
  return {sources,query:observed[0]?.value||'',mode:'uncertain',failure};
 }
 async function lookup(game,evidence,names,{search,valid=()=>true,onstage=()=>{},getNames,readNames,codeResult}={}){
  const code=codeResult||await lookupCode(game,evidence,{search,valid,onstage});if(!code||!valid())return null;if(code.mode==='code')return code;
  onstage('Numer niepotwierdzony — sprawdzam pełną nazwę karty…');
  if(!names?.length&&getNames)try{names=await getNames()}catch{}if(!valid())return null;names=names||[];
  if(readNames)try{await readNames(names)}catch(e){if(!valid()||e.name==='AbortError')return null;if(e.weissEngineError)throw e;evidence.nameReadFailed=true}if(!valid())return null;
  const matches=suggest(names,evidence),queries=matches.map(x=>x.name);evidence.weissNames=matches.map(x=>x.name);
  // OCR noise is never presented as an identified Japanese name or used as a
  // broad catalog query. Only a title supported by the bundled dictionary is used.
  if(!names.length&&game==='weiss'&&!queries.length)queries.push(...titleLines(evidence).filter(x=>x.confidence>=75&&/^[A-Za-z0-9\s.,'’!?:\-–—()]+$/.test(x.text)&&nameKey(x.text).length>=6).slice(0,2).map(x=>x.text));
  const sources=[...code.sources];let failure=code.failure;
  const series=seriesReads(evidence);
  for(const q of [...new Set(queries)].slice(0,3)){if(!valid())return null;try{const filter=series.length===1?{weissSeries:series[0].value}:{};let data=await search({game,q,ocr:'1',...filter});if(!data.cards?.length&&filter.weissSeries){data=await search({game,q,ocr:'1'});data={...data,weissSeriesApplied:false};}if(!valid())return null;const unknownSeries=data.weissSeriesApplied===false;if(unknownSeries)evidence.weissRejectedSeries=filter.weissSeries;const cards=(data.cards||[]).filter(c=>unknownSeries||series.length!==1||seriesKey(c.localId)===series[0].value);if(cards.length)sources.push({q,ocr:'1',...(unknownSeries?{}:filter),data:{...data,cards}})}catch(e){if(!valid())return null;failure=e}}
  const mode=queries.length?'name':'uncertain';evidence.weissLookup={mode};return {sources,query:queries[0]||code.query,mode,note:failure?.message||'Nie potwierdzono serii i numeru ani nazwy. Zbliż dolną część karty, usuń odblaski lub wpisz dane ręcznie.'};
 }
 const numberPasses=[
  {region:[.09,.885,.22,.022],psm:'7',width:1200,freeText:true},
  {region:[.09,.875,.24,.042],psm:'7',width:1200,enhance:true,freeText:true},
  {region:[0,.73,1,.27],psm:'11',width:1800,freeText:true,broad:true},
  {region:[.03,.845,.40,.10],psm:'11',width:1600,freeText:true}
 ].map(p=>({...p,kind:'numbers',latin:true}));
 const landscapeNumberPasses=[
  {region:[.415,.889,.17,.023],psm:'7',width:1000,freeText:true},
  {region:[.405,.88,.18,.045],psm:'7',width:1000,enhance:true,freeText:true},
  {region:[0,.67,1,.33],psm:'11',width:1800,freeText:true,broad:true},
  {region:[.34,.83,.30,.12],psm:'11',width:1500,freeText:true}
 ].map(p=>({...p,kind:'numbers',latin:true}));
 const namePasses=[{region:[.20,.81,.78,.16],psm:'11',width:1800,broad:true},{region:[.27,.895,.65,.05],psm:'7'}, {region:[.29,.896,.54,.052],psm:'6'}, {region:[.27,.885,.65,.065],psm:'7',enhance:true}].map(p=>({...p,kind:'names',latin:false,width:p.width||1400}));
 const landscapeNamePasses=[{region:[.50,.78,.49,.19],psm:'11',width:1500,broad:true},{region:[.59,.88,.36,.068],psm:'7'}, {region:[.575,.88,.39,.075],psm:'6'}, {region:[.59,.88,.36,.068],psm:'7',enhance:true}].map(p=>({...p,kind:'names',latin:false,width:p.width||1200}));
 const landscape=image=>(image.naturalWidth||image.width)>(image.naturalHeight||image.height);
 const getNumberPasses=image=>landscape(image)?landscapeNumberPasses:numberPasses;
 const getNamePasses=image=>landscape(image)?landscapeNamePasses:namePasses;
 const japanesePasses=image=>(landscape(image)?[[.575,.875,.385,.08],[.56,.865,.41,.095]]:[[.27,.88,.66,.075],[.25,.865,.70,.09]]).map((region,i)=>({region,enhance:!!i,width:1200}));
 function titleEvidence(result,pass,image){
  const width=result.width||result.resizedImageWidth,height=result.height||result.resizedImageHeight,rw=result.resizedImageWidth||width,rh=result.resizedImageHeight||height;
  if(!width||!height||!rw||!rh)return [];
  const lines=(result.texts||[]).filter(r=>r.box?.length===4).map(r=>{
   const p=r.box,x=p.map(v=>v[0]),y=p.map(v=>v[1]),cx=(Math.min(...x)+Math.max(...x))/2/rw*width,cy=(Math.min(...y)+Math.max(...y))/2/rh*height;
   const glyphHeight=(Math.hypot(p[3][0]-p[0][0],p[3][1]-p[0][1])+Math.hypot(p[2][0]-p[1][0],p[2][1]-p[1][1]))/2/rh*height;
   return {text:r.text||'',confidence:100*(r.mean??r.score??0),source:'weiss-japanese-title',height:glyphHeight/(height-48)*pass.region[3],x:pass.region[0]+(cx-24)/(width-48)*pass.region[2],y:pass.region[1]+(cy-24)/(height-48)*pass.region[3]};
  }).filter(r=>r.confidence>=45&&r.y>=.878&&r.y<=.955&&r.x>=(landscape(image)?.57:.27));
  const tallest=Math.max(0,...lines.map(r=>r.height));
  // Keep main title glyphs; small furigana, numeric labels and franchise logos
  // must not become competing card names. Dictionary matching follows this step.
  return lines.filter(r=>r.height>=tallest*.48);
 }
 function readout(e){return [footerStatus(e),'Nazwa: '+(e.weissNames?.join(' / ')||'brak potwierdzonego odczytu')].join('\n')}
 function syncScanner(){const enabled=typeof currentGame==='function'&&is(currentGame()),control=$('weiss-scan-options'),guide=$('scan-guide');if(control)control.hidden=!enabled;if(guide&&enabled)guide.dataset.orientation=$('weiss-orientation')?.value||'portrait';}
 function createReader(game,valid=()=>true){const workers=new Map();let closed=false,usedJapanese=false,neuralUnavailable=false,stage=()=>{},deadline=Infinity,deepScan=false;
  const check=()=>{if(closed||!valid())throw new DOMException('Anulowano','AbortError')};
  async function close(){if(closed)return;closed=true;const old=[...workers.values()];workers.clear();for(const w of old){CardScanRuntime.untrack(w);await w.terminate().catch(()=>{})}if(usedJapanese&&valid())CardScanRuntime.cancel()}
  async function worker(lang){check();if(workers.has(lang))return workers.get(lang);
   const previous=[...workers.values()][0],params=lang==='eng'?{load_system_dawg:'0',load_freq_dawg:'0'}:{};
   if(previous?.reinitialize){await previous.reinitialize(lang,1,params);check();workers.clear();workers.set(lang,previous);return previous;}
   for(const w of workers.values()){CardScanRuntime.untrack(w);await w.terminate().catch(()=>{});}workers.clear();
   const create=globalThis.CardWeissOCR?.create;if(!create){await loadOCR();check();}
   let w;try{w=await (create?create(lang,params,m=>{if(!closed&&valid()&&/loading.*(?:core|language)/i.test(m.status||''))stage('Wczytuję odczyt Weiß Schwarz — pierwszy start może potrwać chwilę…');}):Tesseract.createWorker(lang,1,{},params));}catch(e){e.weissEngineError=true;throw e;}if(closed||!valid()){await w.terminate().catch(()=>{});check();}CardScanRuntime.track(w);workers.set(lang,w);return w;
  }
  async function pass(image,p,evidence){check();const w=await worker(p.kind==='numbers'||game==='weiss'?'eng':'jpn');
   await w.setParameters({tessedit_pageseg_mode:p.psm,user_defined_dpi:'300',preserve_interword_spaces:'1',tessedit_char_whitelist:p.latin&&!p.freeText?'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/-_@+ |':''});
   const crop=enhancedRegion(image,p.region,p.enhance,p.width||1800),{data}=await w.recognize(crop,{rotateAuto:true},{text:true,blocks:true});check();if(deadline===Infinity)deadline=Date.now()+(deepScan?40000:10000);
   const lines=data.blocks?.flatMap(b=>b.paragraphs?.flatMap(p=>p.lines||[])||[])||data.lines||[],passId='weiss-'+p.kind+'-'+evidence.numbers.length+'-'+evidence.names.length;
   const rows=lines.map(l=>({text:l.text||'',confidence:l.confidence||0,source:passId,region:p.region,box:l.bbox,cropWidth:crop.width,cropHeight:crop.height,y:p.region[1]+(((l.bbox?.y0||0)+(l.bbox?.y1||0))/2-24)/(crop.height-48)*p.region[3]})).filter(x=>x.text.trim());
   // OCR may split a title into separate blocks around a shine or decoration.
   // Rejoin only nearby fragments on the same printed baseline, never paragraphs.
   const groups=[];for(const row of rows.filter(r=>r.box&&r.confidence>=15).sort((a,b)=>a.box.y0-b.box.y0||a.box.x0-b.box.x0)){
    const b=row.box,cy=(b.y0+b.y1)/2,h=b.y1-b.y0;let g=groups.find(g=>Math.abs(g.cy-cy)<=Math.min(g.h,h)*.55);if(!g){g={cy,h,rows:[]};groups.push(g);}g.rows.push(row);
   }
   for(const g of groups){const sorted=g.rows.sort((a,b)=>a.box.x0-b.box.x0);let part=[];const emit=()=>{if(part.length>1){const first=part[0],last=part.at(-1),length=part.reduce((s,r)=>s+r.text.trim().length,0);rows.push({...first,text:part.map(r=>r.text.trim()).join(' '),confidence:part.reduce((s,r)=>s+r.confidence*r.text.trim().length,0)/Math.max(1,length),box:{x0:first.box.x0,x1:last.box.x1,y0:Math.min(...part.map(r=>r.box.y0)),y1:Math.max(...part.map(r=>r.box.y1))},joined:true});}part=[];};for(const row of sorted){if(part.length&&row.box.x0-part.at(-1).box.x1>Math.max(g.h,row.box.y1-row.box.y0)*4)emit();part.push(row);}emit();}
   if(!rows.length)rows.push({text:data.text||'',confidence:data.confidence||0,source:passId,region:p.region});
   evidence[p.kind].push(...rows);if(p.broad&&p.kind==='numbers'&&game==='weiss')evidence.names.push(...rows.filter(r=>r.y>=.875&&r.y<=.955));return rows;
  }
  return {close,async scan(image,{search,getNames,deep=false,onstage=()=>{},onread=()=>{}}={}){check();stage=onstage;deepScan=deep;deadline=Infinity;const original=image,alignment=globalThis.CardWeissFrame?.prepare(image);if(alignment?.aligned)image=alignment.image;const evidence={aligned:!!alignment?.aligned,names:[],numbers:[],full:'',game,weissOrientation:landscape(image)?'landscape':'portrait',engine:'Weiss · seria i numer'},attempts=new Map();let code;
   const memo=async params=>{const key=JSON.stringify(params);if(!attempts.has(key))attempts.set(key,search(params));return attempts.get(key)};
   for(const p of getNumberPasses(image)){check();if(Date.now()>deadline)break;onstage('Odczytuję serię i numer Weiß Schwarz…');try{await pass(image,p,evidence);onread(evidence)}catch(e){check();if(e.weissEngineError)throw e;evidence.numberReadFailed=true;break}check();code=await lookupCode(game,evidence,{search:memo,valid:()=>!closed&&valid(),onstage});check();if(code?.sources?.length&&code.mode!=='code'&&!evidence.codeZoomed&&Date.now()<deadline){
     const row=[...evidence.numbers].reverse().find(r=>r.box&&r.confidence>=40&&T.weissReads(numberText(r.text)).length);
     if(row){evidence.codeZoomed=true;const [x,y,w,h]=row.region,b=row.box,px=w/(row.cropWidth-48),py=h/(row.cropHeight-48),left=Math.max(0,x+(b.x0-30)*px),top=Math.max(0,y+(b.y0-29)*py),right=Math.min(1,x+(b.x1-18)*px),bottom=Math.min(1,y+(b.y1-19)*py);
      if(right>left&&bottom>top)await pass(image,{kind:'numbers',latin:true,freeText:true,region:[left,top,right-left,bottom-top],psm:'7',width:1500,enhance:true},evidence);
      check();code=await lookupCode(game,evidence,{search:memo,valid:()=>!closed&&valid(),onstage});check();
     }
    }if(code?.mode==='code'){onread(evidence);return {evidence,result:code}}}
   const result=await lookup(game,evidence,[],{search:memo,valid:()=>!closed&&valid(),onstage,getNames,codeResult:code,readNames:async names=>{
    const found=()=>{const matches=suggest(names,evidence);evidence.weissNames=matches.map(x=>x.name);onread(evidence);return matches.some(x=>x.similarity>=.98)};
    if(found())return;
    for(const p of getNamePasses(image).slice(0,deep?4:2)){check();if(Date.now()>deadline)break;onstage(game==='weiss-jp'?'Odczytuję japoński tytuł…':'Odczytuję pełną angielską nazwę…');await pass(image,p,evidence);if(found())return;}
    // A wide, contrast-adjusted fallback also works when sleeves, borders or
    // decorative artwork prevent a confident geometric crop.
    for(const source of deep?(alignment?.aligned?[image,original]:[image]):[]){check();if(Date.now()>deadline)break;onstage('Sprawdzam szerszy kadr nazwy i poprawiam kontrast…');await pass(source,{kind:'names',latin:false,region:landscape(source)?[.43,.75,.56,.24]:[.15,.78,.84,.21],psm:'11',width:2000,enhance:true},evidence);if(found())return;}
    if(game==='weiss-jp'&&Date.now()<deadline&&!neuralUnavailable&&typeof CardScanRuntime.read==='function')try{
     for(const w of workers.values()){CardScanRuntime.untrack(w);await w.terminate().catch(()=>{});}workers.clear();check();
     for(const p of japanesePasses(image).slice(0,deep?3:1)){check();if(Date.now()>deadline)break;usedJapanese=true;onstage('Odczytuję japońską nazwę karty…');const canvas=enhancedRegion(image,p.region,p.enhance,p.width),r=await CardScanRuntime.read(canvas,{language:'ja',maxSide:1500,onstage:s=>{if(valid()&&s==='loading')onstage('Wczytuję lokalny odczyt japońskich nazw…')}});check();evidence.names.push(...titleEvidence(r,p,image));evidence.engine='Weiss · japoński OCR';if(found())return;}
    }catch(e){check();neuralUnavailable=true;evidence.japaneseReadFailed=true;onstage('Sprawdzam japoński tytuł odczytem rezerwowym…')}

   }});check();evidence.limited=Date.now()>deadline;if(result&&!result.sources.length&&!deep)result.note='Nie potwierdzono karty. Zbliż serię i numer albo wybierz „Dokładniejszy odczyt”.';onread(evidence);return {evidence,result};
  }};
 }
 return Object.freeze({is,codeKey,numberText,nameKey,nameScore,titleLines,suggest,reads,compare,rank,footerStatus,lookupCode,lookup,createReader,numberPasses,namePasses,landscape,getNumberPasses,getNamePasses,japanesePasses,titleEvidence,seriesKey,seriesReads,readout,syncScanner});
})();
