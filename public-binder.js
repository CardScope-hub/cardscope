// Read-only shared viewer. Auth identifies friends; collection stores/editors are never loaded.
(() => {
 'use strict';
 const $=id=>document.getElementById(id),el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const viewer=()=>globalThis.CardScopeAuth?.state.status==='signed-in'&&!globalThis.CardScopeAuth.state.recovery?globalThis.CardScopeAuth.state.user?.id||null:null;
 const token=new URLSearchParams(location.search).get('share');
 let data=null,page=0,selectedCard=null,back=false,requestId=0,fx=null,currency='PLN';
 const layouts=['2x2','3x3','4x3','4x4','4x5','5x4','5x5','6x6'];
 const themes={amethyst:'#8555cf',lavender:'#b59ae1',plum:'#7d467f',midnight:'#62558f',iris:'#6963cb',pearl:'#b89ac9'};
 const symbols={diamond:'✧',star:'✦',moon:'☾',pokeball:'◉',dragon:'♜',bolt:'ϟ',flower:'❀'};
 const safeString=(s,max=200)=>typeof s==='string'?s.slice(0,max):'';
 function imageURL(s){if(typeof s!=='string')return '';if(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s)&&s.length<17000000)return s;try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
 function linkURL(s){try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
 const validFX=t=>t&&/^\d{4}-\d{2}-\d{2}$/.test(t.date)&&t.rates?.PLN===1&&['EUR','USD'].every(c=>Number.isFinite(t.rates[c])&&t.rates[c]>0);
 try{const stored=localStorage.getItem('cardscope.currency');if(['PLN','EUR','USD'].includes(stored))currency=stored;const f=JSON.parse(localStorage.getItem('cardscope.fx'));if(validFX(f))fx=f;}catch{}
 $('public-currency').value=currency;
 const raw=(n,c)=>new Intl.NumberFormat('pl-PL',{style:'currency',currency:c}).format(n);
 const convert=q=>q.currency===currency?q.amount:fx? q.amount*fx.rates[q.currency]/fx.rates[currency]:null;
 function quote(c){
  const q=c?.quote;
  if(q&&Number.isFinite(q.amount)&&q.amount>=0&&q.amount<=10000000&&['PLN','EUR','USD'].includes(q.currency))return {amount:q.amount,currency:q.currency,source:safeString(q.source,100),at:q.at,url:linkURL(q.url)};
  if(c&&Number.isFinite(c.price)&&c.price>=0&&c.price<=10000000&&['PLN','EUR','USD'].includes(c.priceCurrency||'EUR'))return {amount:c.price,currency:c.priceCurrency||'EUR',source:({'tcgplayer':'TCGplayer','tcgrepublic-jp':'TCG Republic · JP','novatcg-jp':'NovaTCG · JP','manual':'Wycena ręczna'}[c.priceSource])||(String(c.priceSource).includes('cardmarket')?'Cardmarket':'Zapisana wycena'),at:c.priceUpdated||c.createdAt,url:linkURL(c.priceUrl)};
  return null;
 }
 const price=q=>!q?'Brak wyceny':convert(q)===null?raw(q.amount,q.currency)+' · brak kursu':raw(convert(q),currency);
 const date=s=>{if(s==null||s==='')return 'brak daty źródła';let n=typeof s==='number'||/^\d{10,13}$/.test(s)?Number(s):Date.parse(s);if(Number.isFinite(n)&&n<1e11&&n>1e9)n*=1000;return Number.isFinite(n)?new Date(n).toLocaleDateString('pl-PL'):'brak daty źródła';};
 function validate(d){
  const b=d?.binder;if(!d||d.schema!==1||!b||!layouts.includes(b.columns+'x'+b.rows)||!Number.isInteger(b.pages)||b.pages<1||b.pages>100||!Array.isArray(b.slots)||b.slots.length!==b.columns*b.rows*b.pages||b.slots.some(id=>id!==null&&(typeof id!=='string'||!/^[\w-]{1,100}$/.test(id)))||!Array.isArray(d.cards)||d.cards.length>3600)throw Error('Nieprawidłowa odpowiedź bindera.');
  return {...d,byId:new Map(d.cards.filter(c=>c&&typeof c.id==='string').map(c=>[c.id,c]))};
 }
 function render(){
  if(!data)return;const b=data.binder;page=Math.max(0,Math.min(page,b.pages-1));
  const owner=safeString(data.ownerName,50)||'Kolekcjoner';$('public-owner').textContent=owner;$('owner-avatar').textContent=Array.from(owner).slice(0,2).join('').toLocaleUpperCase('pl');
  CardI18n.protect($('public-title')).textContent=safeString(b.name,70);document.title=safeString(b.name,70)+' · '+owner+' · CardScope';CardI18n.protect($('public-subtitle')).textContent=safeString(b.subtitle,120);$('cover-emblem').textContent=symbols[b.emblem]||'✧';
  document.documentElement.style.setProperty('--cover',themes[b.theme]||themes.amethyst);document.querySelector('.public-cover').dataset.pattern=['aurora','linen','stars'].includes(b.pattern)?b.pattern:'aurora';
  const filled=b.slots.filter(Boolean);let sum=0,missing=0,noFX=0,priced=0;
  for(const id of filled){const q=quote(data.byId.get(id));if(!q){missing++;continue;}const n=convert(q);if(n===null){noFX++;continue;}sum+=n;priced++;}
  $('public-total').textContent=noFX?'Brak kursu do pełnej sumy':priced?raw(sum,currency):'Brak wyceny';
  $('public-missing').textContent=filled.length?`${priced} z ${filled.length} kart wycenionych${missing?' · '+missing+' bez ceny':''}${noFX?' · '+noFX+' bez kursu':''}`:'Ten binder jest jeszcze pusty.';
  $('public-count').textContent=String(filled.length);$('public-layout').textContent=`${b.pages} stron · układ ${b.columns} × ${b.rows}`;
  $('public-updated').textContent='Ostatni zapis zawartości: '+date(data.updatedAt)+'.';
  $('public-fx').textContent=fx?'Przelicznik NBP · kurs z '+fx.date+'.':'Bez dostępnego kursu pokazujemy ceny w walutach źródłowych.';
  renderPage();if(selectedCard)renderCard();
 }
 function renderPage(){
  const b=data.binder,per=b.columns*b.rows,grid=$('public-page');grid.style.setProperty('--cols',b.columns);grid.replaceChildren();
  $('public-page-title').textContent='Strona '+(page+1)+' z '+b.pages;grid.setAttribute('aria-label','Strona '+(page+1)+': karty w binderze');
  for(let n=0;n<per;n++){
   const id=b.slots[page*per+n],card=data.byId.get(id);const pocket=el(card?'button':'div',undefined,'public-pocket'+(card?'':' empty-pocket'));
   if(card){pocket.type='button';pocket.setAttribute('aria-label',safeString(card.name)+' · '+price(quote(card))+' · powiększ kartę');const image=CardArtwork.src;if(image){const img=el('img');img.src=image;img.alt=safeString(card.name);img.loading='lazy';img.decoding='async';img.addEventListener('error',()=>{img.remove();pocket.prepend(CardI18n.protect(el('span',safeString(card.name),'pocket-fallback')));},{once:true});pocket.append(img);}else pocket.append(CardI18n.protect(el('span',safeString(card.name),'pocket-fallback')));
    const caption=el('span',undefined,'pocket-caption');caption.append(CardI18n.protect(el('b',safeString(card.name))),el('small',price(quote(card))));pocket.append(caption);pocket.onclick=()=>{selectedCard=card;back=false;renderCard();$('public-card-dialog').showModal();};
   }else{pocket.append(el('span',id?'Karta niedostępna':'✧'),el('small',id?'':'Wolna kieszonka'));}
   grid.append(pocket);
  }
  const select=$('public-page-select');if(select.options.length!==b.pages){select.replaceChildren();for(let i=0;i<b.pages;i++){const o=el('option','Strona '+(i+1)+' z '+b.pages);o.value=String(i);select.append(o);}}select.value=String(page);
  $('public-prev').disabled=page===0;$('public-next').disabled=page===b.pages-1;
 }
 function turn(n){if(!data||!Number.isInteger(n)||n<0||n>=data.binder.pages||n===page)return;page=n;renderPage();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)$('public-page').animate?.([{opacity:.4,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:230,easing:'ease-out'});}
 function renderCard(){
  const c=selectedCard,q=quote(c),src=CardArtwork.src;CardI18n.protect($('public-card-name')).textContent=safeString(c.name);$('public-card-owner').textContent=safeString(data.ownerName,50);
  CardI18n.protect($('public-card-meta')).textContent=[c.game,c.set,c.number,c.rarity,c.language,c.variant].filter(Boolean).map(v=>safeString(v,120)).join(' · ');
  const img=$('public-card-image');img.hidden=!src;$('public-card-noimage').hidden=!!src;img.alt=safeString(c.name)+(back?' · rewers':'');if(src)img.src=src;else img.removeAttribute('src');img.onerror=()=>{img.hidden=true;$('public-card-noimage').hidden=false;};
  $('public-card-value').textContent=price(q);$('public-card-source').textContent=q?.source||'Źródło nie udostępnia ceny tego wydania.';$('public-card-date').textContent=q?'Data wyceny: '+date(q.at):'';
  globalThis.CardPriceLinks?.render($('public-card-ebay'),c,c.variant);const link=linkURL(quote(c)?.url);$('public-card-market').hidden=!link;if(link)$('public-card-market').href=link;else $('public-card-market').removeAttribute('href');
  $('public-card-flip').hidden=!imageURL(c.backArtwork);$('public-card-flip').textContent=back?'Pokaż przód ↻':'Pokaż drugą stronę ↻';
 }
 function clearPublicData(){
  data=null;selectedCard=null;back=false;$('public-card-dialog').close();$('public-page').replaceChildren();$('public-content').hidden=true;
  $('public-card-image').removeAttribute('src');$('public-card-image').alt='';$('public-card-market').removeAttribute('href');$('public-card-market').hidden=true;$('public-card-ebay').replaceChildren();$('public-card-flip').hidden=true;
  for(const id of ['public-title','public-subtitle','public-owner','owner-avatar','public-total','public-missing','public-count','public-layout','public-updated','public-card-name','public-card-meta','public-card-value','public-card-source','public-card-date','public-card-owner'])$(id).textContent='';
  $('public-page-select').replaceChildren();$('public-page-title').textContent='Binder';document.title='Udostępniony binder · CardScope';
 }
 async function load(){
  const run=++requestId,who=viewer();$('public-sign-in').hidden=true;$('public-refresh').disabled=true;$('public-retry').hidden=true;
  if(!data){$('public-status').hidden=false;$('public-status-title').textContent='Otwieramy binder…';$('public-status-note').textContent='Za chwilę poznasz tę kolekcję.';}
  try{
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token||''))throw Error('Ten link jest niepełny. Poproś właściciela o nowy link z aplikacji.');
   const config=globalThis.CARDSCOPE_SUPABASE;if(!config?.url||!config?.publishableKey)throw Error('Nie wczytano konfiguracji strony. Spróbuj ponownie.');
   const session=who?await globalThis.CardScopeAuth.syncSession(who):null;if(who!==viewer()||run!==requestId)return;
   const response=await fetch(new URL('/rest/v1/rpc/cardscope_binder_public_v1',config.url),{method:'POST',credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(25000),headers:{apikey:config.publishableKey,...(session?{Authorization:'Bearer '+session.accessToken}:{}),'Content-Type':'application/json'},body:JSON.stringify({p_token:token})});
   const d=await response.json().catch(()=>null);if(run!==requestId||who!==viewer())return;
   if(!response.ok)throw Error(response.status===404?'Udostępnianie binderów nie zostało jeszcze włączone na tej stronie.':'Nie udało się pobrać bindera. Sprawdź internet i spróbuj ponownie.');
   if(!d)throw Error('Ten binder jest prywatny, link został wyłączony albo konto wymaga zaakceptowania Cię jako znajomego.');
   data=validate(d);if(selectedCard){selectedCard=data.byId.get(selectedCard.id)||null;if(!selectedCard)$('public-card-dialog').close();}
   $('public-content').hidden=false;$('public-status').hidden=true;render();
  }catch(e){if(run!==requestId||who!==viewer())return;clearPublicData();$('public-sign-in').hidden=!!who;$('public-status').hidden=false;$('public-status-title').textContent='Nie możemy otworzyć bindera.';$('public-status-note').textContent=e.name==='TimeoutError'?'Połączenie trwa zbyt długo. Spróbuj ponownie.':e.message||'Sprawdź połączenie z internetem.';$('public-retry').hidden=false;}
  finally{if(run===requestId)$('public-refresh').disabled=false;}
 }
 async function rates(){
  try{const r=await fetch('https://api.nbp.pl/api/exchangerates/tables/A/?format=json',{credentials:'omit',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error();const [t]=await r.json();const f={date:t.effectiveDate,rates:{PLN:1,...Object.fromEntries(t.rates.filter(r=>['USD','EUR'].includes(r.code)).map(r=>[r.code,r.mid]))}};if(!validFX(f))throw Error();fx=f;}
  catch{try{const r=await fetch(new URL('prices-fx.json',location.href),{credentials:'omit',signal:AbortSignal.timeout(8000)});const f=await r.json();if(r.ok&&validFX(f)&&(!fx||f.date>fx.date))fx=f;}catch{}}
  if(fx)try{localStorage.setItem('cardscope.fx',JSON.stringify(fx));}catch{}render();
 }
 $('public-currency').onchange=e=>{currency=e.target.value;try{localStorage.setItem('cardscope.currency',currency);}catch{}render();};
 $('public-prev').onclick=()=>turn(page-1);$('public-next').onclick=()=>turn(page+1);$('public-page-select').onchange=e=>turn(Number(e.target.value));
 $('public-card-close').onclick=()=>$('public-card-dialog').close();$('public-card-dialog').addEventListener('close',()=>{selectedCard=null;});$('public-card-flip').onclick=()=>{back=!back;renderCard();};
 $('public-refresh').onclick=$('public-retry').onclick=()=>void load();
 document.addEventListener('keydown',e=>{if($('public-card-dialog').open||e.target.closest('input,select,textarea'))return;if(e.key==='ArrowRight')turn(page+1);if(e.key==='ArrowLeft')turn(page-1);});
 let lastViewer;globalThis.CardScopeAuth?.subscribe(s=>{
  if(s.status==='loading'){requestId++;lastViewer=undefined;clearPublicData();return;}
  const id=viewer();if(id!==lastViewer){lastViewer=id;requestId++;clearPublicData();void load()}
 });if(!globalThis.CardScopeAuth)void load();window.addEventListener('pagehide',()=>{requestId++;clearPublicData()});window.addEventListener('pageshow',async e=>{if(!e.persisted)return;const run=++requestId;clearPublicData();await globalThis.CardScopeAuth?.refresh();if(run===requestId)void load()});void rates();
})();
