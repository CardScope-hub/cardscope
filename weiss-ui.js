// Edition selection changes the catalog identity and artwork together.
globalThis.CardWeissUI=(()=>{
 let scanGeneration=0,scanChoices=[];
 const element=id=>document.getElementById(id);
 function generic(id,hidden){const el=element(id);if(el)el.hidden=hidden;const label=document.querySelector('label[for="'+id+'"]');if(label)label.hidden=hidden;}
 function label(c){return CardWeiss.rarity(c.rarity)+' · '+c.localId;}
 function fill(select,rows,id){select.replaceChildren(...rows.map(c=>{const o=document.createElement('option');o.value=c.id;const duplicates=rows.filter(x=>label(x)===label(c));o.textContent=label(c)+(duplicates.length>1?' · ilustracja '+(duplicates.findIndex(x=>x.id===c.id)+1):'');return o}));select.value=id;}
 async function scan(c){const token=++scanGeneration,enabled=CardWeiss.is(c);scanChoices=[];for(const id of ['ws-result','ws-edit'])element(id).hidden=!enabled;generic('result-variant',enabled);generic('variant',enabled);element('rarity').readOnly=enabled;if(!enabled)return;
  for(const id of ['ws-result-select','ws-edit-select']){fill(element(id),[c],c.id);element(id).disabled=true}
  element('ws-result-note').textContent='Szukam dostępnych rzadkości tego wydania…';element('ws-edit-note').textContent='Wybór otworzy podgląd wybranego wydania i jego ceny.';
  try{const rows=await CardCatalog.weissVariants(c);if(token!==scanGeneration||matched!==c)return;scanChoices=rows.length?rows:[c];for(const id of ['ws-result-select','ws-edit-select']){fill(element(id),scanChoices,c.id);element(id).disabled=false}element('ws-result-note').textContent='Wybierz oznaczenie z karty. Zmieni się jej numer, ilustracja i cena. Pokazujemy tylko wydania dostępne w katalogu.';}
  catch{if(token===scanGeneration)element('ws-result-note').textContent='Nie udało się pobrać innych wydań. Bieżąca karta pozostaje wybrana.';}
 }
 function choose(event){const c=scanChoices.find(x=>x.id===event.target.value);if(!c)return;selectMatch(c);}
 for(const id of ['ws-result-select','ws-edit-select'])element(id).onchange=choose;
 window.addEventListener('cardscope:account-change',()=>{scanGeneration++;scanChoices=[]});
 return Object.freeze({scan,generic,fill,label});
})();
