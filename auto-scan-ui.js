// UI adapter: keep 'All games' selected after opening a detected card.
(() => {
 const $=id=>document.getElementById(id);
 function syncScanner(){const auto=currentGame()==='auto';$('auto-scan-hint').hidden=!auto;$('auto-scan-options').hidden=!auto;const guide=$('scan-guide');if(auto){guide.dataset.game='auto';guide.dataset.orientation=$('auto-orientation').value;}$('scan-engine-mode').disabled=auto;if(auto){$('scan-engine-mode').value='local';$('ai-engine-note').textContent='Wszystkie gry rozpoznajemy na urządzeniu. Zdjęcie nie jest wysyłane do usługi AI.';}else $('ai-engine-note').textContent=$('scan-engine-mode').value==='ai'?'Zdjęcie zostanie wysłane do OpenAI.':'Zdjęcie pozostaje na urządzeniu podczas odczytu.';if(!auto){$('auto-scan-help').hidden=true;$('live-auto-help').hidden=true;}}
 async function open(card,token){if(token!==scanId)return;const request=++scanId;status('Pobieram rozpoznane wydanie…');
  try{let c=card;if(card._pokemon){const lang=card._autoLanguage||card.catalogLanguage||'en';try{c={...card,...await catalogJSON('https://api.tcgdex.net/v2/'+lang+'/cards/'+encodeURIComponent(card.id)),catalogLanguage:lang,gameKey:'pokemon'};}catch{c={...card,set:card._set||card.set||{name:'',cardCount:{}},variants:card.variants||{},variantsList:card.variantsList||['Nieustalony']};}}
   if(request!==scanId)return;selectMatch(c);
  }catch(e){if(request===scanId){status(e.message||'Nie udało się otworzyć karty. Ponów skan.');$('auto-scan-help').hidden=false;}}
 }
 function present(result,token){if(token!==scanId)return;$('matches').replaceChildren();$('more-matches').hidden=true;$('scan-checks').hidden=true;
  for(const id of ['retry','catalog-submit','scan-classic'])$(id).disabled=false;$('processing').setAttribute('aria-busy','false');
  if(result.single){void open(result.single,token);return;}
  $('auto-scan-help').hidden=false;$('auto-fallback-game').value='';
  for(const c of result.cards||[]){const b=node('button',undefined,'match-choice');b.type='button';CardPokemonArt.thumbnail(b,c._pokemon?{...c,catalogLanguage:c._autoLanguage}:c);const info=node('span');info.append(node('b',c.name),node('small',[CardAutoScan.labels[c._autoGame],c._set?.name||c.set?.name,c.localId,c.rarity].filter(Boolean).join(' · ')));b.append(info);b.onclick=()=>void open(c,token);$('matches').append(b);}
  status(result.note||'Porównaj ilustrację i numer karty.');$('catalog-count').textContent=(result.cards?.length||0)+' propozycji · wszystkie gry';
 }
 async function recognize({classic=false}={}){if(!photo)return;CardScanner.cancel();prepareLookup();const token=++scanId;let reader;$('auto-scan-help').hidden=true;$('processing').setAttribute('aria-busy','true');for(const id of ['retry','catalog-submit','scan-classic'])$(id).disabled=true;
  try{const image=new Image();image.src=photo;await image.decode();if(token!==scanId)return;reader=CardAutoScan.createReader(()=>token===scanId,{preferClassic:classic});const result=await reader.scan(image,{language:selectedLanguage(),onstage:t=>{if(token===scanId)status(t);}});if(token!==scanId)return;
   $('scan-readout').textContent=result.evidences?.pokemon?.full||'Brak czytelnego tekstu.';present(result,token);
  }catch(e){if(token===scanId&&e.name!=='AbortError'){status('Nie udało się odczytać karty. '+(e.message||'Spróbuj ponownie przy lepszym świetle.'));$('auto-scan-help').hidden=false;}}
  finally{await reader?.close();if(token===scanId){for(const id of ['retry','catalog-submit','scan-classic'])$(id).disabled=false;$('processing').setAttribute('aria-busy','false');}}
 }
 $('auto-fallback-retry').onclick=()=>{const game=$('auto-fallback-game').value;if(!game){$('auto-fallback-game').focus();return;}scanId++;CardScanner.cancel();setGame(game);if(photo)void globalThis.CardAutoScanUI.retrySelected();else openScanner();};
 $('auto-orientation').onchange=()=>{scanId++;globalThis.CardLiveScan?.stop();CardScanner.cancel();syncScanner();$('live-results').replaceChildren();$('live-status').textContent='Ustaw kartę w nowej ramce i uruchom skan.';};
 $('live-auto-help').onclick=()=>{document.querySelector('.scanner-config').open=true;$('scan-game').scrollIntoView({block:'center'});$('scan-game').focus();};
 globalThis.CardAutoScanUI={syncScanner,present,open,recognize,retrySelected:()=>recognizeSelected()};
 // Resolve the global entry point at click time, after all modules have loaded.
 function recognizeSelected(){return globalThis.CardAutoRecognizeSelected();}
 syncScanner();
})();
