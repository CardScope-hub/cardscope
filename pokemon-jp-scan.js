// Japanese Pokémon: identify the title first; the collector number is optional.
// All recognition runs locally. Set labels and attack text never decide the species.
(()=>{
 const normalize=s=>String(s??'').normalize('NFKC').replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60)).toLowerCase().replace(/[^\p{L}\p{N}ー]/gu,'');
 const small='ァィゥェォャュョッヮヵヶ',large='アイウエオヤユヨツワカケ';
 const fold=s=>normalize(s).replace(/[ァィゥェォャュョッヮヵヶ]/g,c=>large[small.indexOf(c)]);
 const base=s=>String(s??'').replace(/\s*(?:vmax|vstar|ex|gx|v|lv\.?x)$/i,'').trim();
 const number=s=>String(s).replace(/^0+(?=\d)/,'');
 const cache=new WeakMap();
 function build(cards,sets){let index=cache.get(cards);if(index?.sets===sets)return index;const names=new Map();for(const c of cards){const label=base(c.name),key=fold(label);if(key.length<3)continue;if(!names.has(key))names.set(key,{key,label,cards:[]});names.get(key).cards.push(c)}index={sets,names:[...names.values()],setMap:new Map(sets.map(s=>[s.id,s]))};cache.set(cards,index);return index}
 function distance(a,b){if(Math.abs(a.length-b.length)>1)return 9;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let row=[i];for(let j=1;j<=b.length;j++)row[j]=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]!==b[j-1]));if(Math.min(...row)>1)return 9;prev=row}return prev[b.length]}
 function identify(cards,sets,evidence){const index=build(cards,sets),reads=(evidence.names||[]).filter(r=>r.confidence>=45&&!/から\s*進化|カラ\s*進化/.test(r.text||'')).map(r=>({...r,key:fold(r.text)}));
  const exact=[];for(const n of index.names){const hits=reads.filter(r=>r.key.includes(n.key));if(hits.length)exact.push({...n,confidence:Math.max(...hits.map(r=>r.confidence)),support:new Set(hits.map(r=>r.source)).size,exact:true})}
  // Prefer ブラッキー to its substring ラッキー, and the full trainer-owned name.
  const longest=exact.filter(n=>!exact.some(other=>other.key.length>n.key.length&&other.key.includes(n.key)));
  if(longest.length){longest.sort((a,b)=>b.confidence-a.confidence||b.support-a.support);const top=longest[0];return longest.filter(n=>n.confidence>=top.confidence-12).slice(0,3)}
  // One OCR glyph error may be recoverable, but only as an explicit suggestion.
  // Short names and dakuten stay distinct; no suffix/character is silently dropped.
  const fuzzy=[];for(const n of index.names){if(n.key.length<4)continue;let best=0,support=0;for(const r of reads){if(r.confidence<65)continue;const chunks=r.key.match(/[ァ-ヿー]+/g)||[];let hit=false;for(const text of chunks){for(const size of [n.key.length,n.key.length+1]){for(let at=0;at+size<=text.length;at++){if(distance(n.key,text.slice(at,at+size))<=1){hit=true;break}}if(hit)break}if(hit)break}if(hit){support++;best=Math.max(best,r.confidence)}}if(support)fuzzy.push({...n,confidence:best,support,exact:false})}
  fuzzy.sort((a,b)=>b.support-a.support||b.confidence-a.confidence||b.key.length-a.key.length);return fuzzy.filter(n=>!fuzzy.some(other=>other.key.length>n.key.length&&other.key.includes(n.key))).slice(0,2);
 }
 function parseNumbers(reads){const found=[];for(const r of reads||[]){const text=String(r.text||'').normalize('NFKC').toUpperCase().replace(/[／∕]/g,'/');for(const m of text.matchAll(/(?<![\dA-Z])(\d{1,3})\s*\/\s*(\d{2,3})(?!\d)/g))found.push({local:number(m[1]),total:Number(m[2]),confidence:r.confidence||0,source:r.source,text:m[0]});for(const m of text.matchAll(/(?<![\dA-Z])(\d{1,3})\s*\/\s*((?:SV|SM|XY|BW|S|M)\s*-\s*P)\b/g))found.push({local:number(m[1]),set:m[2].replace(/\s/g,''),confidence:r.confidence||0,source:r.source,text:m[0]});if(r.numberOnly&&/^\s*\d{1,3}\s*$/.test(text))found.push({local:number(text.trim()),confidence:r.confidence||0,source:r.source,text:text.trim()})}return found}
 function rank(cards,sets,evidence){const index=build(cards,sets),names=identify(cards,sets,evidence),numbers=parseNumbers(evidence.numbers),rows=[];
  for(const n of names)for(const c of n.cards){const setId=c.setId||c.id.slice(0,c.id.lastIndexOf('-')),set=index.setMap.get(setId),hits=numbers.filter(x=>x.local===number(c.localId)),full=hits.find(x=>x.total?x.total===Number(c.printedTotal??set?.cardCount?.official):x.set?x.set===setId.toUpperCase():false);
   rows.push({c,set,name:n.exact?1:.85,num:!!hits.length,full:full||null,score:(n.exact?10000:0)+n.confidence+(full?600:hits.length?200:0),certain:false,japanese:true,recognizedName:n.label,nameExact:n.exact,
    matchLabel:full?'Nazwa i numer — potwierdź ilustrację':hits.length?'Nazwa i możliwy numer — wybierz wydanie':n.exact?'Rozpoznana nazwa — wybierz wydanie':'Podobna nazwa — sprawdź Pokémona'});
  }
  // Keep all editions available. A bad/missing number never removes the right name.
  return rows.sort((a,b)=>b.score-a.score||String(b.c.id).localeCompare(String(a.c.id),undefined,{numeric:true}));
 }
 function titleEvidence(result,crop=[.015,0,.97,.45]){
  const width=result.width||result.resizedImageWidth,height=result.height||result.resizedImageHeight,scaledWidth=result.resizedImageWidth||width,scaledHeight=result.resizedImageHeight||height;
  const lines=(result.texts||[]).filter(line=>line.box?.length>=4).map(line=>{const points=line.box,xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);const cy=(Math.min(...ys)+Math.max(...ys))/2/scaledHeight*height;
   // Text coordinates refer to the selected crop, not a card aligned to the frame.
   // Vertical side lengths measure glyph height without counting camera tilt.
   const h=(Math.hypot(points[3][0]-points[0][0],points[3][1]-points[0][1])+Math.hypot(points[2][0]-points[1][0],points[2][1]-points[1][1]))/2/scaledHeight*height;
   return {text:line.text||'',confidence:100*(line.mean??line.score??0),source:'jp-title',y:crop[1]+(cy-24)/Math.max(1,height-48)*crop[3],height:h/Math.max(1,height-48)*crop[3],left:crop[0]+(Math.min(...xs)/scaledWidth*width-24)/Math.max(1,width-48)*crop[2]};
  }).filter(line=>line.confidence>=30&&line.y>=0&&line.y<=.48&&!normalize(line.text).includes('カラ進化'));
  const tallest=Math.max(0,...lines.map(line=>line.height));
  // A pre-evolution caption or tiny text inside the artwork is not the heading.
  return lines.filter(line=>line.height>=tallest*.43);
 }
 const titlePasses=[{region:[.015,0,.97,.45],width:1100},{region:[.015,0,.97,.45],width:1250,enhance:true},{region:[.06,0,.89,.135],width:1100}];
 const classicPasses=[{region:[.18,.025,.53,.07],width:800},{region:[.16,.02,.55,.077],width:800,psm:'6'},{region:[.18,.035,.53,.055],width:750,threshold:140}];
 function region(image,pass){const canvas=enhancedRegion(image,pass.region,!!pass.enhance,pass.width||1000);if(pass.threshold){const ctx=canvas.getContext('2d',{willReadFrequently:true}),p=ctx.getImageData(24,24,canvas.width-48,canvas.height-48);for(let i=0;i<p.data.length;i+=4){const v=Math.max(p.data[i],p.data[i+1],p.data[i+2])<pass.threshold?0:255;p.data[i]=p.data[i+1]=p.data[i+2]=v}ctx.putImageData(p,24,24)}return canvas}
 async function createReader(isValid=()=>true){let closed=false,classic=null,classicOnly=false,primaryError='';
  const check=()=>{if(closed||!isValid())throw new DOMException('Anulowano','AbortError')};
  async function close(){if(closed)return;closed=true;if(classic){CardScanRuntime.untrack(classic);await classic.terminate().catch(()=>{})}if(isValid())CardScanRuntime.cancel()}
  async function fallback(image,evidence,onstage,onread){if(!classic){await loadOCR();check();const worker=await Tesseract.createWorker('jpn',1);if(closed||!isValid()){await worker.terminate();check()}classic=CardScanRuntime.track(worker)}for(let i=0;i<classicPasses.length;i++){check();const pass=classicPasses[i];onstage('names',i+1,3);await classic.setParameters({tessedit_pageseg_mode:pass.psm||'7',user_defined_dpi:'300',preserve_interword_spaces:'1',tessedit_char_whitelist:''});check();const {data}=await classic.recognize(region(image,pass));check();evidence.names.push({text:data.text||'',confidence:data.confidence||0,source:'jp-classic-'+i});onread(evidence)}}
  return {close,async read(image,index,{onstage=()=>{},onread=()=>{},onname=()=>{}}={}){check();const evidence={language:'ja',names:[],numbers:[],sets:[],full:'',scannerVersion:'pokemon-jp-position-3',engine:classicOnly?'odczyt rezerwowy':'japoński OCR',...(classicOnly?{engineError:primaryError,engineNote:'Japoński odczyt nie uruchomił się. Aktywny jest odczyt rezerwowy.'}:{})};
   if(!classicOnly)try{for(let i=0;i<titlePasses.length;i++){const pass=titlePasses[i];onstage('names',i+1,3);const canvas=region(image,pass);const result=await CardScanRuntime.read(canvas,{language:'ja',maxSide:1400,onstage:s=>{if(isValid()&&s==='loading')onstage('loading',1,1)}});check();evidence.names.push(...titleEvidence(result,pass.region).map(r=>({...r,source:'jp-title-'+i})));onread(evidence);const names=identify(index.cards,index.sets,evidence);if(names.length)onname(evidence);if(names.some(n=>n.exact&&n.confidence>=70))break}
   }catch(error){check();classicOnly=true;evidence.engine='odczyt rezerwowy';primaryError=String(error.message||error).slice(0,300);evidence.engineError=primaryError;evidence.engineNote='Nie udało się uruchomić odczytu japońskiego. Używam odczytu rezerwowego.';onstage('fallback',1,1);onread(evidence)}
   if(classicOnly||!identify(index.cards,index.sets,evidence).length){if(!classicOnly)evidence.engine='japoński OCR + odczyt rezerwowy';onstage('fallback',1,1);onread(evidence);await fallback(image,evidence,onstage,onread);check();if(identify(index.cards,index.sets,evidence).length)onname(evidence)}
   // Number lookup is optional. Its failure must never discard an identified title.
   if(!classicOnly&&identify(index.cards,index.sets,evidence).length){try{onstage('numbers',1,1);const canvas=region(image,{region:[.015,.90,.97,.085],width:1400});const result=await CardScanRuntime.read(canvas,{language:'ja',maxSide:1500});check();evidence.numbers=(result.texts||[]).map((r,i)=>({text:r.text||'',confidence:100*(r.mean??0),source:'jp-number-'+i}));onread(evidence)}catch(error){check();evidence.numberUnavailable=true}}
   check();return evidence;
  }};
 }
 globalThis.CardPokemonJP=Object.freeze({normalize,fold,identify,parseNumbers,rank,titleEvidence,createReader});
})();
