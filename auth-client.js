/* Static GitHub Pages authentication. Does not change collection storage. */
(() => {
  'use strict';
  const script = document.currentScript;
  const base = new URL('./', script?.src || window.location.href);
  const loginUrl = new URL('login.html', base).href;
  const appUrl = new URL('app.html', base).href;
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  let recovery = fragment.get('type') === 'recovery';
  let linkError = fragment.has('error') || fragment.has('error_code');
  // Never display tokens or raw error descriptions from a callback URL.
  if (linkError) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  let client = null, serial = 0, state = {status:'loading', user:null, recovery:false, error:''};
  const listeners = new Set();
  function publish(next) {
    state = Object.freeze({...state, ...next});
    for (const listener of listeners) { try { listener(state); } catch (error) { console.error('CardScope: nie udało się odświeżyć widoku konta.'); } }
  }
  function configValues(input) {
    if (!input?.url?.trim() || !input?.publishableKey?.trim()) throw Error('Uzupełnij adres projektu i klucz publiczny w pliku supabase-config.js.');
    let url;
    try { url = new URL(input.url.trim()); } catch { throw Error('Adres Supabase musi być pełnym adresem HTTPS projektu.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !['','/'].includes(url.pathname)) throw Error('Wpisz adres projektu Supabase, np. https://twoj-projekt.supabase.co, bez ścieżki i parametrów.');
    const key = input.publishableKey.trim();
    if (key.startsWith('sb_secret_')) throw Error('To klucz tajny. Usuń go z tego pliku i użyj Publishable key. Jeśli został opublikowany, unieważnij go w Supabase.');
    if (!/^sb_publishable_[A-Za-z0-9_-]{8,}$/.test(key)) {
      let payload;
      try { const token = key.split('.'); if (token.length !== 3) throw Error(); let raw=token[1].replace(/-/g,'+').replace(/_/g,'/'); raw+='='.repeat((4-raw.length%4)%4); payload=JSON.parse(atob(raw)); } catch { throw Error('Wklej Publishable key (sb_publishable_…) albo starszy publiczny klucz anon.'); }
      // A local format guard, not authorization. Supabase validates real credentials.
      if (payload.role !== 'anon') throw Error('Użyj publicznego klucza anon, nigdy service_role ani tokenu użytkownika.');
    }
    return {url:url.origin, key};
  }
  function errorText(error) {
    const code = error?.code || '';
    const messages = {
      invalid_credentials:'Nieprawidłowy adres e-mail lub hasło.',
      email_not_confirmed:'Potwierdź adres e-mail, klikając link otrzymany po rejestracji.',
      user_already_exists:'Jeśli masz już konto, wybierz logowanie lub odzyskaj hasło.',
      email_exists:'Jeśli masz już konto, wybierz logowanie lub odzyskaj hasło.',
      signup_disabled:'Rejestracja jest wyłączona w ustawieniach Supabase.',
      email_provider_disabled:'Logowanie e-mailem jest wyłączone w Supabase.',
      weak_password:'Hasło nie spełnia wymagań ustawionych dla tej aplikacji. Użyj dłuższego i trudniejszego hasła.',
      same_password:'Nowe hasło musi różnić się od poprzedniego.',
      over_email_send_rate_limit:'Osiągnięto limit wiadomości. Spróbuj później; właściciel aplikacji powinien sprawdzić ustawienia SMTP.',
      over_request_rate_limit:'Za dużo prób. Odczekaj chwilę i spróbuj ponownie.',
      email_address_not_authorized:'Wysyłka na ten adres nie jest dostępna. Właściciel aplikacji musi skonfigurować własne SMTP w Supabase.',
      email_address_invalid:'Sprawdź poprawność adresu e-mail.',
      otp_expired:'Link wygasł lub został już wykorzystany. Poproś o nowy.',
      session_not_found:'Sesja wygasła. Zaloguj się ponownie.',
      refresh_token_not_found:'Sesja wygasła. Zaloguj się ponownie.',
      captcha_failed:'Projekt wymaga CAPTCHA. Ten formularz nie ma jeszcze integracji CAPTCHA.'
    };
    if (messages[code]) return messages[code];
    if (error?.name === 'AuthRetryableFetchError' || error instanceof TypeError) return 'Nie udało się połączyć z Supabase. Sprawdź internet i konfigurację projektu.';
    if (error?.status === 429) return messages.over_request_rate_limit;
    if (error?.status >= 500) return 'Usługa logowania chwilowo nie odpowiada. Spróbuj ponownie później.';
    return 'Operacja się nie udała. Sprawdź dane oraz ustawienia Auth w Supabase i spróbuj ponownie.';
  }
  async function refresh() {
    if (!client) return state;
    const run = ++serial;
    try {
      const {data:sessionData,error:sessionError} = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (run !== serial) return state;
      if (!sessionData.session) {
        publish({status:'guest',user:null,recovery:false,error:linkError?'Link nie działa lub wygasł. Wyślij nowy link odzyskiwania hasła.':''});
        return state;
      }
      const {data,error} = await client.auth.getUser();
      if (error) throw error;
      if (run !== serial) return state;
      if (!data?.user?.id) throw Error('Missing user');
      publish({status:'signed-in',user:data.user,recovery,error:linkError?'Link nie działa lub wygasł. Wyślij nowy link odzyskiwania hasła.':''});
    } catch (error) {
      if (run === serial) publish({status:'error',user:null,recovery:false,error:errorText(error)});
    }
    return state;
  }
  function requireClient() { if (!client) throw Error('Najpierw uzupełnij konfigurację Supabase.'); }
  function assertResult(result) { if (result.error) throw result.error; return result.data; }
  const api = {
    loginUrl, appUrl,
    get state() { return state; },
    subscribe(callback) { listeners.add(callback); callback(state); return () => listeners.delete(callback); },
    errorText, refresh,
    async syncSession(expectedOwner) {
      requireClient();
      const {data,error}=await client.auth.getSession();
      if(error)throw error;
      const session=data.session;
      if(!session||session.user?.id!==expectedOwner||state.user?.id!==expectedOwner)throw Error('Zaloguj się ponownie na konto tej kolekcji.');
      return {userId:session.user.id,accessToken:session.access_token};
    },
    async signIn(email,password) {
      requireClient(); recovery=false;linkError=false;
      const data=assertResult(await client.auth.signInWithPassword({email:email.trim(),password}));
      await refresh();return data;
    },
    async signUp(email,password,nickname) {
      requireClient();recovery=false;linkError=false;
      const data=assertResult(await client.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:loginUrl,data:{display_name:nickname.trim().slice(0,50)}}}));
      if(data.session)await refresh();return data;
    },
    async reset(email) {
      requireClient();linkError=false;
      return assertResult(await client.auth.resetPasswordForEmail(email.trim(),{redirectTo:loginUrl}));
    },
    async updatePassword(password) {
      requireClient();if(!state.user||!recovery)throw Error('Otwórz aktualny link odzyskiwania hasła z wiadomości e-mail.');
      const data=assertResult(await client.auth.updateUser({password}));
      recovery=false;await refresh();return data;
    },
    async signOut() {
      requireClient();assertResult(await client.auth.signOut({scope:'local'}));
      serial++;recovery=false;linkError=false;publish({status:'guest',user:null,recovery:false,error:''});
    }
  };
  window.CardScopeAuth=api;
  try {
    const config=configValues(window.CARDSCOPE_SUPABASE);
    if (!window.supabase?.createClient) throw Error('Nie wczytano biblioteki logowania. Sprawdź, czy wgrano folder vendor z paczki.');
    client=window.supabase.createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit',storageKey:'cardscope-auth:'+new URL(config.url).hostname}});
    client.auth.onAuthStateChange((event,session) => {
      if(session?.user?.id&&state.user?.id&&session.user.id!==state.user.id){serial++;publish({status:'loading',user:null,recovery:false,error:''});}
      if(event==='PASSWORD_RECOVERY')recovery=true;
      if(event==='SIGNED_OUT'){serial++;recovery=false;publish({status:'guest',user:null,recovery:false,error:''});return;}
      // Never await Supabase inside its auth callback: it owns a session lock.
      if(['SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED','PASSWORD_RECOVERY'].includes(event))setTimeout(()=>void refresh(),0);
    });
    api.ready=refresh();
  } catch(error) {
    publish({status:'unconfigured',user:null,recovery:false,error:error.message});
    api.ready=Promise.resolve(state);
  }
})();
