// Public SWU-DB snapshot; no login, OCR upload or API key is needed.
globalThis.CardSWU=(()=>{
 const memo=new WeakMap(),T=()=>CardScanText;
 const normalize=s=>String(s||'').normalize('NFKC').toUpperCase().replace(/^(T?)0+(?=\d)/,'$1');
 const positive=v=>v!==null&&v!==''&&Number.isFinite(Number(v))&&Number(v)>0?Number(v):null;
 const identity=c=>c.Set.toUpperCase()+':'+c.Number.toUpperCase();
 function build(d){if(memo.has(d))return memo.get(d);const sets=new Map(d.sets.map(s=>[s.setId.toUpperCase(),s])),raw=new Map(d.cards.map(c=>[identity(c),c])),groups=new Map(),aliases=new Map();
  for(const c of d.cards){let base=c;const key=identity(c),plain=raw.get(c.Set.toUpperCase()+':'+c.Number.replace(/F$/i,''));
   if(/Foil$/i.test(c.VariantType||'')&&/F$/i.test(c.Number)&&plain&&plain.Name===c.Name&&(plain.Subtitle||'')===(c.Subtitle||'')&&(c.VariantType==='Foil'?plain.VariantType==='Normal':c.VariantType.replace(/ Foil$/i,'')===plain.VariantType))base=plain;
   const groupKey=identity(base);if(!groups.has(groupKey))groups.set(groupKey,{base,rows:[]});groups.get(groupKey).rows.push(c);aliases.set(key,groupKey);
  }
  const cards=[];for(const [key,g]of groups){const c=g.base,set=sets.get(c.Set.toUpperCase()),name=[c.Name,c.Subtitle].filter(Boolean).join(' — '),variants=[],offers=[];
   const add=(variant,value,quote,low)=>{if(!variants.includes(variant))variants.push(variant);const amount=positive(value);if(amount===null)return;const id=String(quote.tcgplayerId||c.tcgplayerId||'');if(!/^\d+$/.test(id))return;offers.push({source:'TCGplayer',via:'SWU-DB · katalog z '+d.retrievedAt,metric:'market',amount,currency:'USD',variant,name,set:set?.fullName||c.Set,number:c.Set+'-'+c.Number,updated:null,observedAt:d.retrievedAt,productId:id,url:'https://www.tcgplayer.com/product/'+id,match:'exact',low:positive(low)});};
   for(const row of [...g.rows].sort((a,b)=>(a===c?0:1)-(b===c?0:1))){const isFoil=/Foil$/i.test(row.VariantType||'');add(row.VariantType||'Normal',isFoil?(positive(row.FoilPrice)||row.MarketPrice):row.MarketPrice,row,isFoil?row.LowFoilPrice:row.LowPrice);}
   const foil=(c.VariantType==='Normal'?'Foil':c.VariantType+' Foil');if(!variants.some(v=>/Foil|Showcase|Prestige/i.test(v))&&positive(c.FoilPrice))add(foil,c.FoilPrice,c,c.LowFoilPrice);
   cards.push({gameKey:'swu',game:'Star Wars: Unlimited',id:'swu:'+key,name,primaryName:c.Name,subtitle:c.Subtitle||'',localId:c.Set+'-'+c.Number,collectorNumber:c.Number,set:{id:c.Set,name:set?.fullName||c.Set,cardCount:{}},catalogLanguage:'en',rarity:c.Rarity||'',cardType:c.Type,artworkUrl:c.FrontArt||null,backArtwork:c.BackArt||null,variantsList:variants.length?variants:['Nieustalony'],variants:{},source:'SWU-DB',sourceUrl:'https://api.swu-db.com/cards/'+c.Set.toLowerCase()+'/'+encodeURIComponent(c.Number),marketUrl:'https://www.cardmarket.com/en/StarWarsUnlimited/Products/Search?searchString='+encodeURIComponent([c.Name,c.Subtitle,c.Set,c.Number].filter(Boolean).join(' ')),tcgplayerId:c.tcgplayerId,offers,catalogDate:d.retrievedAt});
  }
  const byId=new Map(cards.map(c=>[c.id,c])),byNumber=new Map(cards.map(c=>[c.set.id+':'+normalize(c.collectorNumber),c])),names=[...new Set(cards.map(c=>c.name))];
  const index={cards,byId,byNumber,names,sets,aliases};memo.set(d,index);return index;
 }
 async function search(params,api){const d=await api.snapshot('swu'),index=build(d),q=String(params.q||'').trim(),page=Math.max(1,Number(params.page)||1),ocr=params.ocr==='1';
  if(params.index==='1')return {names:index.names,retrievedAt:d.retrievedAt};
  if(params.id){const id=String(params.id);return {card:index.byId.get(id)||index.byId.get('swu:'+index.aliases.get(id.replace(/^swu:/,'')))||null};}
  const match=q.toUpperCase().match(/^([A-Z][A-Z0-9]{1,7})\s*[-:# ]\s*(T?\d+[A-Z]*(?:-[A-Z0-9]+)?)(?:\s*\/\s*\d+)?$/),key=T().norm(q);
  let rows=[];const exactNames=ocr?index.cards.filter(c=>T().norm(c.name)===key||T().norm(c.primaryName)===key):[];
  if(match&&index.sets.has(match[1])){const card=index.byNumber.get(match[1]+':'+normalize(match[2]))||index.byId.get('swu:'+index.aliases.get(match[1]+':'+match[2].padStart(3,'0')));if(card)rows=[{card,score:1000}];}
  else if(exactNames.length)rows=exactNames.map(card=>({card,score:T().norm(card.name)===key?300:220}));
  else for(const card of index.cards){const title=T().norm(card.name),primary=T().norm(card.primaryName),set=T().norm(card.set.name);let score=0;
   if(key===title)score=300;else if(key===primary)score=220;else if(q.toUpperCase()===card.set.id||key===set)score=180;else if(/^\d+$/.test(q)&&normalize(q)===normalize(card.collectorNumber))score=180;
   else if(key.length>=2&&key.split(' ').every(x=>title.includes(x)))score=150;
   else if(!ocr&&key.length>=2&&key.split(' ').every(x=>(title+' '+set+' '+T().norm(card.localId)).includes(x)))score=90;
   else if(ocr&&key.length>=4){const full=T().nameScore(card.name,q),main=T().nameScore(card.primaryName,q);if(full>=.82)score=120+Math.round(full*30);else if(main>=.88)score=100+Math.round(main*20);}
   if(score)rows.push({card,score});
  }
  rows.sort((a,b)=>b.score-a.score||a.card.name.localeCompare(b.card.name)||a.card.localId.localeCompare(b.card.localId,undefined,{numeric:true}));
  return {cards:rows.slice((page-1)*36,page*36).map(x=>x.card),total:rows.length,nextPage:rows.length>page*36?page+1:null,catalogCount:index.cards.length,source:'SWU-DB · EN',note:'Katalog z '+d.retrievedAt+'. Wybierz właściwą ilustrację i wariant. Ceny TCGplayer są danymi źródłowymi w USD; kurs waluty wybierzesz u góry.'};
 }
 function syncScanner(){const enabled=typeof currentGame==='function'&&currentGame()==='swu',control=$('swu-scan-options');if(control)control.hidden=!enabled;const guide=$('scan-guide');if(guide)guide.dataset.orientation=enabled?($('swu-orientation')?.value||'portrait'):'portrait';}
 return Object.freeze({build,search,normalize,syncScanner});
})();
