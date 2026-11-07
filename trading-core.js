// Pure trade values: unknown prices and currencies never become zero quotes.
globalThis.CardTradeCore=(()=>{
 'use strict';
 const games=['pokemon','mtg','onepiece','weiss','weiss-jp','riftbound','swu'];
 const currencies=['PLN','EUR','USD'];
 const text=(v,n=200)=>typeof v==='string'?v.slice(0,n):'';
 function safeURL(v){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}}
 function quote(q){return q&&Number.isFinite(q.amount)&&q.amount>=0&&q.amount<=1e7&&currencies.includes(q.currency)?{amount:q.amount,currency:q.currency,source:text(q.source,100),variant:text(q.variant,80),updated:text(q.updated,80),url:safeURL(q.url),metric:text(q.metric,60),manual:q.manual===true}:null}
 function identity(c,variant){return [c.gameKey||'pokemon',c.catalogLanguage||'en',c.id,variant].join('|')}
 function card(c){if(!c||!text(c.id)||!text(c.name))return null;const game=games.includes(c.gameKey)?c.gameKey:'pokemon';return {id:text(c.id),name:text(c.name),gameKey:game,catalogLanguage:text(c.catalogLanguage,10)||'en',localId:text(c.localId,80),printedNumber:text(c.printedNumber,80),set:{id:text(c.set?.id,80),name:text(c.set?.name)},rarity:text(c.rarity,40),artworkUrl:safeURL(c.artworkUrl),backArtwork:safeURL(c.backArtwork)}}
 function summarize(rows,convert){let value=0,quantity=0,priced=0,missing=0,noRate=0,pending=0;
  for(const row of rows){const qty=row.qty;quantity+=qty;if(row.loading)pending+=qty;const q=quote(row.quote);if(!q){missing+=qty;continue}const n=convert(q.amount,q.currency);if(!Number.isFinite(n)||n<0){noRate+=qty;continue}value+=n*qty;priced+=qty;}
  return {cents:Math.round(value*100),quantity,priced,missing,noRate,pending,complete:missing===0&&noRate===0};
 }
 function comparison(left,right){if(!left.quantity||!right.quantity)return {state:'empty',cents:null};if(!left.complete||!right.complete)return {state:'incomplete',cents:null};const cents=right.cents-left.cents;return {state:cents===0?'equal':cents>0?'right':'left',cents:Math.abs(cents)}}
 function pack(sides){return {version:1,sides:sides.map(rows=>rows.slice(0,60).map(row=>({id:row.id,card:card(row.card),qty:row.qty,variant:text(row.variant,80),quote:quote(row.quote)})).filter(r=>r.card))}}
 function unpack(value){if(value?.version!==1||!Array.isArray(value.sides)||value.sides.length!==2)return [[],[]];const seen=new Set();return value.sides.map(rows=>Array.isArray(rows)?rows.slice(0,60).flatMap(r=>{const c=card(r?.card);if(!c||!Number.isInteger(r.qty)||r.qty<1||r.qty>999||!text(r.id,80)||seen.has(r.id))return [];seen.add(r.id);return [{id:text(r.id,80),card:c,qty:r.qty,variant:text(r.variant,80)||'Nieustalony',quote:quote(r.quote),raw:null,offers:[],loading:false,error:'',priceRun:0}]}):[])}
 return Object.freeze({games,currencies,quote,identity,card,safeURL,summarize,comparison,pack,unpack});
})();
