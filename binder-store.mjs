import {validateBinder} from './binder-core.mjs?v=37';
export function createBinderStore(deps={}) {
 const database=deps.indexedDB||globalThis.indexedDB,request=deps.fetch||((...args)=>fetch(...args)),online=deps.online||(()=>navigator.onLine),uuid=deps.uuid||(()=>crypto.randomUUID());
 let db,ready,busy=false,rerun=false,onChange=()=>{},onStatus=()=>{};
 const channel=deps.listeners===false?null:typeof BroadcastChannel==='function'?new BroadcastChannel('cardscope-binders'):null;
 const tx=(stores,mode,fn)=>new Promise((resolve,reject)=>{const t=db.transaction(stores,mode);let result;t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('Konto jest inne niż przy poprzednim zapisie. Zaloguj się na poprzednie konto.'));fn(t,v=>result=v)});
 const all=store=>tx([store],'readonly',(t,set)=>{t.objectStore(store).getAll().onsuccess=e=>set(e.target.result)});
 async function notify(){onChange((await all('binders')).map(x=>x.binder).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)))}
 async function status(text,kind='pending'){onStatus(text,kind,(await all('outbox')).length)}
 async function api(path,options={}){const res=await request(path,{credentials:'same-origin',redirect:'error',cache:'no-store',...options});if(res.status===401||res.status===403)throw Error('Zaloguj się ponownie. Bindery są zachowane na tym urządzeniu.');const data=await res.json().catch(()=>{throw Error('Nie udało się odczytać zapisu na koncie.')});if(!res.ok&&res.status!==409)throw Error(data.error||'Synchronizacja binderów chwilowo niedostępna.');return {data,conflict:res.status===409}}
 async function write(binder){await ready;const valid=validateBinder(binder);await tx(['binders','outbox'],'readwrite',t=>{t.objectStore('binders').get(valid.id).onsuccess=e=>{const old=e.target.result,version=old?.version||0;t.objectStore('binders').put({id:valid.id,binder:valid,version});t.objectStore('outbox').put({id:valid.id,binder:valid,baseVersion:version,mutationId:uuid(),method:'PUT'})}});await notify();await status('Zapisano na urządzeniu · synchronizuję…');channel?.postMessage('updated');void sync();return valid}
 async function remove(id){await ready;await tx(['binders','outbox'],'readwrite',t=>{t.objectStore('binders').get(id).onsuccess=e=>{t.objectStore('outbox').put({id,baseVersion:e.target.result?.version||0,mutationId:uuid(),method:'DELETE'});t.objectStore('binders').delete(id)}});await notify();await status('Usunięcie bindera czeka na zapis');channel?.postMessage('updated');void sync()}
 async function sync(){
  await ready;if(busy){rerun=true;return}busy=true;let conflictMessage='';
  try{
   if(!online()){await status('Offline · bindery zapisane na urządzeniu');return}
   await status('Synchronizuję bindery…');const first=(await api('/api/binders')).data;
   await tx(['meta'],'readwrite',t=>{const meta=t.objectStore('meta');meta.get('owner').onsuccess=e=>{if(e.target.result&&e.target.result.value!==first.owner){t.abort();return}meta.put({key:'owner',value:first.owner})}});
   for(let pass=0;pass<8;pass++){
    const operations=await all('outbox');if(!operations.length)break;
    for(const op of operations){
     const {data,conflict}=await api('/api/binders/'+op.id,{method:op.method,headers:{'Content-Type':'application/json'},body:JSON.stringify({baseVersion:op.baseVersion,mutationId:op.mutationId,...(op.method==='PUT'?{binder:op.binder}:{})})});
     await tx(['binders','outbox'],'readwrite',t=>{
      const out=t.objectStore('outbox'),items=t.objectStore('binders');out.get(op.id).onsuccess=e=>{
       const pending=e.target.result;if(!pending)return;const remote=data.record;
       if(conflict){
        // Keep both versions rather than losing an offline edit from another device.
        if(pending.method==='PUT'){
         const id=uuid(),now=new Date().toISOString(),copy={...pending.binder,id,name:(pending.binder.name.slice(0,48)+' · kopia z urządzenia'),createdAt:now,updatedAt:now};
         items.put({id,binder:copy,version:0});out.put({id,binder:copy,baseVersion:0,mutationId:uuid(),method:'PUT'});
         conflictMessage='Binder zmieniono na innym urządzeniu. Twoje zmiany zachowano jako osobną kopię.';
        }else conflictMessage='Binder zmienił się na innym urządzeniu. Zachowano jego najnowszą wersję — możesz ponowić usunięcie.';
        out.delete(op.id);if(remote&&!remote.deleted)items.put({id:op.id,binder:remote.binder,version:remote.version});else items.delete(op.id);return;
       }
       if(pending.mutationId===op.mutationId){out.delete(op.id);if(remote.deleted)items.delete(op.id);else items.put({id:op.id,binder:remote.binder,version:remote.version})}
       else {out.put({...pending,baseVersion:remote.version});if(pending.method==='PUT')items.put({id:op.id,binder:pending.binder,version:remote.version})}
      };
     });
    }
   }
   let page=(await api('/api/binders')).data;
   while(true){await tx(['binders','outbox'],'readwrite',t=>{for(const row of page.records)t.objectStore('outbox').get(row.id).onsuccess=e=>{if(e.target.result)return;if(row.deleted)t.objectStore('binders').delete(row.id);else t.objectStore('binders').put({id:row.id,binder:row.binder,version:row.version})}});if(!page.next)break;page=(await api('/api/binders?after='+encodeURIComponent(page.next))).data}
   await notify();const pending=(await all('outbox')).length;await status(conflictMessage|| (pending?'Zmiany czekają na synchronizację':'Bindery zapisane na koncie'),conflictMessage?'conflict':pending?'pending':'saved');channel?.postMessage('updated');
  }catch(e){await status(e.message||'Brak połączenia. Kopia binderów pozostaje na urządzeniu.','error')}
  finally{busy=false;if(rerun){rerun=false;void sync()}}
 }
 function init(change,state){onChange=change;onStatus=state;ready=(async()=>{
  await new Promise((resolve,reject)=>{const req=database.open('cardscope-binders-v1',1);req.onupgradeneeded=()=>{for(const name of ['binders','outbox','meta'])req.result.createObjectStore(name,{keyPath:name==='meta'?'key':'id'})};req.onsuccess=()=>{db=req.result;db.onversionchange=()=>db.close();resolve()};req.onerror=()=>reject(req.error)});await notify();
 })();ready.then(()=>sync()).catch(e=>onStatus(e.message||'Zapis binderów jest zablokowany.','error',0));
 if(deps.listeners!==false){window.addEventListener('online',()=>void sync());document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void sync()});setInterval(()=>{if(document.visibilityState==='visible')void sync()},30000)}
 if(channel)channel.onmessage=()=>{void ready.then(notify)};return ready;
 }
 return {init,write,remove,sync};
}
