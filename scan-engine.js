// One local OCR worker at a time; retain loaded models between crops/frames.
globalThis.CardScanRuntime=(()=>{
 const workerURL=new URL('./ocr-runtime/paddle-worker.js?v=14',document.currentScript?.src||location.href).href;
 let worker=null,pending=null,idle=null,warm=false;const classic=new Set();
 const abort=()=>new DOMException('Anulowano odczyt','AbortError');
 function shutdown(){clearTimeout(idle);const w=worker;worker=null;warm=false;if(w)w.terminate()}
 function cancel(){if(pending)pending.finish(abort());shutdown();for(const w of classic)try{Promise.resolve(w.terminate()).catch(()=>{})}catch{};classic.clear()}
 function canvasFor(image,{region,enhance=false,maxSide=1920}={}){
  if(region)return enhancedRegion(image,region,enhance,1800);
  const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height,scale=Math.min(1,maxSide/Math.max(iw,ih));
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(iw*scale));c.height=Math.max(1,Math.round(ih*scale));c.getContext('2d').drawImage(image,0,0,c.width,c.height);return c;
 }
 async function read(image,options={}){
  if(typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined')throw Error('Lokalny silnik WASM nie jest obsługiwany.');
  if(pending)throw Error('Odczyt już trwa.');clearTimeout(idle);
  const canvas=canvasFor(image,options),pixels=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;
  if(!worker){worker=new Worker(workerURL,{type:'module'});warm=false}
  return new Promise((resolve,reject)=>{
   let done=false;const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);pending=null;if(error){shutdown();reject(error)}else{warm=true;idle=setTimeout(shutdown,45000);resolve({...result,width:canvas.width,height:canvas.height})}};
   const timer=setTimeout(()=>finish(Error('Przekroczono czas odczytu.')),warm?45000:100000);pending={finish};
   worker.onmessage=({data})=>{if(data.error)finish(Error('Silnik odczytu nie odpowiedział.'));else if(data.result)finish(null,data.result);else options.onstage?.(data.stage)};
   worker.onerror=()=>finish(Error('Nie udało się uruchomić silnika odczytu.'));
   try{worker.postMessage({width:canvas.width,height:canvas.height,pixels:pixels.buffer},[pixels.buffer])}catch(e){finish(e)}
  });
 }
 function track(w){classic.add(w);return w}function untrack(w){classic.delete(w)}
 return Object.freeze({read,cancel,track,untrack,canvasFor});
})();
globalThis.CardScanner={cancel(){CardScanRuntime.cancel();globalThis.CardVision?.cancel()}};
window.addEventListener('pagehide',()=>CardScanRuntime.cancel());
