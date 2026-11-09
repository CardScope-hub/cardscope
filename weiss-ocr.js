// Self-hosted OCR runtime and models: no CDN, keys or image upload.
globalThis.CardWeissOCR=(()=>{
 const base=new URL('./ws-ocr/',document.currentScript?.src||location.href);let loading;
 function library(){if(globalThis.Tesseract?.createWorker)return Promise.resolve();if(!loading)loading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('tesseract.min.js',base).href;const timer=setTimeout(()=>{s.remove();reject(Error('Nie udało się wczytać lokalnego modułu skanera. Odśwież aplikację po aktualizacji.'));},30000);s.onload=()=>{clearTimeout(timer);resolve()};s.onerror=()=>{clearTimeout(timer);s.remove();reject(Error('Brakuje plików skanera. Wgraj również folder ws-ocr z aktualizacji.'));};document.head.append(s);}).catch(e=>{loading=null;throw e});return loading;}
 async function createRaw(lang,params={},onprogress=()=>{}){await library();let expired=false,w,timer;const pending=Tesseract.createWorker(lang,1,{workerPath:new URL('worker.min.js',base).href,corePath:base.href,langPath:new URL('models/',base).href,workerBlobURL:false,gzip:true,cachePath:'cardscope-weiss-best-v1',logger:m=>onprogress(m)},params).then(async worker=>{if(expired){await worker.terminate();throw new DOMException('Anulowano','AbortError');}w=worker;return worker;});
  try{return await Promise.race([pending,new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(Error('Pobieranie silnika Weiß Schwarz trwa zbyt długo. Sprawdź połączenie i ponów skan.'));},90000);})]);}finally{clearTimeout(timer);}
 }
 async function create(lang,params={},onprogress=()=>{}){return CardScanRuntime.acquire('weiss:'+lang+':'+JSON.stringify(params),()=>createRaw(lang,params,onprogress));}
 return Object.freeze({create,library});
})();
