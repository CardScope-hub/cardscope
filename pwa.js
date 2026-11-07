// Installation is explained in the page, using Safari / Chrome menus only.
(() => {
 const tabs=[...document.querySelectorAll('[data-install-device]')],devices=tabs.map(t=>t.dataset.installDevice);
 const ua=navigator.userAgent||'',ios=/iPhone|iPad|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1);
 function select(device,focus=false){for(const tab of tabs){const active=tab.dataset.installDevice===device;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;const panel=$('install-'+tab.dataset.installDevice);if(panel)panel.hidden=!active;if(active&&focus)tab.focus();}}
 for(const tab of tabs){tab.onclick=()=>select(tab.dataset.installDevice);tab.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=devices.indexOf(tab.dataset.installDevice),n=e.key==='Home'?0:e.key==='End'?devices.length-1:(i+(e.key==='ArrowRight'?1:-1)+devices.length)%devices.length;select(devices[n],true);};}
 select(ios?'ios':/Android/i.test(ua)?'android':'desktop');
 if($('install-open-scanner'))$('install-open-scanner').onclick=()=>openScanner();
 const standalone=window.matchMedia('(display-mode: standalone)');
 function refresh(){const running=standalone.matches||navigator.standalone===true;document.body.dataset.displayMode=running?'standalone':'browser';$('web-mode-label').textContent=running?'CARDSCOPE · APLIKACJA':'CARDSCOPE · W PRZEGLĄDARCE';$('web-install-banner').hidden=running;if($('install-status')){$('install-status').hidden=!running;$('install-status').textContent='✓ Korzystasz z CardScope jako aplikacji.';}}
 // No custom install prompt: the instructions always point to the browser menu.
 window.addEventListener('beforeinstallprompt',e=>e.preventDefault());
 window.addEventListener('appinstalled',refresh);standalone.addEventListener?.('change',refresh);refresh();
})();
