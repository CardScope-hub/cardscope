// Resolve every asset against this worker's directory, including GitHub project pages.
const BASE=new URL('./',self.location.href);
const CACHE_PREFIX='cardscope-shell:'+BASE.pathname+':';
const CACHE=CACHE_PREFIX+'camera-help-below-live-1';
const OCR_CACHE='cardscope-ocr:'+BASE.pathname+':v1';
const isOCR=path=>/^(?:ocr-runtime\/|ws-ocr\/|ocr-asian\/|pokemon-jp-(?:rec\.onnx|dict\.txt|worker\.js)$)/.test(path);
const APP_URL=new URL('app.html',BASE).href;
const SHELL=["tabletop-leaders.js?v=swu-leaders-1","swu-leaders.json?v=swu-leaders-1","weiss-set-core.js?v=weiss-sets-1","weiss-sets.json?v=weiss-sets-1","onepiece-set-core.js?v=onepiece-sets-1","onepiece-sets.json?v=onepiece-sets-1","set-order.js?v=onepiece-sets-1","lorcana-set-core.js?v=lorcana-sets-1","lorcana-sets.json?v=lorcana-sets-1","pokemon-repair.js?v=pokemon-repair-1","pokemon-repair-data.json?v=pokemon-repair-1","cyberpunk-set-core.js?v=cyberpunk-sets-1","cyberpunk-sets.json?v=cyberpunk-sets-1","pokemon-set-core.js?v=pokemon-sets-1","pokemon-set-data/index-en.json?v=pokemon-sets-1","camera-start.js?v=android-camera-1","camera-help.css?v=android-camera-1","mtg-set-core.js?v=mtg-sets-1","mtg-sets.json?v=mtg-sets-1","swu-set-core.js?v=swu-sets-1","swu-sets.json?v=swu-sets-1","rift-set-core.js?v=rift-sets-1","rift-sets.js?v=owned-sets-1","rift-sets.css?v=set-controls-aligned-1","riftbound-sets.json?v=rift-sets-1","pokemon-asian.js?v=pokemon-asian-1","catalog-pokemon-ko.json?v=pokemon-asian-1","catalog-pokemon-zh-cn.json?v=pokemon-asian-1","catalog-pokemon-zh-tw.json?v=pokemon-asian-1","ocr-asian/kor.traineddata.gz","ocr-asian/chi_sim.traineddata.gz","ocr-asian/chi_tra.traineddata.gz","ocr-asian/eng.traineddata.gz","friends-screen.css?v=friends-inline-1","friends-page.js?v=friends-inline-1","social-page.js?v=friends-inline-1","friend-view.js?v=friends-recent-1","app-navigation.css?v=nav-aligned-1","app-route.js?v=friends-inline-1","tabletop.css?v=swu-leaders-1","tabletop-core.js?v=swu-leaders-1","tabletop.js?v=swu-leaders-1","card-layout.css?v=card-layout-1","additional-catalog.js?v=new-games-1","catalog-cyberpunk.json?v=new-games-1","catalog-lorcana.json?v=new-games-1","home-refined.css?v=ebay-home-2","assets/showcase-rare/mtg-ltr-0.jpg","assets/showcase-rare/mtg-ltr-1.jpg","assets/showcase-rare/mtg-fra-0.jpg","assets/showcase-rare/mtg-fra-1.jpg","assets/showcase-rare/onepiece-op01-0.jpg","assets/showcase-rare/onepiece-op01-1.jpg","assets/showcase-rare/weiss-osk-0.jpg","assets/showcase-rare/weiss-osk-1.jpg","assets/showcase-rare/weiss-bav-0.jpg","assets/showcase-rare/weiss-bav-1.jpg","assets/showcase-rare/rift-sfd-0.png","assets/showcase-rare/rift-sfd-1.png","assets/showcase-rare/swu-sor-0.jpg","assets/showcase-rare/swu-sor-1.jpg","assets/showcase-rare/pokemon-sv03-0.webp","assets/showcase-rare/pokemon-sv03-1.webp","ebay-card.css?v=card-layout-1","purchase-core.js?v=purchase-profit-1","purchase-ui.js?v=ebay-home-2","purchase.css?v=ebay-home-2","ebay-prices.js?v=ebay-home-2","quick-search-ui.js?v=new-games-1","ui-polish.js?v=friends-screen-1","quick-search.js?v=new-games-1","price-links.js?v=card-layout-1","ui-polish.css?v=friends-screen-1","trading-core.js?v=new-games-1","trading.js?v=new-games-1","trading.css?v=trading-1","friends.css?v=friends-3","binder-privacy.js?v=friends-3","social-client.js?v=friends-recent-1","profile-core.js?v=friends-3","profile.css?v=friends-3","app-layout.js?v=camera-help-below-live-1","app-layout.css?v=camera-help-below-live-1","catalog-mtg-sets.json?v=maintenance-20261107-1","weiss-frame.js?v=weiss-reliable-1","weiss-ocr.js?v=scanner-session-1","weiss-codebook.js?v=weiss-reliable-1","scanner-top.css?v=scanner-top-1","auto-scan.js?v=scanner-session-1","auto-scan-ui.js?v=scanner-session-1","general-scan.css?v=general-scan-1","sharing-home.css?v=sharing-home-1","home-showcase.js?v=ebay-home-2","weiss-scan.css?v=weiss-layout-compact-1","swu-pl-data.js?v=swu-pl-1","swu-pl.js?v=swu-pl-1","swu-pl.css?v=swu-pl-1","swu-catalog.js?v=swu-1","swu-scan.js?v=swu-portrait-1","swu.css?v=swu-1","catalog-swu.json?v=maintenance-20261107-1","weiss-scan.js?v=scanner-session-1","mtg-scan.js?v=maintenance-20261107-1","card-copies.js?v=card-copies-1","card-copies.css?v=card-copies-1","mtg-catalog.js?v=search-polish-1","catalog-mtg-expanded.json?v=maintenance-20261107-1","catalog-mtg-names.json?v=maintenance-20261107-1","pokemon-jp-worker.js?v=pokemon-jp-name-2","pokemon-jp-rec.onnx?v=pokemon-jp-name-2","pokemon-jp-dict.txt?v=pokemon-jp-name-2","pokemon-jp-scan.js?v=pokemon-jp-position-3","pokemon-art.js?v=pokemon-repair-1","pokemon-art.css?v=pokemon-lang-1","pokemon-artwork.json?v=pokemon-hd-1","catalog-pokemon-en.json?v=pokemon-hd-1","catalog-pokemon-ja.json?v=pokemon-hd-1","catalog-pokemon-de.json?v=pokemon-hd-1","catalog-pokemon-fr.json?v=pokemon-hd-1","catalog-pokemon-es.json?v=pokemon-hd-1","catalog-pokemon-it.json?v=pokemon-hd-1","catalog-pokemon-pt.json?v=pokemon-hd-1","origins-pl-data.js?v=riftbound-pl-2","origins-pl.js?v=riftbound-pl-2","origins-pl.css?v=riftbound-pl-2","centering-grades.js?v=centering-grades-1","centering-grades.css?v=centering-grades-1","pokemon-expansions.js?v=pokemon-repair-1","catalog-pokemon-latest.json?v=pokemon-hd-1","catalog-riftbound.json?v=maintenance-20261107-1","centering-view.js?v=centering-lines-1","centering-view.css?v=centering-lines-1","weiss-pricing.js?v=weiss-nikke2-1","weiss-ui.js?v=weiss-1","price-engine.js?v=new-games-1","cloud-sync.js?v=psa-records-1", "catalog-client.js?v=new-games-1", "scan-engine.js?v=scanner-session-1","web.css?v=37", "web.js?v=pwa-paths-1", "pwa.js?v=general-scan-1", "live-scan.js?v=scanner-session-1", "binder-share.js?v=friends-3", "currency.js?v=card-layout-1", "add-flow.js?v=search-polish-1", "binders.css?v=37", "binders.mjs?v=ebay-home-2", "binder-core.mjs?v=purchase-profit-1", "binder-store.mjs?v=purchase-profit-1", "experience.css?v=37", "learning.js?v=37", "centering-camera.js?v=centering-view-1", "centering.js?v=centering-grades-1", "app.html", "styles.css?v=scanner-text-upright-1", "storage.js?v=psa-records-1", "install.js?v=general-scan-1", "app-experience.js?v=collection-set-sort-1", "details.js?v=new-games-1", "imaging.js?v=scanner-session-1", "scanner.js?v=scanner-session-1", "matching.js?v=pokemon-asian-1", "scan-text.js?v=new-games-1", "scan-index.js?v=new-games-1", "neural-evidence.js?v=new-games-1", "neural-scan.js?v=scanner-session-1", "vision-scan.js?v=mtg-number-first-1", "scan-reader.js?v=scanner-session-1", "recognition.js?v=scanner-session-1", "games.js?v=scanner-session-1", "markets.js?v=search-polish-1", "manifest.json?v=pwa-paths-1", "icon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "assets/charizard.webp", "assets/poncho.webp"].map(path=>new URL(path,BASE).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE),previous=(await caches.keys()).filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE),old=await Promise.all(previous.map(k=>caches.open(k))),ocr=await caches.open(OCR_CACHE);
 // Reuse only an exact versioned URL. New script versions and HTML always load fresh.
 const queue=[...SHELL];await Promise.all(Array.from({length:4},async()=>{
  while(queue.length){const url=queue.shift(),u=new URL(url),path=u.pathname.slice(BASE.pathname.length);let response;
   if(u.searchParams.has('v')||isOCR(path)){response=await ocr.match(url);for(const source of old){if(response)break;response=await source.match(url);}}
   if(!response)response=await fetch(url,{cache:'reload',credentials:'same-origin'});
   if(!response.ok||response.redirected)throw Error('CardScope shell unavailable');
   await (isOCR(path)?ocr:cache).put(url,response);
  }
 }));await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const ocr=await caches.open(OCR_CACHE);
 for(const key of await caches.keys())if(key.startsWith(CACHE_PREFIX)&&key!==CACHE){
  const old=await caches.open(key);for(const request of await old.keys()){
   const u=new URL(request.url);if(u.origin===BASE.origin&&isOCR(u.pathname.slice(BASE.pathname.length))&&!await ocr.match(request)){
    const response=await old.match(request);if(response)await ocr.put(request,response).catch(()=>{});
   }
  }await caches.delete(key);
 }
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);
 if(event.request.method!=='GET'||u.origin!==BASE.origin||!u.pathname.startsWith(BASE.pathname))return;
 const path=u.pathname.slice(BASE.pathname.length);
 // Never cache authentication, API responses or private photos.
 if(path.startsWith('api/')||path.includes('chatgpt')||path==='callback'||path==='login.html'||path==='supabase-config.js'||path.startsWith('auth-'))return;
 if(event.request.mode==='navigate'&&['','index.html','app.html'].includes(path)){
  event.respondWith(fetch(event.request).catch(async()=>{
   const cache=await caches.open(CACHE);
   return await cache.match(APP_URL)||Response.error();
  }));return;
 }
 if(isOCR(path)){
  event.respondWith(caches.open(OCR_CACHE).then(async cache=>{const hit=await cache.match(event.request);if(hit)return hit;const response=await fetch(event.request);if(response.ok&&!response.redirected)await cache.put(event.request,response.clone()).catch(()=>{});return response;}));return;
 }
 if(path.startsWith('pokemon-set-data/')||path.startsWith('mtg-set-data/')||path.startsWith('assets/catalog/')||path.startsWith('ocr-runtime/')||path.startsWith('ws-ocr/')){
  event.respondWith(caches.open(CACHE).then(async cache=>{
   const hit=await cache.match(event.request);if(hit)return hit;
   const response=await fetch(event.request);
   if(response.ok&&!response.redirected)await cache.put(event.request,response.clone()).catch(()=>{});
   return response;
  }));return;
 }
 if(SHELL.includes(u.href))event.respondWith(caches.open(CACHE).then(async cache=>await cache.match(event.request)||fetch(event.request)));
});
