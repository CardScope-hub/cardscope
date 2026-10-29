(() => {
 const auth=globalThis.CardScopeAuth,cloud=globalThis.CardCloud;if(!auth||!cloud)return;
 const profile=document.getElementById('header-account'),login=document.getElementById('sync-login');
 if(profile){profile.href=auth.loginUrl;profile.removeAttribute('target')}
 if(login)login.href=auth.loginUrl;
 const panel=document.createElement('section');panel.id='cardscope-auth-status';panel.setAttribute('aria-label','Konto i synchronizacja');
 Object.assign(panel.style,{padding:'14px 16px',margin:'0 0 16px',border:'1px solid #c8a7f940',borderRadius:'16px',background:'#a879e708',color:'#c9b6db',fontSize:'13px',lineHeight:'1.6',overflowWrap:'anywhere'});
 const account=document.createElement('div'),info=document.createElement('p'),actions=document.createElement('div'),notice=document.createElement('p');
 info.style.margin='6px 0';actions.style.cssText='display:flex;flex-wrap:wrap;gap:10px;margin-top:10px';notice.setAttribute('role','status');notice.hidden=true;
 const migrate=document.createElement('button');migrate.type='button';migrate.className='text-btn';migrate.textContent='Przenieś lokalne karty i bindery na konto';
 const backup=document.createElement('button');backup.type='button';backup.className='text-btn';backup.textContent='Pobierz kopię kart i binderów';
 actions.append(migrate,backup);panel.append(account,info,actions,notice);
 // The Start screen is #scan; nesting here follows its existing navigation visibility.
 document.getElementById('scan')?.prepend(panel);
 let busy=false;
 function render(){
  const user=auth.state.user,s=cloud.state,raw=user?.user_metadata?.display_name;
  const name=(typeof raw==='string'&&raw.trim())||user?.email||'Kolekcjoner';
  account.textContent=user?'Konto: '+(user.email||name):'Zaloguj się, aby korzystać z kolekcji na swoich urządzeniach.';
  if(profile){profile.textContent=user?Array.from(name).slice(0,2).join('').toLocaleUpperCase('pl'):'CS';profile.title=user?'Konto: '+(user.email||name):'Zaloguj się';}
  migrate.hidden=!user||!s.legacy;migrate.disabled=busy;backup.hidden=!user;backup.disabled=busy;
  info.textContent=s.legacy?'Na tym urządzeniu znaleziono '+s.legacy.cards+' kart i '+s.legacy.binders+' binderów ze starego zapisu. Przenieś je na powyższe konto. Oryginalna kopia pozostanie na urządzeniu.':user?'Przycisk „Synchronizuj” wysyła karty i bindery. Zielony status „zapisane w Supabase” potwierdza zakończenie zapisu.':'Lokalna kopia z wcześniejszej wersji nie została usunięta.';
 }
 migrate.onclick=async()=>{
  if(busy||!auth.state.user)return;
  if(!confirm('Przenieść lokalne karty i bindery na konto '+(auth.state.user.email||'aktualnie zalogowane')+'?'))return;
  busy=true;notice.hidden=false;notice.textContent='Przenoszę lokalną kopię…';render();
  try{const n=await cloud.importLegacy();notice.textContent='Przeniesiono '+n.cards+' kart i '+n.binders+' binderów. Sprawdź status synchronizacji powyżej.'}catch(e){notice.textContent=e.message||'Nie udało się przenieść kopii.'}finally{busy=false;render()}
 };
 backup.onclick=async()=>{
  try{const data=await cloud.backup(),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='CardScope-karty-i-bindery-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}catch(e){notice.hidden=false;notice.textContent=e.message}
 };
 auth.subscribe(()=>{notice.hidden=true;render()});cloud.subscribeState(render);render();
})();
