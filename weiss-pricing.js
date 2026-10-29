// Weiss editions are distinct catalog products, not interchangeable finishes.
globalThis.CardWeiss=(()=>{
 const codes={'Rare':'R','Double Rare':'RR','Double Rare Plus':'RR+','Super Rare':'SR','Triple Rare':'RRR','Triple Rare Plus':'RRR+','Special Rare':'SP','Super Special Rare':'SSP','Super Special Plus':'SSP+','Secret Rare':'SEC','Secret Rare Plus':'SEC+','Over-Frame Rare':'OFR','Common':'C','Uncommon':'U','Climax Rare':'CR','Climax Common':'CC','Trial Deck':'TD','Promo':'PR','Promo Plus':'PR+','Promo +':'PR+','Normal':'N','Reprint':'RE','Holo Common':'HC','Holo Uncommon':'HU','Holo Rare':'HR','Holo Double Rare':'HRR','Hololive Parallel':'HLP','Extra Rare':'XR','Special Pack Rare':'SPYR','Kessoku Band Rare':'KBR','BanG Dream Rare':'BDR','JoJo Rare':'JJR','DANDADAN Rare':'DCR','AoButa Rare':'ABR','Fujimi Fantasia Bunko Rare':'FBR'};
 const is=c=>['weiss','weiss-jp'].includes(c?.gameKey||c?.catalogGame);
 const rarity=v=>codes[v]||String(v||'Nieustalona').trim();
 const number=v=>String(v||'').trim().toUpperCase().replaceAll('／','/').replace(/[－−]/g,'-');
 const family=v=>number(v).match(/^([A-Z0-9@!]+\/[A-Z0-9]+-[A-Z]*\d+)/)?.[1]||number(v);
 function japaneseOffer(c,data){const code=number(c.localId),r=rarity(c.rarity),row=data?.japanese?.rows?.[code+'|'+r.toUpperCase()];
  if(c.priceIdentityAmbiguous||!row||number(row.number)!==code||rarity(row.rarity).toUpperCase()!==r.toUpperCase()||row.currency!=='USD'||!Number.isFinite(row.amount)||row.amount<=0||row.amount>10000000)return [];
  let url;try{url=new URL(row.url);if(url.protocol!=='https:'||!['novatcg.com','www.novatcg.com'].includes(url.hostname))return []}catch{return []}
  const date=String(row.observedAt||'').replace(/(\.\d{3})\d+(?=Z|[+-])/,'$1');if(!Number.isFinite(Date.parse(date)))return [];const observedAt=new Date(date).toISOString();
  return [{source:'NovaTCG · JP',via:'Japońskie wydanie · cena sklepu, nie średnia rynku',amount:row.amount,currency:'USD',variant:r,rarity:r,metric:row.inStock?'retail':'retail-unavailable',name:c.name,set:c.set?.name,number:code,updated:observedAt,observedAt,productId:row.productId,url:url.href,match:'exact',inStock:row.inStock===true}];
 }
 function selectedVariant(card,c){const old=card.variant;if(is(c)&&(!old||['Nieustalony','Normal','Foil','Holo'].includes(old)))return rarity(c.rarity);return old}
 const sourceKey=o=>o?.source==='Cardmarket'?'cardmarket':o?.source==='TCGplayer'?'tcgplayer':o?.source==='NovaTCG · JP'?'novatcg-jp':'optcg-market';
 return Object.freeze({is,rarity,number,family,japaneseOffer,selectedVariant,sourceKey});
})();
