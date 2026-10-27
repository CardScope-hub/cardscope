/* In-app rules translation. Never uses model endpoints, API keys or old AI caches. */
(function(root){
 const el=id=>document.getElementById('learn-'+id),manualKey='cardscope-learning-manual-v1',cacheKey='cardscope-learning-catalog-v1';
 let last=null,options=[],active=null,token=0,controller=null;
 const gameNames={'Pokémon':'pokemon','Magic: The Gathering':'mtg','One Piece':'onepiece','Riftbound':'riftbound','Weiß Schwarz':'weiss'};
 function reference(c){if(!c||['mlp','mlp-eternal'].includes(c.catalogGame||c.gameKey))return null;const id=c.catalogId||(!c.createdAt?c.id:null),game=c.catalogGame||c.gameKey||gameNames[c.game]||'pokemon';return id&&['pokemon','mtg','onepiece','riftbound','weiss','weiss-jp'].includes(game)?{id,game,name:c.name,lang:c.catalogLanguage||'en'}:null;}
 function add(tag,text,parent,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;}
 function read(key){try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value.filter(x=>x&&typeof x==='object'):[];}catch{return [];}}
 const identity=(card,b,i)=>JSON.stringify([card.game,card.id,card.language||'en',i,b.text]);
 function manual(card,b,i){return read(manualKey).find(x=>x.key===identity(card,b,i))?.text||'';}
 function remember(card){try{const all=read(cacheKey).filter(x=>x.game!==card.game||x.id!==card.id||x.language!==card.language);localStorage.setItem(cacheKey,JSON.stringify([card,...all].slice(0,20)));}catch{}}
 function render(card){
  el('name').textContent=card.name;el('source').textContent=card.source;el('source').href=card.sourceUrl;el('note').textContent=card.note||'Tekst wybranego wydania z katalogu. Sprawdź aktualne erraty w źródle.';
  el('effects').replaceChildren();let known=0,total=0,own=0;
  card.blocks.forEach((b,i)=>{
   const segments=b.segments?.length?b.segments:(b.text?[{text:b.text,translation:b.translation}]:[]),saved=manual(card,b,i),count=segments.filter(s=>s.translation).length;
   known+=saved?segments.length:count;total+=segments.length;if(saved)own++;
   const box=add('article','',el('effects'),'learn-effect');add('h3',b.label,box);if(b.meta)add('p',b.meta,box,'fine');
   const badge=add('span',saved?'TWÓJ ZAPIS · PL':segments.length&&count===segments.length?'POLSKI · REGUŁY':count?'TŁUMACZENIE CZĘŚCIOWE':'ORYGINAŁ + SŁOWNIK',box,'learn-badge');badge.dataset.state=saved||count===segments.length&&segments.length?'complete':'partial';
   if(saved)add('p',saved,box,'learn-translation');
   else for(const s of segments){if(s.translation)add('p',s.translation,box,'learn-translation');else {const item=add('div','',box,'learn-untranslated');add('small','Fragment bez pełnego tłumaczenia',item);add('p',s.text,item,'learn-original');}}
   if(!segments.length)add('p','Źródło nie zawiera tekstu dodatkowego działania dla tego wydania. Nie odtwarzamy go z nazwy ani ilustracji.',box,'fine');
   if(b.text){const original=add('details','',box,'learn-original-box');add('summary','Porównaj z całym oryginałem',original);add('p',b.text,original,'learn-original');}
   if(b.glossary?.length){const dictionary=add('details','',box,'learn-glossary');add('summary','Pojęcia z tego tekstu · '+b.glossary.length,dictionary);add('p','Objaśnienia pojęć nie zastępują pełnego efektu ani jego warunków.',dictionary,'fine');for(const g of b.glossary){add('b',g.term,dictionary);add('p',g.meaning,dictionary);}}
   if(b.text){const editor=add('details','',box,'learn-editor');add('summary',saved?'Edytuj swój polski zapis':'Dodaj własne tłumaczenie',editor);add('p','Zapis dotyczy tego wydania i tekstu. Pozostanie na tym urządzeniu; nie jest tłumaczeniem oficjalnym.',editor,'fine');
    const label=add('label','Polskie tłumaczenie tego fragmentu',editor),input=add('textarea','',label);input.value=saved;input.maxLength=12000;input.rows=6;input.setAttribute('aria-label','Polskie tłumaczenie: '+b.label);
    const feedback=add('p','',editor,'fine');feedback.setAttribute('role','status');const button=add('button','Zapisz tłumaczenie',editor,'secondary');button.type='button';
    button.onclick=()=>{const value=input.value.trim();if(!value){feedback.textContent='Wpisz tłumaczenie przed zapisaniem.';return;}if(value.length>12000){feedback.textContent='Tekst jest za długi (maks. 12 000 znaków).';return;}try{const key=identity(card,b,i),all=read(manualKey).filter(x=>x.key!==key);localStorage.setItem(manualKey,JSON.stringify([{key,text:value},...all]));render(card);el('status').textContent='Zapisano Twoje tłumaczenie na tym urządzeniu.';}catch{feedback.textContent='Nie udało się zapisać. Skopiuj swój tekst przed zamknięciem.';}};
    if(saved){const remove=add('button','Przywróć tekst z reguł',editor,'text-btn');remove.type='button';remove.onclick=()=>{try{localStorage.setItem(manualKey,JSON.stringify(read(manualKey).filter(x=>x.key!==identity(card,b,i))));render(card);el('status').textContent='Przywrócono tekst wbudowany.';}catch{feedback.textContent='Nie udało się zmienić zapisu.';}};}
   }
  });
  el('coverage').textContent=total?`${known} z ${total} fragmentów ma tekst po polsku${own?' · w tym Twój zapis':''}. `+(known===total?'Porównaj tłumaczenie z oryginałem.':'Pozostałe fragmenty są pokazane w oryginale; słownik objaśnia tylko rozpoznane pojęcia.'):'Brak tekstu działania w źródle.';
  el('coverage').dataset.state=total&&known===total?'complete':'partial';el('guide-title').textContent='Jak czytać ten wynik';el('steps').replaceChildren();
  for(const line of ['Porównaj kod, język i wydanie karty. Tłumaczenie dotyczy wybranego wydania.','Sprawdź wszystkie warunki, koszty i liczby. Nie traktuj częściowego tłumaczenia jak pełnego efektu.','Nazwy własne i symbole zachowują znaczenie z oryginału. Pojęcia rozwiniesz pod tekstem.','W sprawach spornych sprawdź oficjalne zasady i erraty.'])add('li',line,el('steps'));
  el('example').hidden=true;el('uncertainties').replaceChildren();
 }
 function stop(){controller?.abort();controller=null;}
 async function load(){stop();const ref=options[Number(el('select').value)],attempt=++token;active=null;el('content').hidden=true;el('retry').hidden=true;if(!ref)return;controller=new AbortController();const current=controller;el('status').textContent='Wczytuję tekst i wbudowane tłumaczenia…';
  try{const r=await fetch('/api/learn?'+new URLSearchParams(ref),{cache:'no-store',signal:AbortSignal.any([current.signal,AbortSignal.timeout(45000)])}),d=await r.json();if(attempt!==token)return;if(!r.ok)throw Error(d.error||'Nie udało się pobrać karty.');active=d.card;render(active);remember(active);el('content').hidden=false;el('status').textContent='Tryb wbudowany · bez AI i kluczy.';}
  catch(e){if(attempt!==token)return;const cached=read(cacheKey).find(x=>x.game===ref.game&&x.id===ref.id&&(x.language||'en')===ref.lang);if(cached){active=cached;render(active);el('content').hidden=false;el('status').textContent='Kopia z tego urządzenia · nie udało się sprawdzić aktualnego tekstu. Zapis: '+(cached.fetchedAt?new Date(cached.fetchedAt).toLocaleDateString('pl-PL'):'brak daty');}else el('status').textContent=e.message||'Nie udało się pobrać tekstu.';el('retry').hidden=false;}
 }
 function enter(){options=[];for(const c of [last,...cards.map(reference)])if(c&&!options.some(x=>x.game===c.game&&x.id===c.id&&x.lang===c.lang))options.push(c);el('select').replaceChildren();options.forEach((c,i)=>{const o=add('option',c.name+' · '+c.id,el('select'));o.value=i;});el('select').value='0';el('picker').hidden=!options.length;el('empty').hidden=!!options.length;el('content').hidden=true;el('status').textContent='';el('retry').hidden=true;if(options.length)load();else{token++;stop();active=null;}}
 el('select').onchange=load;el('retry').onclick=load;el('scan').onclick=()=>openScanner();
 root.CardLearning={remember(c){last=reference(c);},open(c){const ref=reference(c);if(!ref){message('Najpierw wybierz wydanie karty w katalogu.');return;}last=ref;show('learn');},enter,leave(){token++;stop();}};
 el('result-open').onclick=()=>root.CardLearning.open(matched);el('detail-open').onclick=()=>root.CardLearning.open(detailCard);
})(globalThis);
