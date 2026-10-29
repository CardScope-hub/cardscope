// Public collection interface retained; storage is isolated by Supabase account.
window.CardStore={
 init(onChange,onState){
  const cloud=globalThis.CardCloud;if(!cloud){onState('Nie wczytano synchronizacji. Sprawdź pliki cloud-sync.js i auth-client.js.','error',0);return Promise.reject(Error('Brak modułu synchronizacji.'))}
  cloud.subscribe('card',onChange);
  cloud.subscribeState(s=>onState(s.text,s.kind,s.pending));
  return cloud.ready;
 },
 add:card=>globalThis.CardCloud.write('card',card),
 remove:id=>globalThis.CardCloud.remove('card',id),
 sync:()=>globalThis.CardCloud.sync()
};
