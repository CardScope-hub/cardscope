// The close control belongs to the modal's top layer. Only its content scrolls.
(()=>{
 const closeSelector='button[aria-label^="Zamknij"],button[aria-label^="Close"],button[data-b-close],button.modal-close,button.social-close';
 const cross=/^[×✕✖xX]$/;
 const isRemoval=button=>button.matches('.delete,[data-remove],[aria-label^="Usuń"],[aria-label^="Remove"]');
 const isClose=button=>!isRemoval(button)&&(button.matches(closeSelector)||(!button.hasAttribute('aria-label')&&cross.test(button.textContent.trim())));
 const glyph='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg>';
 let frame=0;
 function decorate(button,modal=false){
  if(!button.classList.contains('cs-close-control')){
   const label=CardI18n.rawAttribute(button,'aria-label')||'Zamknij';
   button.classList.add('cs-close-control');button.type='button';
   button.setAttribute('aria-label',label);button.title=label;
   // The original node (and all its listeners) survives. SVG cannot steal clicks.
   button.innerHTML=glyph;
  }
  if(modal)button.classList.add('viewport-close');
 }
 function viewport(){
  frame=0;const v=window.visualViewport;
  const height=v?.height||window.innerHeight,width=v?.width||window.innerWidth;
  for(const dialog of document.querySelectorAll('dialog.cs-modal-shell[open]')){
   if(height>0)dialog.style.setProperty('--cs-viewport-height',height+'px');
   if(width>0)dialog.style.setProperty('--cs-viewport-width',width+'px');
   dialog.style.setProperty('--cs-viewport-top',Math.max(0,v?.offsetTop||0)+'px');
   dialog.style.setProperty('--cs-viewport-left',Math.max(0,v?.offsetLeft||0)+'px');
  }
 }
 const scheduleViewport=()=>{if(!frame)frame=requestAnimationFrame(viewport);};
 function prepare(dialog){
  let button=[...dialog.querySelectorAll('button')].find(b=>b.closest('dialog')===dialog&&isClose(b));
  // Cropping already has a cancellation action; expose the very same action above it.
  if(!button&&dialog.id==='profile-crop-dialog'&&dialog.querySelector('#profile-crop-cancel')){
   button=document.createElement('button');button.id='profile-crop-close';button.type='button';button.setAttribute('aria-label','Zamknij kadrowanie zdjęcia');
   button.onclick=()=>dialog.querySelector('#profile-crop-cancel')?.click();dialog.prepend(button);
  }
  if(!button)return;
  let bar=dialog.querySelector(':scope > .cs-modal-bar'),panel=dialog.querySelector(':scope > .cs-modal-panel');
  if(!bar||!panel){
   bar=document.createElement('div');bar.className='cs-modal-bar';
   panel=document.createElement('div');panel.className='cs-modal-panel';
   // Use real content nodes, never clone forms or reset unsaved input values.
   for(const node of [...dialog.childNodes])panel.append(node);
   dialog.append(bar,panel);dialog.classList.add('has-viewport-close','cs-modal-shell');
  }
  decorate(button,true);if(button.parentElement!==bar)bar.append(button);
  for(const node of [...dialog.childNodes])if(node!==bar&&node!==panel)panel.append(node);
  scheduleViewport();
 }
 function inspect(root,dialogs=new Set()){
  if(root.matches?.('dialog'))dialogs.add(root);
  const parent=root.closest?.('dialog');if(parent)dialogs.add(parent);
  for(const d of root.querySelectorAll?.('dialog')||[])dialogs.add(d);
  const buttons=[];if(root.matches?.('button'))buttons.push(root);
  buttons.push(...(root.querySelectorAll?.('button')||[]));
  for(const b of buttons)if(!b.closest('dialog')&&!isRemoval(b)&&b.matches(closeSelector))decorate(b);
  return dialogs;
 }
 function start(){
  for(const dialog of inspect(document))prepare(dialog);
  new MutationObserver(records=>{
   const dialogs=new Set(),resetScroll=new Set();
   for(const r of records){
    if(r.type==='attributes'){
     if(r.target.tagName==='DIALOG'&&r.target.open){
      dialogs.add(r.target);
      if(r.attributeName==='open'||r.target.id==='ctr-camera-dialog')resetScroll.add(r.target);
     }
     continue;
    }
    for(const n of r.addedNodes)if(n.nodeType===1&&n.isConnected)inspect(n,dialogs);
   }
   for(const dialog of dialogs)prepare(dialog);
   for(const dialog of resetScroll){const panel=dialog.querySelector(':scope > .cs-modal-panel');if(panel)panel.scrollTop=0;}
  }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','data-mode']});
  window.addEventListener('resize',scheduleViewport,{passive:true});
  window.visualViewport?.addEventListener('resize',scheduleViewport,{passive:true});
  window.visualViewport?.addEventListener('scroll',scheduleViewport,{passive:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
