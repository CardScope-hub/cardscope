// Resolve every asset against this worker's directory, including GitHub project pages.
const BASE=new URL('./',self.location.href);
const CACHE_PREFIX='cardscope-shell:'+BASE.pathname+':';
const CACHE=CACHE_PREFIX+'scanner-paths-1';
const APP_URL=new URL('app.html',BASE).href;
const SHELL=["web.css?v=37", "web.js?v=pwa-paths-1", "pwa.js?v=37", "live-scan.js?v=37", "binder-share.js?v=37", "currency.js?v=37", "add-flow.js?v=37", "binders.css?v=37", "binders.mjs?v=37", "binder-core.mjs?v=37", "binder-store.mjs?v=37", "experience.css?v=37", "learning.js?v=37", "centering-camera.js?v=37", "centering.js?v=37", "app.html", "styles.css?v=37", "storage.js?v=37", "install.js?v=pwa-paths-1", "app-experience.js?v=37", "details.js?v=37", "imaging.js?v=37", "scanner.js?v=37", "matching.js?v=37", "scan-text.js?v=37", "scan-index.js?v=37", "neural-evidence.js?v=37", "neural-scan.js?v=scanner-paths-1", "vision-scan.js?v=37", "scan-reader.js?v=37", "recognition.js?v=37", "games.js?v=37", "markets.js?v=37", "manifest.json?v=pwa-paths-1", "icon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "assets/charizard.webp", "assets/poncho.webp"].map(path=>new URL(path,BASE).href);
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
