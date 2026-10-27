(()=>{
 let destination=null,mode='scan';
 const allowed=new Set(['edit','scanner','processing','scan-result']);
 function labels(){
  $('add-destination').hidden=!destination||!allowed.has(document.body.dataset.view);
  $('add-destination-text').textContent=destination?'Dodajesz do: '+destination.name:'';
  $('result-save').textContent=destination?'＋ Dodaj do bindera i kolekcji':'＋ Dodaj do kolekcji';
 }
 function lookup(scanning){
  document.body.dataset.lookupMode=scanning?'scan':'catalog';
  $('lookup-title').textContent=scanning?'Odkrywamy Twoją kartę':'Znajdź dowolną kartę.';
  $('lookup-description').textContent=scanning?'Odczytujemy nazwę i numer, a następnie sprawdzamy ich zgodność z bazą kart.':'Wybierz grę i wpisz nazwę lub numer. Przeszukujesz pełną bazę — karta nie musi być w Twojej kolekcji. Wybierz właściwe wydanie i dodaj je.';
 }
 function catalog(){prepareLookup();scanId++;$('catalog-panel').open=true;$('catalog-submit').disabled=false;$('catalog-query').focus();status('Wpisz nazwę lub numer karty. Wybierz wynik, aby go dodać.');}
 function start(next,target=null){destination=target;mode=next;begin();$('catalog-query').value='';$('catalog-count').textContent='';if(mode==='catalog')catalog();else openScanner();labels();}
 function cancel(){const target=destination;destination=null;labels();if(target)CardBinders.open(target.id);else show('collection');}
 globalThis.CardAddFlow={start,lookup,enter(view){if(!allowed.has(view))destination=null;labels()},async afterSave(card){
  if(!destination)return false;const target=destination;destination=null;labels();
  try{await CardBinders.addSaved(card,target);message('Karta dodana do bindera i kolekcji.');}
  catch(error){openDetail(card);message('Karta jest już w kolekcji, ale nie udało się dodać jej do bindera. '+error.message);}
  return true;
 }};
 $('open-catalog').onclick=()=>start('catalog');
 $('add').textContent='＋ Znajdź kartę w bazie';$('add').onclick=()=>start('catalog');
 $('take').onclick=()=>start('scan');$('collection-scan').onclick=()=>start('scan');
 $('add-cancel').onclick=cancel;
 $('processing-back').onclick=cancel;
 $('result-back').onclick=()=>mode==='catalog'?catalog():openScanner();
})();
// Read prices without changing the active scanner or selected catalog card.
globalThis.CardPriceLookup=async card=>{
 if(card.catalogGame==='weiss-jp')return null; // Never substitute an English edition's quote.
 const currency=card.priceCurrency||'EUR',at=new Date().toISOString();let data;
 if(card.catalogGame==='pokemon'||!card.catalogGame)data=await catalogJSON('https://api.tcgdex.net/v2/'+(card.catalogLanguage||'en')+'/cards/'+encodeURIComponent(card.catalogId));
 else if(card.catalogGame==='weiss')data=(await otherJSON({game:'weiss',id:card.catalogId})).card;
 else if(card.catalogGame==='mtg')data=(await otherJSON({game:'mtg',id:card.catalogId})).card;
 if(data&&currency==='EUR'&&card.priceSource!=='tcgplayer'){
  // Reverse holo has no distinct quote in this source; do not substitute holo.
  if(card.variant==='Reverse Holo')return null;
  const amount=marketMetric(data,card.variant,'trend');if(amount!==null)return {amount,currency,at:data.pricing?.cardmarket?.updated||at,source:card.catalogGame==='mtg'?'Scryfall / Cardmarket':'TCGdex / Cardmarket'};
 }
 let offers=data?.offers||[];
 const tcg=data?.pricing?.tcgplayer;
 if(tcg?.unit==='USD'){const key=({Normal:'normal',Holo:'holofoil',Foil:'holofoil','Reverse Holo':'reverseholofoil'})[card.variant],quote=tcg[key];if(quote?.productId&&Number.isFinite(quote.marketPrice))offers.push({amount:quote.marketPrice,currency:'USD',variant:card.variant,match:'exact',source:'TCGplayer',updated:tcg.updated,url:'https://www.tcgplayer.com/product/'+quote.productId});}
 if(!offers.length&&card.priceUrl){const response=await fetch('/api/market?'+new URLSearchParams({game:card.catalogGame,name:card.name,set:card.set,number:card.number}),{cache:'no-store',signal:AbortSignal.timeout(60000)});if(!response.ok)return null;offers=(await response.json()).offers||[];}
 const exact=offers.filter(o=>o.match==='exact'&&o.currency===currency&&offerVariant(o.variant)===offerVariant(card.variant)&&(!card.priceUrl||o.url===card.priceUrl));
 return exact.length===1?{amount:exact[0].amount,currency,at:exact[0].updated||at,source:exact[0].source}:null;
};
