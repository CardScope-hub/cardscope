// The Friends tab uses the existing app document and its persistent navigation.
(()=>{
 'use strict';
 const auth=window.CardScopeAuth,$=id=>document.getElementById(id);
 function account(view='login'){
  const url=new URL('login.html',location.href);url.searchParams.set('view',view);url.searchParams.set('return','friends');
  const invite=window.CardInvite?.pending;
  if(invite){try{sessionStorage.setItem('cardscope-pending-friend-v1:'+url.pathname,JSON.stringify({token:invite,at:Date.now()}));}catch{}}
  location.assign(url.href);
 }
 function enter(view,previous){
  const profile=$('header-account');if(profile&&auth){const url=new URL(auth.profileUrl||auth.loginUrl);if(view==='friends')url.searchParams.set('return','friends');profile.href=url.href;}
  if(view!==previous)window.dispatchEvent(new CustomEvent('cardscope-pane',{detail:view}));
 }
 window.CardFriends=Object.freeze({enter});
 window.CardAccountUI=Object.freeze({get pane(){return document.body.dataset.view},changeMode:()=>account(),switchPane:pane=>{if(pane==='friends')window.show('friends');else if(pane==='profile'||pane==='login')account(pane)}});
 if(!auth||!window.CardSocial){$('friends-session-status').textContent='Nie udało się wczytać znajomych. Odśwież aplikację.';$('friends-add').disabled=true;return;}
 $('friends-session-retry').onclick=()=>{void auth.refresh();};
 auth.subscribe(state=>{
  const status=$('friends-session-status'),retry=$('friends-session-retry'),loading=state.status==='loading',failed=['error','unconfigured'].includes(state.status);
  status.hidden=!loading&&!failed&&!state.recovery;
  status.textContent=loading?'Wczytuję znajomych…':state.recovery?'Dokończ zmianę hasła w ustawieniach konta.':failed?(state.error||'Nie udało się wczytać znajomych.') :'';
  status.dataset.kind=failed?'error':'info';retry.hidden=state.status!=='error';
  $('friends-add').disabled=loading||failed||state.recovery;
 });
})();
