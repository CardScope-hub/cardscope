/* A small, local leader catalogue; no collection writes or card-detail navigation. */
(()=>{
 const C=globalThis.CardTabletopCore;if(!C||globalThis.CardTabletopLeaders)return;
 const catalogueURL=new URL('swu-leaders.json?v=swu-leaders-1',document.currentScript?.src||document.baseURI).href;
 const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
 const button=(text,cls,fn)=>{const node=el('button',cls,text);node.type='button';node.onclick=fn;return node;};
 const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('en').replace(/[^a-z0-9]+/g,' ').trim();
 let data=null,pending=null,context=null,modal,panel,search,setFilter,list,notice,more,clear,playerLabel,returnFocus=null,limit=36;
 async function catalogue(){
  if(data)return data;if(pending)return pending;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  pending=(async()=>{
   const response=await fetch(catalogueURL,{signal:controller.signal,credentials:'same-origin'});
   if(!response.ok)throw Error('catalogue');
   const json=await response.json();if(json.version!==1||!Array.isArray(json.leaders))throw Error('catalogue');
   const seen=new Set(),leaders=json.leaders.map(C.leaderData).filter(card=>card&&!seen.has(card.id)&&seen.add(card.id));
   if(!leaders.length)throw Error('catalogue');
   data=leaders.sort((a,b)=>a.name.localeCompare(b.name,'en')||a.subtitle.localeCompare(b.subtitle,'en')||a.id.localeCompare(b.id));
   return data;
  })();
  try{return await pending;}finally{clearTimeout(timeout);pending=null;}
 }
 function finishClose(){context=null;const target=returnFocus;returnFocus=null;if(target?.isConnected)target.focus({preventScroll:true});}
 function close(){if(modal?.open)modal.close();finishClose();}
 function choose(card){const active=context;if(!active)return;active.onSelect(card);close();}
 function create(){
  modal=el('dialog','life-leaders-dialog cs-modal-shell has-viewport-close');modal.id='tabletop-leaders';modal.setAttribute('aria-labelledby','life-leaders-title');
  const bar=el('div','cs-modal-bar'),exit=button('×','cs-close-control viewport-close',close);exit.id='life-leaders-close';exit.setAttribute('aria-label','Zamknij wybór lidera');bar.append(exit);
  panel=el('div','cs-modal-panel');
  const header=el('header','life-leaders-heading'),eyebrow=el('span','life-leaders-eyebrow','STAR WARS: UNLIMITED'),title=el('h2','','Wybierz lidera');title.id='life-leaders-title';playerLabel=el('p','life-leaders-player');header.append(eyebrow,title,playerLabel);
  const filters=el('div','life-leaders-filters'),searchLabel=el('label','','Szukaj lidera');
  search=el('input');search.id='life-leaders-search';search.type='search';search.placeholder='Nazwa, podtytuł lub kod karty';search.autocomplete='off';search.maxLength=100;searchLabel.htmlFor=search.id;searchLabel.append(search);
  const setLabel=el('label','','Dodatek');setFilter=el('select');setFilter.id='life-leaders-set';setLabel.htmlFor=setFilter.id;setLabel.append(setFilter);filters.append(searchLabel,setLabel);
  notice=el('p','life-leaders-notice');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  const results=el('div','life-leaders-results');list=el('div','life-leaders-grid');list.setAttribute('role','group');list.setAttribute('aria-label','Liderzy Star Wars: Unlimited');
  more=button('Pokaż kolejnych','life-leaders-more',()=>{limit+=36;render();});more.id='life-leaders-more';results.append(list,more);
  const footer=el('footer','life-leaders-footer');clear=button('Bez lidera','life-leaders-clear',()=>choose(null));clear.id='life-leaders-clear';footer.append(clear,el('span','','Lider jest tłem pola. Punkty życia pozostają bez zmian.'));
  panel.append(header,filters,notice,results,footer);modal.append(bar,panel);document.body.append(modal);
  const filter=()=>{limit=36;results.scrollTop=0;render();};search.addEventListener('input',filter);setFilter.addEventListener('change',filter);
  modal.addEventListener('cancel',event=>{event.preventDefault();close();});modal.addEventListener('close',()=>{if(!modal.open)finishClose();});
 }
 function render(){
  if(!context||!data)return;
  const query=normalize(search.value),tokens=query.split(' ').filter(Boolean),set=setFilter.value;
  const cards=data.filter(card=>(!set||card.set===set)&&tokens.every(token=>normalize([card.name,card.subtitle,card.id,card.setName].join(' ')).includes(token)));
  cards.sort((a,b)=>Number(b.id===context.selected?.id)-Number(a.id===context.selected?.id));
  list.replaceChildren();notice.textContent=cards.length?'Liderzy: '+cards.length+(context.selected?' · Zaznaczono: '+context.selected.name:''):'Brak wyników. Spróbuj innej nazwy lub wybierz wszystkie dodatki.';
  for(const card of cards.slice(0,limit)){
   const selected=context.selected?.id===card.id,item=button('','life-leaders-card',()=>choose(card));item.dataset.leader=card.id;item.setAttribute('aria-pressed',String(selected));item.setAttribute('aria-label',[card.name,card.subtitle,card.setName,card.id,selected?'Wybrany':'Wybierz'].filter(Boolean).join(' · '));
   const art=el('div','life-leaders-art'),image=el('img');image.alt='';image.loading='lazy';image.decoding='async';image.draggable=false;image.src=card.image;image.onerror=()=>{image.hidden=true;art.dataset.unavailable='true';};art.append(image);
   const copy=el('span','life-leaders-copy');copy.append(el('strong','',card.name),el('span','life-leaders-subtitle',card.subtitle),el('small','',card.id+' · '+card.setName));item.append(art,copy);
   if(selected)item.append(el('span','life-leaders-check','✓'));
   list.append(item);
  }
  more.hidden=cards.length<=limit;clear.disabled=!context.selected;
 }
 async function load(active){
  list.replaceChildren();more.hidden=true;notice.textContent='Wczytuję liderów…';panel.setAttribute('aria-busy','true');
  try{
   const cards=await catalogue();if(context!==active||!modal.open)return;
   const all=el('option','','Wszystkie dodatki');all.value='';setFilter.replaceChildren(all);
   const sets=[...new Map(cards.map(card=>[card.set,card.setName])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'en'));
   for(const [code,name] of sets){const option=el('option','',name+' · '+code);option.value=code;setFilter.append(option);}
   render();
  }catch{
   if(context!==active||!modal.open)return;
   notice.textContent='Nie udało się wczytać listy liderów. Sprawdź połączenie i spróbuj ponownie.';
   const retry=button('Spróbuj ponownie','life-leaders-retry',()=>load(active));retry.id='life-leaders-retry';list.replaceChildren(retry);
  }finally{if(context===active)panel.removeAttribute('aria-busy');}
 }
 function open(options){
  if(!options||typeof options.onSelect!=='function')return;if(!modal)create();if(modal.open)close();
  context={...options,selected:C.leaderData(options.selected)};returnFocus=options.trigger||document.activeElement;
  limit=36;search.value='';setFilter.value='';playerLabel.textContent=options.name+' · Wybierz tło swojego pola';clear.disabled=!context.selected;
  modal.showModal();panel.scrollTop=0;modal.querySelector('.life-leaders-results').scrollTop=0;
  // Avoid opening the phone keyboard until the user chooses to search.
  modal.querySelector('#life-leaders-close').focus({preventScroll:true});load(context);
 }
 globalThis.CardTabletopLeaders=Object.freeze({open,close});
})();
