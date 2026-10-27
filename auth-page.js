(() => {
  'use strict';
  const $=id=>document.getElementById(id),auth=window.CardScopeAuth;
  if(!auth){$('auth-config').hidden=false;$('auth-config').textContent='Nie wczytano logowania. Sprawdź pliki auth-client.js oraz vendor.';return;}
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
  function changeMode(next){if(busy)return;mode=next;clearPasswords();message();render(auth.state);$('auth-title').focus?.();}
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
      $('auth-title').textContent='Jesteś u siebie.';$('auth-intro').textContent='Twoje logowanie Supabase działa. Możesz wrócić do aplikacji.';
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
        if(auth.state.user)message('Zalogowano pomyślnie.','success');
      }else if(action==='register'){
        const data=await auth.signUp($('auth-email').value,$('auth-password').value,$('auth-name').value);
        if(data.session&&auth.state.user)message('Konto jest gotowe.','success');
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
    try{await auth.signOut();mode='login';message('Wylogowano na tym urządzeniu.','success');}
    catch(error){message(auth.errorText(error),'error');}
    finally{busy=false;clearPasswords();render(auth.state);}
  };
  auth.subscribe(render);
})();
