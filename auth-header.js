// Add after auth-client.js on app.html. Does not replace or upload local cards.
(() => {
  const auth=window.CardScopeAuth;
  if(!auth)return;
  const profile=document.getElementById('header-account');
  const oldLogin=document.getElementById('sync-login');
  if(oldLogin)oldLogin.href=auth.loginUrl;
  if(profile){profile.href=auth.loginUrl;profile.removeAttribute('target');}
  const banner=document.createElement('div');
  banner.id='cardscope-auth-status';banner.setAttribute('role','status');
  // Inline styles avoid loading login page styles over the collection layout.
  Object.assign(banner.style,{padding:'12px 15px',margin:'0 0 16px',border:'1px solid #c8a7f930',borderRadius:'13px',color:'#c9b6db',fontSize:'12px',lineHeight:'1.6',overflowWrap:'anywhere'});
  const anchor=document.getElementById('sync-panel')||document.querySelector('main > header');
  if(anchor)anchor.insertAdjacentElement('afterend',banner);
  auth.subscribe(state=>{
    if(state.user){
      const rawName=state.user.user_metadata?.display_name;
      const name=(typeof rawName==='string'&&rawName.trim())||state.user.email||'Kolekcjoner';
      if(profile){profile.textContent=Array.from(name.trim()).slice(0,2).join('').toLocaleUpperCase('pl');profile.title='Konto: '+(state.user.email||name);profile.setAttribute('aria-label','Konto Supabase — '+name);}
      banner.textContent='Zalogowano: '+(state.user.email||name)+'. Karty i bindery pozostają lokalnie w tej przeglądarce — synchronizacja z Supabase nie jest jeszcze podłączona.';
    }else{
      if(profile){profile.textContent='CS';profile.title='Zaloguj się';profile.setAttribute('aria-label','Zaloguj się do CardScope');}
      banner.textContent=state.status==='loading'?'Sprawdzam sesję Supabase…':state.status==='unconfigured'?'Logowanie wymaga uzupełnienia supabase-config.js.':state.status==='error'?'Nie udało się potwierdzić sesji. Kliknij profil, aby spróbować ponownie.':'Korzystasz lokalnie. Kliknij profil, aby zalogować się przez Supabase.';
    }
  });
})();
