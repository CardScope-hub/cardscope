// One quantity per saved collection record. Binder pockets remain individual copies.
globalThis.CardCopies=(()=>{
 const get=id=>document.getElementById(id),MAX=999;
 let owned=[],albums=[],busyId=null,generation=0,binderCardId=null,binderId=null;
 const language=c=>c.catalogLanguage||({Angielski:'en',Japoński:'ja',Niemiecki:'de',Francuski:'fr',Hiszpański:'es',Włoski:'it',Portugalski:'pt-br'}[c.language])||'';
 const normalize=s=>String(s||'').trim().toLocaleLowerCase('pl');
 function samePrinting(saved,c,variant){return !!c&&saved.catalogId===c.id&&(saved.catalogGame||'pokemon')===(c.gameKey||'pokemon')&&language(saved)===(language(c)||'en')&&normalize(saved.variant)===normalize(variant)}
 function placements(ids){const set=new Set(ids);return albums.map(b=>({id:b.id,name:b.name,count:b.slots.filter(id=>id&&set.has(id)).length})).filter(b=>b.count)}
 function minimum(id){return Math.max(1,...placements([id]).map(b=>b.count))}
 function countText(n){return n+' szt.'}
 function albumText(ids){const found=placements(ids);return found.length?'W binderach: '+found.map(b=>b.name+' ('+countText(b.count)+')').join(' · '):'Ta karta nie jest jeszcze ułożona w binderze.'}
 function mount(prefix){const root=get(prefix+'-copies');if(!root)return;root.querySelectorAll('[data-copy-step]').forEach(button=>button.addEventListener('click',()=>{
  const step=Number(button.dataset.copyStep);
  if(prefix==='result'){const field=get('qty'),qty=Number(field.value);field.value=String(Math.min(MAX,Math.max(1,(Number.isInteger(qty)?qty:1)+step)));field.dispatchEvent(new Event('input',{bubbles:true}));refreshScan()}
  else void change(prefix==='detail'?detailCard?.id:binderCardId,step);
 }))}
 function setControls(prefix,qty,min=1,disabled=false){const root=get(prefix+'-copies');if(!root)return;get(prefix+'-copies-value').textContent=Number.isInteger(qty)?String(qty):'—';root.querySelector('[data-copy-step="-1"]').disabled=disabled||qty<=min;root.querySelector('[data-copy-step="1"]').disabled=disabled||qty>=MAX;root.setAttribute('aria-busy',String(!!busyId&&prefix!=='result'))}
 function refreshScan(){
  if(!get('result-copies'))return;
  const qty=Number(get('qty').value),valid=Number.isInteger(qty)&&qty>=1&&qty<=MAX;
  setControls('result',valid?qty:1,1,get('save').disabled);
  const found=owned.filter(c=>samePrinting(c,matched,get('variant').value)),total=found.reduce((n,c)=>n+c.qty,0);
  get('result-copies-owned').textContent=total?'Masz już '+countText(total)+' tego wydania i wariantu w kolekcji.':'Tego wydania i wariantu nie ma jeszcze w kolekcji.';
  get('result-copies-albums').textContent=total?albumText(found.map(c=>c.id)):'';
  const button=get('result-copies-open');button.hidden=!found.length;button.textContent=found.length===1?'Zmień liczbę posiadanych kopii ↗':'Pokaż posiadane kopie ↗';
  button.onclick=()=>{if(found.length===1){const current=owned.find(c=>c.id===found[0].id);if(current)openDetail(current)}else{get('search').value=matched?.name||'';show('collection')}};
  const price=matched?.selectedOffer;get('result-copies-total').textContent=price&&valid?'Wartość '+countText(qty)+': '+money(price.amount*qty,price.currency):'';
 }
 function renderSaved(prefix,id){
  const c=owned.find(c=>c.id===id),min=minimum(id);setControls(prefix,c?.qty,min,!!busyId||!c);
  const note=get(prefix+'-copies-note');
  if(!c){note.textContent='Karta nie jest dostępna w kolekcji.';return}
  const inAlbum=prefix==='binder'?placements([id]).find(b=>b.id===binderId):null;
  note.textContent=(prefix==='binder'?'W tym binderze: '+countText(inAlbum?.count||0)+'. Nowe kopie ułożysz przez „Dodaj karty”.':albumText([id]))+(c.qty<=min&&min>1?' Aby zmniejszyć liczbę kopii, najpierw wyjmij odpowiednie karty z bindera.':'');
 }
 function refresh(){
  if(document.body.dataset.view==='scan-result')refreshScan();
  if(document.body.dataset.view==='detail'){
   const current=owned.find(c=>c.id===detailCard?.id);if(current){detailCard=current;get('detail-quantity').textContent=countText(current.qty);renderDetailPricing()}
   renderSaved('detail',detailCard?.id);
  }
  if(get('b-slot-dialog')?.open)renderSaved('binder',binderCardId);
 }
 async function change(id,step){
  if(!id||busyId)return;const token=generation;busyId=id;refresh();
  const prefix=get('b-slot-dialog')?.open?'binder':'detail',status=get(prefix+'-copies-status');status.textContent='Zapisuję liczbę kopii…';
  try{await CardStore.changeQuantity(id,step);if(token===generation)status.textContent='Liczba kopii zapisana. Status synchronizacji znajdziesz u góry aplikacji.'}
  catch(e){if(token===generation)status.textContent=e.message||'Nie udało się zapisać liczby kopii. Spróbuj ponownie.'}
  finally{if(token===generation){busyId=null;refresh()}}
 }
 function enter(view){if(view==='scan-result')refreshScan();if(view==='detail'){get('detail-copies-status').textContent='';renderSaved('detail',detailCard?.id)}}
 function binder(card,id){binderCardId=card?.id||null;binderId=id;get('binder-copies-status').textContent='';renderSaved('binder',binderCardId)}
 for(const prefix of ['result','detail','binder'])mount(prefix);
 get('qty').addEventListener('input',refreshScan);get('qty').addEventListener('change',refreshScan);
 get('variant').addEventListener('change',refreshScan);
 globalThis.CardCloud?.subscribe('card',next=>{owned=next;refresh()});
 globalThis.CardCloud?.subscribe('binder',next=>{albums=next;refresh()});
 window.addEventListener('cardscope:account-change',()=>{generation++;busyId=null;owned=[];albums=[];binderCardId=null;binderId=null;for(const p of ['detail','binder'])get(p+'-copies-status').textContent='';refresh()});
 return Object.freeze({enter,binder,refreshScan,refresh,samePrinting});
})();
