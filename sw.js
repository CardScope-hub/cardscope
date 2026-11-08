// Resolve every asset against this worker's directory, including GitHub project pages.
const BASE=new URL('./',self.location.href);
const CACHE_PREFIX='cardscope-shell:'+BASE.pathname+':';
const CACHE=CACHE_PREFIX+'psa-panel-1';
const APP_URL=new URL('app.html',BASE).href;
const SHELL=["additional-catalog.js?v=new-games-1","catalog-cyberpunk.json?v=new-games-1","catalog-lorcana.json?v=new-games-1","home-refined.css?v=ebay-home-2","assets/showcase-rare/mtg-ltr-0.jpg","assets/showcase-rare/mtg-ltr-1.jpg","assets/showcase-rare/mtg-fra-0.jpg","assets/showcase-rare/mtg-fra-1.jpg","assets/showcase-rare/onepiece-op01-0.jpg","assets/showcase-rare/onepiece-op01-1.jpg","assets/showcase-rare/weiss-osk-0.jpg","assets/showcase-rare/weiss-osk-1.jpg","assets/showcase-rare/weiss-bav-0.jpg","assets/showcase-rare/weiss-bav-1.jpg","assets/showcase-rare/rift-sfd-0.png","assets/showcase-rare/rift-sfd-1.png","assets/showcase-rare/swu-sor-0.jpg","assets/showcase-rare/swu-sor-1.jpg","assets/showcase-rare/pokemon-sv03-0.webp","assets/showcase-rare/pokemon-sv03-1.webp","ebay-card.css?v=psa-panel-1","purchase-core.js?v=purchase-profit-1","purchase-ui.js?v=ebay-home-2","purchase.css?v=ebay-home-2","ebay-prices.js?v=ebay-home-2","quick-search-ui.js?v=new-games-1","ui-polish.js?v=purchase-profit-1","quick-search.js?v=new-games-1","price-links.js?v=psa-panel-1","ui-polish.css?v=purchase-profit-1","trading-core.js?v=new-games-1","trading.js?v=new-games-1","trading.css?v=trading-1","friends.css?v=friends-3","binder-privacy.js?v=friends-3","social-client.js?v=friends-3","profile-core.js?v=friends-3","profile.css?v=friends-3","app-layout.js?v=maintenance-20261107-1","app-layout.css?v=maintenance-20261107-1","catalog-mtg-sets.json?v=maintenance-20261107-1","weiss-frame.js?v=weiss-reliable-1","weiss-ocr.js?v=weiss-reliable-1","weiss-codebook.js?v=weiss-reliable-1","scanner-top.css?v=scanner-top-1","auto-scan.js?v=new-games-1","auto-scan-ui.js?v=maintenance-20261107-1","general-scan.css?v=general-scan-1","sharing-home.css?v=sharing-home-1","home-showcase.js?v=ebay-home-2","weiss-scan.css?v=weiss-layout-compact-1","swu-pl-data.js?v=swu-pl-1","swu-pl.js?v=swu-pl-1","swu-pl.css?v=swu-pl-1","swu-catalog.js?v=swu-1","swu-scan.js?v=swu-portrait-1","swu.css?v=swu-1","catalog-swu.json?v=maintenance-20261107-1","weiss-scan.js?v=weiss-reliable-1","mtg-scan.js?v=maintenance-20261107-1","card-copies.js?v=card-copies-1","card-copies.css?v=card-copies-1","mtg-catalog.js?v=search-polish-1","catalog-mtg-expanded.json?v=maintenance-20261107-1","catalog-mtg-names.json?v=maintenance-20261107-1","pokemon-jp-worker.js?v=pokemon-jp-name-2","pokemon-jp-rec.onnx?v=pokemon-jp-name-2","pokemon-jp-dict.txt?v=pokemon-jp-name-2","pokemon-jp-scan.js?v=pokemon-jp-position-3","pokemon-art.js?v=maintenance-20261107-1","pokemon-art.css?v=pokemon-lang-1","pokemon-artwork.json?v=maintenance-20261107-1","catalog-pokemon-en.json?v=maintenance-20261107-1","catalog-pokemon-ja.json?v=maintenance-20261107-1","catalog-pokemon-de.json?v=maintenance-20261107-1","catalog-pokemon-fr.json?v=maintenance-20261107-1","catalog-pokemon-es.json?v=maintenance-20261107-1","catalog-pokemon-it.json?v=maintenance-20261107-1","catalog-pokemon-pt.json?v=maintenance-20261107-1","origins-pl-data.js?v=riftbound-pl-2","origins-pl.js?v=riftbound-pl-2","origins-pl.css?v=riftbound-pl-2","centering-grades.js?v=centering-grades-1","centering-grades.css?v=centering-grades-1","pokemon-expansions.js?v=maintenance-20261107-1","catalog-pokemon-latest.json?v=maintenance-20261107-1","catalog-riftbound.json?v=maintenance-20261107-1","centering-view.js?v=centering-lines-1","centering-view.css?v=centering-lines-1","weiss-pricing.js?v=weiss-nikke2-1","weiss-ui.js?v=weiss-1","price-engine.js?v=new-games-1","cloud-sync.js?v=purchase-profit-1", "catalog-client.js?v=new-games-1", "scan-engine.js?v=pokemon-jp-position-3","web.css?v=37", "web.js?v=pwa-paths-1", "pwa.js?v=general-scan-1", "live-scan.js?v=weiss-reliable-1", "binder-share.js?v=friends-3", "currency.js?v=trading-1", "add-flow.js?v=search-polish-1", "binders.css?v=37", "binders.mjs?v=ebay-home-2", "binder-core.mjs?v=purchase-profit-1", "binder-store.mjs?v=purchase-profit-1", "experience.css?v=37", "learning.js?v=37", "centering-camera.js?v=centering-view-1", "centering.js?v=centering-grades-1", "app.html", "styles.css?v=37", "storage.js?v=purchase-profit-1", "install.js?v=general-scan-1", "app-experience.js?v=maintenance-20261107-1", "details.js?v=new-games-1", "imaging.js?v=37", "scanner.js?v=weiss-reliable-1", "matching.js?v=pokemon-jp-name-2", "scan-text.js?v=new-games-1", "scan-index.js?v=new-games-1", "neural-evidence.js?v=new-games-1", "neural-scan.js?v=new-games-1", "vision-scan.js?v=mtg-number-first-1", "scan-reader.js?v=weiss-number-first-1", "recognition.js?v=ebay-home-2", "games.js?v=new-games-1", "markets.js?v=search-polish-1", "manifest.json?v=pwa-paths-1", "icon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "assets/charizard.webp", "assets/poncho.webp"].map(path=>new URL(path,BASE).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 for(const url of SHELL){
  const response=await fetch(url,{cache:'reload',credentials:'same-origin'});
  if(!response.ok||response.redirected)throw Error('CardScope shell unavailable');
  await cache.put(url,response);
 }
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith(CACHE_PREFIX)&&key!==CACHE)await caches.delete(key);
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
 if(path.startsWith('assets/catalog/')||path.startsWith('ocr-runtime/')||path.startsWith('ws-ocr/')){
  event.respondWith(caches.open(CACHE).then(async cache=>{
   const hit=await cache.match(event.request);if(hit)return hit;
   const response=await fetch(event.request);
   if(response.ok&&!response.redirected)await cache.put(event.request,response.clone()).catch(()=>{});
   return response;
  }));return;
 }
 if(SHELL.includes(u.href))event.respondWith(caches.open(CACHE).then(async cache=>await cache.match(event.request)||fetch(event.request)));
});
