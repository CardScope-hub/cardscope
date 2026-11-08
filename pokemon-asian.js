// Local Korean and Chinese OCR. Region + printed set/number determine the edition.
// English names are search aliases only; neither images nor prices cross regions.
globalThis.CardPokemonAsian=(()=>{
 'use strict';
 const baseURL=new URL('./',document.currentScript?.src||location.href);
 const definitions={ko:{name:'Koreański',ocr:'kor',badge:'🇰🇷 KO'},'zh-cn':{name:'Chiński uproszczony',ocr:'chi_sim',badge:'🇨🇳 ZH-CN'},'zh-tw':{name:'Chiński tradycyjny',ocr:'chi_tra',badge:'🇹🇼 ZH-TW'}};
 const supports=lang=>Object.hasOwn(definitions,lang);
 const compact=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 const number=s=>String(s??'').toUpperCase().replace(/\s/g,'').replace(/^0+(?=\d)/,'');
 const setOf=c=>c.setId||c.id.slice(0,c.id.lastIndexOf('-'));
 const cache=new WeakMap(),escaped=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 function book(cards,sets){let b=cache.get(cards);if(b?.sets===sets)return b;
  const setMap=new Map(sets.map(s=>[s.id,s])),codes=[];
  for(const s of sets)for(const code of new Set([s.id,...(s.aliases||[])])){
   if(!/^[a-z][a-z0-9.+_-]{1,23}$/i.test(code)||!(/[0-9]|-P$/i.test(code)||code===s.id&&/^[a-z]{2,5}$/i.test(code)&&!/^(?:none|promo)$/i.test(code)))continue;
   const pattern=[...code.toUpperCase()].map(x=>x==='.'?'[.,]':escaped(x)).join('\\s*');
   codes.push({id:s.id,code,pattern:new RegExp('(?<![A-Z0-9])'+pattern+'(?=$|[^A-Z0-9]|(?:KR|K|F|C|CHS|CHT)(?=\\s*\\d|\\s|$))','i')});
  }
  b={sets,setMap,codes,rows:cards.map(c=>({c,keys:[c.name,...(c.aliases||[])].filter(Boolean).map(compact)}))};cache.set(cards,b);return b;
 }
 function parseNumbers(reads=[]){const out=[];
  for(const r of reads){const text=String(r.text||'').normalize('NFKC').toUpperCase().replace(/[／∕]/g,'/').replace(/(\d)(?=(?:SAR|CSR|CHR|RR|SR|AR|UR|HR)\b)/g,'$1 ');
   for(const m of text.matchAll(/(?<![A-Z0-9])([0-9OILSBZ]{1,4})\s*\/\s*([0-9OILSBZ]{2,4}|(?:SV|SM|XY|BW|S|M)\s*-\s*P)(?![A-Z0-9])/g)){
    const fix=v=>number(v).replace(/[OILSBZ]/g,c=>({O:'0',I:'1',L:'1',S:'5',B:'8',Z:'2'}[c]));
    const promo=/-\s*P$/.test(m[2]);out.push({local:number(fix(m[1])),total:promo?m[2].replace(/\s/g,''):number(fix(m[2])),clean:!/[OILSBZ]/.test(m[1]+(promo?'':m[2])),confidence:Number(r.confidence)||0,source:r.source});
   }
  }return out;
 }
 function nameMatch(keys,reads,manual=false){let best=0,length=0;
  for(const key of keys){if(key.length<2)continue;for(const r of reads){if(!manual&&(r.confidence||0)<40)continue;const text=compact(r.text);if(text.includes(key)){if(key.length>length){length=key.length;best=1}}else if(key.endsWith('ex')&&text.includes(key.slice(0,-2))&&key.length>4){if(key.length-2>length){length=key.length-2;best=.96}}}}
  return {score:best,length};
 }
 function rank(cards,sets,evidence){const b=book(cards,sets),reads=evidence.numbers||[],manual=!!evidence.manual;
  const footer=reads.filter(r=>manual||r.confidence>=40).map(r=>r.text||'').join('\n'),hint=languageHint(footer,evidence.language);
  if(supports(hint)&&hint!==evidence.language)return [];
  const pairs=parseNumbers(reads).filter(p=>manual||p.confidence>=30),pairKeys=new Set(pairs.map(p=>p.local+'/'+p.total)),scopes=new Map();
  for(const r of reads.filter(r=>manual||r.confidence>=40))for(const code of b.codes)if(code.pattern.test(String(r.text||'').normalize('NFKC').toUpperCase()))scopes.set(code.id,Math.max(scopes.get(code.id)||0,r.confidence||0));
  if(!scopes.size&&/\b(?:CSV|CSM|CBB|SV|SM)\d+[A-Z\d.]*/i.test(footer))return [];
  const names=evidence.names||[],candidates=[];let maxNameLength=0;
  for(const row of b.rows){const c=row.c,sid=setOf(c);if(scopes.size&&!scopes.has(sid))continue;
   const set=b.setMap.get(sid),n=number(c.localId),total=number(String(c.printedNumber||'').split('/')[1]||c.printedTotal||set?.cardCount?.official||'');
   const full=pairs.filter(p=>p.local===n&&(!total||p.total===total)).sort((a,b)=>b.confidence-a.confidence)[0],partial=pairs.some(p=>p.local===n),nm=nameMatch(row.keys,names,manual);
   if(!full&&!partial&&!nm.score)continue;
   maxNameLength=Math.max(maxNameLength,nm.length);
   candidates.push({c,set,name:nm.score,nameLength:nm.length,num:partial,full:full||null,setExact:scopes.has(sid),certain:false,asian:true,recognizedName:nm.score?c.name:null,score:(full?600:partial?80:0)+(scopes.has(sid)?300:0)+nm.score*100});
  }
  const full=candidates.filter(r=>r.full);let rows;
  if(full.length){rows=full;const named=rows.filter(r=>r.name&&r.nameLength===maxNameLength);if(!scopes.size&&named.length)rows=named;}
  else rows=candidates.filter(r=>r.name&&r.nameLength===maxNameLength);
  rows.sort((a,b)=>b.score-a.score||a.c.id.localeCompare(b.c.id,undefined,{numeric:true}));
  const one=rows.length===1&&pairKeys.size===1&&rows[0].full?.clean&&rows[0].full.confidence>=55&&(!maxNameLength||rows[0].nameLength===maxNameLength);
  if(one&&!manual&&((scopes.size===1&&scopes.get(setOf(rows[0].c))>=55)||(rows[0].name===1&&names.some(r=>r.confidence>=65))))rows[0].certain=true;
  for(const r of rows)r.matchLabel=r.setExact&&r.full?'Zgodna seria i numer · '+definitions[evidence.language]?.name:r.full?'Zgodny numer · porównaj wydanie':'Nazwa rozpoznana · wybierz numer i ilustrację';
  return rows.slice(0,manual?1000:40);
 }
 function manual(cards,sets,q){
  q=String(q||'').normalize('NFKC').trim();if(!q)return [];
  const b=book(cards,sets),wrap=c=>({c,set:b.setMap.get(setOf(c)),name:0,num:true,full:null,score:200,certain:false,asian:true});
  const id=cards.find(c=>c.id.toLowerCase()===q.toLowerCase());if(id)return [wrap(id)];
  const scopes=[];for(const s of sets)for(const alias of [s.id,s.name,...(s.aliases||[])].filter(Boolean)){
   const m=q.match(new RegExp('^'+escaped(alias)+'(?:\\s*[:#-]\\s*|\\s+|$)(.*)$','i'));if(m)scopes.push({id:s.id,rest:m[1],length:alias.length});
  }
  scopes.sort((a,b)=>b.length-a.length);const scope=scopes[0],ids=new Set(scopes.filter(s=>s.length===scope?.length&&s.rest===scope.rest).map(s=>s.id));
  const pool=scope?cards.filter(c=>ids.has(setOf(c))):cards,query=scope?scope.rest:q;
  if(scope&&!query)return pool.slice(0,1000).map(wrap);
  if(/^\d{1,4}$/.test(query))return pool.filter(c=>number(c.localId)===number(query)).slice(0,1000).map(wrap);
  if(!scope&&/^[a-z][a-z\d.]{1,12}\s*[-:# ]\s*\d+(?:\s*\/\s*\d+)?$/i.test(q))return [];
  return rank(pool,sets,{language:cards[0]?.catalogLanguage,names:[{text:query,confidence:100}],numbers:[{text:scope?scope.id+' '+query:query,confidence:100}],manual:true});
 }
 function languageHint(text,fallback='en'){
  text=String(text||'').normalize('NFKC');if(/[\p{Script=Hangul}]/u.test(text)||/\b(?:SV|SM|S|M)\d+[a-z]?\s+KR?\b/i.test(text))return 'ko';
  if(/\bC(?:SV|SM|S|BB)\d|\b30thC\b/i.test(text))return 'zh-cn';
  if(/\b(?:SV|SM|S|M)\d+[a-z]?\s*F\b/i.test(text))return 'zh-tw';
  if(/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text))return 'ja';
  if(/[\p{Script=Han}]/u.test(text))return supports(fallback)?fallback:/[叶龙宝梦]/u.test(text)?'zh-cn':'zh-tw';return fallback;
 }
 function createReader(lang,valid=()=>true){if(!supports(lang))throw Error('Wybierz język koreański lub chiński.');
  let worker=null,pending=null,closed=false,primaryUnavailable=false;
  const check=()=>{if(closed||!valid())throw new DOMException('Anulowano','AbortError')};
  async function ready(){check();if(worker)return worker;if(!pending)pending=(async()=>{await loadOCR();check();const w=await Tesseract.createWorker(definitions[lang].ocr+'+eng',1,{langPath:new URL('ocr-asian/',baseURL).href},{load_system_dawg:'0',load_freq_dawg:'0'});if(closed||!valid()){await w.terminate();check()}worker=CardScanRuntime.track(w);return worker})().finally(()=>pending=null);return pending;}
  async function close(){closed=true;const w=worker;worker=null;if(w){CardScanRuntime.untrack(w);await w.terminate().catch(()=>{})}}
  return {close,async read(image,index,{onstage=()=>{},onread=()=>{}}={}){
   check();onstage('Wczytuję lokalny odczyt · '+definitions[lang].name+'…');
   const e={language:lang,names:[],numbers:[],sets:[],full:'',scannerVersion:'pokemon-asian-1'};
   const report=()=>{e.full=[...e.names,...e.numbers].map(r=>r.text).join('\n');onread(e);return rank(index.cards,index.sets,e);};
   // The existing on-device Chinese/Latin reader handles outlined set codes well.
   // Korean names use the separate Korean model; Chinese glyphs never use English OCR.
   if(!primaryUnavailable)try{
    const primary=[{kind:'numbers',region:[.015,.90,.97,.085],width:1400},{kind:'numbers',region:[.02,.925,.56,.055],width:1200},...(lang==='ko'?[]:[{kind:'names',region:[.13,.015,.59,.09],width:1200}])];
    for(let i=0;i<primary.length;i++){check();const p=primary[i];onstage(p.kind==='numbers'?'Odczytuję serię i numer karty…':'Odczytuję chińską nazwę…');
     const canvas=enhancedRegion(image,p.region,false,p.width),r=await CardScanRuntime.read(canvas,{maxSide:1600});check();
     e[p.kind].push(...(r.texts||[]).map(t=>({text:t.text||'',confidence:100*(t.mean??t.score??0),source:'asian-primary-'+i})));
     const found=report();if(found.some(r=>r.certain)||p.kind==='names'&&found.some(r=>r.full&&r.name>=.96))return e;
    }
   }catch(error){check();primaryUnavailable=true;e.primaryUnavailable=true;}
   let w;try{w=await ready();check()}catch(error){check();if(rank(index.cards,index.sets,e).length){e.fallbackUnavailable=true;return e}throw error}
   const passes=[
    {kind:'numbers',region:[.155,.942,.145,.033],width:700,psm:'7',digits:true},
    {kind:'numbers',region:[.155,.942,.145,.033],width:700,psm:'6',digits:true},
    {kind:'numbers',region:[0,.83,1,.17],width:2600,psm:'11'},
    {kind:'numbers',region:[0,.89,1,.11],width:3000,psm:'6',enhance:true},
    {kind:'numbers',region:[0,.87,.65,.13],width:2400,psm:'11'},
    {kind:'names',region:[.15,.025,.55,.075],width:900,psm:'7'},
    {kind:'names',region:[.15,.025,.55,.075],width:1000,psm:'6',enhance:true},
    {kind:'names',region:[.08,0,.72,.12],width:1300,psm:'11'}];
   for(let i=0;i<passes.length;i++){check();const p=passes[i];onstage(p.kind==='numbers'?'Odczytuję kod dodatku i numer karty…':'Odczytuję nazwę · '+definitions[lang].name+'…');
    await w.setParameters({tessedit_pageseg_mode:p.psm,user_defined_dpi:'300',preserve_interword_spaces:'1',tessedit_char_whitelist:p.digits?'0123456789/':p.kind==='numbers'?'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789./- ':''});check();
    const canvas=enhancedRegion(image,p.region,!!p.enhance,p.width),{data}=await w.recognize(canvas,{rotateAuto:true});check();
    e[p.kind].push({text:data.text||'',confidence:data.confidence||0,source:'asian-'+p.kind+'-'+i});
    const found=report();if(found.some(r=>r.certain))break;if(p.kind==='names'&&found.some(r=>r.name===1&&r.full))break;
   }check();return e;
  }};
 }
 return Object.freeze({definitions,supports,compact,parseNumbers,rank,manual,languageHint,createReader});
})();
