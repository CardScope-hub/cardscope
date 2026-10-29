async function detectCardText(image,token){return CardScanRuntime.read(image,{onstage(stage){if(token!==scanId)return;status(stage==='loading'?'1 / 3 · Ładuję lokalny silnik. Pierwszy skan może potrwać dłużej…':'2 / 3 · Odczytuję nazwę i numer karty…')}})}
function scanIsCertain(game,evidence,index){
 if(game==='pokemon')return rankScanCatalog(index.cards,index.sets,evidence).some(x=>x.certain);
 return CardScanIndex.suggest(index,evidence).length>0&&CardScanIndex.numbers(game,evidence).some(x=>x.code&&!x.uncertain);
}
async function refineScan(image,game,evidence,index,valid,onstage=()=>{}){
 if(!['pokemon','riftbound'].includes(game)||scanIsCertain(game,evidence,index))return evidence;
 const passes=[{kind:'numbers',region:[0,.78,1,.22],enhance:false},{kind:'names',region:game==='pokemon'?[0,0,1,.25]:[0,.34,1,.4],enhance:false},{kind:'numbers',region:[0,.84,1,.16],enhance:true}];
 for(const pass of passes){if(!valid())throw new DOMException('Anulowano','AbortError');onstage(pass.kind);const r=await CardScanRuntime.read(image,pass);if(!valid())throw new DOMException('Anulowano','AbortError');evidence[pass.kind].push(...CardNeuralEvidence.crop(r));if(scanIsCertain(game,evidence,index))break}
 return evidence;
}
async function recognizeNeural(){if(!photo)return;CardScanner.cancel();prepareLookup();const token=++scanId,game=currentGame(),lang=selectedLanguage();for(const id of ['retry','catalog-submit','scan-classic'])$(id).disabled=true;$('processing').setAttribute('aria-busy','true');status('1 / 3 · Przygotowuję odczyt…');
 const catalog=(game==='pokemon'?getCatalog(lang):scanDictionary(game)).then(value=>({value}),error=>({error}));let fallback=false;
 try{const image=new Image();image.src=photo;await image.decode();if(token!==scanId)return;let result;try{result=await detectCardText(image,token)}catch(e){if(e.name==='AbortError')throw e;fallback=true;throw e}if(token!==scanId)return;
  const evidence=CardNeuralEvidence.fromResult(game,result);$('scan-readout').textContent=evidence.full||'Nie odczytano tekstu.';const index=await catalog;if(token!==scanId)return;if(index.error)throw index.error;
  try{await refineScan(image,game,evidence,index.value,()=>token===scanId,kind=>status(kind==='numbers'?'2 / 3 · Odczytuję numer w powiększeniu…':'2 / 3 · Sprawdzam nazwę w powiększeniu…'))}catch(e){if(e.name==='AbortError')throw e;evidence.numberReadFailed=true}
  if(game==='weiss'){try{await readWeissNumbers(image,evidence,token)}catch(e){if(token!==scanId)return;evidence.numberReadFailed=true}}
  if(token!==scanId)return;$('scan-readout').textContent=[...evidence.names,...evidence.numbers].map(x=>x.text).join('\n');status('3 / 3 · Porównuję odczyt z katalogiem…');await resolveScanEvidence(game,lang,evidence,index.value,token);
 }catch(e){if(token===scanId&&e.name!=='AbortError'){if(fallback){status('Przełączam na zapasowy odczyt na urządzeniu…');return recognizeClassic()}status(e.message||'Nie udało się odczytać karty.')}}finally{if(token===scanId){for(const id of ['retry','catalog-submit','scan-classic'])$(id).disabled=false;$('processing').setAttribute('aria-busy','false')}}
}
$('scan-classic').onclick=()=>{CardScanner.cancel();void recognizeClassic()};
async function resolveScanEvidence(game,lang,evidence,index,token){
 if(game==='pokemon'){const ranked=rankScanCatalog(index.cards,index.sets,evidence);$('catalog-count').textContent=index.cards.length.toLocaleString('pl-PL')+' kart · '+index.sets.length+' serii';$('catalog-query').value=ranked[0]?.c.name||CardScanText.names(evidence)[0]||'';$('scan-checks').hidden=false;$('scan-name-check').textContent='Nazwa: '+(ranked[0]?.c.name||'niepotwierdzona');const read=readEvidence(evidence.numbers.map(x=>x.text).join('\n'));$('scan-number-check').textContent='Odczyt numeru: '+(read.numbers.map(x=>x.local+(x.total?'/'+x.total:'')).join(' · ')||'niepotwierdzony');await presentCandidates(ranked,lang,token,true)}
 else await lookupOtherEvidence(game,evidence,index,token);
}
