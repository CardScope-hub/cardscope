// Restore a deep link inside the existing app document.
(()=>{
 const allowed=new Set(['scan','trading','collection','scanner','binders','centering','friends']);
 function enter(){
  const url=new URL(location.href),view=url.searchParams.get('view');if(!allowed.has(view))return;
  const button=document.querySelector('nav.nav button[data-view="'+view+'"]');if(!button)return;
  button.click();url.searchParams.delete('view');history.replaceState(history.state,'',url.href);
 }
 if(document.readyState==='complete')enter();else window.addEventListener('load',enter,{once:true});
})();
