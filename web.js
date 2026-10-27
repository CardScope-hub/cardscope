// Browser entry points reuse the same collection, scanner and binder modules.
(() => {
 $('web-open-collection').onclick=()=>show('collection');
 $('web-open-binders').onclick=()=>show('binders');
 $('web-copy-link').onclick=async()=>{
  const url=new URL('/app.html',window.location.origin).href;
  try{
   if(!navigator.clipboard?.writeText)throw Error();
   await navigator.clipboard.writeText(url);message('Link do CardScope skopiowany. Otwórz go na drugim urządzeniu.');
  }catch{window.prompt('Skopiuj link do CardScope:',url);}
 };
 function entry(){
  const view=new URLSearchParams(window.location.search).get('view');
  if(['scan','collection','binders','install','centering','about'].includes(view))show(view);
 }
 if(document.readyState!=='complete')document.addEventListener('DOMContentLoaded',entry,{once:true});else entry();
})();
