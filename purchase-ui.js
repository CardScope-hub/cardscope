globalThis.CardPurchaseUI=(()=>{
 const C=CardPurchase,$=id=>document.getElementById(id),make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
 const editors=new Map();let epoch=0,drafts=new Map();
 const owner=()=>globalThis.CardScopeAuth?.state?.user?.id||null;
 function fields(prefix,label='Cena zakupu / szt. (opcjonalnie)'){
  const box=make('div',undefined,'purchase-fields'),a=make('label',label),input=make('input'),b=make('label','Waluta'),select=make('select');
  input.id=prefix+'-amount';input.inputMode='decimal';input.placeholder='np. 30,00';input.maxLength=14;input.autocomplete='off';a.htmlFor=input.id;a.append(input);
  select.id=prefix+'-currency';b.htmlFor=select.id;for(const currency of C.currencies){const o=make('option',currency);o.value=currency;select.append(o)}b.append(select);box.append(a,b);return {box,input,select};
 }
 function panel(title){const root=make('section',undefined,'purchase-panel');root.append(make('h3',title));return root;}
 const edit=fields('purchase'),scan=fields('result-purchase');
 const editPanel=panel('Ile zapłaciłeś za kartę?');editPanel.append(edit.box,make('p','Cena za jedną sztukę. Przy kilku kopiach koszt zostanie pomnożony przez ich liczbę.'));$('price-source-url').after(editPanel);
 const scanPanel=panel('Twój zakup');scanPanel.append(scan.box,make('small','Kwota za jedną sztukę. Zapiszemy ją z kartą w kolekcji i pokażemy również w binderze.'));$('result-copies').after(scanPanel);
 for(const [from,to] of [[edit,scan],[scan,edit]]){from.input.addEventListener('input',()=>to.input.value=from.input.value);from.select.addEventListener('change',()=>to.select.value=from.select.value);}
 function reset(){for(const row of [edit,scan]){row.input.value='';row.select.value=globalThis.CardCurrency?.selected||'PLN'}drafts.clear();}
 function readNew(){return C.parse(edit.input.value,edit.select.value)}
 function date(value){const d=new Date(value);return value&&Number.isFinite(+d)?d.toLocaleDateString('pl-PL'):'brak daty';}
 function setTrend(n,value){n.dataset.trend=value>0?'up':value<0?'down':'flat';}
 function renderStats(root,card,current,qty,addedAt){
  root.replaceChildren();const p=C.read(card?.purchase),r=C.compare(p,current,qty),grid=make('div',undefined,'purchase-stats');
  const cost=make('div'),profit=make('div'),value=make('strong',r.reason?'—':C.format(r.total,r.currency,true),'purchase-profit');
  cost.append(make('span','Koszt zakupu · '+qty+' szt.'),make('strong',p?(globalThis.CardCurrency?.format(p.amount*qty,p.currency)||C.format(p.amount*qty,p.currency)):'Nie podano'));
  if(!r.reason)setTrend(value,r.total);profit.append(make('span','Zysk / strata · '+qty+' szt.'),value);grid.append(cost,profit);root.append(grid);
  root.append(make('p',r.reason?C.reasons[r.reason]:'Na sztukę: '+C.format(r.unit,r.currency,true)+(r.percent===null?'':' · '+(r.percent>0?'+':'')+r.percent.toLocaleString('pl-PL',{maximumFractionDigits:1})+'%')));
  root.append(make('small','Dodano: '+date(addedAt||card?.createdAt)+' · Data wyceny: '+date(current?.at||current?.updated)));
  root.append(make('p','Wyliczenie względem ostatniej dostępnej wyceny, przed sprzedażą i opłatami. Kwota zakupu pozostaje bez zmian przy odświeżaniu cen.'));
 }
 function ensureEditor(key,anchor){
  if(editors.has(key))return editors.get(key);
  const root=panel('Twój koszt i wynik'),stats=make('div'),f=fields(key+'-purchase','Cena zakupu za 1 sztukę'),save=make('button','Zapisz cenę zakupu','secondary purchase-save'),status=make('p');save.type='button';status.setAttribute('role','status');root.append(stats,f.box,save,status);anchor.after(root);
  const state={root,stats,...f,save,status,id:null,dirty:false,busy:false,card:null};editors.set(key,state);
  f.input.addEventListener('input',()=>state.dirty=true);f.select.addEventListener('change',()=>state.dirty=true);
  save.onclick=async()=>{if(state.busy||!state.id)return;const id=state.id,run=epoch,account=owner();let purchase;try{purchase=C.parse(state.input.value,state.select.value)}catch(e){status.textContent=e.message;return}state.busy=true;save.disabled=true;status.textContent='Zapisuję koszt zakupu…';
   try{const latest=typeof cards!=='undefined'?cards.find(c=>c.id===id):null;if(!latest||owner()!==account)throw Error('Karta lub konto zmieniły się. Otwórz ją ponownie.');await CardStore.setPurchase(id,purchase);if(run!==epoch||state.id!==id||owner()!==account)return;state.dirty=false;status.textContent=purchase?'Cena zakupu zapisana.':'Cena zakupu usunięta.';if(typeof detailCard!=='undefined'&&detailCard?.id===id){detailCard=cards.find(c=>c.id===id)||detailCard;renderDetailPricing()}globalThis.CardBinders?.refreshCurrency();}
   catch(e){if(run===epoch&&state.id===id)status.textContent=e.message||'Nie udało się zapisać ceny zakupu.';}
   finally{if(run===epoch&&state.id===id){state.busy=false;save.disabled=false}}
  };return state;
 }
 function renderEditor(key,anchor,card,current,qty,addedAt,hidden=false){if(!anchor)return;const s=ensureEditor(key,anchor);s.root.hidden=hidden||!card;if(!card||hidden)return;
  if(s.id!==card.id){s.id=card.id;s.dirty=false;s.busy=false;s.save.disabled=false;s.status.textContent=''}s.card=card;
  if(!s.dirty&&!s.busy){const p=C.read(card.purchase);s.input.value=p?String(p.amount).replace('.',','):'';s.select.value=p?.currency||globalThis.CardCurrency?.selected||'PLN'}
  renderStats(s.stats,card,current,qty,addedAt);
 }
 function renderDetail(card,quote,hidden=false){renderEditor('detail',$('detail-total').closest('.market-grid'),card,quote,card?.qty||1,card?.createdAt,hidden)}
 function renderBinder(card,quote,entry){renderEditor('binder',$('b-profit').closest('.b-price-grid'),card,quote,1,entry?.addedAt)}
 function summary(anchor,id,rows){if(!anchor)return;let root=$(id);if(!root){root=make('div',undefined,'purchase-summary');root.id=id;anchor.after(root)}const r=C.aggregate(rows);root.replaceChildren();root.append(make('span','Zysk / strata względem zakupu'));const n=make('strong',r.covered?C.format(r.total,r.currency,true):'Brak danych do porównania','purchase-profit');if(r.covered)setTrend(n,r.total);root.append(n,make('small',`Porównano ${r.covered} szt. · ${r.missingCost} bez kosztu · ${r.missingQuote} bez wyceny${r.missingFx?' · '+r.missingFx+' bez kursu':''}. Suma obejmuje tylko porównane karty.`));}
 function collectionSummary(list){summary($('priced'),'collection-purchase-summary',list.map(c=>({purchase:c.purchase,quote:C.quote(c),qty:c.qty})))}
 function binderSummary(b,list,getQuote){const byId=new Map(list.map(c=>[c.id,c]));summary($('b-value-note'),'binder-purchase-summary',b.slots.filter(Boolean).map(id=>({purchase:byId.get(id)?.purchase,quote:getQuote(b,id,byId.get(id)),qty:1})))}
 function inline(card){const p=C.read(card.purchase);if(!p)return null;const r=C.compare(p,C.quote(card),card.qty),n=make('div',r.reason?C.reasons[r.reason]:'Zysk / strata: '+C.format(r.total,r.currency,true),'purchase-inline');if(!r.reason)setTrend(n,r.total);return n;}
 function pickerReset(){drafts.clear()}
 function pickerFields(card){const wrap=make('details',undefined,'purchase-picker'),sum=make('summary','Cena zakupu / szt.'),f=fields('picker-purchase-'+card.id,'Wspólna z kolekcją');const p=C.read(card.purchase),d=drafts.get(card.id)||{raw:p?String(p.amount).replace('.',','):'',currency:p?.currency||globalThis.CardCurrency?.selected||'PLN',dirty:false};drafts.set(card.id,d);f.input.value=d.raw;f.select.value=d.currency;f.input.oninput=()=>{d.raw=f.input.value;d.dirty=true};f.select.onchange=()=>{d.currency=f.select.value;d.dirty=true};wrap.append(sum,f.box);return wrap;}
 async function savePicker(selection){const run=epoch,account=owner();const changes=selection.map(x=>({id:x.id,draft:drafts.get(x.id)})).filter(x=>x.draft?.dirty).map(x=>({id:x.id,purchase:C.parse(x.draft.raw,x.draft.currency)}));for(const x of changes){if(run!==epoch||owner()!==account)throw Error('Konto zmieniło się. Otwórz binder ponownie.');await CardStore.setPurchase(x.id,x.purchase)}if(run!==epoch||owner()!==account)throw Error('Konto zmieniło się.');}
 window.addEventListener('cardscope:account-change',()=>{epoch++;reset();for(const s of editors.values()){s.id=null;s.dirty=false;s.busy=false;s.root.hidden=true;s.input.value='';s.stats.replaceChildren();s.status.textContent=''}for(const id of ['collection-purchase-summary','binder-purchase-summary'])$(id)?.remove()});
 reset();return Object.freeze({reset,readNew,renderDetail,renderBinder,collectionSummary,binderSummary,inline,pickerReset,pickerFields,savePicker});
})();
