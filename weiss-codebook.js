// Recover typography against actual catalog identifiers. Repairs remain explicit
// candidates; competing printed suffixes and conflicting reads are never merged.
globalThis.CardWeissCodebook=(()=>{
 const fold=s=>String(s||'').normalize('NFKC').toUpperCase().replace(/[£€]/g,'E').replace(/\$/g,'S').replace(/[^A-Z0-9@+_]/g,'').replace(/[OILSZBG]/g,c=>({O:'0',I:'1',L:'1',S:'5',Z:'2',B:'8',G:'6'})[c]);
 const cache=new WeakMap(),rarities=new Set(['','R','RR','RRR','CR','CC','C','U','N','PR','SR','SP','SSP','SEC','OFR','TD','RE','XR','RR+']);
 function index(book){if(cache.has(book))return cache.get(book);const groups=[];for(const [series,records] of book.series){if(!series)continue;const code=CardWeissScan.numberText(series),key=CardWeissScan.codeKey(series),rows=[...new Map(records.map(r=>[r.key,r])).values()];groups.push({series,key,fold:fold(key),rows:rows.map(r=>({...r,tail:r.key.slice(key.length),foldTail:fold(r.key.slice(key.length))}))});}cache.set(book,groups);return groups;}
 function observe(book,evidence){const out=[];for(const block of evidence.numbers||[]){if((block.confidence||0)<8)continue;const raw=String(block.text||'').normalize('NFKC').toUpperCase(),compact=raw.replace(/[£€]/g,'E').replace(/\$/g,'S').replace(/[^A-Z0-9@+_]/g,''),f=fold(compact);if(f.length<8||f.length>50)continue;
   for(const group of index(book)){const at=f.indexOf(group.fold);if(at<0||at>5)continue;const tail=compact.slice(at+group.key.length),ft=fold(tail);if((tail.match(/\d/g)||[]).length<1)continue;
    for(const r of group.rows){if(!ft.startsWith(r.foldTail))continue;const rest=tail.slice(r.tail.length),extra=rest.replace(/[|]/g,'');const exactTail=tail.startsWith(r.tail);let noisy=false;
     if(!rarities.has(extra)){if(extra.length<2||!rarities.has(extra.slice(0,-1))||!/[JI]$/.test(extra))continue;noisy=true;}
     const repaired=compact.slice(at,at+group.key.length)!==group.key||!exactTail||/[£€$]/.test(raw)||noisy;
     out.push({value:r.number.split(' ')[0],key:r.key,confidence:block.confidence,source:block.source||'unspecified',uncertain:repaired||block.confidence<55,catalogRepair:repaired,rarityJoined:!!rest,raw:block.text});
    }
   }
  }
  return out;
 }
 function aggregate(observed){const groups=new Map();for(const r of observed){if(!groups.has(r.key))groups.set(r.key,{...r,reads:[],sources:new Set()});const g=groups.get(r.key);g.reads.push(r);g.sources.add(r.source||'unspecified');if(r.confidence>g.confidence){g.confidence=r.confidence;g.value=r.value;}g.uncertain&&=r.uncertain;}
  for(const g of groups.values()){g.support=new Set(g.reads.filter(r=>r.confidence>=45).map(r=>r.source||'unspecified')).size;g.best=Math.max(...g.reads.map(r=>r.confidence));g.weight=g.reads.reduce((s,r)=>Math.max(s,r.confidence),0)+Math.min(3,g.support)*18;}
  return [...groups.values()].sort((a,b)=>b.weight-a.weight);
 }
 return Object.freeze({observe,aggregate,fold});
})();
