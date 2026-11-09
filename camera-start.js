/* Camera negotiation is separate from OCR and never requires installation. */
(function(root){
 'use strict';
 let pending=Promise.resolve();
 const failure=(name,message)=>Object.assign(new Error(message||name),{name});
 const stop=stream=>{for(const track of stream?.getTracks?.()||[])try{track.stop()}catch{}};
 function profiles(deviceId){
  const camera=deviceId?{deviceId:{exact:deviceId}}:{facingMode:{ideal:'environment'}};
  return [{...camera,width:{ideal:1920},height:{ideal:1080}},
   {...camera,width:{ideal:1280},height:{ideal:720}},camera,...(deviceId?[]:[true])];
 }
 function acquire({media=root.navigator?.mediaDevices,deviceId='',current=()=>true}={}){
  // A system permission prompt cannot be cancelled. Serialize attempts, then release
  // late streams immediately if the user has already left the scanner.
  const task=pending.catch(()=>{}).then(async()=>{
   if(!current())throw failure('AbortError');
   if(!media?.getUserMedia)throw failure('UnavailableError');
   let last;
   for(const video of profiles(deviceId)){
    if(!current())throw failure('AbortError');
    try{
     const stream=await media.getUserMedia({audio:false,video});
     if(!current()){stop(stream);throw failure('AbortError');}
     if(!stream.getVideoTracks().length){stop(stream);throw failure('NotFoundError');}
     return stream;
    }catch(error){
     last=error;
     if(!['OverconstrainedError','ConstraintNotSatisfiedError','NotReadableError','TrackStartError'].includes(error.name))throw error;
    }
   }
   throw last;
  });
  pending=task.then(()=>{},()=>{});return task;
 }
 function preview(video,stream,{signal,timeout=12000}={}){
  video.muted=true;video.defaultMuted=true;video.playsInline=true;video.autoplay=true;
  video.setAttribute('muted','');video.setAttribute('playsinline','');
  if(video.srcObject!==stream)video.srcObject=stream;
  return new Promise((resolve,reject)=>{
   let done=false,playing=false;
   const events=['loadeddata','playing','canplay','resize'];
   const finish=error=>{
    if(done)return;done=true;clearTimeout(timer);
    for(const event of events)video.removeEventListener(event,check);
    signal?.removeEventListener('abort',cancel);error?reject(error):resolve();
   };
   const cancel=()=>finish(failure('AbortError'));
   const check=()=>{if(playing&&video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0)finish();};
   const timer=setTimeout(()=>finish(failure('PreviewTimeoutError')),timeout);
   for(const event of events)video.addEventListener(event,check);
   signal?.addEventListener('abort',cancel,{once:true});
   if(signal?.aborted){cancel();return;}
   // Called synchronously inside the click handler when retrying blocked playback.
   try{Promise.resolve(video.play()).then(()=>{playing=true;check()},error=>finish(error.name==='NotAllowedError'?failure('PlaybackBlockedError'):error));}
   catch(error){finish(error);}
  });
 }
 function capabilities(track){try{return track?.getCapabilities?.()||{}}catch{return {}}}
 function tune(track){
  const caps=capabilities(track),advanced={};
  if(caps.focusMode?.includes('continuous'))advanced.focusMode='continuous';
  if(caps.exposureMode?.includes('continuous'))advanced.exposureMode='continuous';
  // Some mobile drivers never settle this promise. It must not block live video.
  if(Object.keys(advanced).length&&track?.applyConstraints)try{Promise.resolve(track.applyConstraints({advanced:[advanced]})).catch(()=>{})}catch{}
  return caps;
 }
 function explain(error,secure=root.isSecureContext){
  if(secure===false)return 'Kamera wymaga HTTPS. Otwórz CardScope pod bezpiecznym adresem strony.';
  const names={
   UnavailableError:'Ta przeglądarka nie udostępnia kamery. Otwórz link bezpośrednio w Chrome lub Samsung Internet, zamiast w oknie komunikatora.',
   NotAllowedError:'Brak zgody na kamerę. Zezwól na aparat dla tej strony i przeglądarki w ustawieniach telefonu, a potem spróbuj ponownie.',
   PermissionDeniedError:'Dostęp do aparatu jest zablokowany. Sprawdź uprawnienia strony i przeglądarki.',
   SecurityError:'Przeglądarka blokuje dostęp do aparatu. Otwórz bezpośrednio bezpieczny adres CardScope w przeglądarce.',
   NotReadableError:'Nie można uruchomić aparatu. Zamknij inne aplikacje używające kamery i spróbuj ponownie.',
   TrackStartError:'Aparat jest niedostępny lub zajęty. Zamknij inne aplikacje używające kamery.',
   NotFoundError:'Nie znaleziono dostępnego aparatu. Sprawdź, czy aparat działa w telefonie.',
   OverconstrainedError:'Wybrany aparat nie obsługuje tych ustawień. Wybierz inny aparat lub ustaw wybór automatyczny.',
   ConstraintNotSatisfiedError:'Nie udało się dobrać ustawień aparatu. Spróbuj wyboru automatycznego.',
   PreviewTimeoutError:'Aparat nie przesłał obrazu. Spróbuj ponownie lub wybierz inny aparat.',
   PlaybackBlockedError:'Aparat jest dostępny. Dotknij „Uruchom podgląd”, aby wyświetlić obraz.'
  };
  return names[error?.name]||'Nie udało się uruchomić podglądu. Spróbuj ponownie lub otwórz stronę w przeglądarce Chrome.';
 }
 root.CardCamera={acquire,preview,capabilities,tune,stop,explain,profiles};
})(globalThis);
