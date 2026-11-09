// Cancel active work; keep a healthy idle model for the next card.
// No captured images or recognized text are retained in diagnostics.
globalThis.CardScanRuntime=(()=>{
 const base=document.currentScript?.src||location.href;
 const workerURL=new URL('./ocr-runtime/paddle-worker.js?v=14',base).href;
 const jpWorkerURL=new URL('./pokemon-jp-worker.js?v=pokemon-jp-name-2',base).href;
 const IDLE_MS=120000,classic=new Set(),metrics=[];
 let worker=null,pending=null,idle=null,warm=false,workerLanguage=null;
 let slot=null,creating=null,epoch=0;
 const abort=()=>new DOMException('Anulowano odczyt','AbortError');
 const now=()=>globalThis.performance?.now?.()??Date.now();
 function record(engine,stage,started,reused,ok=true){metrics.push({engine,stage,ms:Math.round(now()-started),reused:!!reused,ok});if(metrics.length>24)metrics.shift();}
 function shutdown(){clearTimeout(idle);const w=worker;worker=null;warm=false;workerLanguage=null;if(w)w.terminate();}
 function disposeSlot(s=slot){if(!s||s.dead)return;clearTimeout(s.idle);if(slot===s)slot=null;s.dead=true;try{Promise.resolve(s.raw.terminate()).catch(()=>{});}catch{}}
 function cancel({dispose=false}={}){
  epoch++;
  if(pending)pending.finish(abort());else if(dispose)shutdown();
  if(creating){creating.cancel();creating=null;}
  for(const w of [...classic])try{Promise.resolve(w.abort?w.abort():w.terminate()).catch(()=>{});}catch{}
  classic.clear();if(dispose)disposeSlot();
 }
 function canvasFor(image,{region,enhance=false,maxSide=1920,width=1800}={}){
  if(region)return enhancedRegion(image,region,enhance,width);
  const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
  if(!iw||!ih)throw Error('Brak obrazu do odczytu.');
  const scale=Math.min(1,maxSide/Math.max(iw,ih)),c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(iw*scale));c.height=Math.max(1,Math.round(ih*scale));
  c.getContext('2d').drawImage(image,0,0,c.width,c.height);return c;
 }
 function normalizeResult(result,width,height){
  const rw=Number(result.resizedImageWidth)||width,rh=Number(result.resizedImageHeight)||height;
  const sx=width/rw,sy=height/rh;
  return {...result,width,height,resizedImageWidth:width,resizedImageHeight:height,texts:(result.texts||[]).map(line=>({...line,box:line.box?.map(([x,y])=>[x*sx,y*sy])}))};
 }
 async function read(image,options={}){
  if(typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined')throw Error('Lokalny silnik WASM nie jest obsługiwany.');
  if(pending||creating||slot?.leased)throw Error('Odczyt już trwa.');
  clearTimeout(idle);disposeSlot();
  const canvas=canvasFor(image,options),pixels=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;
  const language=options.language==='ja'?'ja':'default';if(worker&&workerLanguage!==language)shutdown();
  if(!worker){worker=new Worker(language==='ja'?jpWorkerURL:workerURL,{type:'module'});workerLanguage=language;warm=false;}
  const current=worker,started=now(),reused=warm;
  return new Promise((resolve,reject)=>{
   let done=false;
   const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);current.onmessage=current.onerror=null;pending=null;record(language,'ocr',started,reused,!error);
    if(error){shutdown();reject(error);}else{warm=true;idle=setTimeout(shutdown,IDLE_MS);resolve(normalizeResult(result,canvas.width,canvas.height));}};
   const timer=setTimeout(()=>finish(Error('Odczyt trwa zbyt długo. Spróbuj ponownie lub zbliż numer karty.')),warm?25000:90000);pending={finish};
   current.onmessage=({data})=>{if(data.error)finish(Error('Błąd odczytu: '+String(data.error).slice(0,300)));else if(data.result)finish(null,data.result);else options.onstage?.(data.stage);};
   current.onerror=()=>finish(Error('Nie udało się uruchomić silnika odczytu.'));
   try{current.postMessage({width:canvas.width,height:canvas.height,pixels:pixels.buffer},[pixels.buffer]);}catch(e){finish(e);}
  });
 }
 // A lease's terminate releases a healthy worker. An active operation is aborted
 // and destroyed, so old callbacks can never write into a new scan.
 async function acquire(key,factory){
  if(pending||creating||slot?.leased)throw Error('Odczyt już trwa.');
  shutdown();const started=now(),reused=slot?.key===key&&!slot.dead;
  if(!reused){disposeSlot();const run=epoch;let expired=false,timer,rejectCreate;
   const ticket={cancel(){expired=true;rejectCreate?.(abort());}};creating=ticket;
   try{
    const raw=await Promise.race([Promise.resolve().then(factory).then(w=>{if(expired||run!==epoch){try{Promise.resolve(w.terminate()).catch(()=>{});}catch{}throw abort();}return w;}),new Promise((_,reject)=>{rejectCreate=reject;timer=setTimeout(()=>{expired=true;reject(Error('Pobieranie silnika trwa zbyt długo. Sprawdź połączenie i ponów skan.'));},90000);})]);
    if(run!==epoch){try{await raw.terminate();}catch{}throw abort();}slot={key,raw,leased:false,dead:false,idle:null};
   }finally{clearTimeout(timer);if(creating===ticket)creating=null;}
  }
  record(key,'engine',started,reused);const s=slot;clearTimeout(s.idle);s.leased=true;let released=false,operation=null;
  async function invoke(method,args){
   if(released||s.dead)throw abort();if(operation)throw Error('Odczyt już trwa.');
   const started=now();let rejectPending,timer;
   const op={cancel(){rejectPending?.(abort());}};operation=op;
   try{return await Promise.race([Promise.resolve().then(()=>{if(released||s.dead)throw abort();return s.raw[method](...args);}),new Promise((_,reject)=>{rejectPending=reject;timer=setTimeout(()=>{disposeSlot(s);reject(Error('Odczyt trwa zbyt długo. Zbliż tekst karty i ponów próbę.'));},method==='recognize'?25000:10000);})]);}
   catch(e){disposeSlot(s);throw e;}
   finally{clearTimeout(timer);if(operation===op)operation=null;if(method==='recognize')record(key,'ocr',started,true,!s.dead);}
  }
  const lease={setParameters(...a){return invoke('setParameters',a);},recognize(...a){return invoke('recognize',a);},
   async terminate(){if(released)return;released=true;classic.delete(lease);s.leased=false;if(operation){operation.cancel();disposeSlot(s);}else if(!s.dead)s.idle=setTimeout(()=>disposeSlot(s),IDLE_MS);},
   async abort(){await lease.terminate();}
  };classic.add(lease);try{await lease.setParameters({tessedit_pageseg_mode:'11',tessedit_char_whitelist:'',preserve_interword_spaces:'1',user_defined_dpi:'300'});return lease;}catch(e){await lease.terminate();throw e;}
 }
 async function classicWorker(lang,params={}){const key='classic:'+lang+':'+JSON.stringify(params);return acquire(key,()=>Tesseract.createWorker(lang,1,{},params));}
 const track=w=>{classic.add(w);return w;},untrack=w=>classic.delete(w);
 return Object.freeze({read,cancel,track,untrack,canvasFor,normalizeResult,acquire,classicWorker,metrics:()=>metrics.map(x=>({...x})),record,now});
})();
globalThis.CardScanner={cancel(options){CardScanRuntime.cancel(options);globalThis.CardVision?.cancel();}};
window.addEventListener('pagehide',()=>CardScanRuntime.cancel({dispose:true}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)CardScanRuntime.cancel({dispose:true});});
