// Production eBay Browse API only. No scraping, auction bids, or invented prices.
const names={pokemon:'Pokemon',mtg:'Magic Gathering',onepiece:'One Piece',weiss:'Weiss Schwarz','weiss-jp':'Weiss Schwarz',riftbound:'Riftbound',swu:'Star Wars Unlimited',yugioh:'Yu-Gi-Oh',lorcana:'Disney Lorcana'};
const languages={en:'English',ja:'Japanese',de:'German',fr:'French',es:'Spanish',it:'Italian','pt-br':'Portuguese'};
const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\b0+(?=\d)/g,'').trim();
function validate(input){if(!input||!names[input.game]||!languages[input.language])throw Error('INVALID_CARD');for(const [k,max] of [['name',160],['number',80],['set',160],['variant',60]])if(typeof input[k]!=='string'||input[k].length>max)throw Error('INVALID_CARD');if(!input.name.trim()||!/[0-9]/.test(input.number))throw Error('INVALID_CARD');return Object.fromEntries(['game','language','name','number','set','variant'].map(k=>[k,input[k].trim()]));}
function query(c){return [names[c.game],c.number,languages[c.language],c.name,c.set,['Nieustalony','Normal','Inny'].includes(c.variant)?'':c.variant].map(s=>String(s).replace(/[^\p{L}\p{N}\s/.-]/gu,' ')).join(' ').replace(/\s+/g,' ').trim().slice(0,200)}
function offers(items,c,observedAt){const out=[];for(const item of items||[]){const title=String(item.title||''),text=norm(title),code=norm(c.number);
 if(!item.buyingOptions?.includes('FIXED_PRICE')||item.itemGroupHref||!(' '+text+' ').includes(' '+code+' '))continue;
 const words=norm(c.name).split(' ').filter(w=>w.length>=3&&!['the','and','for','with'].includes(w));
 const named=words.filter(w=>(' '+text+' ').includes(' '+w+' ')).length>=Math.min(2,words.length);
 // A Japanese Weiss name is often translated in the listing. Its full printed
 // series + number is usable; a short Pokemon number alone is not identity.
 if(!named&&!(c.language==='ja'&&/[a-z]{2,}/i.test(c.number)))continue;
 // Lots, replicas, graded slabs and accessories are not a single raw card quote.
 if(/\b(lot|bundle|playset|proxy|replica|custom|digital|booster|pack|sleeves?|psa|bgs|cgc|graded)\b|\bx\d+\b/i.test(text))continue;
 const lang=Object.entries(languages).find(([,v])=>new RegExp('\\b'+v+'\\b','i').test(text));if(lang&&lang[0]!==c.language)continue;
 const v=norm(c.variant);if(v==='normal'&&/\b(foil|holo|etched)\b/.test(text)&&!/\b(non foil|non holo)\b/.test(text))continue;if(v.includes('reverse')&&/\b(non holo|non foil)\b/.test(text))continue;if(['foil','holo'].includes(v)&&/\b(non foil|non holo|reverse)\b/.test(text))continue;
 if(['weiss','weiss-jp'].includes(c.game)){const rarity=text.match(/\b(ssp|sp|sec|rrr|rr|sr|ofr|r)\b/i)?.[1];if(rarity&&/^(ssp|sp|sec|rrr|rr|sr|ofr|r)$/.test(v)&&v!==rarity)continue;}
 const amount=Number(item.price?.value),currency=item.price?.currency;let url;try{url=new URL(item.itemWebUrl)}catch{continue}if(url.protocol!=='https:'||url.username||url.password||!/^([a-z0-9-]+\.)?ebay\.(com|de|co\.uk|pl|fr|it|es|ca|com\.au)$/i.test(url.hostname)||!Number.isFinite(amount)||amount<=0||amount>1e7||!['USD','EUR','PLN','GBP'].includes(currency))continue;
 out.push({source:'eBay',amount,currency,title:title.slice(0,250),condition:String(item.condition||'Stan: sprawdź ofertę').slice(0,100),url:url.href,observedAt,metric:'asking',match:'candidate'});
 }return out;}
