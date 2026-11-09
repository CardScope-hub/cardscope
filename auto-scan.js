// General scanner: identify the catalog from printed evidence, then verify the card.
// Never change the user's scan mode or carry OCR evidence between different frames.
globalThis.CardAutoScan=(()=>{
 'use strict';
 const games=['pokemon','mtg','swu','onepiece','riftbound','weiss','weiss-jp','lorcana','cyberpunk'];
 const labels={lorcana:'Disney Lorcana',cyberpunk:'Cyberpunk TCG',pokemon:'Pokémon',mtg:'Magic: The Gathering',swu:'Star Wars: Unlimited',onepiece:'One Piece',riftbound:'Riftbound',weiss:'Weiß Schwarz · EN','weiss-jp':'Weiß Schwarz · JP'};
 const japanese=s=>/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(s||'');
 const primaryNamesCache=new WeakMap();
 const family=g=>g==='weiss-jp'?'weiss':g;
 function fromResult(result,footers=[]){const out={};
  for(const game of games){const e=CardNeuralEvidence.fromResult(game,result);e.numbers.push(...footers.map(r=>game==='swu'&&r.source==='auto-swu-footer'?{...r,source:'swu-portrait-footer'}:r));e.full=[e.full,...footers.map(x=>x.text)].join('\n');
   // Weiss titles sit at the foot of the card; rules paragraphs are not names.
   if(game==='weiss'||game==='weiss-jp'){
    const w=result.width||1,h=result.height||1,wide=w>h;
    e.names=CardNeuralEvidence.crop({...result,texts:(result.texts||[]).filter(t=>{const p=t.box||[],x=p.reduce((n,v)=>n+v[0],0)/4/w,y=p.reduce((n,v)=>n+v[1],0)/4/h;return p.length===4&&y>=.855&&y<=.965&&x>=(wide?.56:.24);})});
   }
   out[game]=e;
  }return out;
 }
 function classify(e){const map=new Map(),text=e.pokemon?.full||'',add=(game,score,reason,code=false)=>{if((map.get(game)?.score||0)<score)map.set(game,{game,score,reason,code});};
  for(const game of ['lorcana','cyberpunk']){const nums=CardAdditional.reads(game,e[game]).filter(n=>n.code);if(nums.length)add(game,nums.some(n=>!n.uncertain)?100:80,'Numer '+labels[game],true);}
  if(/lorcana|ravensburger|storyborn|dreamborn|floodborn/i.test(text))add('lorcana',75,'Tekst Disney Lorcana');
  if(/cyberpunk|weirdco|cd\s*projekt|eddies|night\s*city/i.test(text))add('cyberpunk',75,'Tekst Cyberpunk TCG');
  const ws=CardWeissScan.reads(e.weiss).filter(r=>/\/[SW][A-Z]?[0-9OILSBZ]/.test(r.value));
  for(const r of ws){const en=/-(?:[A-Z]{0,2}E)\d|\/[SW]\w*(?:PE|TE|E)\d/.test(r.value);add(en?'weiss':'weiss-jp',r.uncertain?82:100,'Seria i numer Weiß Schwarz',true);}
  if(!ws.length&&CardWeissScan.seriesReads(e.weiss).length){add('weiss',75,'Seria Weiß Schwarz');add('weiss-jp',75,'Seria Weiß Schwarz');}
  const swu=CardSWUScan.reads(e.swu);if(swu.observations.length)add('swu',swu.reliable?100:80,'Seria i numer Star Wars: Unlimited',true);
  const mtg=CardMTGScan.reads(e.mtg);if(mtg.pairs.length)add('mtg',mtg.reliable?100:80,'Seria i numer Magic',true);
  const one=CardScanIndex.numbers('onepiece',e.onepiece).filter(n=>n.code&&!/^P-/.test(n.value));if(one.length)add('onepiece',one.some(n=>!n.uncertain&&n.confidence>=60)?100:80,'Numer One Piece',true);
  const rift=CardScanIndex.numbers('riftbound',e.riftbound).filter(n=>n.code&&!/^pr-/i.test(n.value));if(rift.length)add('riftbound',rift.some(n=>!n.uncertain&&n.confidence>=60)?100:80,'Seria i numer Riftbound',true);
  if(/\bC(?:SV|SM|S|BB)\d|\b(?:SV|SM|S|M)\d+[a-z]?\s*(?:KR?|F)\b|宝可梦|寶可夢|포켓몬|pok[eé]mon|weakness|resistance|retreat|\bHP\s*\d{2,3}|\d{2,3}\s*HP\b|たね|にげる|弱点|ポケモン/i.test(text))add('pokemon',72,'Układ i tekst Pokémon');
  if(/lucasfilm|star\s*wars|fantasy\s*flight|shield\s+token/i.test(text))add('swu',72,'Tekst Star Wars: Unlimited');
  if(/wizards\s+of\s+the\s+coast|\b(?:sorcery|instant|enchantment|planeswalker)\b|legendary\s+(?:creature|artifact)|\bcreature\s*[—-]/i.test(text))add('mtg',70,'Tekst Magic');
  if(/riftbound|riot\s*games|rune\s+pool|champion\s+(?:unit|legend)|when\s+(?:i|you)\s+conquer/i.test(text))add('riftbound',70,'Tekst Riftbound');
  if(/one\s*piece|\bDON!!|bandai|バンダイ/i.test(text))add('onepiece',65,'Tekst One Piece');
  if(/bushiroad|wei[ßs]+\s*schwarz|アンコール|クライマックス/i.test(text)){add(japanese(text)?'weiss-jp':'weiss',70,'Tekst Weiß Schwarz');}
  return [...map.values()].sort((a,b)=>b.score-a.score);
 }
 const key=c=>(c.gameKey||c._autoGame||'pokemon')+'|'+(c.catalogLanguage||'en')+'|'+c.id;
 function finish(rows,routes,failed=false){
  const unique=new Map();for(const row of rows){const k=key(row.card),old=unique.get(k);if(!old||row.score>old.score)unique.set(k,row);}
  const sorted=[...unique.values()].sort((a,b)=>b.score-a.score),exact=sorted.filter(x=>x.exact),conflict=new Set(routes.filter(r=>r.code&&r.score>=100).map(r=>family(r.game))).size>1;
  const single=!failed&&!conflict&&exact.length===1&&!exact[0].incomplete?exact[0].card:null;
  return {cards:sorted.slice(0,12).map(x=>x.card),single,confirmed:!failed&&!conflict&&exact.length>0,routes,note:single?'Rozpoznano '+labels[single._autoGame]+'.':sorted.length?'Porównaj ilustrację, serię i numer — wybierz właściwe wydanie.':failed?'Część katalogów chwilowo nie odpowiada. Ponów skan lub wybierz grę.':'Nie ma pewnego dopasowania. Zbliż nazwę i numer lub wskaż grę poniżej.'};
 }
 async function resolve(evidences,{search,getNames,getPokemon,rankPokemon,valid=()=>true,language='en',codeOnly=false,deep=false,timeLeft=()=>true,onstage=()=>{}}={}){
  const check=()=>{if(!valid())throw new DOMException('Anulowano','AbortError');};check();
  const routes=classify(evidences),rows=[];let failed=false;
  const append=(game,cards,{exact=false,incomplete=false,score=100,lang=game==='weiss-jp'?'ja':'en'}={})=>{for(const c of cards)rows.push({card:{...c,gameKey:c.gameKey||game,catalogLanguage:c.catalogLanguage||lang,_autoGame:game,_autoLanguage:c.catalogLanguage||lang},exact,incomplete,score});};
  // Verify observed codes in the respective catalog; no title dictionaries are
  // downloaded for a clearly identified MTG / SWU / Weiss / One Piece / Rift card.
  for(const r of routes.filter(r=>r.code)){
   check();const game=r.game,e=evidences[game];onstage('Sprawdzam '+labels[game]+' · serię i numer…');
   try{
    if(game==='weiss'||game==='weiss-jp'){
     const hit=await CardWeissScan.lookupCode(game,e,{search,valid});check();if(hit?.sources?.length){const all=hit.sources.flatMap(s=>s.data.cards),one=CardMTGScan.singleResult(hit.sources,e);append(game,all,{exact:hit.mode==='code',incomplete:!one,score:hit.mode==='code'?1000:180});}
    }else if(game==='mtg'||game==='swu'){
     const parsed=game==='mtg'?CardMTGScan.reads(e):CardSWUScan.reads(e),reads=parsed.reliable?[parsed.reliable]:(game==='mtg'?parsed.pairs:parsed.observations).slice(0,2);
     for(const read of reads){const q=game==='mtg'?'set:'+read.set+' cn:'+read.number:read.value;
      const data=await search({game,q,ocr:'0'});check();
      const cards=(data.cards||[]).filter(c=>game==='mtg'?String(c.set?.id||c.setCode||'').toLowerCase()===read.set&&CardMTGScan.numberKey(c.localId)===read.number:String(c.set?.id).toUpperCase()===read.set&&String(c.collectorNumber).toUpperCase().replace(/^(T?)0+(?=\d)/,'$1')===String(read.number).toUpperCase().replace(/^(T?)0+(?=\d)/,'$1'));
      append(game,cards,{exact:!!parsed.reliable,incomplete:!parsed.reliable||!!data.nextPage||Number(data.total)>cards.length,score:parsed.reliable?1000:180});
     }
    }else{
     const nums=CardScanIndex.numbers(game,e).filter(n=>n.code&&!/^pr-/i.test(n.value)).slice(0,2);
     for(const n of nums){const data=await search({game,q:n.query||n.value,ocr:'0'});check();const ranked=CardScanIndex.rank(game,data.cards||[],e),found=ranked.filter(x=>x.evidence.number==='match'||x.evidence.number==='similar');
      for(const row of found){const exact=row.evidence.number==='match'&&!n.uncertain&&n.confidence>=60&&nums.length===1;append(game,[row.card],{exact,incomplete:!!data.nextPage||Number(data.total)>found.length,score:exact?1000:180});}
     }
    }
   }catch(err){check();failed=true;}
  }
  if(rows.some(r=>r.exact))return finish(rows,routes,failed);
  // A Pokémon fraction alone is not enough. Its title must match too.
  if(!codeOnly||routes.some(r=>r.game==='pokemon'))try{
   check();const e=evidences.pokemon,lang=CardPokemonAsian.languageHint(e.full||e.names.map(r=>r.text).join(' '),language);
   const index=await getPokemon(lang);check();const ranked=rankPokemon(index.cards,index.sets,{...e,language:lang});
   const found=ranked.filter(r=>r.certain||r.name>=.88||r.recognizedName).slice(0,12),certain=found.filter(r=>r.certain);
   for(const r of found)append('pokemon',[{...r.c,_pokemon:true,_set:r.set}],{lang,exact:!!r.certain,incomplete:certain.length!==1,score:r.certain?1000:110+(r.name||.88)*50+(r.num?20:0)});
  }catch(err){check();failed=true;}
  if(rows.some(r=>r.exact)||codeOnly)return finish(rows,routes,failed);
  const selected=deep?games:routes.filter(r=>r.score>=65).map(r=>r.game);
  const ordered=[...new Set(selected)].filter(g=>g!=='pokemon');
  // Match titles only. Names mentioned in rules text must not identify a game.
  for(const game of ordered){check();if(!timeLeft())break;const e=evidences[game],jp=game==='weiss-jp';if(jp&&!e.names.some(r=>japanese(r.text)))continue;
   if(!e.names.some(r=>(r.confidence||0)>=40&&r.text.trim().length>=3))continue;
   onstage('Porównuję nazwę · '+labels[game]+'…');
   try{let names=await getNames(game);check();const title={...e,full:''};if(game==='swu'){if(!primaryNamesCache.has(names))primaryNamesCache.set(names,[...new Set(names.map(n=>n.split(' — ')[0]))]);names=primaryNamesCache.get(names);}
    const suggested=(jp||game==='weiss'?CardWeissScan.suggest(names,title):CardScanIndex.suggest(names,title)).filter(x=>x.similarity>=.88).slice(0,2);
    for(const s of suggested){const data=await search({game,q:s.name,ocr:'1'});check();const ranked=CardScanIndex.rank(game,data.cards||[],title);
     const found=ranked.filter(r=>['match','similar'].includes(r.evidence.name)).slice(0,8);append(game,found.map(r=>r.card),{score:110+s.similarity*50,incomplete:true});}
   }catch(err){check();failed=true;}
  }
  return finish(rows,routes,failed);
 }
 function tesseractResult(data,width,height){const lines=data.blocks?.flatMap(b=>b.paragraphs?.flatMap(p=>p.lines||[])||[])||data.lines||[];return {width,height,texts:lines.map(l=>({text:l.text,mean:(l.confidence||0)/100,box:[[l.bbox.x0,l.bbox.y0],[l.bbox.x1,l.bbox.y0],[l.bbox.x1,l.bbox.y1],[l.bbox.x0,l.bbox.y1]]}))};}
 function createReader(valid=()=>true,deps={}){
  let closed=false,classic=null,neuralFailed=!!deps.preferClassic;const wsReaders=new Map();let jpReader=null;const asianReaders=new Map();
  const check=()=>{if(closed||!valid())throw new DOMException('Anulowano','AbortError');};
  const search=deps.search||((p)=>otherJSON(p)),getNames=deps.getNames||(g=>scanDictionary(g)),getPokemon=deps.getPokemon||(l=>getCatalog(l)),rankPokemon=deps.rankPokemon||((c,s,e)=>rankScanCatalog(c,s,e));
  async function read(image,options={}){check();
   if(!neuralFailed)try{const r=await CardScanRuntime.read(image,options);check();return r;}catch(err){check();if(options.language==='ja')throw err;neuralFailed=true;}
   if(options.language==='ja')throw Error('Japoński odczyt jest niedostępny.');
   if(!classic){await loadOCR();check();const w=await CardScanRuntime.classicWorker('eng');if(closed||!valid()){await w.terminate();check();}classic=CardScanRuntime.track(w);await classic.setParameters({tessedit_pageseg_mode:'11'});}
   const canvas=options.region?enhancedRegion(image,options.region,!!options.enhance,2200):image;
   const {data}=await classic.recognize(canvas,{}, {text:true,blocks:true});check();return tesseractResult(data,canvas.width||canvas.naturalWidth,canvas.height||canvas.naturalHeight);
  }
  async function readAsian(image,lang,onstage){const index=await getPokemon(lang);check();let reader=asianReaders.get(lang);if(!reader){reader=CardPokemonAsian.createReader(lang,()=>!closed&&valid());asianReaders.set(lang,reader);}let e;try{e=await reader.read(image,index,{onstage});}finally{await reader.close();asianReaders.delete(lang);}check();const ranked=rankPokemon(index.cards,index.sets,e),rows=ranked.map(r=>({card:{...r.c,_pokemon:true,_set:r.set,gameKey:'pokemon',catalogLanguage:lang,_autoGame:'pokemon',_autoLanguage:lang},exact:!!r.certain,incomplete:ranked.length!==1,score:r.certain?1000:160}));return {...finish(rows,[]),evidences:{pokemon:e}};}
  async function close(){closed=true;for(const r of asianReaders.values())await r.close();asianReaders.clear();if(classic){CardScanRuntime.untrack(classic);await classic.terminate().catch(()=>{});classic=null;}for(const r of wsReaders.values())await r.close();wsReaders.clear();await jpReader?.close();jpReader=null;}
  return {close,async scan(image,{onstage=()=>{},language='en',deep=false}={}){
   check();if(CardPokemonAsian.supports(language)){const asian=await readAsian(image,language,onstage);check();if(asian.cards.length)return asian;}let result=await read(image,{onstage:s=>onstage(s==='loading'?'Wczytuję lokalny odczyt wszystkich gier…':'Odczytuję kartę i szukam jej gry…')});check();
   const deadline=Date.now()+(deep?40000:10000),timeLeft=()=>Date.now()<deadline;let evidences=fromResult(result),routes=classify(evidences);const memo=new Map(),options={search:p=>{const k=JSON.stringify(p);if(!memo.has(k))memo.set(k,search(p));return memo.get(k);},getNames,getPokemon,rankPokemon,valid:()=>!closed&&valid(),language,deep,timeLeft,onstage};
   let found=await resolve(evidences,{...options,codeOnly:true});check();
   if(found.single||found.confirmed)return {...found,evidences};
   // Shared footer enlargements help identify the family without seven OCR runs.
   const footers=[];
   for(const pass of [{region:[0,.82,1,.18],enhance:false},{region:[.55,.89,.45,.11],enhance:true}]){
    if(!timeLeft())break;onstage('Powiększam numer i oznaczenie serii…');const r=await read(image,pass);check();footers.push(...CardNeuralEvidence.crop(r).map(x=>({...x,source:'auto-footer-'+footers.length})));evidences=fromResult(result,footers);routes=classify(evidences);found=await resolve(evidences,{...options,codeOnly:true});check();if(found.single||found.confirmed)return {...found,evidences};
   }
   const detectedLanguage=CardPokemonAsian.languageHint(evidences.pokemon.full,language);
   if(CardPokemonAsian.supports(detectedLanguage)&&detectedLanguage!==language){const asian=await readAsian(image,detectedLanguage,onstage);check();if(asian.cards.length)return asian;}
   // Preserve the precise portrait-footer pass for small SWU collector numbers.
   if(routes.some(r=>r.game==='swu')&&CardSWUScan.isPortrait(image))for(const pass of CardSWUScan.getFooterPasses(image).slice(0,2)){
    if(!timeLeft())break;onstage('Odczytuję mały numer Star Wars…');const r=await read(image,pass);check();footers.push(...CardNeuralEvidence.crop(r).map(x=>({...x,source:'auto-swu-footer'})));evidences=fromResult(result,footers);routes=classify(evidences);found=await resolve(evidences,{...options,codeOnly:true});check();if(found.single)return {...found,evidences};
   }
   // When a family is visible, reuse its established precise reader.
   const ws=routes.find(r=>(r.game==='weiss'||r.game==='weiss-jp')&&r.score>=70);
   if(ws&&timeLeft()){if(classic){CardScanRuntime.untrack(classic);await classic.terminate();classic=null;}const targets=routes.filter(r=>family(r.game)==='weiss'&&r.score===ws.score).map(r=>r.game);const rows=[];
    for(const game of targets){check();let reader=wsReaders.get(game);if(!reader){reader=CardWeissScan.createReader(game,()=>!closed&&valid());wsReaders.set(game,reader);}
     let r;try{r=await reader.scan(image,{search:options.search,getNames:()=>getNames(game),deep,onstage});}finally{await reader.close();wsReaders.delete(game);}check();evidences[game]=r.evidence;
     if(r.result?.sources?.length){const unique=new Map();for(const s of r.result.sources)for(const c of s.data.cards)unique.set(c.id,c);const one=r.result.mode==='code'&&CardMTGScan.singleResult(r.result.sources,r.evidence);for(const c of unique.values())rows.push({card:{...c,_autoGame:game,_autoLanguage:game==='weiss-jp'?'ja':'en'},exact:r.result.mode==='code',incomplete:!one,score:r.result.mode==='code'?1000:160});}
    }if(rows.length)return {...finish(rows,routes),evidences};
   }
   found=await resolve(evidences,options);check();if(found.cards.length)return {...found,evidences};
   // Japanese titles require the Japanese model, not Latin OCR gibberish.
   if(!timeLeft())return {...found,evidences,limited:true,note:found.cards.length?found.note:'Nie potwierdzono karty. Zbliż numer albo wybierz „Dokładniejszy odczyt”.'};
   if(language!=='ja'&&!japanese(evidences.pokemon.full)&&!routes.some(r=>r.game==='weiss-jp'))return {...found,evidences};
   onstage('Sprawdzam również japońskie nazwy…');
   try{const jp=await read(image,{language:'ja',maxSide:1800});check();const je=fromResult(jp,footers);for(const g of games)je[g].numbers.push(...evidences[g].numbers);
    found=await resolve(je,{...options,language:'ja'});check();if(found.cards.length)return {...found,evidences:je};
    if(japanese(je.pokemon.names.map(x=>x.text).join(' '))){const index=await getPokemon('ja');check();if(!jpReader)jpReader=await CardPokemonJP.createReader(()=>!closed&&valid());const pe=await jpReader.read(image,index,{onstage:()=>onstage('Porównuję japońską nazwę Pokémon…')});check();const ranked=rankPokemon(index.cards,index.sets,pe),rows=ranked.filter(r=>r.recognizedName||r.name>=.9).map(r=>({card:{...r.c,_pokemon:true,_set:r.set,gameKey:'pokemon',catalogLanguage:'ja',_autoGame:'pokemon',_autoLanguage:'ja'},exact:!!r.certain,incomplete:ranked.length!==1,score:r.certain?1000:160}));if(rows.length)return {...finish(rows,routes),evidences:je};}
   }catch(err){check();}
   return {...found,evidences};
  }};
 }
 return Object.freeze({games,labels,fromResult,classify,resolve,finish,createReader,tesseractResult});
})();
