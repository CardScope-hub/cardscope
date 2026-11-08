// Manual lookup only: OCR confidence and scanner matching remain independent.
globalThis.CardQuickSearch=(()=>{
 const games=['pokemon','mtg','onepiece','weiss','weiss-jp','riftbound','swu','lorcana','cyberpunk'];
 const clean=q=>String(q||'').normalize('NFKC').replace(/[‐‑–—−]/g,'-').trim();
 const pokemonAliases={SSH:'swsh1',RCL:'swsh2',DAA:'swsh3',CPA:'swsh3.5',VIV:'swsh4',SHF:'swsh4.5',BST:'swsh5',CRE:'swsh6',EVS:'swsh7',FST:'swsh8',BRS:'swsh9',ASR:'swsh10',PGO:'swsh10.5',LOR:'swsh11',SIT:'swsh12',CRZ:'swsh12.5',SVI:'sv01',PAL:'sv02',OBF:'sv03',MEW:'sv03.5',PAR:'sv04',PAF:'sv04.5',TEF:'sv05',TWM:'sv06',SFA:'sv06.5',SCR:'sv07',SSP:'sv08',PRE:'sv08.5',JTG:'sv09',DRI:'sv10',BLK:'sv10.5b',WHT:'sv10.5w',MEG:'me01',PFL:'me02',ASC:'me02.5',POR:'me03',CRI:'me04',PBL:'me05'};
 function canonical(game,value){const q=clean(value);
  if(game==='onepiece')return q.replace(/^(OP|EB|ST|PRB)\s*(\d{2})\s*[- ]\s*(\d{3})(.*)$/i,(_,s,n,c,rest)=>s.toUpperCase()+n+'-'+c+rest);
  if(game==='riftbound')return q.replace(/^([a-z]{2,6})\s*[- ]\s*(\d+[a-z*]?)\s*\/\s*(\d+)$/i,'$1-$2-$3');
  if(game==='weiss'||game==='weiss-jp')return q.replace(/\s*([/\-])\s*/g,'$1');
  return q;
 }
 function gamesFor(value){const q=clean(value);
  if(/^β\s*\d|^(?:WNC|WTNC|WNCB|WNCR|BETA|RETAIL)\s*[:#-]?\s*\d/i.test(q))return ['cyberpunk'];
  if(/^\d{1,3}[a-z]?\s*(?:\/\s*(?:\d{1,3}|P\d+))?\s+[•· ]*(?:EN|ENG)\s+[•· ]*(?:\d{1,2}|Q\d)$/i.test(q))return ['lorcana'];
  if(/^[\w-]+\s*\/\s*[SW]\w*\s*-\s*(?:E[N]?)?\d/i.test(q))return ['weiss','weiss-jp'];
  if(/^(OP|EB|ST|PRB)\s*\d{2}\s*[- ]\s*\d{3}/i.test(q))return ['onepiece'];
  // POR is both Pokémon Perfect Order and Magic's Portal; keep both catalogs.
  const prefix=q.match(/^([a-z]{3})\s*[-:# ]\s*(?:[a-z]{0,3})?\d/i)?.[1].toUpperCase();if(pokemonAliases[prefix]&&prefix!=='POR')return ['pokemon'];
  return [...games];
 }
 function pokemon(catalog,sets,value){const q=clean(value),key=normalize(q),id=catalog.find(c=>normalize(c.id)===key);
  if(id)return rankCatalog([id],sets,id.localId);
  // Match the longest series alias first; punctuation in set IDs is significant.
  const scopes=[];
  for(const set of sets){const aliases=[set.id,set.name,set.abbreviation?.official,...(set.aliases||[]),...Object.entries(pokemonAliases).filter(([,id])=>[id,id+'tg',id+'gg',id+'sv'].includes(set.id)).map(([a])=>a)];
   for(const a of aliases.filter(Boolean)){const escaped=String(a).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),m=q.match(new RegExp('^'+escaped+'(?:\\s*[:#-]\\s*|\\s+)(.+)$','i'));if(m)scopes.push({set,rest:m[1],length:String(a).length});}
  }
  scopes.sort((a,b)=>b.length-a.length);const scope=scopes[0],scopeIds=new Set(scopes.filter(x=>x.length===scope?.length&&x.rest===scope.rest).map(x=>x.set.id));
  const fraction=(scope?.rest||q).match(/^([a-z]{0,4}\d{1,4}[a-z]?)\s*(?:[/／]\s*([a-z]{0,4}\d{1,4}))?$/i);
  if(fraction){const local=cardNumber(fraction[1]),total=fraction[2]&&cardNumber(fraction[2]);const map=new Map(sets.map(s=>[s.id,s]));
   return catalog.filter(c=>{const sid=c.setId||c.id.slice(0,c.id.lastIndexOf('-'));if(scope&&!scopeIds.has(sid))return false;const number=cardNumber(c.localId);if(number!==local&&!(['svp','mep'].includes(sid)&&sid.toUpperCase()+number===local))return false;if(!total)return true;const printed=String(c.printedNumber||'').split('/')[1];let expected=cardNumber(printed||c.printedTotal||map.get(sid)?.cardCount?.official);if(!printed&&/^[A-Z]+/.test(total)&&/^\d+$/.test(expected))expected=(number.match(/^[A-Z]+/)?.[0]||'')+expected;return expected===total;}).map(c=>({c,set:map.get(c.setId||c.id.slice(0,c.id.lastIndexOf('-'))),num:true,full:total?{clean:true,total}:null,score:200,certain:false}));
  }
  // An unknown series is not permission to choose any card with that number.
  if(!scope&&/^[a-z][a-z\d.]{1,12}\s*[-:# ]\s*[a-z]{0,4}\d+(?:\s*\/\s*\d+)?$/i.test(q))return [];
  return rankManualCatalog(catalog,sets,q);
 }
 async function page(game,q,language='en',page=1){if(game==='pokemon'){const index=await getCatalog(language),ranked=pokemon(index.cards,index.sets,q);return {cards:ranked.slice((page-1)*36,page*36).map(r=>({...r.c,_pokemon:true,_set:r.set,set:r.set,gameKey:'pokemon',catalogLanguage:language})),nextPage:ranked.length>page*36?page+1:null,total:ranked.length};}return CardCatalog.search({game,q:canonical(game,q),page,ocr:'0'});}
 return Object.freeze({games,canonical,gamesFor,pokemon,page});
})();
