// Weiss editions are distinct catalog products, not interchangeable finishes.
globalThis.CardWeiss=(()=>{
 const codes={'Rare':'R','Double Rare':'RR','Double Rare Plus':'RR+','Super Rare':'SR','Triple Rare':'RRR','Triple Rare Plus':'RRR+','Special Rare':'SP','Super Special Rare':'SSP','Super Special Plus':'SSP+','Secret Rare':'SEC','Secret Rare Plus':'SEC+','Over-Frame Rare':'OFR','Common':'C','Uncommon':'U','Climax Rare':'CR','Climax Common':'CC','Trial Deck':'TD','Promo':'PR','Promo Plus':'PR+','Promo +':'PR+','Normal':'N','Reprint':'RE','Holo Common':'HC','Holo Uncommon':'HU','Holo Rare':'HR','Holo Double Rare':'HRR','Hololive Parallel':'HLP','Extra Rare':'XR','Special Pack Rare':'SPYR','Kessoku Band Rare':'KBR','BanG Dream Rare':'BDR','JoJo Rare':'JJR','DANDADAN Rare':'DCR','AoButa Rare':'ABR','Fujimi Fantasia Bunko Rare':'FBR'};
 const is=c=>['weiss','weiss-jp'].includes(c?.gameKey||c?.catalogGame);
 const rarity=v=>codes[v]||String(v||'Nieustalona').trim();
 // Normalize Unicode spelling only for price identity; keep the displayed/saved rarity unchanged.
 const rarityKey=v=>rarity(v).normalize('NFKC').toUpperCase();
 const number=v=>String(v||'').trim().toUpperCase().replaceAll('／','/').replace(/[－−]/g,'-');
 const family=v=>number(v).match(/^([A-Z0-9@!]+\/[A-Z0-9]+-[A-Z]*\d+)/)?.[1]||number(v);
 function japaneseOffer(c,data){const code=number(c.localId),r=rarity(c.rarity),row=data?.japanese?.rows?.[code+'|'+r.toUpperCase()];
  if(c.priceIdentityAmbiguous||!row||number(row.number)!==code||rarity(row.rarity).toUpperCase()!==r.toUpperCase()||row.currency!=='USD'||!Number.isFinite(row.amount)||row.amount<=0||row.amount>10000000)return [];
  let url;try{url=new URL(row.url);if(url.protocol!=='https:'||!['novatcg.com','www.novatcg.com'].includes(url.hostname))return []}catch{return []}
  const date=String(row.observedAt||'').replace(/(\.\d{3})\d+(?=Z|[+-])/,'$1');if(!Number.isFinite(Date.parse(date)))return [];const observedAt=new Date(date).toISOString();
  return [{source:'NovaTCG · JP',via:'Japońskie wydanie · cena sklepu, nie średnia rynku',amount:row.amount,currency:'USD',variant:r,rarity:r,metric:row.inStock?'retail':'retail-unavailable',name:c.name,set:c.set?.name,number:code,updated:observedAt,observedAt,productId:row.productId,url:url.href,match:'exact',inStock:row.inStock===true}];
 }
 function selectedVariant(card,c){const old=card.variant;if(is(c)&&(!old||['Nieustalony','Normal','Foil','Holo'].includes(old)))return rarity(c.rarity);return old}
 function republicSearchUrl(c){const game=c?.gameKey||c?.catalogGame,code=c?.localId||c?.number;if(game!=='weiss-jp'||!code)return null;return 'https://tcgrepublic.com/product/text_search.html?'+new URLSearchParams({category:'31',q:code}).toString();}
 function republicOffer(c,data){
  if((c?.gameKey||c?.catalogGame)!=='weiss-jp'||c.catalogLanguage&&c.catalogLanguage!=='ja'||c.priceIdentityAmbiguous)return [];
  const source=data?.republic,code=number(c.localId),r=rarity(c.rarity),key=code+'|'+rarityKey(r),row=source?.rows?.[key];
  if(/-(?:E|TE|PE)\d/.test(code)||code.includes('/EN-'))return [];
  if(data?.schema!==1||source?.language!=='ja'||source?.currency!=='USD'||source?.kind!=='retail'||source?.ambiguous?.includes(key)||!row)return [];
  if(row.catalogId&&row.catalogId!==String(c.id))return [];
  if(number(row.number)!==code||rarityKey(row.rarity)!==rarityKey(r)||row.currency!=='USD'||typeof row.inStock!=='boolean'||!Number.isFinite(row.amount)||row.amount<=0||row.amount>10000000||!/^\d+$/.test(String(row.productId)))return [];
  let url;try{url=new URL(row.url);if(url.protocol!=='https:'||url.hostname!=='tcgrepublic.com'||url.pathname!=='/product/product_page_'+row.productId+'.html'||url.username||url.password)return []}catch{return []}
  const date=String(row.observedAt||'').replace(/(\.\d{3})\d+(?=Z|[+-])/,'$1');if(!Number.isFinite(Date.parse(date)))return [];const observedAt=new Date(date).toISOString();
  return [{source:'TCG Republic · JP',via:row.inStock?'Cena oferty sklepu dla tego numeru i rzadkości JP · nie średnia transakcji':'Cena katalogowa sklepu dla tego numeru i rzadkości JP · produkt niedostępny',amount:row.amount,currency:'USD',variant:r,rarity:r,metric:row.inStock?'retail':'retail-unavailable',name:c.name,set:c.set?.name,number:code,updated:observedAt,observedAt,productId:String(row.productId),url:url.href,match:'exact',inStock:row.inStock}];
 }
 const sourceKey=o=>o?.source==='Cardmarket'?'cardmarket':o?.source==='TCGplayer'?'tcgplayer':o?.source==='NovaTCG · JP'?'novatcg-jp':o?.source==='TCG Republic · JP'?'tcgrepublic-jp':'optcg-market';
 return Object.freeze({is,rarity,number,family,japaneseOffer,republicOffer,republicSearchUrl,selectedVariant,sourceKey});
})();
