// Cost is per physical copy, independent of the market quote and its history.
globalThis.CardPurchase=(()=>{
 const currencies=['PLN','EUR','USD'];
 function parse(raw,currency,recordedAt=new Date().toISOString()){
  const text=String(raw??'').trim().replace(',','.');if(!text)return null;
  if(!/^\d+(\.\d{1,2})?$/.test(text))throw Error('Wpisz cenę zakupu, np. 30,50, lub pozostaw pole puste.');
  const amount=Number(text);if(!Number.isFinite(amount)||amount<0||amount>10000000||!currencies.includes(currency)||!Number.isFinite(Date.parse(recordedAt)))throw Error('Sprawdź kwotę i walutę zakupu.');
  return {amount:Math.round(amount*100)/100,currency,recordedAt};
 }
 function read(value){if(!value||typeof value.amount!=='number'||!Number.isFinite(value.amount)||value.amount<0||value.amount>10000000||!currencies.includes(value.currency))return null;return {amount:value.amount,currency:value.currency,recordedAt:value.recordedAt||null};}
 function quote(card){return Number.isFinite(card?.price)&&card.price>=0?{amount:card.price,currency:card.priceCurrency||'EUR',at:card.priceUpdated||null,source:card.priceSource||'Zapisana wycena'}:null;}
 const round=n=>Math.round((n+Number.EPSILON)*100)/100;
 function compare(purchase,current,qty=1,fx=globalThis.CardCurrency){
  const p=read(purchase);if(!p)return {reason:'cost'};
  if(!current||!Number.isFinite(current.amount)||current.amount<0)return {reason:'quote'};
  if(!Number.isInteger(qty)||qty<1)return {reason:'quantity'};
  const currency=fx?.selected||p.currency;
  const convert=(n,c)=>c===currency?n:fx?.convert(n,c,currency)??null;
  const cost=convert(p.amount,p.currency),value=convert(current.amount,current.currency);
  if(cost===null||value===null||!Number.isFinite(cost)||!Number.isFinite(value))return {reason:'fx'};
  const unit=round(value-cost),total=round((value-cost)*qty);
  return {currency,cost:round(cost),value:round(value),unit,total,qty,percent:cost>0?(value-cost)/cost*100:null};
 }
 function aggregate(rows,fx=globalThis.CardCurrency){
  let total=0,cost=0,value=0,covered=0,missingCost=0,missingQuote=0,missingFx=0,currency=fx?.selected||null;
  for(const row of rows){const n=row.qty||1,r=compare(row.purchase,row.quote,n,fx);if(r.reason){if(r.reason==='cost')missingCost+=n;else if(r.reason==='fx')missingFx+=n;else missingQuote+=n;continue}if(currency&&currency!==r.currency){missingFx+=n;continue}currency=r.currency;total+=r.total;cost+=r.cost*n;value+=r.value*n;covered+=n;}
  return {total:round(total),cost:round(cost),value:round(value),currency,covered,missingCost,missingQuote,missingFx};
 }
 function format(n,currency,signed=false){return (signed&&n>0?'+':'')+new Intl.NumberFormat('pl-PL',{style:'currency',currency}).format(Object.is(n,-0)?0:n);}
 const reasons={cost:'Uzupełnij cenę zakupu.',quote:'Brak wyceny — zysk/strata niedostępne.',fx:'Brak kursu walut do porównania.',quantity:'Brak liczby kopii.'};
 return Object.freeze({parse,read,quote,compare,aggregate,format,currencies,reasons});
})();
