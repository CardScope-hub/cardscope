/* Private, user-entered transaction facts. No marketplace requests or imported prices. */
globalThis.CardGradeSales=(()=>{
 const grades=[10,9,8],currencies=['PLN','EUR','USD'],kinds=['purchase','sale'];
 const lang=v=>({en:'en',Angielski:'en',ja:'ja',jp:'ja','Japoński':'ja'})[v]||v||'';
 const catalogId=c=>c.catalogId||(c.gameKey?c.id:null);
 const game=c=>c.catalogGame||c.gameKey||c.game||'';
 const language=c=>lang(c.catalogLanguage||c._autoLanguage||c.language);
 const variant=(c,v)=>String(v||c.variant||'Nieustalony');
 function same(card,saved,v){
  if(variant(card,v)!==variant(saved))return false;
  if(card.id===saved.id&&!card.gameKey)return scope({...card,variant:variant(card,v)})===scope(saved);
  return !!(catalogId(card)&&catalogId(saved)&&catalogId(card)===catalogId(saved)&&game(card)===game(saved)&&language(card)===language(saved));
 }
 function scope(card){return JSON.stringify([game(card),catalogId(card)||card.id,language(card),variant(card)]);}
 function today(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
 function safeURL(value){if(!value)return '';if(typeof value!=='string'||value.length>2048)throw Error('Link jest za długi.');try{const u=new URL(value);if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;}catch{}throw Error('Podaj poprawny link HTTPS bez danych logowania.');}
 function normalize(input){
  if(!input||!grades.includes(input.grade))throw Error('Wybierz ocenę PSA 10, 9 lub 8.');
  if(!Number.isFinite(input.amount)||input.amount<0.01||input.amount>10000000)throw Error('Podaj kwotę od 0,01 do 10 000 000.');
  if(!currencies.includes(input.currency))throw Error('Wybierz walutę PLN, EUR lub USD.');
  if(!kinds.includes(input.kind))throw Error('Wybierz własny zakup lub własną sprzedaż.');
  const date=input.date;
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||date<'1900-01-01'||date>today())throw Error('Podaj prawidłową datę zakończonej transakcji, nie późniejszą niż dziś.');
  return {grade:input.grade,amount:Math.round(input.amount*100)/100,currency:input.currency,kind:input.kind,date,url:safeURL(input.url)};
 }
 function records(card){const key=scope(card);return (Array.isArray(card.gradedSales)?card.gradedSales:[]).filter(r=>{try{return r.scope===key&&typeof r.id==='string'&&/^[\w-]{1,100}$/.test(r.id)&&!!normalize(r);}catch{return false}}).sort((a,b)=>b.date.localeCompare(a.date)||String(b.recordedAt||'').localeCompare(String(a.recordedAt||''))||b.id.localeCompare(a.id));}
 function latest(card,grade){return records(card).find(r=>r.grade===grade)||null;}
 function amount(text){if(!/^\d+(?:[.,]\d{1,2})?$/.test(String(text).trim()))throw Error('Podaj kwotę, np. 120,50 (maksymalnie dwa miejsca po przecinku).');return Number(String(text).trim().replace(',','.'));}
 return Object.freeze({grades,currencies,same,scope,today,safeURL,normalize,records,latest,amount});
})();
