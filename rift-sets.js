(function(root){
 'use strict';
 const $ = id => document.getElementById(id);
 const games = {
  weiss:{name:'Weiß Schwarz',core:root.CardWeissSetCore,
   kinds:[['all','Wszystkie karty'],['base','Standardowe rzadkości'],['parallel','Rzadkie i specjalne'],['extra','Promo i karty z talii']]},
  riftbound: {name:'Riftbound', core:root.CardRiftSetCore, file:'riftbound-sets.json?v=rift-sets-1', count:6,
   kinds:[['all','Wszystkie wydania'],['base','Podstawowy set'],['alternate','Alternatywne i sygnatury'],['extra','Runy, tokeny i dodatki']]},
  swu: {name:'Star Wars: Unlimited', core:root.CardSWUSetCore, file:'swu-sets.json?v=swu-sets-1', count:11,
   kinds:[['all','Wszystkie wydania'],['base','Podstawowy set'],['alternate','Hyperspace, foil i inne warianty'],['extra','Tokeny']]},
  mtg: {name:'Magic: The Gathering',label:'Magic (MTG)',core:root.CardMTGSetCore,file:'mtg-sets.json?v=mtg-sets-1',lazy:true,packVersion:'mtg-sets-1',
   kinds:[['all','Wszystkie wydania'],['base','Standardowe ilustracje'],['alternate','Specjalne warianty'],['extra','Tokeny i dodatki']]},
  pokemon:{name:'Pokémon',core:root.CardPokemonSetCore,lazy:true,packVersion:'pokemon-sets-1',kinds:[['all','Wszystkie karty']]},
  cyberpunk:{name:'Cyberpunk TCG',label:'Cyberpunk',core:root.CardCyberpunkSetCore,file:'cyberpunk-sets.json?v=cyberpunk-sets-1',count:17,
   kinds:[['all','Wszystkie rzadkości'],['standard','Common, Uncommon, Rare, Epic'],['premium','Iconic, Secret, Nova Rare']]},
  lorcana:{name:'Disney Lorcana',label:'Lorcana',core:root.CardLorcanaSetCore,file:'lorcana-sets.json?v=lorcana-sets-1',count:19,
   kinds:[['all','Wszystkie wydania'],['base','Zwykłe karty'],['alternate','Epic · Enchanted · Iconic'],['promo','Promocje'],['extra','Tokeny']]},
  onepiece:{name:'One Piece',core:root.CardOnePieceSetCore,file:'onepiece-sets.json?v=onepiece-sets-1',count:86,
   kinds:[['all','Wszystkie wydania'],['base','Standardowe wydania'],['alternate','Alternatywne i specjalne'],['don','Karty DON!!']]}
 };
 const pokemonLanguages={en:'Angielski',ja:'Japoński',de:'Niemiecki',fr:'Francuski',es:'Hiszpański',it:'Włoski',pt:'Portugalski',ko:'Koreański','zh-cn':'Chiński uproszczony','zh-tw':'Chiński tradycyjny'};
 let pokemonLanguage='en',weissLanguage='en';
 try{const l=localStorage.getItem('cardscope:weiss-set-language');if(['en','ja'].includes(l))weissLanguage=l}catch{}
 const cacheKey=()=>game==='pokemon'?'pokemon:'+pokemonLanguage:game==='weiss'?'weiss:'+weissLanguage:game;
 let game = 'riftbound', core = games[game].core;
 const host = $('collection-sets'), allTab = $('collection-all-cards'), setsTab = $('collection-rift-sets');
 if (!host || !core) return;
 const el = (tag, text, cls) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; };
 const button = (text, cls, action) => { const n = el('button', text, cls); n.type = 'button'; n.addEventListener('click', action); return n; };
 let index, saved = [], stamp = '', owned = new Map(), mode = 'all', currentSet = null;
 const catalogs = new Map(), requests = new Map();
 const packCache = new Map(), packRequests = new Map();
 let navigationId=0, shelf, shelfResults, shelfMore, setQuery='',setCategory='all',setYear='all',setLimit=30;
 let setOrder='catalog';
 let onlyOwnedSets=false,shelfOwnership='';
 try{onlyOwnedSets=localStorage.getItem('cardscope:sets-owned-only')==='true'}catch{}
 const readOrder=()=>{try{return ['catalog','newest','oldest'].includes(localStorage.getItem('cardscope:set-order:'+game))?localStorage.getItem('cardscope:set-order:'+game):'catalog'}catch{return 'catalog'}};
 const releaseDate=s=>root.CardSetOrder?.date(game,s)||null;
 const displayDate=s=>{const d=releaseDate(s);return d?d.slice(8,10)+'.'+d.slice(5,7)+'.'+d.slice(0,4):''};
 setOrder=readOrder();
 let status = 'all', kind = 'all', query = '', limit = 48, grid, resultText, more, progressText, progressBar, statusButtons;
 let tiles = new Map(), previewCard, restoreOverflow, showingBack = false;
 function gameSwitch() {
  const group = el('div', null, 'rs-game-switch');
  group.setAttribute('role','group'); group.setAttribute('aria-label','Gra w kolekcji setów');
  for (const [key, config] of Object.entries(games).sort(([a],[b])=>a==='weiss'?1:b==='weiss'?-1:0)) {
   const b = button(config.label || config.name, '', () => selectGame(key));
   b.dataset.game = key; b.setAttribute('aria-pressed', String(key === game)); group.append(b);
  }
  return group;
 }
 function mount(...children) {
  const focusedGame = document.activeElement?.dataset.game;
  const language=el('label',null,'rs-language');
  if(game==='pokemon'||game==='weiss'){
   const isWeiss=game==='weiss';
   language.append(el('span','Język wydania'));const select=el('select');select.setAttribute('aria-label',isWeiss?'Język wydań Weiß Schwarz':'Język setów Pokémon');
   for(const [value,label] of Object.entries(isWeiss?{en:'EN · angielskie',ja:'JP · japońskie'}:pokemonLanguages)){const o=el('option',label);o.value=value;select.append(o)}
   select.value=isWeiss?weissLanguage:pokemonLanguage;select.addEventListener('change',()=>{
    if(isWeiss){weissLanguage=select.value;try{localStorage.setItem('cardscope:weiss-set-language',weissLanguage)}catch{}}else pokemonLanguage=select.value;setCategory='all';setYear='all';navigationId++;if(modal.open)modal.close();index=null;currentSet=null;owned=new Map();setQuery='';setLimit=30;void load();
   });language.append(select);
  }
  host.replaceChildren(gameSwitch(), ...(['pokemon','weiss'].includes(game)?[language]:[]), ...children);
  if (focusedGame) host.querySelector(`.rs-game-switch [data-game="${game}"]`)?.focus({preventScroll:true});
 }
 function selectGame(next) {
  if (game === next) return;
  navigationId++;
  if (modal.open) modal.close();
  setQuery='';setCategory='all';setYear='all';setLimit=30;
  game = next; setOrder=readOrder(); core = games[game].core; index = null; currentSet = null; owned = new Map();
  void load();
 }
 const modal = el('dialog', null, 'rs-preview');
 modal.setAttribute('aria-labelledby', 'rs-preview-title');
 const close = button('×', 'rs-close', () => modal.close());
 close.setAttribute('aria-label', 'Zamknij podgląd karty');
 const previewBody = el('div', null, 'rs-preview-body');
 modal.append(close, previewBody); document.body.append(modal);
 modal.addEventListener('close', () => {
  if (restoreOverflow !== undefined) document.documentElement.style.overflow = restoreOverflow;
  restoreOverflow = undefined; previewCard = null;
 });
 modal.addEventListener('click', event => {
  if (event.target !== modal) return;
  const r = modal.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) modal.close();
 });
 function catalogImage(card,cls='') {
  const wrap=el('span',null,'rs-lorcana-image'),img=el('img',null,cls),placeholder=el('span','Brak dostępnej ilustracji','rs-no-image');
  const urls=[...new Set([card.image,...card.fallbackImages||[]].filter(u=>typeof u==='string'&&u.startsWith('https://')))];let position=0;
  img.alt=card.name;img.loading='lazy';img.decoding='async';placeholder.hidden=!!urls.length;img.hidden=!urls.length;
  img.addEventListener('error',()=>{const next=urls[++position];if(next)img.src=next;else{img.hidden=true;img.removeAttribute('src');placeholder.hidden=false}});
  if(urls.length)img.src=urls[0];wrap.append(img,placeholder);return wrap;
 }
 function image(card, cls = '') {
  if(game==='lorcana'||game==='onepiece'||game==='weiss')return catalogImage(card,cls);
  if(game==='pokemon'&&root.CardPokemonRepair)return root.CardPokemonRepair.image(card,cls);
  if (!card.image) { const placeholder=el('span','Brak ilustracji w źródle','rs-no-image');placeholder.setAttribute('role','img');placeholder.setAttribute('aria-label',card.name+' — brak ilustracji');return placeholder; }
  const img = el('img', null, cls); img.src = card.image; img.alt = card.name; img.loading = 'lazy'; img.decoding = 'async';
  img.addEventListener('error', () => { img.hidden = true; img.parentElement?.classList.add('rs-art-unavailable'); });
  return img;
 }
 function preview(card, preserveFace = false) {
  if (!preserveFace || previewCard?.key !== card.key) showingBack = false;
  previewCard = card;
  previewBody.replaceChildren();
  const art = el('div', null, 'rs-preview-art');
  art.append(image(showingBack && card.backImage ? {...card,image:card.backImage,name:card.name+' — rewers'} : card));
  const title = el('h2', card.name); title.id = 'rs-preview-title';
  const info = el('div', null, 'rs-preview-info'), have = owned.get(card.key);
  info.append(el('p', index.data.sets.find(s => s.id === card.setId).name, 'rs-kicker'), title,
   el('p', [card.code, card.variant, card.rarity].filter(Boolean).join(' · '), 'rs-meta'),
   el('p', have ? `✓ W kolekcji · ${have.qty} szt.` : 'Jeszcze nie masz tego wydania', 'rs-preview-status'));
  if (card.backImage) info.append(button(showingBack ? 'Pokaż przód karty' : 'Pokaż drugą stronę', 'secondary rs-flip', () => {
   showingBack = !showingBack; preview(card, true);
   previewBody.querySelector('.rs-flip')?.focus({preventScroll:true});
  }));
  if (have) info.append(button('Otwórz kartę z kolekcji ↗', 'primary', () => {
   const record = saved.find(c => owned.get(card.key)?.ids.includes(c.id));
   if (!record || typeof openDetail !== 'function') return;
   modal.close(); openDetail(record);
  }));
  else info.append(el('p', 'Dodaj ją przez skaner lub katalog. Po zapisaniu w kolekcji pojawi się tutaj automatycznie.', 'rs-muted'));
  previewBody.append(art, info);
  if (!modal.open) {
   restoreOverflow = document.documentElement.style.overflow;
   document.documentElement.style.overflow = 'hidden'; modal.showModal(); close.focus();
  }
 }
 function setMode(next) {
  mode = next;
  $('collection-owned').hidden = next !== 'all'; host.hidden = next !== 'sets';
  for (const [tab, selected] of [[allTab, next === 'all'], [setsTab, next === 'sets']]) {
   tab.classList.toggle('active', selected); tab.setAttribute('aria-pressed', String(selected));
   if (selected) tab.setAttribute('aria-current', 'page'); else tab.removeAttribute('aria-current');
  }
  if (next === 'sets') void load();
 }
 allTab.addEventListener('click', () => setMode('all'));
 setsTab.addEventListener('click', () => setMode('sets'));
 async function load() {
  if (index) { refresh(); return; }
  const target = cacheKey(), config = {...games[game]};
  if(game==='pokemon')config.file='pokemon-set-data/index-'+pokemonLanguage+'.json?v=pokemon-sets-1';
  mount(el('p', `Wczytuję sety ${config.name}…`, 'rs-loading'));
  let task = requests.get(target);
  if (!task) {
   task = (async () => {
    if (catalogs.has(target)) return catalogs.get(target);
    let data;
    if(target.startsWith('weiss:'))data=await config.core.load(target.split(':')[1]);
    else{const response = await fetch(new URL(config.file, document.baseURI));
    if (!response.ok) throw Error('catalog');data=await response.json();}
    if(target.startsWith('pokemon:')&&root.CardPokemonRepair)data=await root.CardPokemonRepair.prepareIndex(data);
    if (data.version !== 1 || !data.sets?.length || config.count && data.sets.length !== config.count || !(config.lazy ? data.entries?.length : data.cards?.length)) throw Error('schema');
    const built = config.core.buildIndex(data);
    built.setByCardKey=new Map(built.data.cards.map(c=>[c.key,c.setId]));
    catalogs.set(target, built); return built;
   })();
   requests.set(target, task);
  }
  try {
   const built = await task;
   if (cacheKey() !== target) return;
   index = built; owned = core.ownership(index, saved); overview();
  } catch {
   if (cacheKey() !== target) return;
   mount(el('h2', 'Nie udało się wczytać setów.'), el('p', 'Połącz się z internetem i spróbuj ponownie.', 'rs-muted'), button('Spróbuj ponownie', 'secondary rs-retry', () => load()));
  } finally { if (requests.get(target) === task) requests.delete(target); }
 }
 function updateTile(set) {
  const tile = tiles.get(set.id); if (!tile) return;
  const stats = core.summary(cardsForSet(set.id), owned);
  tile.count.textContent = `${stats.owned} / ${stats.total}`;
  tile.bar.value = stats.owned; tile.bar.max = stats.total;
  tile.node.setAttribute('aria-label', `${set.name}: ${stats.owned} z ${stats.total} wydań w kolekcji. Otwórz set.`);
 }
 function cardsForSet(id) { return index.bySet?.get(id) || index.data.cards.filter(c=>c.setId===id); }
 function ownedSetIds() {
  const ids=new Set();
  for(const key of owned.keys()){const id=index.setByCardKey.get(key);if(id)ids.add(id)}
  return ids;
 }
 const ownershipSignature=ids=>JSON.stringify([...ids].sort());
 const onepieceCategories={main:'Główne dodatki',extra:'Extra Booster',premium:'Premium Booster',starter:'Talie startowe',event:'Wydania turniejowe',promo:'Promocje i pozostałe'};
 const lorcanaCategories={main:'Główne dodatki',quest:'Illumineer’s Quest',promo:'Wydania kolekcjonerskie',beta:'Format Coconut · beta'};
 const cyberpunkCategories={expansion:'Główne wydania',starter:'Talie startowe',promo:'Promocje',demo:'Talie demonstracyjne'};
 const categoryNames={main:'Dodatki i edycje główne',commander:'Commander',special:'Zestawy specjalne',promo:'Promocje',extra:'Tokeny i dodatki'};
 function renderShelf() {
  const ownedIds=ownedSetIds();shelfOwnership=ownershipSignature(ownedIds);
  const normalized=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase();
  const terms=normalized(setQuery).split(/\s+/).filter(Boolean);
  const matches=index.data.sets.filter(s=>(!['mtg','cyberpunk','lorcana','onepiece'].includes(game)||setCategory==='all'||s.category===setCategory)
   && (!onlyOwnedSets||ownedIds.has(s.id))
   && (game!=='weiss'||setCategory==='all'||s.franchiseId===setCategory)
   && (game!=='mtg'||setYear==='all'||s.year===setYear)
   && terms.every(t=>normalized(s.id+' '+s.name+' '+(s.aliases||[]).join(' ')).includes(t)));
  const ordered=root.CardSetOrder?.sort(matches,setOrder,game)||matches;
  const shown=ordered.slice(0,setLimit);
  tiles=new Map();shelf.replaceChildren();
  for (const set of shown) {
   const tile = button('', 'rs-set', () => openSet(set.id));tile.dataset.setId=set.id;
   const art = el('span', null, 'rs-set-art'); art.append(image(set));
   const text = el('span', null, 'rs-set-text');
   const bar = el('progress'); bar.setAttribute('aria-label', `Kompletność setu ${set.name}`);
   const count = el('strong');
   text.append(el('span', set.displayCode || set.code || set.id, 'rs-set-code'), el('span', set.name, 'rs-set-name'));
   if(game==='mtg')text.append(el('span',set.preview?'Przedsprzedaż · '+set.releaseDate:(set.year+' · '+categoryNames[set.category]),'rs-set-date'));
   if(game==='lorcana'||game==='onepiece'){text.append(el('span',(game==='lorcana'?lorcanaCategories:onepieceCategories)[set.category],'rs-set-date'));if(set.catalogNote)text.append(el('span',set.catalogNote,'rs-set-date'));if(set.preview)text.append(el('span',set.previewLabel,'rs-preview-label'));}
   if(game==='weiss')text.append(el('span',(weissLanguage==='ja'?'JP':'EN')+' · '+set.franchise,'rs-set-date'));
   const date=displayDate(set);if(date)text.append(el('span','Premiera · '+date,'rs-set-date rs-release-date'));
   if(game==='cyberpunk'){const date=el('span',set.previewLabel||cyberpunkCategories[set.category],'rs-set-date');if(set.preview)date.classList.add('rs-preview-label');text.append(date)}
   text.append(count, el('span', 'wydań w kolekcji', 'rs-set-caption'), bar);
   tile.append(art, text, el('span', '↗', 'rs-set-arrow')); shelf.append(tile);
   tiles.set(set.id, { node: tile, count, bar }); updateTile(set);
  }
  shelfResults.textContent=matches.length?`Wyświetlasz ${shown.length} z ${matches.length} setów`:onlyOwnedSets?'Nie masz kart w setach pasujących do tych filtrów. Odznacz „Tylko sety z moimi kartami” lub zmień filtry.':'Nie znaleziono setu. Zmień nazwę lub filtry.';
  shelfMore.hidden=shown.length>=matches.length;
 }
 function overview() {
  navigationId++; currentSet = null; tiles = new Map();
  const intro = el('div', null, 'rs-intro');
  intro.append(el('p', games[game].name.toUpperCase() + ' · TWOJE SETY', 'rs-kicker'), el('h2', 'Zobacz, czego jeszcze brakuje.'),
   el('p', 'Karty z Twojej kolekcji zaznaczają się automatycznie. Szare pola to wydania, które czekają na odkrycie.', 'rs-muted'));
  shelf = el('div', null, 'rs-shelf');
  shelfResults=el('p',null,'rs-results');shelfResults.setAttribute('role','status');
  shelfMore=button('Pokaż kolejne sety','secondary rs-more',()=>{setLimit+=30;renderShelf()});
  const controls=el('div',null,'rs-set-controls');controls.hidden=false;
  {
   const search=el('input');search.className='rs-set-search';search.type='search';search.placeholder=game==='weiss'?'Seria, wydanie lub kod, np. Re:ZERO, Vol. 2, NIK…':game==='onepiece'?'Szukaj dodatku, np. OP01, EB05, Heroines…':game==='riftbound'||game==='swu'?'Nazwa lub kod dodatku…':game==='lorcana'?'Szukaj dodatku, np. The First Chapter, Fabled, Q3…':game==='pokemon'?'Nazwa lub kod setu Pokémon…':game==='cyberpunk'?'Szukaj zestawu, np. Retail, Beta, The Heist…':'Szukaj setu, np. LTR, Star Trek, Bloomburrow…';search.value=setQuery;search.setAttribute('aria-label','Szukaj setu '+games[game].name);
   search.addEventListener('input',()=>{setQuery=search.value;setLimit=30;renderShelf()});
   controls.append(search);
   if(game==='weiss'){
    const label=el('label',null,'rs-order-label');label.append(el('span','Seria'));
    const select=el('select');select.className='rs-weiss-franchise';select.setAttribute('aria-label','Seria Weiß Schwarz');
    const franchises=[...new Map(index.data.sets.map(s=>[s.franchiseId,s.franchise])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'pl'));
    for(const [value,name] of [['all','Wszystkie serie'],...franchises]){const o=el('option',name);o.value=value;select.append(o)}
    select.value=setCategory;select.addEventListener('change',()=>{setCategory=select.value;setLimit=30;renderShelf()});label.append(select);controls.append(label);
   }
   if(['cyberpunk','lorcana','onepiece'].includes(game)){
    const category=el('select');category.className='rs-set-category';category.setAttribute('aria-label','Rodzaj zestawu '+games[game].name);
    for(const [value,label] of [['all','Wszystkie zestawy'],...Object.entries(game==='onepiece'?onepieceCategories:game==='lorcana'?lorcanaCategories:cyberpunkCategories)]){const o=el('option',label);o.value=value;category.append(o)}
    category.value=setCategory;category.addEventListener('change',()=>{setCategory=category.value;setLimit=30;renderShelf()});controls.append(category);
   }
   if(game==='mtg'){
   const select=el('select');select.className='rs-set-type';select.setAttribute('aria-label','Rodzaj setu MTG');
   for(const [value,label] of [['all','Wszystkie rodzaje'],...Object.entries(categoryNames)]){const o=el('option',label);o.value=value;select.append(o)}
   select.value=setCategory;select.addEventListener('change',()=>{setCategory=select.value;setLimit=30;renderShelf()});
   const year=el('select');year.className='rs-set-year';year.setAttribute('aria-label','Rok wydania setu');
   for(const value of ['all',...[...new Set(index.data.sets.map(s=>s.year))].sort().reverse()]){const o=el('option',value==='all'?'Wszystkie lata':value);o.value=value;year.append(o)}
   year.value=setYear;year.addEventListener('change',()=>{setYear=year.value;setLimit=30;renderShelf()});controls.append(select,year);
   }
  }
  const orderLabel=el('label',null,'rs-order-label');orderLabel.append(el('span','Sortowanie dodatków'));
  const sort=el('select');sort.className='rs-set-sort';sort.setAttribute('aria-label','Sortowanie dodatków według daty wydania');
  for(const [value,label] of [['catalog','Kolejność katalogu'],['newest','Data wydania · od najnowszych'],['oldest','Data wydania · od najstarszych']]){const option=el('option',label);option.value=value;sort.append(option)}
  sort.value=setOrder;sort.addEventListener('change',()=>{setOrder=sort.value;setLimit=30;try{localStorage.setItem('cardscope:set-order:'+game,setOrder)}catch{}renderShelf()});orderLabel.append(sort);controls.append(orderLabel);
  const ownedLabel=el('label',null,'rs-owned-toggle'),ownedToggle=el('input');
  ownedToggle.type='checkbox';ownedToggle.checked=onlyOwnedSets;
  ownedToggle.setAttribute('aria-controls','rs-set-shelf');shelf.id='rs-set-shelf';
  ownedToggle.addEventListener('change',()=>{
   onlyOwnedSets=ownedToggle.checked;setLimit=30;
   try{localStorage.setItem('cardscope:sets-owned-only',String(onlyOwnedSets))}catch{}
   renderShelf();
  });
  ownedLabel.append(ownedToggle,el('span','Tylko sety z moimi kartami'));
  mount(intro,controls,ownedLabel,el('p','Daty według katalogu danego wydania. Zestawy bez potwierdzonej daty są na końcu sortowania.','rs-sort-note'),shelfResults,shelf,shelfMore,el('p',game==='weiss'
   ? 'Albumy są podzielone według wydań serii. Promki i karty z talii znajdziesz w pasującym wydaniu, bez osobnych albumów. Różne ilustracje i rzadkości mają osobne miejsca; EN i JP mają oddzielny postęp. Karty bez pewnego przypisania do wydania pozostają w zwykłej kolekcji.'
   : game==='onepiece'
   ? 'Katalog angielski. Alternatywne ilustracje, promocje, reprinty i DON!! mają osobne miejsca. Kilka kopii tego samego wydania liczymy razem. OP18 jest oznaczone jako zapowiedź i obejmuje tylko udostępnione karty.'
   : game==='lorcana'
   ? 'Podgląd kart w języku angielskim. Normal i Foil tego samego wydania liczymy razem. Enchanted, Epic, Iconic, promocje oraz różne ilustracje mają osobne miejsca. Promocje znajdziesz przy dodatku wskazanym na karcie; Curator’s Collection i Coconut mają własne zestawy.'
   : game==='cyberpunk'
   ? 'Retail, Beta, talie i promocje mają osobne kolekcje. Różne numery oraz warianty a/b liczymy osobno; kilka kopii i wykończenia tego samego wydania zajmują jedno pole. Zapowiedzi obejmują karty udostępnione w katalogu.'
   : game==='pokemon'
   ? 'Każdy język ma własne sety i postęp. Kilka kopii oraz wykończenia tego samego numeru liczymy razem. Karty pochodzą z katalogów aplikacji; podgląd EN jest oznaczony i nie zmienia języka ani posiadania karty. Szczegóły setu wczytują się po jego otwarciu.'
   : game==='mtg'
   ? 'Wydania papierowe z katalogu Scryfall. Różne sety i numery mają osobne pola; wersje językowe i wykończenia tego samego numeru liczymy razem. Karty setu wczytują się po jego otwarciu.'
   : game === 'swu'
   ? 'Podstawowe karty, Hyperspace, Showcase, Prestige i inne wydania z różnymi numerami mają osobne pola. Kilka kopii tego samego wydania zajmuje jedno pole. Na końcu znajdziesz zestawy Intro Battle: Hoth i Twin Suns 2026.'
   : 'Osobno liczymy różne numery, alternatywne ilustracje, sygnatury oraz dodatki do setu. Kilka kopii tego samego wydania zajmuje jedno pole.', 'rs-footnote'));
  renderShelf();
 }
 function openSet(id) {
  if(games[game].lazy&&!index.ready.has(id)){void loadSet(id);return;}
  renderSet(id);
 }
 async function loadSet(id) {
  const targetIndex=index,target=game,requestId=++navigationId,set=index.data.sets.find(s=>s.id===id);
  currentSet=null;tiles=new Map();
  const back=()=>button('← Wszystkie sety','rs-back',()=>overview());
  mount(back(),el('h2',set.name),el('p','Wczytuję karty tego setu…','rs-loading'));
  const active=()=>game===target&&index===targetIndex&&navigationId===requestId;
  try{
   if(target==='pokemon'&&set.repairOnly){
    games[target].core.hydrate(targetIndex,id,root.CardPokemonRepair.mergeRows([],id));
    if(active()){owned=core.ownership(index,saved);renderSet(id)}return;
   }
   if(!(target==='pokemon'?/^pokemon-set-data\/pack-\d+\.json$/:/^mtg-set-data\/pack-\d+\.json$/).test(set.file))throw Error('Invalid pack path');
   let promise=packRequests.get(set.file);
   if(!promise){
    promise=(async()=>{
     if(packCache.has(set.file))return packCache.get(set.file);
     const r=await fetch(new URL(set.file+'?v='+games[target].packVersion,document.baseURI));if(!r.ok)throw Error('MTG pack');
     const p=await r.json();if(p.version!==1||p.game!==target||!p.sets)throw Error('MTG schema');
     packCache.set(set.file,p);if(packCache.size>3)packCache.delete(packCache.keys().next().value);return p;
    })();
    packRequests.set(set.file,promise);
   }
   let pack;try{pack=await promise}finally{if(packRequests.get(set.file)===promise)packRequests.delete(set.file)}
   games[target].core.hydrate(targetIndex,id,target==='pokemon'&&root.CardPokemonRepair?root.CardPokemonRepair.mergeRows(pack.sets[id],id):pack.sets[id]);
   if(active()){owned=core.ownership(index,saved);renderSet(id)}
  }catch{
   if(active())mount(back(),el('h2',set.name),el('p','Nie udało się wczytać kart. Sprawdź połączenie z internetem.','rs-muted'),button('Spróbuj ponownie','secondary rs-set-retry',()=>openSet(id)));
  }
 }
 function renderSet(id) {
  currentSet = index.data.sets.find(s => s.id === id); status = 'all'; kind = 'all'; query = ''; limit = 48;
  host.replaceChildren();
  const back = button('← Wszystkie sety', 'rs-back', () => { overview(); setsTab.focus({preventScroll:true}); });
  const header = el('div', null, 'rs-set-header');
  const title = el('div'); title.append(el('p', `${games[game].name.toUpperCase()}${game==='weiss'?' · '+(weissLanguage==='ja'?'JP':'EN'):''} / ${currentSet.displayCode || currentSet.code || id}`, 'rs-kicker'), el('h2', currentSet.name));
  if(game==='lorcana'&&currentSet.catalogNote)title.append(el('p',currentSet.catalogNote,'rs-set-date'));
  if(currentSet.preview)title.append(el('p',currentSet.previewLabel || 'Przedsprzedaż · premiera '+currentSet.releaseDate,'rs-set-date'));
  const progress = el('div', null, 'rs-set-progress'); progressText = el('p'); progressBar = el('progress'); progressBar.setAttribute('aria-label', 'Kompletność całego setu');
  progress.append(progressText, progressBar); header.append(title, progress);
  const filters = el('div', null, 'rs-filters'), statuses = el('div', null, 'rs-statuses'); statuses.setAttribute('role', 'group'); statuses.setAttribute('aria-label', 'Posiadanie kart');
  statusButtons = new Map();
  for (const [key, name] of [['all','Wszystkie'],['owned','Posiadane'],['missing','Brakujące']]) {
   const b = button(name, '', () => { status = key; limit = 48; refreshGrid(); }); statuses.append(b); statusButtons.set(key, b);
  }
  const fields = el('div', null, 'rs-fields');
  const search = el('input'); search.type = 'search'; search.placeholder = 'Nazwa lub numer karty…'; search.setAttribute('aria-label', 'Szukaj w tym secie');
  search.addEventListener('input', () => { query = search.value; limit = 48; refreshGrid(); });
  const select = el('select'); select.setAttribute('aria-label', 'Rodzaj wydania');
  for (const [value, label] of games[game].kinds) {
   const option = el('option', label); option.value = value; select.append(option);
  }
  select.addEventListener('change', () => { kind = select.value; limit = 48; refreshGrid(); });
  select.hidden=games[game].kinds.length===1;fields.append(search, select); filters.append(statuses, fields);
  resultText = el('p', null, 'rs-results'); resultText.setAttribute('role', 'status'); resultText.setAttribute('aria-live', 'polite');
  grid = el('div', null, 'rs-grid');
  more = button('Pokaż kolejne karty', 'secondary rs-more', () => { limit += 48; refreshGrid(); });
  mount(back, header, filters, resultText, grid, more,
   el('p', '✓ Kolorowe — posiadane. Szare — brakujące. Dopasowanie po serii i numerze karty; nazwa sama nie zaznacza wydania.', 'rs-footnote'));
  refreshGrid(); back.focus({preventScroll:true});
 }
 function refreshGrid() {
  if (!currentSet) return;
  const list = cardsForSet(currentSet.id), stats = core.summary(list, owned);
  progressText.textContent = `${stats.owned} / ${stats.total} wydań · ${Math.round(stats.owned / stats.total * 100)}%`;
  progressBar.max = stats.total; progressBar.value = stats.owned;
  for (const [key, b] of statusButtons) {
   const label = key === 'all' ? 'Wszystkie' : key === 'owned' ? 'Posiadane' : 'Brakujące';
   b.textContent = `${label} (${key === 'all' ? stats.total : key === 'owned' ? stats.owned : stats.total - stats.owned})`;
   b.setAttribute('aria-pressed', String(status === key));
  }
  const found = core.filter(list, owned, {status, kind, query});
  resultText.textContent = found.length ? `Wyświetlasz ${Math.min(limit, found.length)} z ${found.length} wydań` : 'Brak kart spełniających te warunki.';
  const previous = new Map([...grid.children].map(n => [n.dataset.key, n]));
  const keep = new Set(); let position = 0;
  for (const card of found.slice(0, limit)) {
   let n = previous.get(card.key);
   if (!n) {
    n = button('', 'rs-card', () => preview(card)); n.dataset.key = card.key;
    const art = el('span', null, 'rs-card-art'); art.append(image(card));
    n._badge = el('span', null, 'rs-owned-badge'); art.append(n._badge);
    n.append(art, el('span', [card.code, card.variant,game==='weiss'?card.rarity:null].filter(Boolean).join(' · '), 'rs-card-code'), el('span', card.name, 'rs-card-name'));
   }
   const have = owned.get(card.key);
   n.classList.toggle('rs-missing', !have); n._badge.textContent = have ? `✓ ${have.qty} szt.` : 'Brakuje';
   n.setAttribute('aria-label', `${card.name}, ${card.code}, ${card.variant || ''}, ${have ? 'w kolekcji: ' + have.qty + ' sztuk' : 'brak w kolekcji'}. Zobacz kartę.`);
   if (grid.children[position] !== n) grid.insertBefore(n, grid.children[position] || null);
   keep.add(n); position++;
  }
  for (const n of [...grid.children]) if (!keep.has(n)) n.remove();
  more.hidden = found.length <= limit;
 }
 function refresh() {
  if (!index) return;
  if (currentSet) refreshGrid();
  else if(onlyOwnedSets&&shelfOwnership!==ownershipSignature(ownedSetIds()))renderShelf();
  else for (const set of index.data.sets) updateTile(set);
  if (modal.open && previewCard) preview(previewCard, true);
 }
 function collectionChanged(next) {
  saved = Array.isArray(next) ? next : [];
  const fingerprint = JSON.stringify([root.CardPokemonSetCore.fingerprint(saved),root.CardWeissSetCore?.fingerprint(saved),saved.map(c=>[c.officialPrintingId,c.tcgplayerId,c.cardmarketId,c.lorcastId,c.fullIdentifier,c.printedNumber,c.sourceId,c.lorcanaId])]); if (stamp === fingerprint) return;
  stamp = fingerprint;
  if (index) { owned = core.ownership(index, saved); refresh(); }
 }
 root.CardRiftSets = { collectionChanged, enter(view) { if (view !== 'collection' && modal.open) modal.close(); } };
 root.addEventListener('cardscope:account-change', () => { if (modal.open) modal.close(); stamp = ''; collectionChanged([]); });
 if (root.CardCloud?.subscribe) root.CardCloud.subscribe('card', collectionChanged);
 else if (typeof cards !== 'undefined') collectionChanged(cards);
})(globalThis);
