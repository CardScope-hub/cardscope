import {validateBinder} from './binder-core.mjs?v=37';
export function createBinderStore(deps={}){
 const cloud=deps.cloud||globalThis.CardCloud;
 if(cloud)cloud.setValidator('binder',validateBinder);
 return {
  init(onChange,onState){
   if(!cloud){onState('Nie wczytano modułu synchronizacji.','error',0);return Promise.reject(Error('Brak modułu synchronizacji.'))}
   cloud.subscribe('binder',onChange);cloud.subscribeState(s=>onState(s.text,s.kind,s.pending));return cloud.ready;
  },
  write:binder=>cloud.write('binder',validateBinder(binder)),
  remove:id=>cloud.remove('binder',id),
  sync:()=>cloud.sync()
 };
}
