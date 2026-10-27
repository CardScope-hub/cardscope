// Catalog-assisted OCR. The catalog suggests corrections; it never rewrites the
// observed text or treats a fuzzy name as proof of a particular printing.
globalThis.CardScanIndex=(()=>{
 const T=globalThis.CardScanText,cache=new WeakMap();
 const grams=s=>new Set(Array.from({length:Math.max(0,s.length-2)},(_,i)=>s.slice(i,i+3)));
 function aliases(name){const base=name.replace(/\s*\([^)]*\)/g,'').replace(/\s+-\s+(?:OP|ST|EB|PRB)\d+-\d+.*/i,'').trim(),first=base.split(/\s+-\s+|\s*,\s*/)[0];return [...new Set([base,...(first.length>=4?[first]:[]),...(base.match(/^(?:The|An|A) .{5}/)?[base.replace(/^(?:The|An|A) /,'')]:[])])]}
 function build(names){if(cache.has(names))return cache.get(names);const rows=[],postings=new Map();for(const name of names)for(const alias of aliases(name)){const key=T.compact(alias);if(key.length<3)continue;const id=rows.length,g=grams(key);rows.push({name,alias,key,g});for(const gram of g){if(!postings.has(gram))postings.set(gram,[]);postings.get(gram).push(id)}}const out={rows,postings};cache.set(names,out);return out}
 function suggest(names,evidence){const index=build(names),scores=new Map(),blocks=[...evidence.names.map(x=>({...x,title:true})),{text:evidence.full||'',confidence:0,title:false}];
  for(const block of blocks)for(const raw of block.text.split('\n')){const line=T.cleanLine(raw);if(line.length<3||line.length>100)continue;const hits=new Map();for(const g of grams(T.compact(line)))for(const id of index.postings.get(g)||[])hits.set(id,(hits.get(id)||0)+1);
   const ids=[...hits].filter(([id,n])=>n>=Math.max(1,Math.floor(index.rows[id].g.size*.35))).sort((a,b)=>b[1]/Math.max(1,index.rows[b[0]].g.size)-a[1]/Math.max(1,index.rows[a[0]].g.size)).slice(0,90);
   for(const[id]of ids){const row=index.rows[id],similarity=T.nameScore(row.alias,line),minimum=row.key.length<=4?1:row.key.length<=8?.8:.76;if(similarity<minimum||(!block.title&&similarity<.92))continue;const score=similarity+(block.title?.12:0)+Math.min(100,block.confidence||0)*.0004+Math.min(row.key.length,24)*.001;const previous=scores.get(row.name);if(!previous||score>previous.score)scores.set(row.name,{name:row.name,score,similarity,read:line,title:block.title})}
  }
  let found=[...scores.values()];if(found.some(x=>x.title))found=found.filter(x=>x.title);found.sort((a,b)=>b.score-a.score);return found.filter(x=>x.score>=found[0].score-.08).slice(0,5)
 }
 const fix=s=>s.toUpperCase().replace(/O/g,'0').replace(/[IL]/g,'1');
 const numberKey=s=>String(s||'').toLowerCase().replace(/^0+(?=\d)/,'');
 function numbers(game,evidence){
  if(game==='weiss'||game==='weiss-jp'){
   const unique=new Map();
   for(const block of [...evidence.numbers,...evidence.names,{text:evidence.full||'',confidence:0}])for(const read of T.weissReads(block.text)){
    const x={...read,key:T.weissKey(read.value),code:true,confidence:block.confidence||0,uncertain:read.uncertain||(block.confidence||0)<40};
    const old=unique.get(x.key);if(!old||old.uncertain&&!x.uncertain||old.uncertain===x.uncertain&&x.confidence>old.confidence)unique.set(x.key,x);
   }
   return [...unique.values()].sort((a,b)=>b.confidence-a.confidence).slice(0,8);
  }
  const out=[];for(const block of [...evidence.numbers,...evidence.names,{text:evidence.full||'',confidence:0}])for(const code of T.codes(game,block.text))out.push({value:code,key:code.toLowerCase().replace(/[\s-]/g,''),code:true,confidence:block.confidence});
  // One Piece's adjacent block/rarity icon can be fused to its three-digit code.
  // Use the prefix to retrieve candidates, but retain the raw read as uncertain.
  if(game==='onepiece')for(const block of evidence.numbers)for(const m of block.text.toUpperCase().matchAll(/\b([O0]P|[S5]T|E[B8]|PR[B8])\s*([\dOIL]{2})\s*-\s*([\dOIL]{3})(\d{1,2})\b/g)){const q=m[1].replace('0P','OP').replace('5T','ST').replace(/8$/,'B')+fix(m[2])+'-'+fix(m[3]);out.push({value:q+m[4],query:q,key:q.toLowerCase().replace(/-/g,''),code:true,uncertain:true,confidence:block.confidence})}
  if(game==='mtg'||game==='riftbound')for(const block of evidence.numbers){for(const line of block.text.split('\n')){if(/©|copyright|wizards|202\d|199\d|200\d|201\d/i.test(line))continue;for(const m of line.toUpperCase().matchAll(/\b([\dOIL]{1,4})([A-Z*]?)\s*\/\s*([\dOIL]{2,4})\b/g)){const n=fix(m[1]);if(/\d/.test(m[1]))out.push({value:n+m[2].toLowerCase(),key:numberKey(n+m[2]),total:fix(m[3]),confidence:block.confidence})}
   if(game==='mtg'&&block.confidence>=35){const m=line.trim().toUpperCase().match(/^(?:[CURMSL]\s+)?(\d{2,4}[A-Z]?)(?:\s+[CURMSL])?$/);if(m&&!/^19\d\d$|^20\d\d$/.test(m[1]))out.push({value:m[1],key:numberKey(m[1]),confidence:block.confidence})}
  }}const unique=new Map();for(const x of out){const key=(x.code?'code:':'num:')+x.key+(x.total?'/'+numberKey(x.total):'');const old=unique.get(key);if(!old||old.uncertain&&!x.uncertain)unique.set(key,x)}return [...unique.values()]
 }
 function compare(game,card,evidence){const title=evidence.names.map(x=>x.text).join('\n'),full=evidence.full||'',a=aliases(card.name),titleScore=Math.max(0,...a.map(x=>T.nameScore(x,title))),fullScore=Math.max(0,...a.map(x=>T.nameScore(x,full))),observed=numbers(game,evidence);const actual=game==='mtg'?[{key:numberKey(card.localId)}]:numbers(game,{names:[],numbers:[{text:card.localId,confidence:100}],full:''});
  if(game==='riftbound'){const m=String(card.localId).match(/-(\d+)([a-z*]?)(?:-\d+)?$/i);if(m)actual.push({key:numberKey(m[1]+m[2]),total:String(card.localId).split('-')[2]})}
  const same=(x,y)=>Boolean(x.code)===Boolean(y.code)&&x.key===y.key&&(!x.total||!y.total||numberKey(x.total)===numberKey(y.total));
  const isWeiss=game==='weiss'||game==='weiss-jp',near=(x,y)=>isWeiss&&Number.isFinite(T.weissDistance(x.value,y.value));
  const matches=observed.filter(x=>actual.some(y=>same(x,y))),conflicts=observed.filter(x=>!actual.some(y=>same(x,y)||near(x,y))),similar=observed.some(x=>actual.some(y=>near(x,y)));
  const number=matches.length?(conflicts.length?'ambiguous':matches.some(x=>!x.uncertain)?'match':'similar'):similar?(conflicts.length?'ambiguous':'similar'):observed.length?'conflict':'unread';const name=titleScore===1?'match':titleScore>=(T.compact(a[0]).length<=4?1:.76)?'similar':fullScore>=.92?'body':'unread';
  return {name,number,observed:observed.map(x=>x.value),score:(name==='match'?120:name==='similar'?100:name==='body'?20:0)+(number==='match'?(['match','similar'].includes(name)?140:40):number==='similar'?50:number==='ambiguous'?30:number==='conflict'?-50:0),joint:['match','similar'].includes(name)&&number==='match'}
 }
 function rank(game,cards,evidence){return cards.map(card=>({card,evidence:compare(game,card,evidence)})).sort((a,b)=>b.evidence.score-a.evidence.score||a.card.name.localeCompare(b.card.name))}
 return Object.freeze({aliases,suggest,numbers,compare,rank});
})();
