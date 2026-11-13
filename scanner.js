let cameraStream=null,cameraAttempt=0,torchOn=false,qualityTimer=null,capturing=false;
let cameraPhase='idle',cameraAbort=null,cameraWaiting=null,selectedCamera='';
function stopCamera(){
 $('camera').parentElement?.classList.remove('is-live','is-capturing');
 cameraAttempt++;cameraPhase='idle';cameraAbort?.abort();cameraAbort=null;
 capturing=false;clearInterval(qualityTimer);qualityTimer=null;clearTimeout(cameraWaiting);
 torchOn=false;$('torch').disabled=true;$('torch').setAttribute('aria-pressed','false');
 $('scan-card').disabled=true;$('camera-play').hidden=true;
 const stream=cameraStream;cameraStream=null;CardCamera.stop(stream);
 try{$('camera').pause()}catch{}$('camera').srcObject=null;
}
function cameraHelp(error){
 $('camera-status').textContent=CardCamera.explain(error);
 $('camera-retry').hidden=false;$('camera-help').hidden=false;$('camera-help').open=true;
 $('camera-error-code').textContent='Informacja techniczna: '+(error.name||'CameraError');
}
function pauseScannerCamera(){
 stopCamera();$('camera-status').textContent='Kamera zatrzymana. Uruchom ją ponownie, aby kontynuować.';$('camera-retry').hidden=false;
}
async function listScannerCameras(attempt){
 try{
  const list=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');
  if(attempt!==cameraAttempt)return;
  const select=$('camera-device');select.replaceChildren(new Option('Automatycznie · tylny aparat',''));
  list.forEach((d,i)=>{if(d.deviceId)select.append(new Option(d.label||`Aparat ${i+1}`,d.deviceId))});
  select.value=selectedCamera;$('camera-device-label').hidden=list.length<2;
 }catch{/* Device enumeration is optional; live camera continues. */}
}
async function startScannerPreview(attempt){
 const stream=cameraStream;if(!stream||attempt!==cameraAttempt)return;
 cameraPhase='preview';$('camera-play').hidden=true;
 try{
  await CardCamera.preview($('camera'),stream,{signal:cameraAbort.signal});
  if(attempt!==cameraAttempt)return;
  if(document.hidden){pauseScannerCamera();return;}
  cameraPhase='ready';$('camera').parentElement?.classList.add('is-live');
  $('scan-card').disabled=false;$('camera-retry').hidden=true;$('camera-help').open=false;
  $('camera-status').textContent='Ustaw całą kartę w ramce. Unikaj odblasków i trzymaj telefon nieruchomo.';
  const track=stream.getVideoTracks()[0],caps=CardCamera.tune(track);$('torch').disabled=!caps.torch;
  clearInterval(qualityTimer);qualityTimer=setInterval(checkCameraQuality,700);checkCameraQuality();
  void listScannerCameras(attempt);
 }catch(error){
  if(attempt!==cameraAttempt)return;
  if(error.name==='PlaybackBlockedError'){
   cameraPhase='gesture';$('camera-play').hidden=false;
   $('camera-status').textContent=CardCamera.explain(error);return;
  }
  stopCamera();cameraHelp(error);
 }
}
async function openScanner(){
 // Do not invalidate a permission dialog after a second tap on the scan tab.
 if(cameraPhase==='permission'&&!$('scanner').hidden)return;
 show('scanner');$('recent-card').replaceChildren();
 if(cards[0]){const im=document.createElement('img');im.src=CardArtwork.src;im.alt='Ostatnia karta';$('recent-card').append(im)}else $('recent-card').textContent='▤';
 const attempt=++cameraAttempt;cameraAbort=new AbortController();cameraPhase='permission';
 $('scan-card').disabled=true;$('camera-retry').hidden=true;$('camera-play').hidden=true;
 $('camera-quality').textContent='Kamera';$('camera-status').textContent='Uruchamiam kamerę… Zezwól na dostęp do aparatu.';
 $('camera-error-code').textContent='';
 cameraWaiting=setTimeout(()=>{
  if(attempt!==cameraAttempt||cameraPhase!=='permission')return;
  $('camera-status').textContent='Czekam na aparat. Sprawdź prośbę o dostęp do kamery. Jeśli jej nie widać, otwórz pomoc poniżej.';
  $('camera-help').hidden=false;$('camera-help').open=true;
 },8000);
 try{
  if(window.isSecureContext===false)throw Object.assign(Error(),{name:'SecurityError'});
  const stream=await CardCamera.acquire({deviceId:selectedCamera,current:()=>attempt===cameraAttempt});
  clearTimeout(cameraWaiting);if(attempt!==cameraAttempt){CardCamera.stop(stream);return;}
  cameraStream=stream;
  if(document.hidden){pauseScannerCamera();return;}
  const track=stream.getVideoTracks()[0];
  track.addEventListener?.('ended',()=>{if(attempt!==cameraAttempt)return;stopCamera();cameraHelp({name:'NotReadableError'})},{once:true});
  await startScannerPreview(attempt);
 }catch(error){
  if(attempt!==cameraAttempt)return;
  stopCamera();cameraHelp(error);
 }
}
$('camera-play').onclick=()=>startScannerPreview(cameraAttempt);
$('camera-device').onchange=()=>{selectedCamera=$('camera-device').value;void openScanner()};
$('camera-native').onchange=event=>{
 const input=$('scan-upload');
 // Reuse the existing image import/OCR flow and its language settings.
 if(typeof input.onchange==='function')void input.onchange(event);
};
function scanCrop(vw,vh,view,guide){const scale=Math.max(view.width/vw,view.height/vh),ox=(vw*scale-view.width)/2,oy=(vh*scale-view.height)/2;return {x:(guide.left-view.left+ox)/scale,y:(guide.top-view.top+oy)/scale,width:guide.width/scale,height:guide.height/scale}}
function captureCanvas(maxWidth=2400){const video=$('camera');if(!cameraStream||!video.videoWidth||video.readyState<2)return null;const guide=$('scan-guide'),rect=guide.getBoundingClientRect(),border=parseFloat(getComputedStyle(guide).borderLeftWidth)||0,crop=scanCrop(video.videoWidth,video.videoHeight,video.getBoundingClientRect(),{left:rect.left+border,top:rect.top+border,width:rect.width-2*border,height:rect.height-2*border});const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.min(maxWidth,Math.round(crop.width)));canvas.height=Math.max(1,Math.round(canvas.width*(['auto','swu','weiss','weiss-jp'].includes(guide.dataset.game)&&guide.dataset.orientation==='landscape'?63/88:88/63)));canvas.getContext('2d').drawImage(video,crop.x,crop.y,crop.width,crop.height,0,0,canvas.width,canvas.height);return canvas}
function checkCameraQuality(){if(capturing)return;try{const canvas=captureCanvas(210);if(!canvas)return;const q=CardScanQuality.inspect(canvas),label=$('camera-quality');label.textContent=q.hint||'Ustaw całą kartę w ramce';label.dataset.state=q.hint?'warn':'ready'}catch{/* Quality hints must never prevent scanning. */}}
$('scan-card').onclick=async()=>{if(capturing)return;globalThis.CardLiveScan?.stop();CardScanner.cancel();const attempt=cameraAttempt;if(!captureCanvas(210)){message('Poczekaj na podgląd kamery.');return}capturing=true;$('camera').parentElement?.classList.add('is-capturing');$('scan-card').disabled=true;$('camera-status').textContent='Przytrzymaj telefon — wybieram najostrzejsze ujęcie…';let best=null,bestScore=-1;try{for(let i=0;i<3;i++){if(attempt!==cameraAttempt)return;const canvas=captureCanvas();if(canvas){const score=globalThis.CardWeissScan?.is(currentGame())&&globalThis.CardWeissFrame?.quality?CardWeissFrame.quality(canvas):qualityScore(canvasQuality(canvas));if(score>bestScore){bestScore=score;best=canvas}}if(i<2)await new Promise(r=>setTimeout(r,110))}if(attempt!==cameraAttempt)return;if(!best)throw Error('Nie udało się uchwycić obrazu. Spróbuj ponownie.');begin(best.toDataURL('image/jpeg',.97));recognize()}catch(e){if(attempt===cameraAttempt){$('camera-status').textContent=e.message;$('scan-card').disabled=false}}finally{capturing=false;$('camera').parentElement?.classList.remove('is-capturing')}};
$('close-scanner').onclick=()=>show('scan');$('camera-retry').onclick=openScanner;$('scanner-manual').onclick=()=>begin();$('recent-card').onclick=()=>cards.length?openDetail(cards[0]):show('collection');
window.addEventListener('pagehide',stopCamera);document.addEventListener('visibilitychange',()=>{if(document.hidden&&!$('scanner').hidden&&cameraStream)pauseScannerCamera()});
$('torch').onclick=async()=>{const track=cameraStream?.getVideoTracks()[0];if(!track)return;try{await track.applyConstraints({advanced:[{torch:!torchOn}]});torchOn=!torchOn;$('torch').setAttribute('aria-pressed',String(torchOn));$('torch').setAttribute('aria-label',torchOn?'Wyłącz latarkę':'Włącz latarkę')}catch{message('Ten aparat nie obsługuje latarki w przeglądarce.')}};
