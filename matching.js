// Pure catalog matching: rank every edition before paginating the UI.
const normalize=s=>String(s??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const cardNumber=s=>String(s??'').toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/^(\D*)0+(?=\d)/,'$1');
// Set browsing is manual-only. It must never loosen scanner confidence.
function rankManualCatalog(catalog,sets,text){
 const key=normalize(text),id=catalog.find(c=>normalize(c.id)===key);
 if(id)return rankCatalog([id],sets,id.localId);
 const scopes=[];
 for(const set of sets)for(const alias of [set.name,set.id,set.abbreviation?.official,...(set.aliases||[])].filter(Boolean)){
  const token=normalize(alias);if(token.length<3)continue;
  const pos=(' '+key+' ').indexOf(' '+token+' ');
  if(pos>=0)scopes.push({set,token,pos});
 }
 scopes.sort((a,b)=>b.token.length-a.token.length);
 const scope=scopes[0];let rows=catalog,query=text;
 if(scope){rows=catalog.filter(c=>(c.setId||c.id.slice(0,c.id.lastIndexOf('-')))===scope.set.id);query=(' '+key+' ').replace(' '+scope.token+' ',' ').trim();}
 const exact=rows.filter(c=>c.printedNumber&&normalize(c.printedNumber)===normalize(query));
 if(exact.length)return rankCatalog(exact,sets,exact[0].localId);
 if(scope&&!query)return rows.map(c=>({c,set:scope.set,name:0,num:false,full:null,score:0,certain:false}));
 return rankCatalog(rows,sets,query);
}
function editDistance(a,b){if(Math.abs(a.length-b.length)>2)return 99;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]!==b[j-1]));prev=next}return prev[b.length]}
function readEvidence(text){text=String(text).replace(/\b[A-Z]{2,5}(?:EN|FR|DE|IT|ES|PT|JP)(?=[0-9OIL]{1,4}\s*[/／])/gi,' ');const lines=String(text).split('\n').map(normalize).filter(Boolean),numbers=[];for(const m of String(text).toUpperCase().matchAll(/\b([A-Z]{0,4}[0-9OIL]{1,4})\s*[/／]\s*([A-Z]{0,4}[0-9OIL]{1,4})\b/g)){const fix=s=>s.replace(/\s/g,'').replace(/[OIL]+(?=[0-9OIL]*$)/g,x=>x.replace(/O/g,'0').replace(/[IL]/g,'1'));numbers.push({local:cardNumber(fix(m[1])),total:cardNumber(fix(m[2])),clean:!/[OIL]/.test(m[1]+m[2])})}for(const m of String(text).toUpperCase().matchAll(/\b(SWSH|SVP|SM|XY|BW|HGSS|DP|TG|GG|SV)(?:\s*(?:EN|FR|DE|IT|ES|PT|JP))?\s*(\d{1,4})\b/g))numbers.push({local:cardNumber(m[1]+m[2]),total:null,clean:true});return {lines,numbers}}
function nameScore(name,lines){const n=normalize(name);let best=0;for(const line of lines){if(CardScanText.compact(line)===CardScanText.compact(name)||(' '+line+' ').includes(' '+n+' '))return 1;const base=name.replace(/\s+(?:ex|gx|vmax|vstar|v|lv\.?x)$/i,'');const score=Math.max(CardScanText.nameScore(name,line),base!==name?CardScanText.nameScore(base,line)*.94:0);const length=CardScanText.compact(name).length;const threshold=length<5?.99:length<9?.79:.75;if(score>=threshold)best=Math.max(best,score===1?.98:score)}return best}
function rankCatalog(catalog,sets,text,options={}){const evidence=readEvidence(text),names=new Map(),setMap=new Map(sets.map(s=>[s.id,s]));const direct=normalize(text);return catalog.map(c=>{const setId=c.setId||c.id.slice(0,c.id.lastIndexOf('-')),set=setMap.get(setId),n=normalize(c.name);if(!names.has(n))names.set(n,nameScore(c.name,options.nameLines||evidence.lines));const name=names.get(n),number=cardNumber(c.localId);const hits=evidence.numbers.filter(x=>x.local===number||setId==='svp'&&x.local==='SVP'+number);const full=hits.find(x=>x.total&&(/^\d+$/.test(x.total)?Number(x.total)===(c.printedTotal??set?.cardCount?.official):x.total.replace(/\d/g,'')===number.replace(/\d/g,'')));const num=hits.length>0||direct===normalize(c.localId)||direct===normalize(c.id);const setMatch=set&&(' '+direct+' ').includes(' '+normalize(set.name)+' ');return {c,set,name,num,full,score:name*100+(num?55:0)+(full?45:0)+(setMatch?25:0),certain:name===1&&!!full?.clean&&/^\d+$/.test(full.total)};}).filter(x=>x.name>=.75||x.num).sort((a,b)=>b.score-a.score||a.c.id.localeCompare(b.c.id))}
// Auto-selection uses header/footer evidence, never names mentioned in attack text.
function rankScanCatalogBase(catalog,sets,evidence){const header=evidence.names.map(x=>x.text).join('\n'),footer=evidence.numbers.map(x=>x.text).join('\n');const primary=rankCatalog(catalog,sets,header+'\n'+footer,{nameLines:readEvidence(header).lines}),fallback=rankCatalog(catalog,sets,evidence.full||'');const reliableNames=evidence.names.filter(x=>x.confidence>=45).map(x=>x.text).join('\n'),reliableNumbers=evidence.numbers.filter(x=>x.confidence>=40).map(x=>x.text).join('\n');const reliable=rankCatalog(catalog,sets,reliableNames+'\n'+reliableNumbers,{nameLines:readEvidence(reliableNames).lines}),eligible=new Set(reliable.filter(x=>x.certain).map(x=>x.c.id));const numberPairs=new Set(readEvidence(footer).numbers.filter(n=>n.clean&&n.total&&/^\d+$/.test(n.total)).map(n=>n.local+'/'+n.total));const result=primary.map(x=>({...x,certain:x.certain&&eligible.has(x.c.id)&&nameScore(x.c.name,readEvidence(reliableNames).lines)===1&&numberPairs.size===1}));const ids=new Set(result.map(x=>x.c.id));for(const x of fallback)if(!ids.has(x.c.id))result.push({...x,certain:false,score:x.score*.7});result.sort((a,b)=>b.score-a.score);if(result[1]&&result[0].score-result[1].score<12)result[0].certain=false;return result}

