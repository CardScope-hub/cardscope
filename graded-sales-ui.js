/* All entries stay in the account's existing private collection payload. */
globalThis.CardGradeSalesUI=(()=>{
 const core=globalThis.CardGradeSales,contexts=new Map();let own=[],generation=0;
 const owner=()=>globalThis.CardScopeAuth?.state?.user?.id||null;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const button=(text,fn,cls='psa-small-button')=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
 const link=(url,text)=>{const a=el('a','psa-text-link',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
 const raw=r=>new Intl.NumberFormat('pl-PL',{style:'currency',currency:r.currency}).format(r.amount);
 const money=r=>globalThis.CardCurrency?.format(r.amount,r.currency)||raw(r);
 const date=r=>r.date.split('-').reverse().join('.');
 const kind=r=>r.kind==='purchase'?'Twój zakup':'Twoja sprzedaż';
 function resolve(host,c,v){
  if(!owner()||!['result-ebay','detail-ebay','binder-ebay'].includes(host.id))return null;
  let preferred;
  try{if(host.id==='detail-ebay'&&typeof detailCard!=='undefined')preferred=own.find(x=>x.id===detailCard?.id);}catch{}
  preferred=preferred||own.find(x=>x.id===c.id);
  if(preferred)return core.same(c,preferred,v)?preferred:null;
  const matches=own.filter(x=>core.same(c,x,v));return matches.length===1?matches[0]:null;
 }
 function selected(ctx){return own.find(c=>c.id===ctx.cardId&&core.scope(c)===ctx.scope)||null;}
 function alive(ctx){return contexts.get(ctx.host)===ctx&&owner()===ctx.owner&&ctx.generation===generation&&!!selected(ctx);}
 function reset(ctx){
  ctx.editId=null;ctx.inputs.grade.value='10';ctx.inputs.kind.value='purchase';ctx.inputs.amount.value='';ctx.inputs.currency.value=globalThis.CardCurrency?.selected||'PLN';ctx.inputs.date.value=core.today();ctx.inputs.url.value='';ctx.save.textContent='Zapisz transakcję';ctx.cancel.hidden=true;
 }
 function busy(ctx,value){ctx.busy=value;for(const n of ctx.form.querySelectorAll('input,select,button'))n.disabled=value;for(const n of ctx.history.querySelectorAll('button'))n.disabled=value;}
 async function save(ctx){
  if(ctx.busy||!alive(ctx))return;ctx.status.textContent='';
  try{
   const f=ctx.inputs,input=core.normalize({grade:Number(f.grade.value),amount:core.amount(f.amount.value),currency:f.currency.value,date:f.date.value,url:f.url.value.trim(),kind:f.kind.value});
   busy(ctx,true);await CardStore.saveGradeSale(ctx.cardId,{...input,id:ctx.editId||undefined,scope:ctx.scope},ctx.owner);
   if(!alive(ctx))return;reset(ctx);ctx.editor.open=false;ctx.status.textContent='Zapisano własną transakcję. Status synchronizacji znajdziesz na dole strony głównej.';paint(ctx);
  }catch(e){if(alive(ctx))ctx.status.textContent=e.message||'Nie udało się zapisać transakcji.';}
  finally{if(alive(ctx))busy(ctx,false);}
 }
 async function remove(ctx,r){
  if(ctx.busy||!alive(ctx)||!confirm('Usunąć własny wpis PSA '+r.grade+' z '+date(r)+'?'))return;
  try{busy(ctx,true);await CardStore.removeGradeSale(ctx.cardId,r.id,ctx.owner);if(!alive(ctx))return;if(ctx.editId===r.id)reset(ctx);ctx.status.textContent='Usunięto wpis.';paint(ctx);}
  catch(e){if(alive(ctx))ctx.status.textContent=e.message;}
  finally{if(alive(ctx))busy(ctx,false);}
 }
 function paint(ctx){
  const card=selected(ctx);if(!card)return;const records=core.records(card);ctx.grid.replaceChildren();ctx.historyList.replaceChildren();
  for(const grade of core.grades){
   const r=records.find(x=>x.grade===grade),cell=el('div','psa-grade'),label=el('span','psa-grade-label','PSA '+grade);cell.append(label);
   if(r){cell.append(el('strong','psa-grade-value',money(r)),el('span','psa-grade-state',kind(r)+' · '+date(r)));if(globalThis.CardCurrency?.selected&&CardCurrency.selected!==r.currency)cell.append(el('span','psa-grade-original',raw(r)));if(r.url)cell.append(link(core.safeURL(r.url),'Twój link ↗'));}
   else cell.append(el('span','psa-grade-state','Brak własnego wpisu'));
   const ebay=link(CardPriceLinks.psa(ctx.card,grade,ctx.variant),'eBay ↗');ebay.dataset.psaGrade=String(grade);cell.append(ebay);ctx.grid.append(cell);
  }
  ctx.history.hidden=!records.length;ctx.historySummary.textContent='Twoje wpisy · '+records.length;
  for(const r of records){
   const row=el('div','psa-history-row'),info=el('div','psa-history-info');info.append(el('strong','', 'PSA '+r.grade+' · '+money(r)),el('span','',kind(r)+' · '+date(r)));if(r.url)info.append(link(core.safeURL(r.url),'Twój link ↗'));
   const actions=el('div','psa-history-actions');actions.append(button('Edytuj',()=>{
    if(ctx.busy||!alive(ctx))return;ctx.editId=r.id;for(const key of ['grade','amount','currency','date','url','kind'])ctx.inputs[key].value=String(r[key]);ctx.save.textContent='Zapisz zmianę';ctx.cancel.hidden=false;ctx.editor.open=true;ctx.status.textContent='';ctx.inputs.amount.focus({preventScroll:true});
   }),button('Usuń',()=>remove(ctx,r)));row.append(info,actions);ctx.historyList.append(row);
  }
  if(ctx.busy)busy(ctx,true);
 }
 function build(host,card,owned,variant){
  const ctx={host,card,variant,cardId:owned.id,scope:core.scope(owned),owner:owner(),generation,busy:false,inputs:{}};
  const panel=el('section','psa-panel');panel.setAttribute('aria-label','Twoje prywatne transakcje kart PSA');ctx.panel=panel;
  const heading=el('div','psa-panel-heading');heading.append(el('h3','psa-panel-title','PSA · Twoje transakcje'),el('span','psa-panel-badge','Prywatne'));
  ctx.grid=el('div','psa-grade-grid');panel.append(heading,ctx.grid,el('p','psa-panel-note','Ostatni własny wpis dla każdej oceny. Kwota za 1 kartę, bez wysyłki i opłat. To nie jest automatyczna wycena rynku.'));
  ctx.editor=el('details','psa-editor');ctx.editor.append(el('summary','','+ Zapisz własną transakcję'));ctx.form=el('div','psa-form');ctx.form.setAttribute('role','group');ctx.form.setAttribute('aria-label','Dane własnej transakcji');
  function field(key,label,type,options){
   const wrap=el('label','psa-field'),node=el(options?'select':'input');node.id=host.id+'-psa-'+key;node.name=key;wrap.htmlFor=node.id;wrap.append(el('span','',label));
   if(options)for(const[value,text]of options){const option=el('option','',text);option.value=value;node.append(option);}else node.type=type;
   ctx.inputs[key]=node;wrap.append(node);ctx.form.append(wrap);return node;
  }
  field('grade','Ocena',null,core.grades.map(n=>[String(n),'PSA '+n]));
  field('kind','Transakcja',null,[['purchase','Mój zakup'],['sale','Moja sprzedaż']]);
  const amount=field('amount','Kwota za 1 kartę','text');amount.inputMode='decimal';amount.placeholder='np. 120,50';amount.maxLength=14;amount.autocomplete='off';
  field('currency','Waluta',null,core.currencies.map(n=>[n,n]));const day=field('date','Data transakcji','date');day.max=core.today();day.min='1900-01-01';
  const url=field('url','Publiczny link · opcjonalnie','url');url.placeholder='https://…';url.maxLength=2048;url.autocomplete='off';url.parentElement.classList.add('psa-field-wide');
  ctx.form.append(el('p','psa-form-note','Zapisuj własne, zakończone zakupy lub sprzedaże. Nie wklejaj prywatnych potwierdzeń ani linków z danymi logowania.'));
  const actions=el('div','psa-form-actions');ctx.save=button('Zapisz transakcję',()=>save(ctx),'psa-save');ctx.cancel=button('Anuluj edycję',()=>{reset(ctx);ctx.status.textContent='';});actions.append(ctx.save,ctx.cancel);ctx.form.append(actions);ctx.editor.append(ctx.form);panel.append(ctx.editor);
  ctx.form.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();void save(ctx);}});
  ctx.status=el('p','psa-save-status');ctx.status.setAttribute('role','status');ctx.status.setAttribute('aria-live','polite');panel.append(ctx.status);
  ctx.history=el('details','psa-history');ctx.historySummary=el('summary');ctx.historyList=el('div');ctx.history.append(ctx.historySummary,ctx.historyList);panel.append(ctx.history);
  CardPriceLinks.appendPSASources(panel,card,variant);reset(ctx);paint(ctx);return ctx;
 }
 function render(host,card,variant){
  const owned=resolve(host,card,variant);if(!owned){contexts.delete(host);return false;}
  let ctx=contexts.get(host);if(!ctx||ctx.owner!==owner()||ctx.cardId!==owned.id||ctx.scope!==core.scope(owned)){
   ctx=build(host,card,owned,variant);contexts.set(host,ctx);
  }else{ctx.card=card;ctx.variant=variant;paint(ctx);}
  host.append(ctx.panel);return true;
 }
 function refresh(){for(const [host,ctx]of contexts){if(!alive(ctx)){contexts.delete(host);ctx.panel.remove();continue;}paint(ctx);}}
 function accountChange(){generation++;own=[];for(const ctx of contexts.values())ctx.panel.remove();contexts.clear();}
 window.addEventListener('cardscope:account-change',accountChange);
 globalThis.CardCloud?.subscribe('card',rows=>{own=rows;refresh();});
 // The main pricing module mounts us on demand. No timer or scroll listener.
 return Object.freeze({render,refreshCurrency:refresh});
})();
