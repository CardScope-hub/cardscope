// Restore the selected tab when returning from the standalone Friends screen.
(()=>{
 const allowed=new Set(['scan','trading','collection','scanner','binders','centering']);
 function enter(){
  const url=new URL(location.href),view=url.searchParams.get('view');if(!allowed.has(view))return;
  const button=document.querySelector('nav.nav button[data-view="'+view+'"]');if(!button)return;
  button.click();url.searchParams.delete('view');history.replaceState(history.state,'',url.href);
 }
 if(document.readyState==='complete')enter();else window.addEventListener('load',enter,{once:true});
})();
