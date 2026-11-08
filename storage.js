// Public collection interface retained; storage is isolated by Supabase account.
window.CardStore={
 init(onChange,onState){
  const cloud=globalThis.CardCloud;if(!cloud){onState('Nie wczytano synchronizacji. Sprawdź pliki cloud-sync.js i auth-client.js.','error',0);return Promise.reject(Error('Brak modułu synchronizacji.'))}
  cloud.subscribe('card',onChange);
  cloud.subscribeState(s=>onState(s.text,s.kind,s.pending));
  return cloud.ready;
 },
 add:card=>globalThis.CardCloud.write('card',card),
 saveGradeSale:(id,input,owner)=>globalThis.CardCloud.saveGradeSale(id,input,owner),
 removeGradeSale:(id,recordId,owner)=>globalThis.CardCloud.removeGradeSale(id,recordId,owner),
 setPurchase:(id,purchase)=>globalThis.CardCloud.setPurchase(id,purchase),
 changeQuantity:(id,delta)=>globalThis.CardCloud.changeQuantity(id,delta),
 remove:id=>globalThis.CardCloud.remove('card',id),
 sync:()=>globalThis.CardCloud.sync()
};
