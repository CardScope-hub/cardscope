// Shared, deterministic OCR cleanup. Approximate matches always require confirmation.
globalThis.CardScanText=(()=>{
 const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const compact=s=>norm(s).replace(/ /g,'');
 function distance(a,b){let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]!==b[j-1]));prev=next}return prev[b.length]}
 function similarity(a,b){a=compact(a);b=compact(b);if(!a||!b)return 0;if(a===b)return 1;const longest=Math.max(a.length,b.length);if(Math.abs(a.length-b.length)>Math.max(2,longest*.24))return 0;return 1-distance(a,b)/longest}
 function nameScore(name,text){const n=norm(name).replace(/\s+\d+$/,''),words=norm(text).split(' '),size=n.split(' ').length;let best=0;for(let length=Math.max(1,size-1);length<=size+2;length++)for(let start=0;start+length<=words.length;start++){const candidate=words.slice(start,start+length).join(' ');const s=similarity(n,candidate);if(s>best)best=s}return best}
 function cleanLine(s){return String(s).replace(/[©®™]/g,' ').replace(/[^\p{L}\p{N}\s,.'’!:-]/gu,' ').replace(/\b(?:HP|POWER)\s*\d+\b/gi,' ').replace(/\b(?:BASIC|STAGE\s*[12]|CHARACTER|LEADER|EVENT|CHAMPION UNIT|CHAMPION LEGEND|UNIT|LEGEND)\b/gi,' ').replace(/(?:\s+|^)\d[\d\s,:-]*(?=$)/g,'').replace(/^[\s\p{N}\p{P}\p{S}_]+/u,'').replace(/\s+/g,' ').trim().replace(/[,:.'’!\-]+$/g,'').trim().replace(/^I\s+(?=.{5})/,'').replace(/\s+[cijoy]$/i,'')}
 function names(evidence){const output=[],seen=new Set();for(const block of [...evidence.names,...(evidence.full?[{text:evidence.full,confidence:0}]:[])])for(const raw of block.text.split('\n')){const s=cleanLine(raw);if((s.length<3&&!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(s))||s.length>65||!(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(s)||/\p{L}{3}/u.test(s))||/copyright|illustrat|all rights|www\.|bandai|wizards|entertainment|trading card|©/i.test(raw))continue;const key=norm(s);if(/^(counter|power|cost|life|friend|resource|event|problem|troublemaker|creature|instant|sorcery|enchantment|artifact|land|foil|normal|rare|uncommon|common|attack|defense|defence|strength|evasive|challenger|pony|unicorn|pegasus|earth pony)$/.test(key))continue;if(seen.has(key))continue;seen.add(key);output.push(s)}return output.slice(0,16)}
 function codes(game,text){const s=String(text).normalize('NFKC').toUpperCase().replace(/[–—_]/g,'-'),out=[];if(game==='onepiece')for(const m of s.matchAll(/\b([O0]P|[S5]T|E[B8]|PR[B8])\s*([\dOILS]{2})\s*-?\s*([\dOILS]{3})(?![\dA-Z])/g)){const fix=n=>n.replace(/O/g,'0').replace(/[IL]/g,'1').replace(/S/g,'5');out.push(m[1].replace('0P','OP').replace('5T','ST').replace(/8$/,'B')+fix(m[2])+'-'+fix(m[3]))}
 if(game==='weiss'||game==='weiss-jp')out.push(...weissReads(text).map(x=>x.value));
 if(game==='riftbound')for(const m of s.matchAll(/\b([O0]GN|SFD|UNL|VND|VEN|OGS|JDG|OPP|PR)\s*[-·•.:]?\s*([\dOIL]{1,4})([A-Z*]?)(?![\dA-Z])/g))out.push(m[1].replace('0GN','OGN').toLowerCase()+'-'+m[2].replace(/O/g,'0').replace(/[IL]/g,'1')+m[3].toLowerCase());
 if(game==='onepiece')for(const m of s.matchAll(/\bP\s*-\s*([\dOIL]{3})(?![\dA-Z])/g))out.push('P-'+m[1].replace(/O/g,'0').replace(/[IL]/g,'1'));
 return [...new Set(out)].slice(0,5)}
 function queries(game,evidence){const text=[...evidence.names,...evidence.numbers].map(x=>x.text).join('\n')+'\n'+(evidence.full||'');return [...codes(game,text).map(q=>({q,code:true})),...names(evidence).slice(0,6).map(q=>({q,code:false}))]}
 const p=(kind,region,enhance=false,psm='11')=>({kind,region,enhance,psm});
 const layouts={
 pokemon:[p('names',[.12,.02,.7,.095],false,'7'),p('numbers',[.005,.8,.99,.2]),p('names',[.01,.005,.98,.24]),p('names',[.12,.02,.7,.095],true,'7'),p('numbers',[.015,.93,.96,.065],true,'6'),p('numbers',[.005,.82,.99,.18],true,'6'),p('full',[0,0,1,1])],
 mtg:[p('names',[.055,.022,.79,.082],false,'7'),p('numbers',[0,.86,1,.14]),p('numbers',[0,.865,.45,.09],true,'6'),p('names',[.025,.01,.89,.15],true,'6'),p('names',[0,0,1,.24],false,'11'),p('names',[0,0,1,.24],true,'11'),p('full',[0,0,1,1])],
 onepiece:[p('names',[.015,.82,.97,.15]),p('numbers',[.35,.88,.65,.12]),p('numbers',[.5,.88,.5,.12],true,'11'),p('names',[.015,.76,.97,.22],true,'6'),p('names',[0,.76,1,.24],false,'11'),p('names',[0,.76,1,.24],true,'11'),p('full',[0,0,1,1]),p('numbers',[0,.86,1,.14],true,'6')],
 weiss:[p('names',[0,.64,1,.23],false,'6'),p('names',[0,.6,1,.4],true,'11'),p('full',[0,0,1,1])],
 riftbound:[p('names',[.035,.54,.9,.1],false,'6'),p('names',[0,.4,1,.25],true,'11'),p('numbers',[0,.86,1,.14]),p('names',[.01,.37,.98,.35],true,'6'),p('full',[0,0,1,1])]
 };
 layouts['weiss-jp']=layouts.weiss;
 // Preserve the printed suffix (SP, SSP+, M@P, underscore); it identifies a printing.
 // Confusable glyphs are compared to real catalog codes, never silently rewritten.
 function weissReads(text){
  const s=String(text||'').normalize('NFKC').toUpperCase().replace(/[–—−]/g,'-').replace(/[\\|∕⁄]/g,'/');
  const out=[];
  for(const m of s.matchAll(/\b([A-Z0-9]{2,10})[ \t]*\/[ \t]*([A-Z0-9]{2,16})(?:\s*-\s*([A-Z0-9][A-Z0-9@+_]{0,15}))?(?![A-Z0-9@+_])/g)){
   const value=m[1]+'/'+m[2]+(m[3]?'-'+m[3]:'');
   if(/[0-9]/.test(m[2]+(m[3]||''))||/^[SW][0-9OILSBZ]+$/.test(m[2]))out.push({value,uncertain:false});
  }
  // A dropped slash / dash is retrieval evidence only. Never label it a clean read.
  for(const m of s.matchAll(/\b([A-Z0-9]{2,10})[ \t]*\/[ \t]*([SW][A-Z]?[0-9OILSBZ]{1,4})[ \t]+([A-Z]?[0-9OILSBZ]{2,4}[A-Z@+_]*)(?![A-Z0-9@+_])/g))out.push({value:m[1]+'/'+m[2]+'-'+m[3],uncertain:true});
  if(!out.length)for(const m of s.matchAll(/\b([A-Z0-9]{2,8}?)[ \t]*([SW][A-Z]?[0-9OILSBZ]{1,4})[ \t-]+([A-Z]?[0-9OILSBZ]{2,4}[A-Z@+_]*)(?![A-Z0-9@+_])/g))out.push({value:m[1]+'/'+m[2]+'-'+m[3],uncertain:true});
  return [...new Map(out.filter(x=>!out.some(y=>y.value.startsWith(x.value+'-'))).map(x=>[x.value,x])).values()].slice(0,8);
 }
 const weissKey=s=>String(s||'').normalize('NFKC').toUpperCase().replace(/[\s/\\|\-–—−]/g,'');
 function weissDistance(a,b){
  a=weissKey(a);b=weissKey(b);if(a.length!==b.length||a.length<6)return Infinity;
  const groups=['0O','1IL','2Z','5S','8B','6G'];let changes=0;
  for(let i=0;i<a.length;i++)if(a[i]!==b[i]){if(!groups.some(g=>g.includes(a[i])&&g.includes(b[i])))return Infinity;changes++}
  return changes<=4?changes:Infinity;
 }
 // Two footer bands + both corners: narrow crops retain tiny print at full resolution.
 const weissNumberPasses=[
  p('numbers',[0,.85,1,.15],false,'11'),p('numbers',[0,.85,1,.15],true,'11'),
  p('numbers',[0,.92,.72,.08],false,'6'),p('numbers',[0,.92,.72,.08],true,'6'),
  p('numbers',[.28,.92,.72,.08],true,'6'),p('numbers',[0,.78,1,.15],true,'11')
 ].map(x=>({...x,latin:true}));
 return Object.freeze({norm,compact,distance,similarity,nameScore,cleanLine,names,codes,queries,layouts,weissReads,weissKey,weissDistance,weissNumberPasses});
})();
