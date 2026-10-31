/* Account-scoped local queue + Supabase RLS. No service_role key and no /api server. */
(function(root){
 'use strict';
 function createCardCloud(deps={}){
  const auth=deps.auth||root.CardScopeAuth,config=deps.config||root.CARDSCOPE_SUPABASE;
  const database=deps.indexedDB||root.indexedDB,request=deps.fetch||root.fetch.bind(root);
  const uuid=deps.uuid||(()=>root.crypto.randomUUID()),online=deps.online||(()=>root.navigator.onLine);
  const local=deps.localStorage||root.localStorage,project=new URL(config.url).hostname;
  const base=new URL('/rest/v1/',config.url).href;
  const keyOf=(kind,id)=>kind+':'+id,clone=x=>JSON.parse(JSON.stringify(x));
  const subscribers=new Set(),views={card:new Set(),binder:new Set()},validators={};
  let active=null,desired,epoch=0,transition=Promise.resolve(),latest={owner:null,kind:'pending',text:'Sprawdzam konto…',pending:0,legacy:null};
  const channel=deps.listeners===false?null:typeof root.BroadcastChannel==='function'?new root.BroadcastChannel('cardscope-sync:'+project):null;
  function publish(update){latest={...latest,...update};for(const f of subscribers){try{f(latest)}catch{}}}
  function emit(kind,items){for(const f of views[kind]){try{f(items)}catch{}}}
  function open(name,existing=false){return new Promise((resolve,reject)=>{
   const r=database.open(name,1);let absent=false;
   r.onupgradeneeded=()=>{if(existing){absent=true;r.transaction.abort();return}for(const s of ['records','outbox','meta'])r.result.createObjectStore(s,{keyPath:'key'});};
   r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();resolve(r.result)};
   r.onerror=()=>absent?resolve(null):reject(r.error);
   r.onblocked=()=>reject(Error('Zamknij inne karty CardScope i odśwież stronę.'));
  })}
  function tx(db,stores,mode,fn){return new Promise((resolve,reject)=>{
   const t=db.transaction(stores,mode);let result;
   t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('Zapis lokalny został przerwany.'));
   try{fn(t,v=>result=v)}catch(e){try{t.abort()}catch{}reject(e)}
  })}
  const all=(db,s)=>tx(db,[s],'readonly',(t,set)=>{t.objectStore(s).getAll().onsuccess=e=>set(e.target.result)});
  const get=(db,s,k)=>tx(db,[s],'readonly',(t,set)=>{t.objectStore(s).get(k).onsuccess=e=>set(e.target.result)});
  const control=open('cardscope-sync-control:'+project);
  function ensure(ctx){if(!ctx||active!==ctx)throw Error('Konto zmieniło się. Otwórz kartę ponownie przed zapisem.');}
  function validate(kind,input){
   if(!['card','binder'].includes(kind)||!input||!/^[\w-]{1,100}$/.test(input.id)||typeof input.name!=='string'||!input.name.trim())throw Error('Nieprawidłowa karta lub binder.');
   if(kind==='card'&&(!Number.isInteger(input.qty)||input.qty<1||input.qty>999))throw Error('Nieprawidłowa liczba kopii karty.');
   if(kind==='binder'&&!Array.isArray(input.slots))throw Error('Nieprawidłowe kieszonki bindera.');
   const value=validators[kind]?validators[kind](input):input;
   if(new TextEncoder().encode(JSON.stringify(value)).length>12582912)throw Error('Ten zapis przekracza 12 MB. Zmniejsz zdjęcie karty.');
   return clone(value);
  }
  function localRow(remote){
   if(!remote||!['card','binder'].includes(remote.kind)||!/^[\w-]{1,100}$/.test(remote.id)||!Number.isSafeInteger(Number(remote.version))||Number(remote.version)<1)throw Error('Nieprawidłowa odpowiedź synchronizacji.');
   return {key:keyOf(remote.kind,remote.id),kind:remote.kind,id:remote.id,payload:remote.deleted?null:validate(remote.kind,remote.payload),deleted:!!remote.deleted,version:Number(remote.version)};
  }
  async function notify(ctx){
   const rows=await all(ctx.db,'records');if(active!==ctx)return;
   for(const kind of ['card','binder'])emit(kind,rows.filter(x=>x.kind===kind&&!x.deleted).map(x=>x.payload).sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''))));
  }
  async function status(ctx,text,kind='pending'){
   const pending=(await all(ctx.db,'outbox')).length;
   if(active===ctx)publish({owner:ctx.owner,text,kind,pending});
  }
  function friendly(error){
   if(error?.code==='PGRST205'||error?.code==='PGRST202'||error?.status===404)return 'Brakuje tabeli synchronizacji. Uruchom 01-SUPABASE.sql w SQL Editor swojego projektu.';
   if(error?.status===401||error?.status===403)return 'Sesja wygasła lub brak uprawnień. Zaloguj się ponownie i sprawdź wykonanie skryptu SQL. Zmiany pozostają na urządzeniu.';
   if(error?.status===413)return 'Zdjęcie jest za duże do wysłania. Zmiany pozostają na urządzeniu.';
   if(!online()||error?.name==='TypeError'||error?.name==='TimeoutError')return 'Brak połączenia. Zmiany są zapisane na urządzeniu i czekają na wysłanie.';
   return error?.message||'Synchronizacja nie powiodła się. Kopia pozostaje na urządzeniu.';
  }
  async function rest(ctx,path,body){
   ensure(ctx);const session=await auth.syncSession(ctx.owner);ensure(ctx);
   if(!session?.accessToken||session.userId!==ctx.owner)throw Error('Zaloguj się ponownie na konto tej kolekcji.');
   const response=await request(base+path,{method:body?'POST':'GET',credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(45000),headers:{apikey:config.publishableKey,Authorization:'Bearer '+session.accessToken,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
   const data=await response.json().catch(()=>null);ensure(ctx);
   if(!response.ok){const e=Error('Nie udało się zapisać danych w Supabase. Zmiany pozostają na urządzeniu.');e.status=response.status;e.code=data?.code;throw e}
   return data;
  }
  async function pull(ctx){
   for(const kind of ['card','binder']){
    let after='';
    for(;;){
     const query=new URLSearchParams({select:'user_id,kind,id,payload,deleted,version',user_id:'eq.'+ctx.owner,kind:'eq.'+kind,order:'id.asc',limit:'200'});if(after)query.set('id','gt.'+after);
     const data=await rest(ctx,'cardscope_sync_items?'+query);if(!Array.isArray(data))throw Error('Nieprawidłowa lista zapisów.');
     const rows=data.map(r=>{if(r.user_id!==ctx.owner||r.kind!==kind)throw Error('Nieprawidłowy właściciel odpowiedzi.');return localRow(r)});
     await tx(ctx.db,['records','outbox'],'readwrite',t=>{
      for(const row of rows)t.objectStore('outbox').get(row.key).onsuccess=e=>{
       if(!e.target.result)t.objectStore('records').get(row.key).onsuccess=old=>{
        if(!old.target.result||row.version>=old.target.result.version)t.objectStore('records').put(row);
       };
      };
     });
     if(data.length<200)break;const next=data[data.length-1].id;if(next<=after)throw Error('Nieprawidłowa kolejna strona synchronizacji.');after=next;
    }
   }
  }
  async function ack(ctx,operations,answers){
   if(!Array.isArray(answers)||answers.length!==operations.length)throw Error('Niepełne potwierdzenie zapisu. Ponowię synchronizację.');
   const byId=new Map(answers.map(x=>[x.mutation_id,x]));let conflict=false;
   const prepared=operations.map(op=>{
    const answer=byId.get(op.mutationId);if(!answer||typeof answer.conflict!=='boolean')throw Error('Brak potwierdzenia zmiany.');
    if(answer.record&&(answer.record.user_id!==ctx.owner||answer.record.kind!==op.kind||answer.record.id!==op.id))throw Error('Nieprawidłowe potwierdzenie właściciela zapisu.');
    if(!answer.record&&!answer.conflict)throw Error('Brak zapisanego rekordu.');
    return {op,answer,remote:answer.record?localRow(answer.record):null};
   });
   await tx(ctx.db,['records','outbox'],'readwrite',t=>{
    const items=t.objectStore('records'),queue=t.objectStore('outbox');
    for(const {op,answer,remote} of prepared)queue.get(op.key).onsuccess=e=>{
     const pending=e.target.result;if(!pending)return;
     if(answer.conflict){
      conflict=true;
      if(!pending.deleted){
       const id=uuid(),name=pending.payload.name.slice(0,op.kind==='binder'?45:95)+' · kopia z urządzenia';
       const payload={...pending.payload,id,name,updatedAt:new Date().toISOString()};
       const key=keyOf(op.kind,id);items.put({key,kind:op.kind,id,payload,deleted:false,version:0});
       queue.put({key,kind:op.kind,id,payload,deleted:false,baseVersion:0,mutationId:uuid()});
      }
      queue.delete(op.key);if(remote)items.put(remote);else items.delete(op.key);return;
     }
     if(pending.mutationId===op.mutationId){queue.delete(op.key);items.put(remote)}
     else {queue.put({...pending,baseVersion:remote.version});items.put({...remote,payload:pending.payload,deleted:pending.deleted})}
    };
   });return conflict;
  }
  async function run(ctx){
   let conflict=false;
   try{
    ensure(ctx);if(!online()){await status(ctx,'Offline · zmiany pozostają na urządzeniu','offline');return}
    await status(ctx,'Synchronizuję karty i bindery…');
    for(let pass=0;pass<4;pass++){
     const pending=await all(ctx.db,'outbox');if(!pending.length)break;
     for(let offset=0;offset<pending.length;){
      ensure(ctx);const batch=[];let bytes=0;
      while(offset<pending.length&&batch.length<25){const op=pending[offset],size=JSON.stringify(op).length;if(batch.length&&bytes+size>1500000)break;batch.push(op);bytes+=size;offset++}
      const answers=await rest(ctx,'rpc/cardscope_sync_batch_v1',{p_operations:batch.map(({key,...op})=>op)});
      conflict=await ack(ctx,batch,answers)||conflict;await notify(ctx);await status(ctx,'Wysyłam zmiany…');
     }
    }
    await pull(ctx);ensure(ctx);await notify(ctx);
    const pending=(await all(ctx.db,'outbox')).length;
    const text=conflict?'Wykryto równoczesne zmiany. Edycję zachowano jako kopię; sprzeczne usunięcie wymaga ponowienia.':pending?'Pozostałe zmiany czekają na synchronizację.':'✓ Karty i bindery zapisane w Supabase · '+new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
    await status(ctx,text,conflict?'conflict':pending?'pending':'saved');channel?.postMessage({owner:ctx.owner});
   }catch(e){if(active===ctx)await status(ctx,friendly(e),'error')}
  }
  async function sync(){
   await ready();const ctx=active;if(!ctx)return;
   if(ctx.syncing)return ctx.syncing;
   const locks=deps.locks===false?null:(deps.locks||root.navigator?.locks);
   ctx.syncing=(locks?locks.request('cardscope-sync:'+project+':'+ctx.owner,{ifAvailable:true},lock=>lock?run(ctx):undefined):run(ctx));
   try{await ctx.syncing}finally{ctx.syncing=null}
  }
  async function write(kind,input,deleted=false){
   const ctx=active;if(!ctx)throw Error('Zaloguj się, aby zapisać kartę lub binder na swoim koncie.');
   const id=deleted?input:input?.id,payload=deleted?null:validate(kind,input);if(!/^[\w-]{1,100}$/.test(id))throw Error('Nieprawidłowy identyfikator.');
   ensure(ctx);const key=keyOf(kind,id);
   await tx(ctx.db,['records','outbox'],'readwrite',t=>{t.objectStore('records').get(key).onsuccess=e=>{
    const version=e.target.result?.version||0;t.objectStore('records').put({key,kind,id,payload,deleted,version});
    t.objectStore('outbox').put({key,kind,id,payload,deleted,baseVersion:version,mutationId:uuid()});
   }});await notify(ctx);await status(ctx,'Zapisano na urządzeniu · zmiany czekają na wysłanie');channel?.postMessage({owner:ctx.owner});if(active===ctx)void sync();return payload;
  }
  async function changeQuantity(id,delta){
   if(!/^[\w-]{1,100}$/.test(id)||![1,-1].includes(delta))throw Error('Nieprawidłowa zmiana liczby kopii.');
   const ctx=active;ensure(ctx);const key=keyOf('card',id);let reason;
   const payload=await tx(ctx.db,['records','outbox'],'readwrite',(t,set)=>{
    t.objectStore('records').getAll().onsuccess=e=>{try{
     ensure(ctx);const rows=e.target.result,current=rows.find(r=>r.key===key&&!r.deleted)?.payload;
     if(!current)throw Error('Ta karta nie jest już dostępna w kolekcji.');
     let minimum=1;
     for(const row of rows)if(row.kind==='binder'&&!row.deleted)minimum=Math.max(minimum,(row.payload.slots||[]).filter(x=>x===id).length);
     const qty=current.qty+delta;
     if(qty<1||qty>999)throw Error('Liczba kopii musi mieścić się w zakresie 1–999.');
     if(delta<0&&qty<minimum)throw Error('W jednym z binderów masz '+minimum+' kopii tej karty. Najpierw wyjmij odpowiednie kopie z bindera.');
     const next=validate('card',{...current,qty}),version=rows.find(r=>r.key===key).version||0;
     t.objectStore('records').put({key,kind:'card',id,payload:next,deleted:false,version});
     t.objectStore('outbox').put({key,kind:'card',id,payload:next,deleted:false,baseVersion:version,mutationId:uuid()});set(next);
    }catch(e){reason=e;t.abort()}};
   }).catch(e=>{throw reason||e});
   await notify(ctx);await status(ctx,'Zapisano liczbę kopii na urządzeniu · zmiany czekają na wysłanie');channel?.postMessage({owner:ctx.owner});if(active===ctx)void sync();return payload;
  }
  async function legacySnapshot(){
   const oldCards=await open('cardscope-private-v1',true),oldBinders=await open('cardscope-binders-v1',true);let cards=[],binders=[];
   try{
    if(oldCards?.objectStoreNames.contains('cards'))cards=await all(oldCards,'cards');
    else {const parsed=JSON.parse(local.getItem('cardscope.collection.v1')||'[]');if(!Array.isArray(parsed))throw Error('Nieprawidłowa lokalna kopia kart.');cards=parsed;}
    if(oldBinders?.objectStoreNames.contains('binders'))binders=(await all(oldBinders,'binders')).map(x=>x.binder||x);
    return {cards,binders};
   }finally{oldCards?.close();oldBinders?.close()}
  }
  async function legacyInfo(ctx){
   const c=await control,claim=await get(c,'meta','legacy-owner');
   if(claim&&claim.owner!==ctx.owner)return null;
   if(claim&&await get(ctx.db,'meta','legacy-import:'+claim.batch))return null;
   const source=await legacySnapshot();return source.cards.length||source.binders.length?{cards:source.cards.length,binders:source.binders.length}:null;
  }
  async function importLegacy(){
   const ctx=active;ensure(ctx);const source=await legacySnapshot();ensure(ctx);
   const cards=source.cards.map(x=>validate('card',x)),binders=source.binders.map(x=>validate('binder',x));
   if(!cards.length&&!binders.length)return {cards:0,binders:0};
   const c=await control;
   const claim=await tx(c,['meta'],'readwrite',(t,set)=>{const s=t.objectStore('meta');s.get('legacy-owner').onsuccess=e=>{
    const old=e.target.result;if(old){set(old);return}const v={key:'legacy-owner',owner:ctx.owner,batch:uuid()};s.put(v);set(v);
   }});if(claim.owner!==ctx.owner)throw Error('Ta lokalna kopia została już przypisana do innego konta.');ensure(ctx);
   const result=await tx(ctx.db,['records','outbox','meta'],'readwrite',(t,set)=>{
    const meta=t.objectStore('meta'),marker='legacy-import:'+claim.batch;
    meta.get(marker).onsuccess=e=>{
     if(e.target.result){set(e.target.result.counts);return}
     const ids=new Map(cards.map(x=>[x.id,uuid()]));
     const put=(kind,payload)=>{const id=payload.id,key=keyOf(kind,id);t.objectStore('records').put({key,kind,id,payload,deleted:false,version:0});t.objectStore('outbox').put({key,kind,id,payload,deleted:false,baseVersion:0,mutationId:uuid()})};
     for(const card of cards)put('card',{...card,id:ids.get(card.id)});
     for(const binder of binders)put('binder',{...binder,id:uuid(),slots:binder.slots.map(id=>id==null?null:ids.get(id)||id),quotes:Object.fromEntries(Object.entries(binder.quotes||{}).map(([id,q])=>[ids.get(id)||id,q]))});
     const counts={cards:cards.length,binders:binders.length};meta.put({key:marker,counts});set(counts);
    };
   });await notify(ctx);if(active===ctx)publish({legacy:null});await status(ctx,'Przeniesiono lokalną kopię · wysyłam na konto');await sync();return result;
  }
  async function backup(){
   const ctx=active;ensure(ctx);const rows=await all(ctx.db,'records');ensure(ctx);
   const data={app:'CardScope',version:2,exportedAt:new Date().toISOString(),cards:rows.filter(x=>x.kind==='card'&&!x.deleted).map(x=>x.payload),binders:rows.filter(x=>x.kind==='binder'&&!x.deleted).map(x=>x.payload)};
   if(await legacyInfo(ctx))data.localBeforeMigration=await legacySnapshot();ensure(ctx);return data;
  }
  async function ready(){await auth.ready;await transition;}
  function accountChanged(state){
   const owner=state.user?.id||null;if(owner===desired)return;desired=owner;const ticket=++epoch;const previous=active;active=null;previous?.db.close();
   emit('card',[]);emit('binder',[]);publish({owner,legacy:null,pending:0,kind:'pending',text:owner?'Otwieram kolekcję tego konta…':'Zaloguj się, aby otworzyć kolekcję. Poprzednie lokalne dane są zachowane.'});
   if(deps.listeners!==false)root.dispatchEvent?.(new CustomEvent('cardscope:account-change'));
   transition=(async()=>{
    if(!owner)return;
    const db=await open('cardscope-cloud-v1:'+project+':'+owner);
    if(ticket!==epoch){db.close();return}
    const ctx={owner,db,syncing:null};active=ctx;await notify(ctx);
    try{const legacy=await legacyInfo(ctx);if(active===ctx)publish({legacy})}catch(e){if(active===ctx)publish({text:'Nie udało się odczytać starej kopii. Zachowaj dane przeglądarki.',kind:'error'})}
    if(active===ctx)void Promise.resolve().then(sync);
   })().catch(e=>{if(ticket===epoch)publish({text:friendly(e),kind:'error'})});
  }
  auth.subscribe(accountChanged);
  if(deps.listeners!==false){
   root.addEventListener?.('online',()=>{void auth.refresh().then(sync)});
   root.document?.addEventListener('visibilitychange',()=>{if(root.document.visibilityState==='visible')void sync()});
   root.setInterval(()=>{if(root.document.visibilityState==='visible')void sync()},30000);
  }
  // Other tabs share this IndexedDB. Notify the view, without echoing a cloud sync
  // back to the sender (which would otherwise cause an endless broadcast loop).
  if(channel)channel.onmessage=e=>{if(active?.owner===e.data?.owner)void notify(active)};
  return {get ready(){return ready()},get state(){return latest},subscribeState(f){subscribers.add(f);f(latest);return()=>subscribers.delete(f)},subscribe(kind,f){views[kind].add(f);f([]);if(active)void notify(active);return()=>views[kind].delete(f)},setValidator(kind,f){validators[kind]=f},write,changeQuantity,remove:(kind,id)=>write(kind,id,true),sync,importLegacy,backup};
 }
 root.createCardCloud=createCardCloud;
 if(root.CardScopeAuth&&root.indexedDB)root.CardCloud=createCardCloud();
})(globalThis);
