// Friends is a standalone app screen. Account forms stay on login.html.
(()=>{
 'use strict';
 const auth=window.CardScopeAuth,$=id=>document.getElementById(id);
 function account(view='login'){
  const url=new URL('login.html',location.href);url.searchParams.set('view',view);url.searchParams.set('return','friends');
  const invite=window.CardInvite?.pending;
  // The social controller retains the pending invitation on this origin.
  if(invite){try{sessionStorage.setItem('cardscope-pending-friend-v1:'+url.pathname,JSON.stringify({token:invite,at:Date.now()}));}catch{}}
  location.assign(url.href);
 }
 window.CardAccountUI=Object.freeze({get pane(){return 'friends'},changeMode:()=>account(),switchPane:pane=>{if(pane==='profile'||pane==='login')account(pane)}});
 if(!auth||!window.CardSocial){$('friends-session-status').textContent='Nie udało się wczytać znajomych. Odśwież stronę.';$('friends-add').disabled=true;return;}
 $('friends-session-retry').onclick=()=>{void auth.refresh();};
 auth.subscribe(state=>{
  const status=$('friends-session-status'),retry=$('friends-session-retry'),loading=state.status==='loading',failed=['error','unconfigured'].includes(state.status);
  status.hidden=!loading&&!failed&&!state.recovery;
  status.textContent=loading?'Wczytuję znajomych…':state.recovery?'Dokończ zmianę hasła w ustawieniach konta.':failed?(state.error||'Nie udało się wczytać znajomych.') :'';
  status.dataset.kind=failed?'error':'info';retry.hidden=state.status!=='error';
  $('friends-add').disabled=loading||failed||state.recovery;
 });
})();
