// Keep navigation outside changing views; one canonical camera/control order.
globalThis.CardLayout=(()=>{
 const byId=id=>document.getElementById(id);
 function scanner(){
  const section=byId('scanner');if(!section)return;
  const camera=section.querySelector('.camera-stage'),shutter=section.querySelector('.shutter-row'),config=section.querySelector('.scanner-config'),body=config?.querySelector('.scanner-config-body'),select=byId('scan-game');
  if(!camera||!shutter||!config||!select)return;
  let category=byId('scanner-category');if(!category){category=document.createElement('div');category.id='scanner-category';category.className='scanner-category';}
  if(!category.contains(select)){const field=document.createElement('div'),label=document.querySelector('label[for="scan-game"]')||document.createElement('label');label.htmlFor='scan-game';label.textContent='Kategoria kart';field.append(label,select);category.append(field);}
  const summary=config.querySelector('summary>span');if(summary)summary.textContent='Język i ustawienia skanera';
  if(body)for(const id of ['auto-scan-options','weiss-scan-options','swu-scan-options']){const control=byId(id);if(control&&!body.contains(control))body.append(control);}
  const ordered=[camera,shutter,category,byId('live-panel'),config,byId('camera-status'),byId('camera-retry'),section.querySelector('.scanner-secondary-tools')].filter(Boolean);
  let previous=null;for(const el of ordered){const expected=previous?previous.nextElementSibling:section.firstElementChild;if(expected!==el)section.insertBefore(el,expected);previous=el;}
  section.dataset.layout='camera-first-v2';
 }
 function chrome(){const nav=document.querySelector('nav.nav');if(nav&&nav.parentElement!==document.body)document.body.insertBefore(nav,document.querySelector('main'));}
 function beforeView(view){const active=document.activeElement;if(active&&active!==document.body&&active.closest?.('main>section')&&active.closest('main>section').id!==view)active.blur?.();if(view==='scanner')scanner();}
 function resetScroll(){window.scrollTo({top:0,left:0,behavior:'instant'});}
 chrome();scanner();return Object.freeze({scanner,chrome,beforeView,resetScroll});
})();
