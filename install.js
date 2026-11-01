const cardscopeInstallBase=new URL('./',document.currentScript?.src||window.location.href);
// Do not rebuild a collection during finger scrolling or inertial scrolling.
// Local/cloud records are still applied immediately; only the visible list waits.
let collectionRefreshTimer=null,collectionLastScroll=-Infinity;
const collectionIdleMs=1500;
function cancelCollectionRefresh(){clearTimeout(collectionRefreshTimer);collectionRefreshTimer=null;}
function refreshCollectionWhenIdle(){
 cancelCollectionRefresh();
 if(document.hidden||document.body.dataset.view!=='collection')return;
 const remaining=collectionIdleMs-(Date.now()-collectionLastScroll);
 if(remaining>0){collectionRefreshTimer=setTimeout(refreshCollectionWhenIdle,remaining);return;}
 const anchor=[...$('list').children].find(row=>row.dataset.cardId&&row.getBoundingClientRect().bottom>0),top=anchor?.getBoundingClientRect().top;
 render();
 if(anchor?.isConnected&&Number.isFinite(top)){
  const shift=anchor.getBoundingClientRect().top-top;
  if(Math.abs(shift)>1)window.scrollBy(0,shift);
 }
}
window.addEventListener('scroll',()=>{if(document.body.dataset.view==='collection')collectionLastScroll=Date.now()},{passive:true,capture:true});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden)cancelCollectionRefresh();
 else if(document.body.dataset.view==='collection')refreshCollectionWhenIdle();
});
$('sync-now').onclick=()=>CardStore.sync();
CardStore.init(next=>{cards=next;globalThis.CardBinders?.collectionChanged();globalThis.CardExperience?.refreshHome();refreshCollectionWhenIdle()},(text,state,count)=>{$('sync-label').textContent=text+(count?' · '+count+' zmian':'');$('sync-panel').dataset.state=state;$('sync-login').hidden=!text.includes('Zaloguj')});
if('serviceWorker'in navigator)navigator.serviceWorker.register(new URL('sw.js',cardscopeInstallBase).href,{scope:cardscopeInstallBase.href,updateViaCache:'none'}).catch(()=>{$('offline-note').textContent='Nie udało się włączyć trybu offline. Korzystaj z aplikacji przy połączeniu z internetem.'});
$('import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>30000000)throw Error('Plik przekracza 30 MB.');const d=JSON.parse(await file.text());if(d.app!=='CardScope'||!Array.isArray(d.cards))throw Error('Wybierz kopię JSON z CardScope.');for(const c of d.cards)if(!c||!/^[\w-]{1,100}$/.test(c.id)||typeof c.name!=='string'||!c.name.trim()||c.name.length>120||!Number.isInteger(c.qty)||c.qty<1||c.qty>999||(c.price!==null&&(!Number.isFinite(c.price)||c.price<0))||c.priceCurrency&&!['EUR','USD','GBP','PLN'].includes(c.priceCurrency))throw Error('Kopia zawiera nieprawidłowe dane.');let count=0;for(const c of d.cards)if(!cards.some(x=>x.id===c.id)){await CardStore.add(c);count++}render();message('Zaimportowano '+count+' kart. Sprawdź status zapisu.')}catch(error){message(error.message||'Import się nie udał.')}finally{e.target.value=''}};

// Never reload automatically: a scan or unsaved card may still be open.
if('serviceWorker' in navigator){let controlled=!!navigator.serviceWorker.controller;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(controlled)$('app-update').hidden=false;controlled=true});}
$('app-update-reload').onclick=()=>{if(photo&&document.body.dataset.view!=='collection'&&!confirm('Bieżący skan nie został zapisany. Wczytać aktualizację?'))return;window.location.reload()};

window.addEventListener('cardscope:account-change',()=>{
 cancelCollectionRefresh();collectionLastScroll=-Infinity;
 scanId++;globalThis.CardScanner?.cancel();globalThis.CardBinders?.closeDialogs();
 photo=null;matched=null;marketPrice=null;cards=[];
 $('form').reset();$('preview').removeAttribute('src');$('preview').hidden=true;
 $('matches').replaceChildren();$('collection').querySelectorAll?.('[data-private]').forEach(x=>x.remove());
 show('scan');globalThis.CardExperience?.refreshHome();
});