// A missing stylized ex badge is recoverable only from a unique name + printed fraction.
function missingEx(name,lines){
 if(!/\s+ex$/i.test(name))return false;
 const base=CardScanText.compact(name.replace(/\s+ex$/i,''));if(base.length<5)return false;
 return lines.some(line=>{const cleaned=normalize(line).replace(/\bhp\s*\d+\b/g,' ').replace(/\b(?:basic|stage|hp)\b/g,' ').replace(/\b\d+\b/g,' ').trim(),read=CardScanText.compact(cleaned);return [base,base+'e',base+'x'].includes(read)});
}
// Narrow the OCR search before edit-distance ranking. Full-card rules text must
// not trigger expensive comparisons against every name on every camera frame.
const pokemonScanIndexes=new WeakMap();
function scanCandidatePool(catalog,evidence){
 if(catalog.length<500||!globalThis.CardScanIndex)return catalog;
 let index=pokemonScanIndexes.get(catalog);if(!index){const byName=new Map(),byNumber=new Map();for(const c of catalog){if(!byName.has(c.name))byName.set(c.name,[]);byName.get(c.name).push(c);const n=cardNumber(c.localId);if(!byNumber.has(n))byNumber.set(n,[]);byNumber.get(n).push(c);if(c.id.startsWith('svp-')){const p='SVP'+n;if(!byNumber.has(p))byNumber.set(p,[]);byNumber.get(p).push(c)}}index={byName,byNumber,names:[...byName.keys()]};pokemonScanIndexes.set(catalog,index)}
 const found=new Map();const add=c=>found.set(c.id,c);
 for(const s of CardScanIndex.suggest(index.names,evidence))for(const c of index.byName.get(s.name)||[])add(c);
 const footer=evidence.numbers.map(x=>x.text).join('\n');
 for(const n of readEvidence(footer||evidence.full).numbers)for(const c of index.byNumber.get(n.local)||[])add(c);
 return [...found.values()];
}
function rankScanCatalog(catalog,sets,evidence){
 if(evidence.language==='ja')return CardPokemonJP.rank(catalog,sets,evidence);
 catalog=scanCandidatePool(catalog,evidence);
 let ranked=rankScanCatalogBase(catalog,sets,evidence);
 const names=readEvidence(evidence.names.filter(x=>x.confidence>=65).map(x=>x.text).join('\n')).lines;
 const numbers=readEvidence(evidence.numbers.map(x=>x.text).join('\n')).numbers;
 const reliable=readEvidence(evidence.numbers.filter(x=>x.confidence>=65).map(x=>x.text).join('\n')).numbers;
 const pairs=new Set(numbers.filter(n=>n.total).map(n=>n.local+'/'+n.total));
 if(pairs.size===1&&reliable.some(n=>n.clean&&n.total)){
  const exact=ranked.filter(x=>x.full?.clean);if(exact.length){
   const joint=exact.filter(x=>x.name>=.75);ranked=joint.length?joint:exact;
   if(ranked.length===1&&missingEx(ranked[0].c.name,names))ranked[0]={...ranked[0],certain:true,recoveredSuffix:true};
  }
 }
 if(pairs.size>1)ranked=ranked.map(x=>({...x,certain:false}));
 if(!ranked.some(x=>x.full)){const numbered=ranked.filter(x=>x.num&&x.name>=.85);if(numbered.length)ranked=numbered}
 // Identical names and printed numbers can recur in anniversary reprints.
 // No candidate is automatic when two editions share the strongest evidence.
 if(ranked[1]&&ranked[0].score-ranked[1].score<12)ranked=ranked.map(x=>({...x,certain:false}));
 // Scanner suggestions are a shortlist; full manual search remains unbounded.
 return ranked.slice(0,6);
};
