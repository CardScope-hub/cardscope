globalThis.CardPriceLinks=(()=>{
 function safe(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}}
 function query(c,variant){const language=c.catalogLanguage||c._autoLanguage||c.language,langs={en:'English',ja:'Japanese',jp:'Japanese',Angielski:'English','Japoński':'Japanese',de:'German',fr:'French',es:'Spanish',it:'Italian','pt-br':'Portuguese'};
  const set=typeof c.set==='string'?c.set:c.set?.name||c._set?.name;const number=c.printedNumber||c.localId||c.number;const v=variant||c.variant||c.rarity;
  return [...new Set([c.name,number,set,c.game||({pokemon:'Pokemon',mtg:'MTG',weiss:'Weiss Schwarz','weiss-jp':'Weiss Schwarz',swu:'Star Wars Unlimited',riftbound:'Riftbound',onepiece:'One Piece',lorcana:'Disney Lorcana',cyberpunk:'Cyberpunk TCG'})[c.gameKey||c.catalogGame],langs[language],v&&!['Normal','Nieustalony'].includes(v)?v:null].filter(Boolean))].join(' ').slice(0,350);
 }
 function ebay(c,variant,sold=false){const p=new URLSearchParams({_nkw:query(c,variant)});if(sold){p.set('LH_Sold','1');p.set('LH_Complete','1')}return 'https://www.ebay.com/sch/i.html?'+p;}
 // A search shortcut is not a transaction feed. Never infer a sold price or
 // "no sales" from the asking-price response used by the separate eBay strip.
 function psa(c,grade,variant){
  if(![10,9,8].includes(Number(grade)))return null;
  const identity=query(c,variant).replace(/\b(?:PSA|BGS|CGC|SGC|TAG|ACE)\s*\d{1,2}(?:[.,]\d)?\b/gi,'').replace(/\s+/g,' ').trim();
  const p=new URLSearchParams({_nkw:identity+' "PSA '+Number(grade)+'"',LH_Sold:'1',LH_Complete:'1',_sop:'13'});
  return 'https://www.ebay.com/sch/i.html?'+p;
 }
 function link(url,text){const a=document.createElement('a');a.href=url;a.textContent=text;a.target='_blank';a.rel='noopener noreferrer';return a}
 function source(host,value,label='Źródło ceny ↗'){if(!host)return;host.replaceChildren();const url=safe(value);host.hidden=!url;if(url)host.append(link(url,label));}

 function renderPSA(host,c,variant){
  // The scanned-card page has a second eBay strip below additional sources.
  // Show the grading panel once, immediately below the primary eBay link.
  if(host.id==='result-offers-ebay')return;
  const panel=document.createElement('section');panel.className='psa-panel';panel.setAttribute('aria-label','Sprzedaże kart z oceną PSA');
  const heading=document.createElement('div');heading.className='psa-panel-heading';
  const title=document.createElement('h3');title.className='psa-panel-title';title.textContent='Sprzedaże kart PSA';
  const badge=document.createElement('span');badge.className='psa-panel-badge';badge.textContent='eBay';heading.append(title,badge);
  const grid=document.createElement('div');grid.className='psa-grade-grid';
  for(const grade of [10,9,8]){
   const row=link(psa(c,grade,variant),'');row.className='psa-grade';row.dataset.psaGrade=String(grade);
   row.setAttribute('aria-label','PSA '+grade+' · brak danych w aplikacji. Sprawdź sprzedane oferty karty '+c.name+' na eBay (nowa karta).');
   const name=document.createElement('span');name.className='psa-grade-label';name.textContent='PSA '+grade;
   const state=document.createElement('span');state.className='psa-grade-state';state.textContent='brak danych';
   const action=document.createElement('span');action.className='psa-grade-action';action.append(document.createTextNode('Sprawdź '));
   const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');action.append(arrow);
   row.append(name,state,action);grid.append(row);
  }
  const note=document.createElement('p');note.className='psa-panel-note';note.textContent='Ceny sprzedaży sprawdzisz na eBay. „Brak danych” nie oznacza braku sprzedaży.';
  panel.append(heading,grid,note);host.append(panel);
 }

 function placeNearPrice(host){
  const selectors={'result-ebay':'.result-quick-actions .result-market','result-offers-ebay':'#market-offers','detail-ebay':'#detail .market-grid','binder-ebay':'#b-slot-dialog .b-price-grid','trade-ebay':'.trade-detail-price','visit-card-ebay':'.visit-card-price','public-card-ebay':'.public-card-price'};
  const selector=selectors[host.id],anchor=selector&&document.querySelector(selector);
  if(anchor&&anchor.nextElementSibling!==host)anchor.after(host);
 }
 const rendered=new WeakMap();
 function render(host,c,variant){
  if(!host)return;host.replaceChildren();host.hidden=!c;if(!c)return;placeNearPrice(host);
  rendered.set(host,{card:c,variant});
  host.classList.remove('ebay-links','market-tile','ebay-market-card');host.classList.add('ebay-strip');
  host.setAttribute('aria-label','Sprawdź cenę na eBay');
  const browse=link(ebay(c,variant),'');browse.className='ebay-strip-link';browse.dataset.searchUrl=browse.href;
  const title=document.createElement('span');title.className='ebay-strip-label';title.append(document.createTextNode('Sprawdź cenę na '));const brand=document.createElement('b');brand.textContent='eBay';title.append(brand);
  const arrow=document.createElement('span');arrow.className='ebay-strip-arrow';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
  browse.append(title,arrow);host.append(browse);renderPSA(host,c,variant);
  // The search link is ready before optional eBay pricing or authentication runs.
  try{globalThis.CardEbayPrices?.render(host,c,variant)}catch{}
  if(host.id==='result-ebay'){
   const secondary=document.getElementById('result-offers-ebay');if(secondary){render(secondary,c,variant);secondary.hidden=!document.querySelector('#market-offers .offer-tile');}
  }
 }

 // Keep the static strip usable with older cached rendering modules as well.
 // Observe only card identity fields: never the collection, scrolling or prices.
 function install(){
  const views=[
   ['result-ebay','result-name','result-series','result-variant'],
   ['detail-ebay','detail-name','detail-series','detail-price-variant'],
   ['binder-ebay','b-slot-title','b-slot-info',null],
   ['trade-ebay','trade-detail-title','trade-detail-meta','trade-detail-variant'],
   ['visit-card-ebay','visit-card-name','visit-card-meta',null],
   ['public-card-ebay','public-card-name','public-card-meta',null]
  ];
  for(const [id,nameId,metaId,variantId] of views){
   const host=document.getElementById(id),name=document.getElementById(nameId),meta=document.getElementById(metaId),select=variantId&&document.getElementById(variantId);
   if(!host)continue;placeNearPrice(host);let pending=false;
   function card(){
    // These globals are owned by the app; accessing happens after the view opens.
    try{if(id==='result-ebay'&&typeof matched!=='undefined'&&matched)return matched;
     if(id==='detail-ebay'&&typeof detailCard!=='undefined'&&detailCard)return typeof detailPriceCatalog!=='undefined'&&detailPriceCatalog||detailCard;}catch{}
    const saved=rendered.get(host)?.card,label=name?.textContent?.trim();
    if(saved&&label&&label===saved.name)return saved;
    return label?{name:label,set:meta?.textContent?.trim()||''}:null;
   }
   function refresh(){pending=false;const c=card();if(!c)return;const v=select?.value||rendered.get(host)?.variant,old=rendered.get(host),link=host.querySelector('.ebay-strip-link');
    if(old&&link&&link.dataset.searchUrl===ebay(c,v)){host.hidden=false;placeNearPrice(host);return}render(host,c,v);
   }
   const schedule=()=>{if(!pending){pending=true;queueMicrotask(refresh)}};
   for(const node of [name,meta,select].filter(Boolean))new MutationObserver(schedule).observe(node,{childList:true,subtree:true,characterData:true});
   select?.addEventListener('change',schedule);
   host.addEventListener('click',event=>{
    const link=event.target.closest('a');if(!link||!host.contains(link))return;const c=card();if(!c)return;
    const grade=Number(link.dataset.psaGrade),v=select?.value||rendered.get(host)?.variant;
    if(grade){const url=psa(c,grade,v);if(url)link.href=url;return;}
    if(!link.classList.contains('ebay-strip-link'))return;
    const url=ebay(c,v);
    // Update in place before default navigation; do not remove the clicked node.
    if(link.dataset.searchUrl!==url){link.href=url;link.dataset.searchUrl=url;link.querySelector('.ebay-strip-price')?.remove();link.removeAttribute('aria-label');link.removeAttribute('title');}
   },true);
   refresh();
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else queueMicrotask(install);

 return Object.freeze({safe,query,ebay,psa,source,render});
})();
