// eBay credentials exist only in the Supabase Edge Function, never in this file.
globalThis.CardEbayPrices=(()=>{
 const cache=new Map(),views=new WeakMap();let owner=null,epoch=0,cooldown=0;
 const auth=()=>globalThis.CardScopeAuth;
 const langs={Angielski:'en','Japoński':'ja','Niemiecki':'de','Francuski':'fr','Hiszpański':'es','Włoski':'it','Portugalski':'pt-br'};
 const games={'Pokémon':'pokemon','Magic: The Gathering':'mtg','Weiß Schwarz':'weiss','One Piece':'onepiece',Riftbound:'riftbound','Star Wars: Unlimited':'swu','Yu-Gi-Oh!':'yugioh','Disney Lorcana':'lorcana'};
 function request(c,variant){const game=c.gameKey||c.catalogGame||games[c.game],language=c.catalogLanguage||langs[c.language]||(game==='weiss-jp'?'ja':'en');let number=String(c.printedNumber||c.localId||c.number||'');if(game==='pokemon'&&!number.includes('/')&&c.set?.cardCount?.official)number+='/'+c.set.cardCount.official;
  let selected=variant||c.variant||c.rarity||'';if(['weiss','weiss-jp'].includes(game)&&!/^(ssp|sp|sec|rrr|rr|sr|ofr|r)$/i.test(selected)&&/^(ssp|sp|sec|rrr|rr|sr|ofr|r)$/i.test(c.rarity||''))selected=c.rarity;
  return {game,name:String(c.name||'').slice(0,160),number:number.slice(0,80),set:String(typeof c.set==='string'?c.set:c.set?.name||'').slice(0,160),language,variant:String(selected).slice(0,60)};
 }
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
 function amount(q){if(globalThis.CardCurrency)return CardCurrency.format(q.amount,q.currency);return new Intl.NumberFormat('pl-PL',{style:'currency',currency:q.currency}).format(q.amount)}
 function endpoint(){try{const cfg=globalThis.CARDSCOPE_SUPABASE,u=new URL(cfg.url);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||!['','/'].includes(u.pathname)||!cfg.publishableKey)return null;return {url:new URL('/functions/v1/ebay-prices',u).href,key:cfg.publishableKey}}catch{return null}}
 function safeOffer(o){const url=globalThis.CardPriceLinks?.safe(o?.url);let host;try{host=new URL(url).hostname}catch{return null}if(!/^([a-z0-9-]+\.)?ebay\.(com|de|co\.uk|pl|fr|it|es|ca|com\.au)$/i.test(host)||!Number.isFinite(o.amount)||o.amount<=0||o.amount>1e7||!['EUR','USD','PLN','GBP'].includes(o.currency)||!o.title)return null;return {...o,url,title:String(o.title).slice(0,250)}}
 async function lookup(body){const user=auth()?.state?.user?.id,cfg=endpoint();if(!user||auth().state.recovery)return {offers:[],note:'Zaloguj się, aby pobrać ceny ofert eBay.'};if(!cfg)return {offers:[],note:'Ceny eBay nie są jeszcze uruchomione. Możesz skorzystać z linków do ofert.'};
  if(owner!==user){owner=user;epoch++;cache.clear()}const run=epoch,key=user+'|'+JSON.stringify(body),hit=cache.get(key);if(hit&&Date.now()-hit.at<900000)return hit.promise;
  if(Date.now()<cooldown)return {offers:[],note:'Ceny eBay są chwilowo niedostępne. Linki do ofert nadal działają.'};
  const entry={at:Date.now()};entry.promise=(async()=>{try{const session=await auth().syncSession(user);if(auth().state.user?.id!==user||run!==epoch)return {offers:[]};const r=await fetch(cfg.url,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json',apikey:cfg.key,Authorization:'Bearer '+session.accessToken},body:JSON.stringify(body),signal:AbortSignal.timeout(35000)});const data=await r.json().catch(()=>({}));if(!r.ok){if([404,503].includes(r.status))cooldown=Date.now()+120000;cache.delete(key);return {offers:[],note:r.status===404||data.code==='NOT_CONFIGURED'?'Ceny eBay nie są jeszcze uruchomione. Możesz skorzystać z linków do ofert.':r.status===401?'Zaloguj się ponownie, aby odświeżyć ceny eBay.':r.status===429?'Limit odświeżania cen eBay. Spróbuj później.':'Nie udało się pobrać cen eBay. Linki do ofert nadal działają.'}}if(auth().state.user?.id!==user||run!==epoch)return {offers:[]};if(data.selection!=='highest-asking-v1')return {offers:[],note:'Zaktualizuj funkcję ebay-prices w Supabase, aby wyświetlać najwyższą ofertę.'};return {offers:(data.offers||[]).map(safeOffer).filter(Boolean).slice(0,1),note:data.offers?.length?'Najwyższa znaleziona cena „Kup teraz”, bez dostawy. Porównujemy pasujące oferty w maksymalnie 200 wynikach eBay US pobranych od najdroższych. Potwierdź wydanie, wariant i stan.':'Nie znaleziono ofert z tym kodem. Sprawdź wyniki bezpośrednio na eBay.'};}catch{cache.delete(key);return {offers:[],note:'Nie udało się pobrać cen eBay. Spróbuj ponownie później.'}}})();cache.set(key,entry);if(cache.size>100)cache.delete(cache.keys().next().value);return entry.promise;
 }
 function render(host,c,variant){
  const link=host?.querySelector('.ebay-strip-link');if(!link||!c)return;
  const body=request(c,variant);if(!body.game||!body.number)return;
  const state={user:auth()?.state?.user?.id,link};views.set(host,state);
  void lookup(body).then(result=>{
   if(views.get(host)!==state||!host.contains(link)||auth()?.state?.user?.id!==state.user)return;
   const q=result.offers?.[0];if(!q)return;
   const price=el('span',amount(q));price.className='ebay-strip-price';price.title='Najwyższa znaleziona cena oferty, bez dostawy';
   link.href=q.url;link.title=q.title+' · najwyższa znaleziona oferta, bez dostawy';link.setAttribute('aria-label','Sprawdź najwyższą znalezioną ofertę na eBay: '+amount(q));link.querySelector('.ebay-strip-arrow').before(price);
  });
 }

 auth()?.subscribe(s=>{const id=s.status==='signed-in'&&!s.recovery?s.user?.id:null;if(id!==owner){owner=id;epoch++;cache.clear();cooldown=0;document.querySelectorAll('.ebay-strip-link').forEach(link=>{link.querySelector('.ebay-strip-price')?.remove();link.href=link.dataset.searchUrl;link.removeAttribute('title');link.removeAttribute('aria-label')})}});
 return Object.freeze({render,request,lookup});
})();
