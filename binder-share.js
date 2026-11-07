// Share an unlisted URL on this website. Only the owner can create or revoke it.
(() => {
 'use strict';
 const base=new URL('./',document.currentScript?.src||location.href);
 const $=id=>document.getElementById(id);
 let selected=null,owner=null,generation=0,busy=false,privateBinder=false;
 const dialog=document.createElement('dialog');dialog.id='binder-share-dialog';dialog.className='share-dialog';
 dialog.setAttribute('aria-labelledby','share-heading');
 dialog.innerHTML=`<div class="share-heading"><span class="eyebrow">TWOJA KOLEKCJA, WSPÓLNA PASJA</span><button type="button" id="share-close" class="round-control" aria-label="Zamknij udostępnianie">×</button></div><h2 id="share-heading">Pokaż swój binder.</h2><p id="share-binder-name"></p><p id="share-privacy-note">Odbiorca może oglądać karty i wyceny, bez możliwości edycji. Dostęp zależy od prywatności Twojego konta i bindera.</p><label for="share-owner">Nazwa właściciela widoczna dla innych</label><input id="share-owner" type="text" maxlength="50" autocomplete="nickname" placeholder="Twój nick"><p class="fine">Udostępniasz tylko ten binder. Zmiany kart i cen pojawią się w linku po synchronizacji i odświeżeniu widoku przez odbiorcę.</p><button id="share-publish" class="primary" type="button">Utwórz link do bindera ↗</button><div id="share-link-tools" hidden><label for="share-url">Link do Twojego bindera</label><input id="share-url" readonly type="url"><div class="share-actions"><button id="share-copy" class="primary" type="button">Kopiuj link</button><button id="share-native" class="secondary" type="button">Udostępnij ↗</button><a id="share-preview" class="secondary" target="_blank" rel="noopener noreferrer">Otwórz podgląd ↗</a></div><button id="share-revoke" class="text-btn" type="button">Wyłącz ten link</button></div><p id="share-status" role="status" aria-live="polite"></p>`;
 document.body.append(dialog);
 const valid=run=>run===generation&&dialog.open&&owner===globalThis.CardScopeAuth?.state.user?.id;
 function lock(value){busy=value;dialog.setAttribute('aria-busy',String(value));for(const id of ['share-publish','share-revoke'])$(id).disabled=value||(id==='share-publish'&&privateBinder);}
 function state(data){
  privateBinder=!!data?.binderPrivate;$('share-privacy-note').textContent=privateBinder?'Ten binder jest prywatny — widzisz go tylko Ty. Aby udostępnić, zmień Widoczność bindera.':data?.accountPrivate?'Konto prywatne: link otworzą tylko zalogowani, zaakceptowani znajomi.':'Konto publiczne: każdy z linkiem może obejrzeć ten binder, bez edycji.';
  $('share-link-tools').hidden=!data?.enabled;
  $('share-publish').textContent=data?.enabled?'Zapisz nazwę właściciela':'Utwórz link do bindera ↗';
  if(data?.enabled){const url=new URL('binder.html',base);url.searchParams.set('share',data.token);$('share-url').value=url.href;$('share-preview').href=url.href;$('share-owner').value=data.ownerName;}
  else{$('share-url').value='';$('share-preview').removeAttribute('href');}
 }
 async function rpc(action,name){
  const who=owner,id=selected,auth=globalThis.CardScopeAuth,config=globalThis.CARDSCOPE_SUPABASE;
  if(!who||auth?.state.user?.id!==who)throw Error('Zaloguj się na konto właściciela bindera.');
  const session=await auth.syncSession(who);
  if(owner!==who||selected!==id||auth.state.user?.id!==who)throw Error('Konto lub binder zmieniły się. Otwórz udostępnianie ponownie.');
  const res=await fetch(new URL('/rest/v1/rpc/cardscope_binder_share_manage_v1',config.url),{method:'POST',credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(25000),headers:{apikey:config.publishableKey,Authorization:'Bearer '+session.accessToken,'Content-Type':'application/json'},body:JSON.stringify({p_binder_id:id,p_action:action,p_owner_name:name||null})});
  const data=await res.json().catch(()=>null);
  if(!res.ok){if(data?.message==='BINDER_PRIVATE')throw Error('Ten binder jest prywatny. Zmień „Widoczność bindera”, aby go udostępnić.');if(data?.code==='PGRST202'||data?.code==='42P01')throw Error('Włącz linki w Supabase: uruchom plik 02-BINDER-LINKI.sql w SQL Editor.');if(res.status===401||res.status===403)throw Error('Sesja wygasła. Zaloguj się ponownie.');if(data?.message==='Sync binder first')throw Error('Najpierw zsynchronizuj binder z kontem.');throw Error('Nie udało się zapisać linku. Spróbuj ponownie.');}
  return data;
 }
 async function open(binder){
  if(!binder)return;generation++;selected=binder.id;owner=globalThis.CardScopeAuth?.state.user?.id;
  state(null);$('share-binder-name').textContent=binder.name;
  $('share-owner').value=globalThis.CardScopeAuth?.state.user?.user_metadata?.display_name||'';
  $('share-status').textContent='Sprawdzam udostępnianie…';if(!dialog.open)dialog.showModal();lock(true);const run=generation;
  try{const data=await rpc('status');if(valid(run)){state(data);$('share-status').textContent=data?.enabled?'Link jest aktywny. Możesz go skopiować lub wyłączyć.':'Brak aktywnego linku. Podgląd wśród znajomych zależy od widoczności konta i bindera.';}}
  catch(e){if(valid(run)||run===generation)$('share-status').textContent=e.message||'Brak połączenia.';}
  finally{if(run===generation)lock(false);}
 }
 $('share-publish').onclick=async()=>{
  if(busy)return;const name=$('share-owner').value.trim();if(!name){$('share-status').textContent='Podaj nazwę właściciela, np. swój nick.';$('share-owner').focus();return;}
  lock(true);const run=generation;$('share-status').textContent='Synchronizuję binder i przygotowuję link…';
  try{await globalThis.CardCloud?.sync();if(!valid(run))return;const cloud=globalThis.CardCloud?.state;if(cloud?.pending||['error','offline','conflict'].includes(cloud?.kind))throw Error('Dokończ synchronizację przed udostępnieniem. Sprawdź status na dole ekranu głównego.');const data=await rpc('publish',name);if(valid(run)){state(data);$('share-status').textContent='Gotowe. Skopiuj link i wyślij go wybranej osobie.';}}
  catch(e){if(valid(run))$('share-status').textContent=e.message||'Brak połączenia. Spróbuj ponownie.';}
  finally{if(run===generation)lock(false);}
 };
 $('share-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('share-url').value);$('share-status').textContent='Link skopiowany.';}catch{$('share-url').focus();$('share-url').select();$('share-status').textContent='Zaznaczono link. Skopiuj go ręcznie.';}};
 $('share-native').onclick=async()=>{if(!navigator.share){$('share-copy').click();return;}try{await navigator.share({title:$('share-binder-name').textContent+' · CardScope',url:$('share-url').value});}catch(e){if(e.name!=='AbortError')$('share-status').textContent='Użyj przycisku „Kopiuj link”.';}};
 $('share-revoke').onclick=async()=>{if(busy)return;lock(true);const run=generation;try{const data=await rpc('revoke');if(valid(run)){state(data);$('share-status').textContent='Link wyłączony. Utworzenie nowego linku nie przywróci starego.';}}catch(e){if(valid(run))$('share-status').textContent=e.message||'Nie udało się wyłączyć linku.';}finally{if(run===generation)lock(false);}};
 $('share-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{generation++;busy=false;selected=null;owner=null;});
 window.addEventListener('cardscope:account-change',()=>{generation++;dialog.close();state(null);});
 globalThis.CardBinderShare={open,export:open};
})();
