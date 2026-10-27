// Progressive enhancement only. Navigation, saving and the camera never wait for motion.
(() => {
 const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
 const running=new Set();
 function animate(el,frames,options){
  if(!el?.animate||reduced()||document.hidden)return;
  const effect=el.animate(frames,{duration:420,easing:'cubic-bezier(.2,.8,.2,1)',...options});
  running.add(effect);effect.onfinish=effect.oncancel=()=>running.delete(effect);return effect;
 }
 function cancelMotion(){for(const a of running)a.cancel();running.clear()}
 let lastCount=null,gameSignature='';
 const experience={
  refreshHome(){
   const quantity=cards.reduce((sum,c)=>sum+c.qty,0);
   $('scan').classList.toggle('has-collection',quantity>0);
   $('home-overview').hidden=quantity===0;
   $('home-count').textContent=quantity;
   $('home-sets').textContent=new Set(cards.filter(c=>c.set).map(c=>c.game+'|'+c.set)).size;
   $('home-games').textContent=new Set(cards.map(c=>c.game)).size;
   const priced=cards.filter(c=>Number.isFinite(c.price)&&c.price>=0);
   const items=priced.map(c=>({amount:c.price*c.qty,currency:c.priceCurrency||'EUR'}));
   if($('home-value'))$('home-value').textContent=items.length?(globalThis.CardCurrency?CardCurrency.sum(items):'Pobieram kursy…'):'—';
   if($('home-priced'))$('home-priced').textContent=priced.reduce((sum,c)=>sum+c.qty,0)+' z '+quantity+' kart';
   if(lastCount!==null&&quantity!==lastCount&&document.body.dataset.view==='scan')animate($('home-count'),[{opacity:.4,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:350});
   lastCount=quantity;
   const recent=cards[0];$('home-recent').hidden=!recent;$('home-no-recent').hidden=!!recent;
   if(!recent)return;
   $('home-recent-name').textContent=recent.name;
   $('home-recent-set').textContent=[recent.game,recent.number].filter(Boolean).join(' · ');
   const image=$('home-recent-image'),art=recent.artwork||recent.photo;image.hidden=!art;
   if(art)image.src=art;else image.removeAttribute('src');
   $('home-recent').onclick=()=>openDetail(recent);
  },
  filterCollection(items){
   const select=$('collection-game'),games=[...new Set(cards.map(c=>c.game).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pl'));
   const signature=JSON.stringify(games);
   if(signature!==gameSignature){
    const selected=select.value||'all';select.replaceChildren();
    const all=node('option','Wszystkie gry');all.value='all';select.append(all);
    for(const game of games){const option=node('option',game);option.value=game;select.append(option)}
    select.value=games.includes(selected)?selected:'all';gameSignature=signature;
   }
   const selected=select.value||'all';let found=selected==='all'?[...items]:items.filter(c=>c.game===selected);
   const mode=$('collection-sort').value;
   if(mode==='name')found.sort((a,b)=>a.name.localeCompare(b.name,'pl',{sensitivity:'base'}));
   else if(mode==='quantity')found.sort((a,b)=>b.qty-a.qty);
   else found.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
   $('collection-visible').textContent=found.length+' / '+cards.length+' pozycji w kolekcji';
   return found;
  },
  enter(view,previous){
   if(view==='scan')this.refreshHome();
   const navView=({'detail':'collection','scan-result':'scanner','processing':'scanner','edit':'collection','binder':'binders'})[view]||view;
   document.querySelectorAll('.nav [data-view]').forEach(button=>{
    const active=button.dataset.view===navView;button.classList.toggle('active',active);
    if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
   });
   if(view==='scanner')updateScannerLabel();
   if(view===previous)return;
   cancelMotion();const section=$(view);if(!section?.animate||reduced())return;
   const backwards=['collection','scan'].includes(view)&&['detail','scanner','scan-result'].includes(previous);
   // Animate children, keeping sticky result panels and camera geometry unchanged.
   [...section.children].filter(el=>!el.hidden).slice(0,8).forEach((el,index)=>{
    animate(el,[{opacity:0,transform:'translateY('+(backwards?'-7':'14')+'px)'},{opacity:1,transform:'translateY(0)'}],{duration:440,delay:Math.min(index*35,140)});
   });
   if(['detail','scan-result'].includes(view)){
    const art=$(view==='detail'?'detail-image':'result-image');
    animate(art,[{opacity:0,transform:'translateY(20px) scale(.94) rotate(-2deg)'},{opacity:1,transform:'translateY(0) scale(1) rotate(0)'}],{duration:650,delay:50});
   }
  },
  toast(){animate($('toast'),[{opacity:0,transform:'translateY(15px) scale(.97)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:320})}
 };
 globalThis.CardExperience=experience;
 function updateScannerLabel(){
  const game=$('scan-game'),language=$('scan-language');
  const gameText=game.options?.[game.selectedIndex]?.textContent;
  const languageText=language.options?.[language.selectedIndex]?.textContent;
  $('scan-config-label').textContent=[gameText,languageText].filter(Boolean).join(' · ')||'Gra · język · silnik';
 }
 $('collection-scan').onclick=openScanner;
 $('home-open-collection').onclick=()=>show('collection');
 $('home-open-centering').onclick=()=>show('centering');
 $('home-first-scan').onclick=openScanner;
 $('header-about').onclick=()=>show('about');
 for(const id of ['collection-game','collection-sort'])$(id).onchange=()=>render();
 for(const [id,layout] of [['collection-grid','grid'],['collection-list','list']])$(id).onclick=()=>{
  $('list').dataset.layout=layout;
  $('collection-grid').setAttribute('aria-pressed',String(layout==='grid'));
  $('collection-list').setAttribute('aria-pressed',String(layout==='list'));
  animate($('list'),[{opacity:.35,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:250});
 };
 for(const id of ['scan-game','scan-language'])$(id).addEventListener('change',updateScannerLabel);
 const art=$('home-art');let tiltFrame=0;
 if(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches){
  art.addEventListener('pointermove',event=>{
   if(reduced()||tiltFrame)return;
   tiltFrame=requestAnimationFrame(()=>{
    tiltFrame=0;const rect=art.getBoundingClientRect();
    art.style.setProperty('--tilt-x',((.5-(event.clientY-rect.top)/rect.height)*8).toFixed(2)+'deg');
    art.style.setProperty('--tilt-y',(((event.clientX-rect.left)/rect.width-.5)*12).toFixed(2)+'deg');
   });
  });
  art.addEventListener('pointerleave',()=>{cancelAnimationFrame(tiltFrame);tiltFrame=0;art.style.setProperty('--tilt-x','0deg');art.style.setProperty('--tilt-y','0deg')});
 }
 document.addEventListener('visibilitychange',()=>{document.body.classList.toggle('page-inactive',document.hidden);if(document.hidden)cancelMotion()});
 const preference=window.matchMedia?.('(prefers-reduced-motion: reduce)');preference?.addEventListener?.('change',event=>{if(event.matches)cancelMotion()});
 experience.refreshHome();experience.enter(document.body.dataset.view||'scan',null);
})();
