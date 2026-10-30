// Japanese Pokémon: read the title, Latin set label and collector number separately.
// No rules text, English-name substitution, remote recognition or guessed prices.
(()=>{
 const normalize=s=>String(s??'').normalize('NFKC').replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60)).toLowerCase().replace(/[^\p{L}\p{N}ー]/gu,'');
 const code=s=>String(s??'').normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]/g,'');
 const number=s=>String(s).replace(/^0+(?=\d)/,'');
 const species=s=>normalize(s).replace(/(?:vmax|vstar|ex|gx|v|lvx)$/,'');
 const cache=new WeakMap();
 function build(cards,sets){let index=cache.get(cards);if(index?.sets===sets)return index;
  const setMap=new Map(sets.map(s=>[s.id,s])),byName=new Map(),aliases=new Map();
  for(const c of cards){const key=species(c.name);if(!byName.has(key))byName.set(key,[]);byName.get(key).push(c)}
  for(const s of sets){const list=[s.id];if(/^XY\d+[ab]$/i.test(s.id))list.push(s.id.slice(0,-1));for(const a of list){const k=code(a);if(!aliases.has(k))aliases.set(k,[]);aliases.get(k).push(s.id)}}
  index={sets,setMap,byName,aliases};cache.set(cards,index);return index;
 }
 function similarCode(a,b){if(a.length!==b.length)return false;let changes=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i]){if(!['0O','0A','1I','1L','4D','5S','8B','MN','MU'].some(g=>g.includes(a[i])&&g.includes(b[i])))return false;changes++}return changes===1}
 function parseNumbers(reads){const hits=[];for(const r of reads||[]){const t=String(r.text||'').normalize('NFKC').toUpperCase().replace(/[／∕]/g,'/');
  for(const m of t.matchAll(/(?<![\dA-Z])(\d{1,3})\s*\/\s*(\d{2,3})(?!\d)/g))hits.push({local:number(m[1]),total:Number(m[2]),confidence:r.confidence||0,source:r.source||'',text:m[0]});
  for(const m of t.matchAll(/(?<![\dA-Z])(\d{1,3})\s*\/\s*(SV|S|SM|XY|BW)\s*-\s*P\b/g))hits.push({local:number(m[1]),set:code(m[2]+'-P'),confidence:r.confidence||0,source:r.source||'',text:m[0]});
 }return hits}
 function rank(cards,sets,evidence){const index=build(cards,sets),header=(evidence.names||[]).map(r=>({...r,key:normalize(r.text)})),numbers=parseNumbers(evidence.numbers),labels=[];
  for(const r of evidence.sets||[]){for(const token of String(r.text||'').trim().split(/\s+/)){const k=code(token);if(k.length<2||k==='PROMO')continue;const exact=index.aliases.get(k);if(exact){for(const id of exact)labels.push({id,exact:true,key:k});continue}for(const [alias,ids] of index.aliases)if(similarCode(k,alias))for(const id of ids)labels.push({id,exact:false,key:k})}}
  const seenNames=[];for(const [name] of index.byName){if(name.length<3)continue;const reads=header.filter(r=>r.key.includes(name));if(reads.length)seenNames.push({name,confidence:Math.max(...reads.map(r=>r.confidence||0)),count:reads.length})}
  // Keep the full recognized name: ラッキー must not override ブラッキー.
  const names=seenNames.filter(x=>!seenNames.some(y=>x!==y&&y.name.length>x.name.length&&y.name.includes(x.name)));
  const strong=names.filter(x=>x.confidence>=60);
  const ranked=[];
  for(const c of cards){const setId=c.setId||c.id.slice(0,c.id.lastIndexOf('-')),set=index.setMap.get(setId),base=species(c.name),name=names.find(n=>n.name===base||base.endsWith('ノ'+n.name)),label=labels.filter(l=>l.id===setId);
   if(strong.length&&!strong.some(n=>n.name===base||base.endsWith('ノ'+n.name)))continue;
   const total=c.printedTotal??set?.cardCount?.official;
   const hits=numbers.filter(n=>n.local===number(c.localId)&&(n.set?n.set===code(setId):n.total===Number(total)));
   // A numeric fraction alone is shared by many Japanese expansions and species.
   // Require an independently read set label or name. Never fall back to attack text.
   if(labels.length&&!label.length)continue;
   if(!name&&!(hits.length&&label.length))continue;
   if(!hits.length&&!(name&&label.length&&(evidence.sets||[]).some(r=>/PROMO/i.test(r.text))))continue;
   if(numbers.length&&!hits.length)continue;
   const exact=label.some(l=>l.exact),sources=new Set(hits.map(n=>n.source)),repeat=sources.size>=2;
   const score=(hits.length?120:0)+(label.length?70:0)+(exact?10:0)+(name?40:0)+Math.min(3,sources.size)*8;
   ranked.push({c,set,name:name?1:0,num:!!hits.length,full:hits[0]||null,score,certain:false,japanese:true,
    matchLabel:hits.length?(label.length?'Zgodny numer i kod serii — sprawdź ilustrację':'Zgodna nazwa i numer — sprawdź wydanie'):'Odczytana nazwa — wybierz wydanie',
    verified:!!name&&name.name===base&&name.confidence>=60&&hits.some(n=>n.confidence>=60)&&repeat&&(exact||!labels.length)});
  }
  ranked.sort((a,b)=>b.score-a.score||a.c.id.localeCompare(b.c.id));
  // An automatic result needs a clean title, repeated number, no conflicting reads,
  // and one edition. Code corrections and unreadable holographic titles stay manual.
  const pairs=new Set(numbers.map(n=>n.local+'/'+(n.set||n.total)));
  if(ranked.length===1&&ranked[0].verified&&pairs.size===1&&new Set(labels.map(l=>l.id)).size<=1)ranked[0].certain=true;
  return ranked.slice(0,6);
 }
 function region(image,pass){const canvas=enhancedRegion(image,pass.region,pass.enhance||false,pass.width||500);if(pass.threshold||pass.white){const ctx=canvas.getContext('2d',{willReadFrequently:true}),pixels=ctx.getImageData(24,24,canvas.width-48,canvas.height-48),d=pixels.data;for(let i=0;i<d.length;i+=4){const ink=pass.white?Math.min(d[i],d[i+1],d[i+2])>140:Math.max(d[i],d[i+1],d[i+2])<pass.threshold;d[i]=d[i+1]=d[i+2]=ink?0:255}ctx.putImageData(pixels,24,24)}return canvas}
 const passes=[
  {kind:'names',region:[.18,.035,.53,.055],width:800},
  {kind:'numbers',region:[.16,.943,.115,.025]},
  {kind:'sets',region:[.09,.938,.061,.026]},
  {kind:'numbers',region:[.162,.948,.114,.02],threshold:110},
  {kind:'names',region:[.18,.035,.53,.055],width:750,threshold:140},
  {kind:'sets',region:[.094,.942,.055,.021],white:true},
  {kind:'numbers',region:[.162,.948,.114,.02],psm:'13'},
  {kind:'numbers',region:[.162,.943,.12,.029],threshold:50},
  {kind:'numbers',region:[.171,.941,.156,.03],threshold:80,latin:true},
  {kind:'names',region:[.18,.035,.53,.055],width:750,threshold:80},
  {kind:'numbers',region:[.755,.948,.112,.024]},
  {kind:'numbers',region:[.171,.941,.156,.03],latin:true},
  {kind:'sets',region:[.226,.945,.08,.025],threshold:80,promoOnly:true}
 ];
 const fallbackPasses=[
  {kind:'names',region:[.16,.02,.55,.077],width:800,psm:'6'},
  {kind:'numbers',region:[.03,.9,.94,.085],width:1400,psm:'11',latin:true,labels:true},
  {kind:'numbers',region:[.03,.9,.94,.085],width:1400,psm:'11',latin:true,labels:true,enhance:true},
  ...[.925,.935].flatMap(y=>[
   {kind:'numbers',region:[.15,y,.14,.028]},
   {kind:'numbers',region:[.15,y,.14,.028],threshold:80},
   {kind:'sets',region:[.078,y,.085,.032]}])
 ];
 function cancelled(){throw new DOMException('Anulowano','AbortError')}
 async function createReader(isValid=()=>true){const workers=[];let closed=false;
  const check=()=>{if(closed||!isValid())cancelled()};
  async function close(){if(closed)return;closed=true;for(const w of workers){globalThis.CardScanRuntime?.untrack(w);await w.terminate().catch(()=>{})}}
  try{await loadOCR();check();for(const lang of ['jpn','eng']){const w=await Tesseract.createWorker(lang,1,{},lang==='eng'?{load_system_dawg:'0',load_freq_dawg:'0'}:{});workers.push(w);check();globalThis.CardScanRuntime?.track(w)}}catch(error){await close();throw error}
  return {close,async read(image,index,{onstage=()=>{},onread=()=>{}}={}){check();const evidence={language:'ja',names:[],numbers:[],sets:[],full:''};
   const schedule=[...passes,...fallbackPasses];
   for(let i=0;i<schedule.length;i++){check();if(i===passes.length&&rank(index.cards,index.sets,evidence).some(x=>x.num))break;const pass=schedule[i];if(pass.promoOnly&&!evidence.sets.some(r=>/PROMO/i.test(r.text)))continue;onstage(pass.kind,i+1,schedule.length);const worker=workers[pass.kind==='names'?0:1];
    await worker.setParameters({tessedit_pageseg_mode:pass.psm||'7',user_defined_dpi:'300',preserve_interword_spaces:'1',tessedit_char_whitelist:pass.kind==='names'?'':pass.kind==='sets'||pass.latin?'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/- ':'0123456789/'});check();
    const {data}=await worker.recognize(region(image,pass),pass.labels?{rotateAuto:true}:{});check();const read={text:data.text||'',confidence:data.confidence||0,source:'jp-crop-'+i};evidence[pass.kind].push(read);if(pass.labels)evidence.sets.push(read);onread(evidence);
    if(i>=5&&rank(index.cards,index.sets,evidence).some(x=>x.certain)||i>=passes.length&&rank(index.cards,index.sets,evidence).some(x=>x.num))break;
   }check();return evidence;
  }};
 }
 globalThis.CardPokemonJP={normalize,parseNumbers,rank,createReader,passes};
})();
