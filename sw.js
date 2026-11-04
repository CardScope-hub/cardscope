// Resolve every asset against this worker's directory, including GitHub project pages.
const BASE=new URL('./',self.location.href);
const CACHE_PREFIX='cardscope-shell:'+BASE.pathname+':';
const CACHE=CACHE_PREFIX+'weiss-layout-compact-1';
const APP_URL=new URL('app.html',BASE).href;
const SHELL=["weiss-scan.css?v=weiss-layout-compact-1","swu-pl-data.js?v=swu-pl-1","swu-pl.js?v=swu-pl-1","swu-pl.css?v=swu-pl-1","swu-catalog.js?v=swu-1","swu-scan.js?v=swu-portrait-1","swu.css?v=swu-1","catalog-swu.json?v=swu-1","weiss-scan.js?v=weiss-scan-2","mtg-scan.js?v=mtg-auto-open-1","card-copies.js?v=card-copies-1","card-copies.css?v=card-copies-1","mtg-catalog.js?v=mtg-expansions-1","catalog-mtg-expanded.json?v=mtg-expansions-1","catalog-mtg-names.json?v=mtg-expansions-1","pokemon-jp-worker.js?v=pokemon-jp-name-2","pokemon-jp-rec.onnx?v=pokemon-jp-name-2","pokemon-jp-dict.txt?v=pokemon-jp-name-2","pokemon-jp-scan.js?v=pokemon-jp-position-3","pokemon-art.js?v=pokemon-lang-1","pokemon-art.css?v=pokemon-lang-1","pokemon-artwork.json?v=pokemon-lang-1","catalog-pokemon-en.json?v=pokemon-lang-1","catalog-pokemon-ja.json?v=pokemon-lang-1","catalog-pokemon-de.json?v=pokemon-lang-1","catalog-pokemon-fr.json?v=pokemon-lang-1","catalog-pokemon-es.json?v=pokemon-lang-1","catalog-pokemon-it.json?v=pokemon-lang-1","catalog-pokemon-pt.json?v=pokemon-lang-1","origins-pl-data.js?v=riftbound-pl-2","origins-pl.js?v=riftbound-pl-2","origins-pl.css?v=riftbound-pl-2","centering-grades.js?v=centering-grades-1","centering-grades.css?v=centering-grades-1","pokemon-expansions.js?v=pokemon-lang-1","catalog-pokemon-latest.json?v=expansions-1","catalog-riftbound.json?v=expansions-1","centering-view.js?v=centering-lines-1","centering-view.css?v=centering-lines-1","weiss-pricing.js?v=weiss-nikke2-1","weiss-ui.js?v=weiss-1","price-engine.js?v=weiss-nikke2-1","cloud-sync.js?v=collection-calm-1", "catalog-client.js?v=weiss-scan-2", "scan-engine.js?v=pokemon-jp-position-3","web.css?v=37", "web.js?v=pwa-paths-1", "pwa.js?v=37", "live-scan.js?v=weiss-scan-2", "binder-share.js?v=37", "currency.js?v=prices-1", "add-flow.js?v=prices-1", "binders.css?v=37", "binders.mjs?v=card-copies-1", "binder-core.mjs?v=37", "binder-store.mjs?v=cloud-sync-1", "experience.css?v=37", "learning.js?v=37", "centering-camera.js?v=centering-view-1", "centering.js?v=centering-grades-1", "app.html", "styles.css?v=37", "storage.js?v=card-copies-1", "install.js?v=collection-calm-1", "app-experience.js?v=collection-value-1", "details.js?v=pokemon-lang-1", "imaging.js?v=37", "scanner.js?v=weiss-scan-2", "matching.js?v=pokemon-jp-name-2", "scan-text.js?v=swu-1", "scan-index.js?v=swu-1", "neural-evidence.js?v=swu-portrait-1", "neural-scan.js?v=swu-portrait-1", "vision-scan.js?v=mtg-number-first-1", "scan-reader.js?v=weiss-number-first-1", "recognition.js?v=swu-1", "games.js?v=weiss-scan-2", "markets.js?v=swu-1", "manifest.json?v=pwa-paths-1", "icon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "assets/charizard.webp", "assets/poncho.webp"].map(path=>new URL(path,BASE).href);
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
 if(path.startsWith('ocr-runtime/')){
  event.respondWith(caches.open(CACHE).then(async cache=>{
   const hit=await cache.match(event.request);if(hit)return hit;
   const response=await fetch(event.request);
   if(response.ok&&!response.redirected)await cache.put(event.request,response.clone()).catch(()=>{});
   return response;
  }));return;
 }
 if(SHELL.includes(u.href))event.respondWith(caches.open(CACHE).then(async cache=>await cache.match(event.request)||fetch(event.request)));
});
