/* Local editorial notes. Old translation caches and /api/learn are not used. */
(function(root){
 'use strict';
 const el=id=>document.getElementById('learn-'+id);let last=null,options=[];
 function load(){
  const card=options[Number(el('select').value)];el('content').hidden=!card;if(!card)return;
  const title=el('name');root.CardI18n?.protect(title);title.textContent=card.name||'Karta';
  el('source').hidden=true;el('note').textContent='Własne objaśnienia pojęć, bez kopiowania tekstu karty.';
  el('effects').replaceChildren();const panel=document.createElement('section');panel.className='origins-pl';panel.id='learn-card-explanation';el('effects').append(panel);
  root.CardOriginsPL?.render(panel,card);
  const guide=document.querySelector('#learn .learn-guide');if(guide)guide.hidden=true;
  el('coverage').textContent='Objaśnienia są częściowe. Nie zastępują pełnych zasad ani errat.';el('retry').hidden=true;el('status').textContent='';
 }
 function enter(){
  options=[];const saved=typeof cards!=='undefined'&&Array.isArray(cards)?cards:[];
  for(const c of [last,...saved])if(c&&!options.some(x=>(x.catalogGame||x.gameKey||x.game)===(c.catalogGame||c.gameKey||c.game)&&(x.catalogId||x.id)===(c.catalogId||c.id)))options.push(c);
  el('select').replaceChildren();options.forEach((c,i)=>{const o=document.createElement('option');o.value=i;o.textContent=c.name||'Karta';root.CardI18n?.protect(o);el('select').append(o);});
  el('select').value='0';el('picker').hidden=!options.length;el('empty').hidden=!!options.length;el('content').hidden=true;el('retry').hidden=true;el('status').textContent='';if(options.length)load();
 }
 root.CardLearning={remember(c){last=c;},open(c){if(!c)return;last=c;show('learn');},enter,leave(){}};
 if(el('select'))el('select').onchange=load;
 if(el('scan'))el('scan').onclick=()=>openScanner();
 if(el('result-open'))el('result-open').onclick=()=>root.CardLearning.open(matched);
 if(el('detail-open'))el('detail-open').onclick=()=>root.CardLearning.open(detailCard);
})(globalThis);
