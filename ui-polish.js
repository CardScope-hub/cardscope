// Keep the original button and its handler. In a native modal it must stay in
// that dialog's top layer, rather than becoming an unfocusable body overlay.
(()=>{
 const eligible='dialog button[aria-label^="Zamknij"],dialog button[data-b-close],dialog button.modal-close,dialog button.social-close';
 function pin(root){const buttons=[];if(root.matches?.(eligible))buttons.push(root);buttons.push(...(root.querySelectorAll?.(eligible)||[]));
  for(const button of buttons){if(button.classList.contains('viewport-close'))continue;const dialog=button.closest('dialog');if(!dialog)continue;button.classList.add('viewport-close');button.type='button';dialog.classList.add('has-viewport-close');dialog.append(button);}
 }
 pin(document);new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)pin(n)}).observe(document.body,{childList:true,subtree:true});
})();
