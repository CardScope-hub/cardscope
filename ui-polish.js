// Keep the original button and its handler. In a native modal it must stay in
// that dialog's top layer, rather than becoming an unfocusable body overlay.
(()=>{
 const eligible='dialog button[aria-label^="Zamknij"],dialog button[data-b-close],dialog button.modal-close,dialog button.social-close';
 const socialDialogs=new Set(['friends-add-dialog','friend-profile-dialog','friend-view','visit-card-dialog']);
 function socialShell(dialog,button){
  // A fixed child can still be clipped by a scrolling native dialog on phones.
  // Keep the dialog itself viewport-sized, and scroll only its content panel.
  // The original control stays in the same modal/top layer with its handlers.
  let bar=dialog.querySelector(':scope > .social-modal-bar');
  if(!bar){
   bar=document.createElement('div');bar.className='social-modal-bar';
   const panel=document.createElement('div');panel.className='social-modal-panel';
   for(const child of [...dialog.childNodes])if(child!==button)panel.append(child);
   dialog.append(bar,panel);dialog.classList.add('social-modal-shell');
  }
  bar.append(button);
 }
 function pin(root){const buttons=[];if(root.matches?.(eligible))buttons.push(root);buttons.push(...(root.querySelectorAll?.(eligible)||[]));
  for(const button of buttons){if(button.classList.contains('viewport-close'))continue;const dialog=button.closest('dialog');if(!dialog)continue;button.classList.add('viewport-close');button.type='button';dialog.classList.add('has-viewport-close');if(socialDialogs.has(dialog.id))socialShell(dialog,button);else dialog.append(button);}
 }
 pin(document);new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)pin(n)}).observe(document.body,{childList:true,subtree:true});
})();
