(() => {
  'use strict';
  const $=id=>document.getElementById(id),auth=window.CardScopeAuth;
  if(!auth){$('auth-config').hidden=false;$('auth-config').textContent='Nie wczytano logowania. Sprawdź pliki auth-client.js oraz vendor.';return;}
  // Favorite game is independent of card catalog language.
  const favoriteGame=game=>game==='weiss-jp'?'weiss':game;
  const favoriteGameLabel=game=>favoriteGame(game)==='weiss'?'Weiß Schwarz':CardProfile.games[favoriteGame(game)]||CardProfile.games[''];
  let mode='login',busy=false,lastError='';
  const content={
    login:{title:'Dobrze Cię widzieć.',intro:'Zaloguj się e-mailem i hasłem do konta CardScope.',submit:'Zaloguj się ↗'},
    register:{title:'Twoja historia zaczyna się tutaj.',intro:'Utwórz konto. Jeśli wymagane jest potwierdzenie adresu, otrzymasz wiadomość e-mail.',submit:'Utwórz konto ↗'},
    reset:{title:'Wróć do swojego konta.',intro:'Podaj e-mail. Wyślemy link, który pozwoli Ci ustawić nowe hasło.',submit:'Wyślij link do zmiany hasła ↗'},
    update:{title:'Ustaw nowe hasło.',intro:'Zapisz nowe hasło do swojego konta CardScope.',submit:'Zapisz nowe hasło ↗'}
  };
  function message(text='',kind='info'){
    $('auth-message').textContent=text;$('auth-message').dataset.kind=kind;$('auth-message').hidden=!text;
  }
  function clearPasswords(){
    $('auth-password').value='';$('auth-confirm').value='';$('auth-password').type='password';
    $('auth-show-password').textContent='Pokaż';$('auth-show-password').setAttribute('aria-pressed','false');$('auth-show-password').setAttribute('aria-label','Pokaż hasło');
  }
  function changeMode(next){if(busy||profileSaving)return;pane='login';mode=next;clearPasswords();message();render(auth.state);$('auth-title').focus?.();}
  function field(name,visible,required=false){const input=$(name);input.disabled=!visible;input.required=visible&&required;$(name+'-field').hidden=!visible;}
  function render(state){
    const configured=state.status!=='unconfigured';
    const account=!!state.user&&!state.recovery;
    if(state.user&&state.recovery)mode='update';
    else if(mode==='update')mode='login';
    $('auth-config').hidden=configured;$('auth-config').textContent=configured?'':state.error;
    $('auth-status').textContent=state.status==='loading'?'Sprawdzam sesję…':state.user?'Sesja potwierdzona':configured?'Twoje konto CardScope':'Dokończ konfigurację';
    $('auth-tabs').hidden=account||mode==='update'||!configured;
    for(const key of ['login','register']){$('auth-tab-'+key).setAttribute('aria-pressed',String(mode===key));$('auth-tab-'+key).disabled=busy;}
    $('auth-form').hidden=account||!configured;
    $('auth-account').hidden=!account;
    $('auth-reset').hidden=mode!=='login'||account||!configured;
    $('auth-back-login').hidden=mode!=='reset'||account||!configured;
    $('auth-reset').disabled=busy;$('auth-back-login').disabled=busy;
    $('auth-fields').disabled=busy||!configured||state.status==='loading';
    $('auth-signout').disabled=busy;
    if(account){
      const rawName=state.user.user_metadata?.display_name;
      const nickname=(typeof rawName==='string'&&rawName.trim())||'Kolekcjoner CardScope';
      $('auth-title').textContent='Jesteś u siebie.';$('auth-intro').textContent='Jesteś zalogowany. Możesz edytować swój profil lub wrócić do kolekcji.';
      $('auth-account-name').textContent=nickname;$('auth-account-email').textContent=state.user.email||'';
      $('auth-avatar').textContent=Array.from(nickname.trim()).slice(0,2).join('').toLocaleUpperCase('pl');
      $('auth-open-app').href=auth.appUrl;
    }else{
      $('auth-title').textContent=content[mode].title;$('auth-intro').textContent=content[mode].intro;
      $('auth-account-name').textContent='';$('auth-account-email').textContent='';
      field('auth-name',mode==='register',true);field('auth-email',mode!=='update',true);
      field('auth-password',mode!=='reset',true);field('auth-confirm',['register','update'].includes(mode),true);
      $('auth-password').minLength=mode==='login'?1:8;
      $('auth-password').autocomplete=mode==='login'?'current-password':'new-password';
      $('auth-password-help').hidden=!['register','update'].includes(mode);
      $('auth-submit').textContent=busy?'Chwilka…':content[mode].submit;
    }
    if(state.error&&configured&&state.error!==lastError){message(state.error,'error');lastError=state.error;}
    if(!state.error)lastError='';
    renderProfile(state);
  }
  $('auth-tab-login').onclick=()=>changeMode('login');$('auth-tab-register').onclick=()=>changeMode('register');
  $('auth-reset').onclick=()=>changeMode('reset');$('auth-back-login').onclick=()=>changeMode('login');
  $('auth-show-password').onclick=()=>{const show=$('auth-password').type==='password';$('auth-password').type=show?'text':'password';$('auth-show-password').textContent=show?'Ukryj':'Pokaż';$('auth-show-password').setAttribute('aria-pressed',String(show));$('auth-show-password').setAttribute('aria-label',show?'Ukryj hasło':'Pokaż hasło');};
  $('auth-form').onsubmit=async event=>{
    event.preventDefault();if(busy||['loading','unconfigured'].includes(auth.state.status))return;
    if(!$('auth-form').reportValidity())return;
    if(['register','update'].includes(mode)&&$('auth-password').value!==$('auth-confirm').value){message('Hasła muszą być takie same.','error');return;}
    busy=true;message();render(auth.state);
    const action=mode;
    try{
      if(action==='login'){
        await auth.signIn($('auth-email').value,$('auth-password').value);
        if(auth.state.user){pane='profile';message('Zalogowano pomyślnie.','success');}
      }else if(action==='register'){
        const data=await auth.signUp($('auth-email').value,$('auth-password').value,$('auth-name').value);
        if(data.session&&auth.state.user){pane='profile';message('Konto jest gotowe.','success');}
        else {mode='login';message('Sprawdź pocztę i potwierdź adres, jeśli otrzymasz wiadomość. Jeśli masz już konto, zaloguj się lub odzyskaj hasło.','success');}
      }else if(action==='reset'){
        await auth.reset($('auth-email').value);message('Jeśli istnieje konto dla tego adresu, otrzymasz link do zmiany hasła. Sprawdź również spam.','success');
      }else{
        await auth.updatePassword($('auth-password').value);message('Nowe hasło zostało zapisane.','success');
      }
    }catch(error){message(auth.errorText(error),'error');}
    finally{busy=false;clearPasswords();render(auth.state);}
  };
  $('auth-signout').onclick=async()=>{
    if(busy)return;busy=true;message();render(auth.state);
    try{await auth.signOut();mode='login';pane='profile';message('Wylogowano na tym urządzeniu.','success');}
    catch(error){message(auth.errorText(error),'error');}
    finally{busy=false;clearPasswords();render(auth.state);}
  };
  // Profile and login share the existing callback URL; URL fragments remain with Auth.
  let pane=new URLSearchParams(window.location.search).get('view')==='login'?'login':'profile';
  let profileOwner=null,profileGeneration=0,profileSaving=false,profileDirty=false,baseline=null,draft=CardProfile.read(null);
  const profileValue=()=>({displayName:$('profile-name').value,bio:$('profile-bio').value,game:$('profile-game').value,avatar:draft.avatar,theme:draft.theme,discoverable:$('profile-discoverable').checked,accountPrivate:$('profile-private').checked,version:baseline?.version||0,...window.CardMedia.get()});
  const comparable=p=>JSON.stringify([p.displayName,p.bio,favoriteGame(p.game),p.avatar,p.theme,p.avatarPath||null,p.bannerPath||null,!!p.discoverable,p.accountPrivate!==false,p.version||0]);
  function profileMessage(value='',kind='info'){$('profile-message').textContent=value;$('profile-message').dataset.kind=kind;$('profile-message').hidden=!value;}
  function loadProfile(user){draft=CardProfile.read(user);baseline={...draft};window.CardMedia.reset(draft);$('profile-discoverable').checked=!!draft.discoverable;$('profile-private').checked=draft.accountPrivate!==false;$('profile-name').value=draft.displayName;$('profile-bio').value=draft.bio;$('profile-game').value=favoriteGame(draft.game);profileDirty=false;profileMessage();}
  function previewProfile(){
    const p=profileOwner?profileValue():CardProfile.read(null);window.CardMedia.preview(p);$('profile-cover').dataset.theme=p.theme;
    CardI18n.userText($('profile-preview-name'),p.displayName.trim()||'Twój nick',!!p.displayName.trim());$('profile-preview-game').textContent=favoriteGameLabel(p.game);CardI18n.protect($('profile-preview-bio')).textContent=p.bio.trim();$('profile-preview-bio').hidden=!p.bio.trim();$('profile-bio-count').textContent=Array.from(p.bio).length+' / 160';
    for(const button of $('profile-theme-options').children){const selected=button.dataset.value===p.theme;button.setAttribute('aria-pressed',String(selected));button.textContent=selected?'✓':'';}
    $('profile-discard').hidden=!profileDirty;$('profile-save').textContent=profileSaving?'Zapisuję…':baseline?.version?'Zapisz zmiany ↗':'Utwórz profil ↗';
    $('profile-save').disabled=profileSaving||busy||window.CardSocial.state.status!=='ready'||(!!baseline?.version&&!profileDirty);
    const status=$('profile-save-status');status.dataset.saved=String(!!baseline?.version&&!profileDirty);
    status.textContent=profileSaving?'Zapisuję profil na Twoim koncie…':profileDirty?'Masz niezapisane zmiany.':baseline?.version?'Profil zapisany na Twoim koncie.':'Wybierz swój styl i utwórz profil.';
  }
  function renderProfile(state){
    document.querySelector('.cs-login-layout').dataset.accountView=pane;
    const user=state.status==='signed-in'&&!state.recovery?state.user:null,owner=user?.id||null;
    if(owner!==profileOwner){profileGeneration++;profileOwner=owner;profileSaving=false;loadProfile(user);}
    else if(!profileDirty&&!profileSaving&&comparable(CardProfile.read(user))!==comparable(baseline||{}))loadProfile(user);
    if(state.recovery||(state.status==='guest'&&state.error))pane='login';document.querySelector('.cs-login-layout').dataset.accountView=pane;
    for(const name of ['profile','login']){const selected=name===pane,tab=$('account-tab-'+name);tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;tab.disabled=busy||profileSaving||(name!=='login'&&state.recovery);$(name+'-pane').hidden=!selected;}
    $('profile-loading').hidden=state.status!=='loading';$('profile-guest').hidden=state.status!=='guest';$('profile-form').hidden=!user;
    $('profile-error').hidden=!['error','unconfigured'].includes(state.status);$('profile-error-text').textContent=state.error||'Nie udało się wczytać konta.';$('profile-retry').hidden=state.status==='unconfigured';
    $('profile-fields').disabled=profileSaving||busy||!user;$('profile-account-settings').disabled=profileSaving||busy;
    $('profile-email').textContent=user?.email||'';previewProfile();window.dispatchEvent(new CustomEvent('cardscope-pane',{detail:pane}));
  }
  function switchPane(next,focus=false){if(!['profile','login'].includes(next))return;if(busy||profileSaving||(auth.state.recovery&&next!=='login'))return;pane=next;render(auth.state);if(focus)$('account-tab-'+next).focus();}
  for(const name of ['profile','login']){
    $('account-tab-'+name).onclick=()=>switchPane(name);
    $('account-tab-'+name).onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();switchPane(event.key==='Home'?'profile':event.key==='End'?'login':['profile','login'][(['profile','login'].indexOf(name)+(event.key==='ArrowRight'?1:1))%2],true);};
  }
  for(const [key,label]of Object.entries(CardProfile.themes)){const button=document.createElement('button');button.type='button';button.className='profile-theme-choice';button.dataset.value=key;button.dataset.theme=key;button.title=label;button.setAttribute('aria-label',label);button.setAttribute('aria-pressed','false');button.onclick=()=>{draft.theme=key;profileEdited()};$('profile-theme-options').append(button);}
  for(const key of Object.keys(CardProfile.games)){if(key==='weiss-jp')continue;const option=document.createElement('option');option.value=key;option.textContent=favoriteGameLabel(key);$('profile-game').append(option);}
  function profileEdited(){if(!profileOwner||profileSaving)return;profileDirty=window.CardMedia.dirty||comparable(profileValue())!==comparable(baseline);profileMessage();previewProfile();}
  $('profile-name').oninput=$('profile-bio').oninput=$('profile-game').onchange=$('profile-discoverable').onchange=$('profile-private').onchange=profileEdited;document.addEventListener('profile-media-change',profileEdited);
  $('profile-login').onclick=()=>changeMode('login');$('profile-register').onclick=()=>changeMode('register');$('profile-account-settings').onclick=()=>switchPane('login');$('auth-edit-profile').onclick=()=>switchPane('profile');
  $('profile-discard').onclick=()=>{if(profileSaving)return;loadProfile(auth.state.user);previewProfile();};
  $('profile-retry').onclick=()=>{if(auth.state.status!=='loading')void auth.refresh();};
  $('profile-form').onsubmit=async event=>{
    event.preventDefault();if(profileSaving||busy||!profileOwner||!$('profile-form').reportValidity())return;
    const owner=profileOwner,run=++profileGeneration,value=profileValue();profileSaving=true;profileMessage();render(auth.state);
    const current=()=>run===profileGeneration&&owner===profileOwner&&auth.state.user?.id===owner;
    try{await window.CardSocial.save(value,window.CardMedia.blobs,owner);if(!current())return;loadProfile(auth.state.user);profileMessage('Gotowe! Twój profil został zapisany.','success');}
    catch(error){if(current())profileMessage(window.CardSocial.errorText(error),'error');}
    finally{if(current()){profileSaving=false;render(auth.state);}}
  };

  $('profile-reload').onclick=async()=>{if(profileSaving)return;if(profileDirty&&!confirm('Wczytać zapisany profil i odrzucić niezapisane zmiany?'))return;try{await window.CardSocial.load(true);loadProfile(auth.state.user);previewProfile()}catch(e){profileMessage(window.CardSocial.errorText(e),'error')}};
  window.CardAccountUI=Object.freeze({switchPane,changeMode,get pane(){return pane}});
  window.CardSocial.subscribe(s=>{$('profile-service-status').textContent=s.status==='loading'?'Wczytuję zapis profilu…':s.error||'';render(auth.state)});
  auth.subscribe(render);
  // Keep old invitations working; Auth consumes its callback before routing.
  const route=new URL(location.href),legacyFriends=route.searchParams.get('view')==='friends'||route.searchParams.has('invite');
  const returning=route.searchParams.get('return')==='friends'&&route.searchParams.get('view')==='login';
  if(route.searchParams.get('return')==='friends'){const back=document.querySelector('.cs-login-back');back.href='./app.html?view=friends';back.textContent='← Wróć do znajomych';}
  const recoveryLink=new URLSearchParams(route.hash.slice(1)).get('type')==='recovery';
  let leaving=false;
  function returnToFriends(state){
    if(leaving||recoveryLink||state.recovery||state.error||!['guest','signed-in'].includes(state.status))return;
    if(!legacyFriends&&!(returning&&state.status==='signed-in'))return;
    leaving=true;const target=new URL('app.html?view=friends',auth.loginUrl),invite=route.searchParams.get('invite');
    if(invite&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(invite))target.searchParams.set('invite',invite);
    location.replace(target.href);
  }
  Promise.resolve(auth.ready).then(()=>auth.subscribe(returnToFriends));
})();
