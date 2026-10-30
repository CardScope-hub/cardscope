// Shared local engine, one frame at a time; selecting a candidate never saves it automatically.
(()=>{let enabled=false,generation=0,classic=null,japaneseReader=null,usingClassic=false;const toggle=$('live-toggle'),label=$('live-status'),results=$('live-results');if(!toggle)return;
 const valid=(g,game,lang)=>enabled&&g===generation&&document.body.dataset.view==='scanner'&&currentGame()===game&&selectedLanguage()===lang&&!document.hidden;
 function stop(){const wasRunning=enabled;enabled=false;generation++;toggle.textContent='◉ Włącz skan na żywo';classic=null;const previous=japaneseReader;japaneseReader=null;void previous?.close();usingClassic=false;if(wasRunning)CardScanRuntime.cancel()}
 async function fallback(canvas,game,lang,isValid){if(!classic){await loadOCR();if(!isValid())throw new DOMException('Anulowano','AbortError');const w=await Tesseract.createWorker(game==='weiss-jp'?'jpn+eng':catalogLanguages[lang]?.ocr||'eng',1);if(!isValid()){await w.terminate();throw new DOMException('Anulowano','AbortError')}classic=CardScanRuntime.track(w);await classic.setParameters({tessedit_pageseg_mode:'11'})}const {data}=await classic.recognize(canvas,{}, {text:true,blocks:true});return CardNeuralEvidence.fromTesseract(game,data,canvas.width,canvas.height)}
 async function find(game,lang,evidence,index){
  if(game==='pokemon')return rankScanCatalog(index.cards,index.sets,evidence).slice(0,lang==='ja'?Infinity:4).map(x=>({...x.c,_pokemon:true,_set:x.set}));
  const suggestions=CardScanIndex.suggest(index,evidence),numbers=CardScanIndex.numbers(game,evidence),queries=[...numbers.filter(x=>x.code).map(x=>({q:x.query||x.value,ocr:'1'})),...suggestions.slice(0,2).map(x=>({q:CardScanIndex.aliases(x.name)[0],ocr:'1'}))];
  if(game==='riftbound')queries.push(...numbers.filter(x=>!x.code&&x.total).slice(0,1).map(x=>({q:x.value+'/'+x.total,ocr:'0'})));
  if(!queries.length)queries.push(...CardScanText.queries(game,evidence).slice(0,2).map(x=>({q:x.q,ocr:'1'})));
  const unique=new Map();for(const q of queries.slice(0,4)){const data=await otherJSON({game,...q});for(const c of data.cards||[])unique.set(c.id,c)}
  return CardScanIndex.rank(game,[...unique.values()],evidence).slice(0,4).map(x=>x.card);
 }
 function renderFound(found,{g,game,lang,evidence,index}){
results.replaceChildren();for(const c of found.slice(0,4)){const button=node('button'),im=node('img');button.type='button';CardPokemonArt.thumbnail(button,c._pokemon?{...c,catalogLanguage:lang}:c);button.append(node('span',c.name),node('small',[c._set?.name||c.set?.name,c.localId].filter(Boolean).join(' · ')));
     button.onclick=async()=>{if(!valid(g,game,lang))return;stop();const choice=++scanId;label.textContent='Pobieram wybrane wydanie…';try{let selected=c;if(c._pokemon){try{selected={...c,...await catalogJSON('https://api.tcgdex.net/v2/'+lang+'/cards/'+encodeURIComponent(c.id)),catalogLanguage:lang}}catch{selected={...c,set:c._set||{name:'',cardCount:{}},variants:{},variantsList:['Nieustalony'],catalogLanguage:lang}}}if(choice!==scanId||document.body.dataset.view!=='scanner')return;photo=null;selectMatch(selected)}catch(e){if(choice===scanId)message(e.message)}};results.append(button)}
 if(game==='pokemon'&&lang==='ja'&&found.length>4){const all=node('button');all.type='button';all.className='live-all-editions';all.append(node('span','Zobacz wszystkie wydania'),node('small',found.length+' kart · wybierz ilustrację'));all.onclick=()=>{if(!valid(g,game,lang))return;const ranked=rankScanCatalog(index.cards,index.sets,evidence);stop();photo=null;prepareLookup();const token=++scanId;$('catalog-query').value=ranked[0]?.recognizedName||'';$('catalog-language').value=lang;void presentCandidates(ranked,lang,token,false)};results.append(all)}
 }
 async function start(){if(enabled)return;enabled=true;const g=++generation,game=currentGame(),lang=selectedLanguage();toggle.textContent='■ Zatrzymaj podgląd';results.replaceChildren();label.textContent='Przygotowuję katalog i lokalny odczyt…';
  try{const index=game==='pokemon'?await getCatalog(lang):await scanDictionary(game);if(!valid(g,game,lang))return;usingClassic=game==='weiss-jp'||game==='pokemon'&&lang!=='en';let misses=0;
   while(valid(g,game,lang)){const canvas=captureCanvas(2000);if(!canvas){label.textContent='Najpierw uruchom aparat.';break}for(const button of results.querySelectorAll('button'))button.disabled=true;label.textContent='Odczytuję kartę — trzymaj ją w ramce.';let evidence;
    if(!usingClassic)try{const r=await CardScanRuntime.read(canvas,{onstage:s=>{if(valid(g,game,lang)&&s==='loading')label.textContent='Pierwszy odczyt: pobieram i uruchamiam modele…'}});evidence=CardNeuralEvidence.fromResult(game,r)}catch(e){if(!valid(g,game,lang))break;usingClassic=true;label.textContent='Uruchamiam zapasowy odczyt na urządzeniu…'}
    if(!valid(g,game,lang))break;if(usingClassic){if(game==='pokemon'&&lang==='ja'){if(!japaneseReader)japaneseReader=await CardPokemonJP.createReader(()=>valid(g,game,lang));evidence=await japaneseReader.read(canvas,index,{onstage:kind=>{if(valid(g,game,lang))label.textContent=kind==='loading'?'Wczytuję japoński odczyt nazw…':kind==='names'?'Szukam nazwy w górnej części kadru…':kind==='fallback'?'Sprawdzam nazwę odczytem rezerwowym…':'Nazwa rozpoznana — numer jest opcjonalny.';},onname:e=>{if(!valid(g,game,lang))return;const rows=rankScanCatalog(index.cards,index.sets,e);renderFound(rows.map(x=>({...x.c,_pokemon:true,_set:x.set})),{g,game,lang,evidence:e,index});label.textContent='Rozpoznano: '+[...new Set(rows.map(x=>x.recognizedName))].join(' / ')+'. Możesz już wybrać wydanie.';}})}else evidence=await fallback(canvas,game,lang,()=>valid(g,game,lang));}if(!valid(g,game,lang))break;
    if(!usingClassic&&['pokemon','riftbound'].includes(game)&&!scanIsCertain(game,evidence,index)){
     const r=await CardScanRuntime.read(canvas,{region:[0,.78,1,.22],enhance:misses%2===1});if(!valid(g,game,lang))break;evidence.numbers.push(...CardNeuralEvidence.crop(r));
    }
    const found=await find(game,lang,evidence,index);if(!valid(g,game,lang))break;misses=found.length?0:misses+1;
    renderFound(found,{g,game,lang,evidence,index});
    label.textContent=found.length?(game==='pokemon'&&lang==='ja'?'Nazwa rozpoznana. Wybierz ilustrację i wydanie.':'Wybierz zgodną ilustrację i numer.'):evidence.engineError?'Japoński odczyt nie uruchomił się. Zatrzymaj skan, sprawdź połączenie i spróbuj ponownie.':'Nie udało się odczytać nazwy. Ustaw kartę prosto i usuń odblaski.';await new Promise(r=>setTimeout(r,1200));
   }
  }catch(e){if(g===generation)label.textContent=e.message||'Odczyt przerwany. Możesz ponowić skan.'}finally{if(g===generation)stop()}
 }
 toggle.onclick=()=>enabled?stop():start();const original=stopCamera;stopCamera=function(){stop();original()};for(const id of ['scan-game','scan-language'])$(id).addEventListener('change',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 globalThis.CardLiveScan={stop,find};
})();
