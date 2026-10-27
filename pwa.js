// One install flow for the web header, home page and device guide.
(() => {
 const tabs=[...document.querySelectorAll('[data-install-device]')];
 const devices=tabs.map(tab=>tab.dataset.installDevice);
 const ua=navigator.userAgent||'';
 const ios=/iPhone|iPad|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1);
 let selected=ios?'ios':/Android/i.test(ua)?'android':'desktop';
 function selectDevice(device,focus=false){
  if(!devices.includes(device))return;selected=device;
  for(const tab of tabs){const active=tab.dataset.installDevice===device;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;$('install-'+tab.dataset.installDevice).hidden=!active;if(active&&focus)tab.focus();}
 }
 for(const tab of tabs){
  tab.onclick=()=>selectDevice(tab.dataset.installDevice);
  tab.onkeydown=event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();const current=devices.indexOf(tab.dataset.installDevice);
   const index=event.key==='Home'?0:event.key==='End'?devices.length-1:(current+(event.key==='ArrowRight'?1:-1)+devices.length)%devices.length;
   selectDevice(devices[index],true);
  };
 }
 selectDevice(selected);
 function guide(){
  show('install');selectDevice(selected);
  $('install-guide').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  $('install-guide').focus({preventScroll:true});
 }
 $('install-show-steps').onclick=guide;
 $('install-open-scanner').onclick=()=>openScanner();
 const standalone=window.matchMedia('(display-mode: standalone)');
 const triggers=[...document.querySelectorAll('[data-install-trigger]')];
 const native=$('install-native'),status=$('install-status');
 let deferred=null,busy=false,installedThisSession=false,notice='';
 const appMode=()=>standalone.matches||navigator.standalone===true;
 function refresh(){
  const running=appMode(),installed=running||installedThisSession;
  document.body.dataset.displayMode=running?'standalone':'browser';
  $('web-mode-label').textContent=running?'CARDSCOPE · APLIKACJA':'CARDSCOPE · W PRZEGLĄDARCE';
  $('web-install-banner').hidden=installed;
  for(const button of triggers){button.hidden=installed;button.disabled=busy;}
  native.hidden=installed||!deferred;native.disabled=busy;
  status.hidden=!installed&&!notice;
  status.textContent=running?'✓ Korzystasz z CardScope jako aplikacji.':installedThisSession?'✓ CardScope zostało dodane. Otwórz je z nowej ikony.':notice;
 }
 async function install(){
  if(busy)return;
  if(!deferred){guide();return;}
  const prompt=deferred;deferred=null;busy=true;notice='';refresh();
  try{
   await prompt.prompt();const result=await prompt.userChoice;
   if(result.outcome==='accepted')notice='Instalacja została zatwierdzona. Po jej zakończeniu otwórz CardScope z ikony.';
   else {notice='Możesz korzystać dalej w przeglądarce albo dodać ikonę później.';message(notice);}
  }catch{notice='Skorzystaj z instrukcji poniżej, aby dodać CardScope do ekranu głównego.';guide();message(notice);}
  finally{busy=false;refresh();}
 }
 native.onclick=install;
 for(const button of triggers)button.onclick=install;
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferred=event;notice='';refresh();});
 window.addEventListener('appinstalled',()=>{installedThisSession=true;deferred=null;notice='';refresh();message('CardScope zostało dodane do Twoich aplikacji.');});
 standalone.addEventListener?.('change',refresh);
 refresh();
})();
