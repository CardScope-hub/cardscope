/* Profiles and friends. No private collection access is granted by this module. */
(()=>{
 'use strict';
 const auth=window.CardScopeAuth;if(!auth)return;
 const bucket='cardscope-profile-media',listeners=new Set(),signed=new Map();
 let owner=null,generation=0,state={status:'guest',profile:null,error:''},pending=null,savingOwner=null;
 const fail=code=>Object.assign(Error(code),{code});
 const check=id=>{if(!id||auth.state.user?.id!==id||auth.state.status!=='signed-in'||auth.state.recovery)throw fail('ACCOUNT_CHANGED');};
 const emit=next=>{state=Object.freeze({...state,...next});for(const cb of listeners)try{cb(state)}catch{console.error('CardScope: nie udało się odświeżyć profilu.')}};
 function errorText(e){const code=e?.code||'',messages={ACCOUNT_CHANGED:'Konto się zmieniło. Zaloguj się ponownie.',PROFILE_CONFLICT:'Profil zmienił się na innym urządzeniu. Skopiuj swój opis, kliknij „Wczytaj zapisany profil” i ponów zmiany.',PROFILE_REQUIRED:'Najpierw zapisz swój profil w zakładce Profil.',PROFILE_UNAVAILABLE:'Ten profil jest niedostępny. Poproś o nowy link.',INVITE_INVALID:'Ten link wygasł lub został wyłączony. Poproś o nowy link.',REQUEST_UNAVAILABLE:'To zaproszenie zostało już zmienione. Odśwież listę.',REQUEST_COOLDOWN:'Zaproszenie zostało odrzucone. Następne możesz wysłać po 24 godzinach.',REQUEST_LIMIT:'Masz już 50 oczekujących zaproszeń. Anuluj nieaktualne.',INVALID_IMAGE:'Nie udało się zapisać zdjęcia. Wybierz je ponownie.',AUTH_REQUIRED:'Zaloguj się, aby korzystać ze znajomych.',BUSY:'Trwa zapisywanie. Poczekaj chwilę.',UNCONFIGURED:'Moduł profili nie jest jeszcze uruchomiony. Właściciel strony musi wykonać skrypt 03-PROFILE-ZNAJOMI.sql w Supabase.'};
  if(messages[code])return messages[code];if(['PGRST202','42P01','3F000'].includes(code))return messages.UNCONFIGURED;
  if(e?.name==='AbortError')return 'Serwer nie odpowiedział na czas. Sprawdź zapisany profil przed ponowną próbą.';
  if(e?.status===401)return 'Sesja wygasła. Zaloguj się ponownie.';
  if(e?.status===413)return 'Zdjęcie jest za duże. Wybierz mniejszy plik.';
  if(e?.status===429)return 'Zbyt wiele operacji. Spróbuj za chwilę.';
  if(e?.code?.startsWith('profile_'))return auth.errorText(e);
  return 'Nie udało się połączyć lub zapisać zmian. Sprawdź internet i spróbuj ponownie.';
 }
 async function request(route,body,id=owner,method='POST',raw=false){
  check(id);const {accessToken}=await auth.syncSession(id);check(id);
  const config=window.CARDSCOPE_SUPABASE,url=new URL(config.url),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  if(url.protocol!=='https:'||url.username||url.password||!['','/'].includes(url.pathname))throw fail('UNCONFIGURED');
  try{const response=await fetch(url.origin+route,{method,body:body===undefined?undefined:raw?body:JSON.stringify(body),headers:{apikey:config.publishableKey.trim(),Authorization:'Bearer '+accessToken,'Content-Type':raw?'image/jpeg':'application/json',...(raw?{'x-upsert':'false'}:{})},credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal});
   let data;try{data=await response.json()}catch{data=null}check(id);
   if(!response.ok){const msg=data?.message||data?.error||'';const code=/^(PROFILE_|INVITE_|REQUEST_|INVALID_|AUTH_)/.test(msg)?msg:data?.code||data?.error_code||'REQUEST_FAILED';throw Object.assign(Error('Request failed'),{code,status:response.status});}
   return data;
  }finally{clearTimeout(timer)}
 }
 const rpc=(action,args={},id=owner)=>request('/rest/v1/rpc/cardscope_social_v1',{p_action:action,...args},id);
 function adopt(profile,id){check(id);if(profile&&profile.id!==id)throw fail('ACCOUNT_CHANGED');state=Object.freeze({...state,status:'ready',profile,error:''});if(profile)auth.applyProfileView(profile,id);emit({});return profile;}
 async function load(force=false){const id=owner;if(!id)return null;if(pending&&!force)return pending;const run=++generation;emit({status:'loading',error:''});
  const work=(async()=>{try{const p=await rpc('mine',{},id);if(run===generation&&owner===id)return adopt(p,id);return p;}catch(e){if(run===generation&&owner===id)emit({status:'error',error:errorText(e)});throw e;}finally{if(run===generation)pending=null;}})();pending=work;return work;
 }
 const validPath=path=>typeof path==='string'&&/^[a-f0-9-]{36}\/(avatar|banner)\/[a-f0-9-]{36}\.jpg$/.test(path);
 async function imageUrl(path){if(!validPath(path))return null;const id=owner;check(id);const hit=signed.get(path);if(hit?.until>Date.now())return hit.url;
  const data=await request('/storage/v1/object/sign/'+bucket+'/'+path,{expiresIn:600},id);const origin=new URL(window.CARDSCOPE_SUPABASE.url).origin;
  const value=data?.signedURL||data?.signedUrl;if(typeof value!=='string')return null;
  const url=new URL(value.startsWith('/object/')?'/storage/v1'+value:value,origin+'/storage/v1/');if(url.origin!==origin||!url.pathname.startsWith('/storage/v1/object/sign/'+bucket+'/'))throw fail('INVALID_IMAGE');
  check(id);signed.set(path,{url:url.href,until:Date.now()+480000});return url.href;
 }
 const draws=new WeakMap();
 function paintAvatar(node,p){if(!node)return;const seq=(draws.get(node)||0)+1;draws.set(node,seq);node.dataset.avatar='';CardProfile.paint(node,p);const path=p?.avatarPath;
  if(!path)return;void imageUrl(path).then(url=>{if(url&&draws.get(node)===seq){const img=document.createElement('img');img.alt='';img.src=url;img.referrerPolicy='no-referrer';img.onerror=()=>{if(draws.get(node)===seq){node.dataset.avatar='';CardProfile.paint(node,p)}};node.replaceChildren(img)}}).catch(()=>{});
 }
 function paintBanner(node,p){if(!node)return;const seq=(draws.get(node)||0)+1;draws.set(node,seq);node.replaceChildren();if(!p?.bannerPath)return;void imageUrl(p.bannerPath).then(url=>{if(url&&draws.get(node)===seq){const img=document.createElement('img');img.alt='';img.src=url;img.referrerPolicy='no-referrer';node.replaceChildren(img)}}).catch(()=>{});}
 async function removeFiles(paths,id){if(paths.length)await request('/storage/v1/object/'+bucket,{prefixes:paths},id,'DELETE');}
 async function save(input,media={},id=owner){check(id);if(savingOwner===id)throw fail('BUSY');if(state.status!=='ready')throw fail('UNCONFIGURED');savingOwner=id;
  const previous=state.profile,uploaded=[];let result;
  try{const value={...CardProfile.validate(input),discoverable:!!input.discoverable,avatarPath:input.avatarPath||null,bannerPath:input.bannerPath||null,expectedVersion:input.version||0};
   for(const kind of ['avatar','banner']){if(media[kind] instanceof Blob){if(media[kind].type!=='image/jpeg'||media[kind].size>1500000)throw fail('INVALID_IMAGE');const path=id+'/'+kind+'/'+crypto.randomUUID()+'.jpg';await request('/storage/v1/object/'+bucket+'/'+path,media[kind],id,'POST',true);uploaded.push(path);value[kind+'Path']=path;}}
   result=await rpc('save',{p_profile:value},id);adopt(result,id);
   const obsolete=['avatarPath','bannerPath'].map(k=>previous?.[k]&&previous[k]!==result[k]?previous[k]:null).filter(Boolean);
   // A new save might have reverted a path on another device. Only remove confirmed obsolete files.
   if(obsolete.length)try{const current=await rpc('mine',{},id);await removeFiles(obsolete.filter(p=>p!==current?.avatarPath&&p!==current?.bannerPath),id)}catch{/* The saved profile is safe; optional cleanup can wait. */}
   return result;
  }catch(e){if(uploaded.length&&auth.state.user?.id===id)try{const actual=await rpc('mine',{},id);await removeFiles(uploaded.filter(p=>p!==actual?.avatarPath&&p!==actual?.bannerPath),id)}catch{/* An uncertain save must never delete a possibly referenced image. */}throw e;
  }finally{if(savingOwner===id)savingOwner=null}
 }
 window.CardSocial=Object.freeze({get state(){return state},subscribe(cb){listeners.add(cb);cb(state);return()=>listeners.delete(cb)},load,rpc,save,imageUrl,paintAvatar,paintBanner,errorText});
 auth.subscribe(s=>{const id=s.status==='signed-in'&&!s.recovery?s.user?.id:null;if(id===owner)return;owner=id||null;generation++;pending=null;signed.clear();emit({status:owner?'loading':'guest',profile:null,error:''});if(owner)void load().catch(()=>{});});
})();
