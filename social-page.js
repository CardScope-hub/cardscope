(()=>{
 'use strict';
 const $=id=>document.getElementById(id),auth=window.CardScopeAuth,social=window.CardSocial,ui=window.CardAccountUI;if(!auth||!social||!ui)return;
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
 const key='cardscope-pending-friend-v1:'+new URL(auth.loginUrl).pathname;let invite=null;
 try{const fromUrl=new URLSearchParams(location.search).get('invite');if(fromUrl&&uuid.test(fromUrl)){invite=fromUrl;const saved=JSON.stringify({token:invite,at:Date.now()});sessionStorage.setItem(key,saved);try{localStorage.setItem(key,saved)}catch{}}else{const saved=JSON.parse(sessionStorage.getItem(key)||localStorage.getItem(key)||'null');if(saved&&uuid.test(saved.token)&&Date.now()-saved.at<86400000)invite=saved.token;}}catch{}
 window.CardInvite=Object.freeze({get pending(){return invite}});
 let owner=null,version=0,searchRun=0,timer=null,homeRun=0,home=null,token=null,inviteProfile=null,visible=false,loaded=false,working=false,modalProfile=null,modalOpener=null;
 const message=(value='',kind='info')=>{const n=$('friends-message');n.textContent=value;n.hidden=!value;n.dataset.kind=kind;};
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const button=(text,action,cls='social-button')=>{const b=el('button',cls,text);b.type='button';b.onclick=action;return b;};
 function same(id,run){return owner===id&&version===run&&auth.state.user?.id===id}
 function link(value){const url=new URL(auth.loginUrl);url.searchParams.set('view','friends');url.searchParams.set('invite',value);return url.href;}
 function paintLink(){const has=!!token;$('friend-link').hidden=!has;$('friend-link').value=has?link(token):'';$('friend-link-create').hidden=has;for(const n of ['copy','rotate','revoke'])$('friend-link-'+n).hidden=!has;$('friend-link-share').hidden=!has||!navigator.share;}
 function busy(value){working=value;for(const b of $('friends-content').querySelectorAll('button'))b.disabled=value;}
 async function act(action,target){if(working||!owner)return;const id=owner,run=version;busy(true);message();try{await social.rpc(action,{p_target:target});if(!same(id,run))return;message(({request:'Zaproszenie wysłane.',accept:'Dodano do znajomych.',decline:'Zaproszenie odrzucone.',cancel:'Zaproszenie anulowane.',remove:'Usunięto ze znajomych.'})[action],'success');await refresh();if(modalProfile?.id===target){try{modalProfile=await social.rpc('profile',{p_target:target});paintModal()}catch{closeModal()}}if($('friends-search').value.trim().length>=2)void search();}catch(e){if(same(id,run))message(social.errorText(e),'error')}finally{if(same(id,run))busy(false)}}
 function actions(p){const box=el('div','social-person-actions');if(p.id===owner){box.append(el('small','','To Twój profil'));return box;}
  if(p.relationship==='accepted'){box.append(el('span','social-tag','✓ Znajomy'),button('Usuń',()=>{if(confirm('Usunąć '+p.displayName+' ze znajomych?'))void act('remove',p.id)},'auth-link'));}
  else if(p.relationship==='incoming'){box.append(button('Akceptuj',()=>void act('accept',p.id)),button('Odrzuć',()=>void act('decline',p.id),'auth-link'));}
  else if(p.relationship==='outgoing'){box.append(el('span','social-tag','Wysłano'),button('Anuluj',()=>void act('cancel',p.id),'auth-link'));}
  else{box.append(button('Wyślij zaproszenie',()=>void act('request',p.id)));}
  for(const b of box.querySelectorAll('button'))b.disabled=working;return box;
 }
 function row(p){const item=el('article','social-person'),face=el('span','profile-avatar social-face');social.paintAvatar(face,p);const title=button('',()=>void openProfile(p),'social-person-title'),name=el('strong','',p.displayName),code=el('small','',p.friendCode?'#'+p.friendCode:CardProfile.games[p.game]);title.append(name,code);item.append(face,title,actions(p));return item;}
 function paintLists(){const people=(home?.people||[]).filter(Boolean);for(const relation of ['incoming','accepted','outgoing']){const list=people.filter(p=>p.relationship===relation),node=$('friends-'+relation);node.replaceChildren(...list.map(row));if(!list.length)node.append(el('p','social-list-empty',relation==='incoming'?'Brak nowych zaproszeń.':relation==='accepted'?'Pierwsza wspólna pasja czeka. Znajdź kogoś po nazwie lub wyślij swój link.':'Brak oczekujących zaproszeń.'));if(relation==='outgoing')$('friends-outgoing-count').textContent=String(list.length);}
  $('friends-needs-profile').hidden=!!home?.profile;paintLink();
 }
 function paintInvite(){const n=$('friend-invite-card');n.replaceChildren();n.hidden=!inviteProfile;if(inviteProfile){n.append(el('span','profile-eyebrow','ZAPROSZENIE Z LINKU'),row(inviteProfile),button('Zamknij zaproszenie',()=>{invite=null;inviteProfile=null;try{sessionStorage.removeItem(key);localStorage.removeItem(key)}catch{}const url=new URL(location.href);url.searchParams.delete('invite');history.replaceState(null,'',url.href);paintInvite()},'auth-link'));}}
 async function refresh(){if(!owner)return;const id=owner,run=version,request=++homeRun;$('friends-refresh').disabled=true;
  try{const data=await social.rpc('home');if(!same(id,run)||request!==homeRun)return;home=data;token=data.invite||null;loaded=true;paintLists();if(invite){try{const p=await social.rpc('invite_resolve',{p_token:invite});if(same(id,run)&&request===homeRun){inviteProfile=p;paintInvite()}}catch(e){if(same(id,run)){inviteProfile=null;paintInvite();message(social.errorText(e),'error')}}}}
  catch(e){if(same(id,run)&&request===homeRun)message(social.errorText(e),'error')}
  finally{if(same(id,run)&&request===homeRun)$('friends-refresh').disabled=working;}
 }
 async function search(){const query=$('friends-search').value.trim(),run=++searchRun,id=owner,v=version,node=$('friends-results');node.replaceChildren();if(!id||query.length<2)return;node.append(el('p','social-list-empty','Szukam kolekcjonerów…'));
  try{const profiles=await social.rpc('search',{p_query:query});if(run!==searchRun||!same(id,v))return;node.replaceChildren(...profiles.map(row));if(!profiles.length)node.append(el('p','social-list-empty','Nie znaleziono profilu. Sprawdź nazwę lub poproś znajomego o link.'));}
  catch(e){if(run===searchRun&&same(id,v))node.replaceChildren(el('p','social-list-empty',social.errorText(e)))}
 }
 function paintModal(){if(!modalProfile)return;const p=modalProfile,root=$('friend-profile-view'),cover=el('div','profile-cover');cover.dataset.theme=p.theme;const banner=el('div','profile-banner-image'),avatar=el('div','profile-avatar'),h=el('h2','',p.displayName);h.id='friend-profile-title';social.paintBanner(banner,p);social.paintAvatar(avatar,p);cover.append(banner,avatar,h,el('p','social-profile-game',CardProfile.games[p.game]||''));root.replaceChildren(cover,el('p','social-profile-bio',p.bio||'Kolekcjoner CardScope'),el('p','profile-field-help','#'+p.friendCode),actions(p));}
 async function openProfile(p){const id=owner,run=version;try{const result=await social.rpc('profile',{p_target:p.id});if(!same(id,run)||!result)return;modalProfile=result;modalOpener=document.activeElement;paintModal();$('friend-profile-dialog').showModal();$('friend-profile-close').focus()}catch(e){if(same(id,run))message(social.errorText(e),'error')}}
 function closeModal(){$('friend-profile-dialog').close();modalProfile=null;modalOpener?.focus()}
 $('friend-profile-close').onclick=closeModal;$('friend-profile-dialog').addEventListener('cancel',e=>{e.preventDefault();closeModal()});
 async function tokenAction(action){if(working||!owner)return;const id=owner,run=version;busy(true);try{const data=await social.rpc(action);if(!same(id,run))return;token=data.token||null;paintLink();message(action==='invite_revoke'?'Link wyłączony. Poprzednie linki już nie działają.':action==='invite_rotate'?'Nowy link jest gotowy. Poprzedni już nie działa.':'Link gotowy do wysłania.','success')}catch(e){if(same(id,run))message(social.errorText(e),'error')}finally{if(same(id,run))busy(false)}}
 $('friend-link-create').onclick=()=>void tokenAction('invite_create');$('friend-link-rotate').onclick=()=>{if(confirm('Wygenerować nowy link? Poprzedni przestanie działać.'))void tokenAction('invite_rotate')};$('friend-link-revoke').onclick=()=>{if(confirm('Wyłączyć link do zapraszania?'))void tokenAction('invite_revoke')};
 $('friend-link-copy').onclick=async()=>{if(!token)return;try{await navigator.clipboard.writeText(link(token));message('Link skopiowany. Możesz wysłać go znajomemu.','success')}catch{$('friend-link').focus();$('friend-link').select();message('Przytrzymaj zaznaczony link i wybierz „Kopiuj”.')}};
 $('friend-link-share').onclick=async()=>{if(!token)return;try{await navigator.share({title:'Znajdź mnie w CardScope',text:'Dodaj mnie do znajomych w CardScope.',url:link(token)})}catch(e){if(e.name!=='AbortError')message('Użyj przycisku „Kopiuj link”.')}};
 $('friends-search').oninput=()=>{clearTimeout(timer);searchRun++;timer=setTimeout(()=>void search(),450)};
 $('friends-refresh').onclick=()=>{message();void refresh()};$('friends-login').onclick=()=>ui.changeMode('login');$('friends-edit-profile').onclick=()=>ui.switchPane('profile');
 function render(){const s=auth.state,id=s.status==='signed-in'&&!s.recovery?s.user?.id:null;if(id!==owner){owner=id||null;version++;searchRun++;homeRun++;clearTimeout(timer);home=null;token=null;loaded=false;working=false;inviteProfile=null;closeModal();$('friends-results').replaceChildren();$('friends-search').value='';for(const k of ['incoming','accepted','outgoing'])$('friends-'+k).replaceChildren();paintInvite();paintLink();message();}
  $('friends-guest').hidden=!!owner||s.recovery;$('friends-content').hidden=!owner;
  if(owner&&visible&&!loaded&&social.state.status==='ready'){loaded=true;void refresh()}
  if(owner&&visible&&social.state.status==='error')message(social.state.error,'error');
 }
 window.addEventListener('cardscope-pane',e=>{const was=visible;visible=e.detail==='friends';if(visible&&!was)loaded=false;render()});
 auth.subscribe(render);social.subscribe(render);visible=ui.pane==='friends';
 if(invite&&!auth.state.recovery)ui.switchPane('friends');render();
})();