// Compare only the card price, not shipping. Mixed currencies require live FX.
function highestOffer(rows,rates){
 if(!rows.length)return null;const currencies=new Set(rows.map(x=>x.currency));
 if(currencies.size>1&&[...currencies].some(c=>!Number.isFinite(rates?.[c])||rates[c]<=0))throw Error('FX_UNAVAILABLE');
 const score=q=>q.amount*(currencies.size===1?1:rates[q.currency]);
 return rows.reduce((best,q)=>!best||score(q)>score(best)?q:best,null);
}
function createHandler({env,fetcher=fetch,now=Date.now}){
 let token=null,tokenUntil=0,tokenPromise=null,fx=null,fxUntil=0;const cache=new Map();
 const get=async(url,opts={})=>fetcher(url,{...opts,signal:AbortSignal.timeout(6000)});
 async function accessToken(){if(token&&now()<tokenUntil)return token;if(tokenPromise)return tokenPromise;tokenPromise=(async()=>{const r=await get('https://api.ebay.com/identity/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+btoa(env('EBAY_CLIENT_ID')+':'+env('EBAY_CLIENT_SECRET')),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope'});if(!r.ok)throw Error('EBAY_AUTH');const d=await r.json();if(typeof d.access_token!=='string'||!Number.isFinite(d.expires_in))throw Error('EBAY_AUTH');token=d.access_token;tokenUntil=now()+Math.max(0,d.expires_in-120)*1000;return token})().finally(()=>{tokenPromise=null});return tokenPromise;}
 return async req=>{
 const origin=req.headers.get('Origin'),origins=(env('CARDSCOPE_SITE_ORIGIN')||'https://cardscope-hub.github.io').split(',').map(x=>x.trim());const cors={'Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};if(origin&&origins.includes(origin))cors['Access-Control-Allow-Origin']=origin;
 const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
 if(origin&&!origins.includes(origin))return reply(403,{code:'ORIGIN'});if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});if(req.method!=='POST')return reply(405,{code:'METHOD'});
 const authorization=req.headers.get('Authorization')||'';if(!/^Bearer [\w.-]+$/.test(authorization))return reply(401,{code:'AUTH_REQUIRED'});
 if(!env('EBAY_CLIENT_ID')||!env('EBAY_CLIENT_SECRET'))return reply(503,{code:'NOT_CONFIGURED'});
 try{
  if(Number(req.headers.get('Content-Length'))>4096)return reply(413,{code:'SIZE'});const raw=await req.text();if(raw.length>4096)return reply(413,{code:'SIZE'});let c;try{c=validate(JSON.parse(raw))}catch{return reply(400,{code:'INVALID_CARD'})}
  const supabase=env('SUPABASE_URL'),anon=env('SUPABASE_ANON_KEY');if(!supabase||!anon)return reply(503,{code:'NOT_CONFIGURED'});
  const headers={apikey:anon,Authorization:authorization,'Content-Type':'application/json'};const user=await get(supabase+'/auth/v1/user',{headers});if(!user.ok||!(await user.json()).id)return reply(401,{code:'AUTH_REQUIRED'});
  const key=JSON.stringify(c),hit=cache.get(key);if(hit&&now()-hit.at<900000)return reply(200,hit.data);
  // Durable per-account + app-wide budgets; the RPC uses the verified user JWT.
  const budget=await get(supabase+'/rest/v1/rpc/cardscope_ebay_allow_v1',{method:'POST',headers,body:'{}'});if(!budget.ok)return reply(503,{code:'BUDGET_SETUP'});if(await budget.json()!==true)return reply(429,{code:'RATE_LIMIT'});
  const bearer=await accessToken(),url='https://api.ebay.com/buy/browse/v1/item_summary/search?'+new URLSearchParams({q:query(c),limit:'200',sort:'-price',filter:'buyingOptions:{FIXED_PRICE}'});const r=await get(url,{headers:{Authorization:'Bearer '+bearer,'X-EBAY-C-MARKETPLACE-ID':'EBAY_US'}});
  if(r.status===401){token=null;tokenUntil=0}if(!r.ok)return reply(r.status===429?429:502,{code:'EBAY_UNAVAILABLE'});const result=await r.json(),candidates=offers(result.itemSummaries,c,new Date(now()).toISOString());
  if(new Set(candidates.map(q=>q.currency)).size>1&&(!fx||now()>=fxUntil)){const response=await get('https://api.nbp.pl/api/exchangerates/tables/A/?format=json');if(!response.ok)throw Error('FX_UNAVAILABLE');const rows=await response.json();fx={PLN:1,...Object.fromEntries((rows[0]?.rates||[]).map(row=>[row.code,row.mid]))};fxUntil=now()+3600000;}
  const highest=highestOffer(candidates,fx),data={selection:'highest-asking-v1',offers:highest?[highest]:[],scope:{marketplace:'EBAY_US',examined:result.itemSummaries?.length||0,total:Number(result.total)||0,limit:200},note:'Najwyższa cena samej karty spośród pasujących ofert w maksymalnie 200 wynikach eBay US, pobranych od najdroższych. To cena wystawienia, nie potwierdzona cena sprzedaży.'};cache.set(key,{at:now(),data});if(cache.size>300)cache.delete(cache.keys().next().value);return reply(200,data);
 }catch{return reply(502,{code:'UPSTREAM_UNAVAILABLE'})}
 };
}

Deno.serve(createHandler({env:(key:string)=>Deno.env.get(key)}));
