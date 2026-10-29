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
// Same exact-printing price engine for scanner, saved cards and binders.
globalThis.CardPriceLookup=async card=>{const quote=await CardPrices.lookup(card);return quote?{amount:quote.amount,currency:quote.currency,at:quote.at,source:quote.source}:null};
