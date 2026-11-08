globalThis.CardPurchaseUI=(()=>{
 const C=CardPurchase,$=id=>document.getElementById(id),make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
 const editors=new Map();let epoch=0,drafts=new Map();
 const owner=()=>globalThis.CardScopeAuth?.state?.user?.id||null;
 function fields(prefix,label='Cena zakupu / szt. (opcjonalnie)'){
  const box=make('div',undefined,'purchase-fields'),a=make('label',label),input=make('input'),b=make('label','Waluta'),select=make('select');
  input.id=prefix+'-amount';input.inputMode='decimal';input.placeholder='np. 30,00';input.maxLength=14;input.autocomplete='off';a.htmlFor=input.id;a.append(input);
  select.id=prefix+'-currency';b.htmlFor=select.id;for(const currency of C.currencies){const o=make('option',currency);o.value=currency;select.append(o)}b.append(select);box.append(a,b);return {box,input,select};
 }
 function entryPanel(row){
  const root=make('details',undefined,'purchase-entry'),toggle=make('summary','Dodaj cenę zakupu'),body=make('div',undefined,'purchase-edit-body');body.append(row.box,make('small','Kwota za 1 sztukę · opcjonalnie'));root.append(toggle,body);return {root,toggle};
 }
 const edit=fields('purchase'),scan=fields('result-purchase');
 const editPanel=entryPanel(edit),scanPanel=entryPanel(scan);$('price-source-url').after(editPanel.root);$('result-copies').after(scanPanel.root);
 function entryLabels(){let p=null;try{p=C.parse(edit.input.value,edit.select.value)}catch{}for(const panel of [editPanel,scanPanel])panel.toggle.textContent=p?'Zakup: '+C.format(p.amount,p.currency)+' / szt.':'Dodaj cenę zakupu';}
 for(const [from,to] of [[edit,scan],[scan,edit]]){from.input.addEventListener('input',()=>{to.input.value=from.input.value;entryLabels()});from.select.addEventListener('change',()=>{to.select.value=from.select.value;entryLabels()});}
 function reset(){for(const row of [edit,scan]){row.input.value='';row.select.value=globalThis.CardCurrency?.selected||'PLN'}for(const p of [editPanel,scanPanel])p.root.open=false;entryLabels();drafts.clear();}
 function readNew(){return C.parse(edit.input.value,edit.select.value)}
 function date(value){const d=new Date(value);return value&&Number.isFinite(+d)?d.toLocaleDateString('pl-PL'):'';}
 function setTrend(n,value){n.dataset.trend=value>0?'up':value<0?'down':'flat';}
 function renderStats(root,card,current,qty,addedAt){
  root.replaceChildren();const r=C.compare(card?.purchase,current,qty);root.hidden=!!r.reason;if(r.reason)return false;
  const row=make('div',undefined,'purchase-result-row'),label=make('span','Zysk / strata'),value=make('strong',C.format(r.total,r.currency,true),'purchase-profit');
  setTrend(value,r.total);row.append(label,value);root.append(row);
  const values=make('div',undefined,'purchase-value-line');values.append(make('span','Zakup '+C.format(r.cost*qty,r.currency)),make('span','→','purchase-value-arrow'),make('span','Wycena '+C.format(r.value*qty,r.currency)));
  root.append(values);
  const info=make('details',undefined,'purchase-result-info'),toggle=make('summary',qty+' szt.'+(r.percent===null?'':' · '+(r.percent>0?'+':'')+r.percent.toLocaleString('pl-PL',{maximumFractionDigits:1})+'%'));
  const dates=[date(addedAt||card?.createdAt)?'Dodano '+date(addedAt||card?.createdAt):'',date(current?.at||current?.updated)?'Wycena '+date(current?.at||current?.updated):''].filter(Boolean);
  info.append(toggle);if(dates.length)info.append(make('small',dates.join(' · ')));info.append(make('small','Wynik przed sprzedażą i opłatami. Na sztukę: '+C.format(r.unit,r.currency,true)));root.append(info);return true;
 }
 function ensureEditor(key,anchor){
  if(editors.has(key))return editors.get(key);
  const root=make('section',undefined,'purchase-panel purchase-compact'),stats=make('div',undefined,'purchase-result'),edit=make('details',undefined,'purchase-edit'),toggle=make('summary','Dodaj cenę zakupu'),body=make('div',undefined,'purchase-edit-body'),f=fields(key+'-purchase','Cena zakupu / szt.'),save=make('button','Zapisz','secondary purchase-save'),status=make('p');save.type='button';status.setAttribute('role','status');body.append(f.box,save,status);edit.append(toggle,body);root.append(stats,edit);anchor.after(root);
  // The eBay strip always immediately follows the market price tiles.
  const strip=anchor.nextElementSibling===root?root.nextElementSibling:null;if(strip?.classList.contains('ebay-strip'))strip.after(root);
  const state={root,stats,edit,toggle,...f,save,status,id:null,dirty:false,busy:false,card:null};editors.set(key,state);
  f.input.addEventListener('input',()=>state.dirty=true);f.select.addEventListener('change',()=>state.dirty=true);
  save.onclick=async()=>{if(state.busy||!state.id)return;const id=state.id,run=epoch,account=owner();let purchase;try{purchase=C.parse(state.input.value,state.select.value)}catch(e){status.textContent=e.message;return}state.busy=true;save.disabled=true;status.textContent='Zapisuję koszt zakupu…';
   try{const latest=typeof cards!=='undefined'?cards.find(c=>c.id===id):null;if(!latest||owner()!==account)throw Error('Karta lub konto zmieniły się. Otwórz ją ponownie.');await CardStore.setPurchase(id,purchase);if(run!==epoch||state.id!==id||owner()!==account)return;state.dirty=false;state.edit.open=false;status.textContent='';if(typeof message==='function')message(purchase?'Cena zakupu zapisana.':'Cena zakupu usunięta.');if(document.activeElement===save)state.toggle.focus();if(typeof detailCard!=='undefined'&&detailCard?.id===id){detailCard=cards.find(c=>c.id===id)||detailCard;renderDetailPricing()}globalThis.CardBinders?.refreshCurrency();}
   catch(e){if(run===epoch&&state.id===id)status.textContent=e.message||'Nie udało się zapisać ceny zakupu.';}
   finally{if(run===epoch&&state.id===id){state.busy=false;save.disabled=false}}
  };return state;
 }
 function renderEditor(key,anchor,card,current,qty,addedAt,hidden=false){if(!anchor)return;const s=ensureEditor(key,anchor);s.root.hidden=hidden||!card;if(!card||hidden)return;
  if(s.id!==card.id){s.id=card.id;s.dirty=false;s.busy=false;s.save.disabled=false;s.status.textContent='';s.edit.open=false}s.card=card;
  if(!s.dirty&&!s.busy){const p=C.read(card.purchase);s.input.value=p?String(p.amount).replace('.',','):'';s.select.value=p?.currency||globalThis.CardCurrency?.selected||'PLN'}
  const p=C.read(card.purchase),hasResult=renderStats(s.stats,card,current,qty,addedAt);s.root.dataset.hasResult=String(hasResult);s.toggle.textContent=hasResult?'Zmień cenę zakupu':p?'Zakup: '+C.format(p.amount,p.currency)+' / szt. · Zmień':'Dodaj cenę zakupu';
 }
 function renderDetail(card,quote,hidden=false){renderEditor('detail',$('detail-total').closest('.market-grid'),card,quote,card?.qty||1,card?.createdAt,hidden)}
 function renderBinder(card,quote,entry){renderEditor('binder',$('b-profit').closest('.b-price-grid'),card,quote,1,entry?.addedAt)}
 function summary(anchor,id,rows){if(!anchor)return;let root=$(id);if(!root){root=make('div',undefined,'purchase-summary');root.id=id;anchor.after(root)}const r=C.aggregate(rows);root.replaceChildren();root.hidden=!r.covered;if(!r.covered)return;
  const label=make('span','Zysk / strata'),n=make('strong',C.format(r.total,r.currency,true),'purchase-profit');setTrend(n,r.total);root.append(label,n,make('small','Porównano '+r.covered+' z '+rows.reduce((sum,row)=>sum+(row.qty||1),0)+' szt.'));
 }
 function collectionSummary(list){summary($('priced'),'collection-purchase-summary',list.map(c=>({purchase:c.purchase,quote:C.quote(c),qty:c.qty})))}
 function binderSummary(b,list,getQuote){const byId=new Map(list.map(c=>[c.id,c]));summary($('b-value-note'),'binder-purchase-summary',b.slots.filter(Boolean).map(id=>({purchase:byId.get(id)?.purchase,quote:getQuote(b,id,byId.get(id)),qty:1})))}
 function inline(card){const r=C.compare(card.purchase,C.quote(card),card.qty);if(r.reason)return null;const n=make('div','Zysk / strata '+C.format(r.total,r.currency,true),'purchase-inline');setTrend(n,r.total);return n;}
 function pickerReset(){drafts.clear()}
 function pickerFields(card){const wrap=make('details',undefined,'purchase-picker'),sum=make('summary','Cena zakupu / szt.'),f=fields('picker-purchase-'+card.id,'Wspólna z kolekcją');const p=C.read(card.purchase),d=drafts.get(card.id)||{raw:p?String(p.amount).replace('.',','):'',currency:p?.currency||globalThis.CardCurrency?.selected||'PLN',dirty:false};drafts.set(card.id,d);f.input.value=d.raw;f.select.value=d.currency;f.input.oninput=()=>{d.raw=f.input.value;d.dirty=true};f.select.onchange=()=>{d.currency=f.select.value;d.dirty=true};wrap.append(sum,f.box);return wrap;}
 async function savePicker(selection){const run=epoch,account=owner();const changes=selection.map(x=>({id:x.id,draft:drafts.get(x.id)})).filter(x=>x.draft?.dirty).map(x=>({id:x.id,purchase:C.parse(x.draft.raw,x.draft.currency)}));for(const x of changes){if(run!==epoch||owner()!==account)throw Error('Konto zmieniło się. Otwórz binder ponownie.');await CardStore.setPurchase(x.id,x.purchase)}if(run!==epoch||owner()!==account)throw Error('Konto zmieniło się.');}
 window.addEventListener('cardscope:account-change',()=>{epoch++;reset();for(const s of editors.values()){s.id=null;s.dirty=false;s.busy=false;s.root.hidden=true;s.edit.open=false;s.toggle.textContent='Dodaj cenę zakupu';s.input.value='';s.stats.replaceChildren();s.status.textContent=''}for(const id of ['collection-purchase-summary','binder-purchase-summary'])$(id)?.remove()});
 reset();return Object.freeze({reset,readNew,renderDetail,renderBinder,collectionSummary,binderSummary,inline,pickerReset,pickerFields,savePicker});
})();
