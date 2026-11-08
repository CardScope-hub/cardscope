(()=>{
 const C=globalThis.CardTabletopCore,KEY='cardscope.tabletop.v1';if(!C)return;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const button=(text,cls,fn)=>{const b=el('button',cls,text);b.type='button';if(fn)b.onclick=fn;return b;};
 const dice='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.1"/><circle cx="16" cy="8" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="8" cy="16" r="1.1"/><circle cx="16" cy="16" r="1.1"/></svg>';
 let state=null,storageAvailable=true,rollTimer=0,positionFrame=0;
 const fab=button('','life-fab');fab.id='tabletop-open';fab.innerHTML=dice;fab.title='Licznik życia';fab.setAttribute('aria-label','Otwórz licznik życia');fab.setAttribute('aria-haspopup','dialog');fab.setAttribute('aria-controls','tabletop-dialog');fab.setAttribute('aria-expanded','false');
 const dialog=el('dialog','life-dialog');dialog.id='tabletop-dialog';dialog.setAttribute('aria-labelledby','life-title');
 const close=button('×','life-close',()=>dialog.close());close.id='tabletop-close';close.setAttribute('aria-label','Zamknij licznik życia');
 const header=el('div','life-heading'),kicker=el('span','life-kicker','CARDSCOPE / PRZY STOLE'),title=el('h2','','Zaczynamy partię.');title.id='life-title';
 const intro=el('p','life-intro','Dwie osoby, jeden ekran. Ustawcie życie i rozegrajcie partię.');header.append(kicker,title,intro);
 const setup=el('form','life-setup');setup.id='life-setup';setup.noValidate=true;
 const lifeLabel=el('label','life-label','Ile życia na start?');lifeLabel.htmlFor='life-start';
 const presets=el('div','life-presets');presets.setAttribute('role','group');presets.setAttribute('aria-label','Początkowe życie');
 const lifeInput=el('input','life-input');lifeInput.id='life-start';lifeInput.name='startingLife';lifeInput.type='text';lifeInput.inputMode='numeric';lifeInput.pattern='[0-9]*';lifeInput.maxLength=4;lifeInput.required=true;lifeInput.value='30';lifeInput.autocomplete='off';lifeInput.setAttribute('aria-describedby','life-start-hint life-setup-error');
 const presetButtons=[];for(const n of [20,30,40]){const b=button(String(n),'life-preset',()=>{lifeInput.value=String(n);updatePresets();});b.dataset.life=String(n);presets.append(b);presetButtons.push(b);}
 const hint=el('p','life-hint','Wybierz skrót lub wpisz własną liczbę.');hint.id='life-start-hint';
 const names=el('div','life-names'),nameInputs=[];
 for(let i=0;i<2;i++){const label=el('label','life-label','Gracz '+(i+1)),input=el('input','life-input');input.id='life-name-'+i;input.name='player'+i;input.type='text';input.maxLength=24;input.placeholder='Gracz '+(i+1);input.autocomplete='off';label.htmlFor=input.id;label.append(input);names.append(label);nameInputs.push(input);}
 const facing=el('label','life-facing'),facingInput=el('input');facingInput.type='checkbox';facingInput.id='life-facing';facingInput.checked=true;facing.append(facingInput,el('span','','Gramy naprzeciwko siebie'));
 const error=el('p','life-error');error.id='life-setup-error';error.setAttribute('role','alert');error.hidden=true;
 const setupActions=el('div','life-setup-actions'),start=el('button','life-primary','Rozpocznij partię');start.id='life-begin';start.type='submit';const resume=button('Wróć do trwającej partii','life-secondary',()=>showMatch());resume.id='life-resume';resume.hidden=true;setupActions.append(start,resume);
 setup.append(lifeLabel,presets,lifeInput,hint,names,facing,error,setupActions,el('p','life-local-note','Partia zapisuje się tylko na tym urządzeniu. Zamknięcie licznika jej nie kończy.'));
 const match=el('div','life-match');match.id='life-match';match.hidden=true;
 const board=el('div','life-board'),panels=[];
 for(let i=0;i<2;i++){
  const panel=el('section','life-player life-player-'+i);panel.dataset.player=String(i);panel.setAttribute('aria-labelledby','life-player-name-'+i);
  const who=el('div','life-player-heading'),playerName=el('h3','life-player-name'),badge=el('span','life-starter','ZACZYNA');playerName.id='life-player-name-'+i;badge.hidden=true;who.append(playerName,badge);
  const counter=el('div','life-counter'),minus=button('−','life-step',()=>adjust(i,-1)),plus=button('+','life-step',()=>adjust(i,1));minus.dataset.delta='-1';plus.dataset.delta='1';
  const number=el('output','life-number');number.id='life-value-'+i;number.setAttribute('aria-live','off');counter.append(minus,number,plus);
  const quick=el('div','life-quick'),minus5=button('−5','life-step-small',()=>adjust(i,-5)),plus5=button('+5','life-step-small',()=>adjust(i,5));minus5.dataset.delta='-5';plus5.dataset.delta='5';quick.append(minus5,el('span','life-unit','PUNKTY ŻYCIA'),plus5);
  panel.append(who,counter,quick);panels.push({panel,playerName,badge,number,buttons:[minus,plus,minus5,plus5]});
 }
 const separator=el('div','life-middle'),roll=button('','life-roll',rollStarter);roll.id='life-roll';roll.innerHTML=dice;const rollLabel=el('span','','Losuj start');roll.append(rollLabel);
 const starts=el('p','life-start-result','Kto zaczyna?');starts.id='life-starter-result';separator.append(starts,roll);board.append(panels[0].panel,separator,panels[1].panel);
 const tools=el('div','life-tools'),undo=button('↶ Cofnij','life-tool',undoLast),rotate=button('⇅ Obróć gracza','life-tool',()=>{if(!state)return;state={...state,opposed:!state.opposed};persist();render();}),newGame=button('Nowa partia','life-tool',()=>showSetup(true));undo.id='life-undo';rotate.id='life-rotate';newGame.id='life-new';rotate.setAttribute('aria-pressed','true');tools.append(undo,rotate,newGame);
 const status=el('p','life-status');status.id='life-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 match.append(board,tools);const storageNote=el('p','life-storage-note');storageNote.id='life-storage-note';storageNote.setAttribute('role','status');storageNote.hidden=true;
 dialog.append(close,header,setup,match,status,storageNote);document.body.append(fab,dialog);
 function read(){try{const raw=localStorage.getItem(KEY);if(!raw)return null;return C.validate(JSON.parse(raw));}catch{return null;}}
 function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));storageAvailable=true;}catch{storageAvailable=false;}storageNote.hidden=storageAvailable;storageNote.textContent=storageAvailable?'':'Nie udało się zapisać partii na urządzeniu. Licznik działa do odświeżenia strony.';fab.dataset.active=String(!!state);}
 function updatePresets(){for(const b of presetButtons)b.setAttribute('aria-pressed',String(lifeInput.value===b.dataset.life));}
 function clearRoll(){clearTimeout(rollTimer);rollTimer=0;roll.disabled=false;delete roll.dataset.rolling;}
 function showSetup(newMatch=false){
  clearRoll();dialog.dataset.lifeStage='setup';setup.hidden=false;match.hidden=true;title.textContent=state?'Nowa partia.':'Zaczynamy partię.';intro.hidden=false;intro.textContent=state?'Obecny wynik zastąpisz dopiero po rozpoczęciu nowej partii.':'Dwie osoby, jeden ekran. Ustawcie życie i rozegrajcie partię.';
  lifeInput.value=String(state?.initial||30);nameInputs.forEach((input,i)=>input.value=state?.players[i].name||'');facingInput.checked=state?.opposed??true;resume.hidden=!state;start.textContent=state?'Rozpocznij nową partię':'Rozpocznij partię';error.hidden=true;error.textContent='';lifeInput.removeAttribute('aria-invalid');status.textContent='';updatePresets();resetScroll();if(newMatch)lifeInput.focus({preventScroll:true});
 }
 function showMatch(){if(!state)return;setup.hidden=true;match.hidden=false;dialog.dataset.lifeStage='match';title.textContent='Wasza partia';intro.hidden=false;intro.textContent='Start: '+state.initial+' pkt życia · 2 graczy';error.hidden=true;render();resetScroll();}
 function resetScroll(){const panel=dialog.querySelector(':scope > .cs-modal-panel');if(panel)panel.scrollTop=0;dialog.scrollTop=0;}
 function render(){
  if(!state)return;board.dataset.opposed=String(state.opposed);
  panels.forEach((p,i)=>{const data=state.players[i];p.playerName.textContent=data.name;p.number.textContent=String(data.life);p.number.dataset.digits=String(String(data.life).length);p.number.setAttribute('aria-label',data.name+': '+data.life+' pkt życia');p.badge.hidden=state.starter!==i;p.panel.dataset.starts=String(state.starter===i);p.panel.dataset.empty=String(data.life<=0);for(const b of p.buttons){const delta=Number(b.dataset.delta);b.setAttribute('aria-label',(delta>0?'Dodaj ':'Odejmij ')+Math.abs(delta)+' pkt życia: '+data.name);b.disabled=data.life+delta<C.MIN||data.life+delta>C.MAX;}});
  starts.textContent=state.starter===null?'Kto zaczyna?':'Zaczyna: '+state.players[state.starter].name;rollLabel.textContent=state.starter===null?'Losuj start':'Losuj ponownie';undo.disabled=!state.history.length;rotate.setAttribute('aria-pressed',String(state.opposed));
  fab.dataset.active='true';fab.setAttribute('aria-label','Wróć do licznika życia');
 }
 function adjust(player,delta){if(!state)return;try{state=C.change(state,player,delta);persist();render();status.textContent=state.players[player].name+': '+state.players[player].life+' pkt życia.';}catch(e){status.textContent=e.message;}}
 function undoLast(){if(!state||!state.history.length)return;const h=state.history.at(-1);state=C.undo(state);persist();render();status.textContent='Cofnięto zmianę. '+state.players[h.player].name+': '+state.players[h.player].life+' pkt życia.';}
 function rollStarter(){
  if(!state||roll.disabled)return;try{state=C.draw(state,()=>crypto.getRandomValues(new Uint32Array(1))[0]);persist();render();status.textContent=starts.textContent+'.';roll.disabled=true;roll.dataset.rolling='true';rollTimer=setTimeout(clearRoll,460);}catch(e){status.textContent=e.message||'Losowanie jest chwilowo niedostępne.';}
 }
 setup.addEventListener('submit',event=>{
  event.preventDefault();try{const next=C.create(lifeInput.value,nameInputs.map(n=>n.value),facingInput.checked);state=next;persist();showMatch();roll.focus({preventScroll:true});status.textContent='Nowa partia: po '+state.initial+' pkt życia.';}catch(e){error.textContent=e.message;error.hidden=false;lifeInput.setAttribute('aria-invalid','true');lifeInput.focus({preventScroll:true});}
 });
 lifeInput.addEventListener('input',()=>{updatePresets();lifeInput.removeAttribute('aria-invalid');error.hidden=true;});
 fab.onclick=()=>{if(dialog.open)return;if(storageAvailable)state=read()||state;if(state)showMatch();else showSetup();dialog.showModal();fab.setAttribute('aria-expanded','true');if(state)roll.focus({preventScroll:true});else presets.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});};
 dialog.addEventListener('close',()=>{clearRoll();fab.setAttribute('aria-expanded','false');fab.focus({preventScroll:true});});
 function place(){
  positionFrame=0;const nav=document.querySelector('.nav'),r=nav?.getBoundingClientRect(),height=window.innerHeight,width=window.innerWidth;
  if(r&&r.width>0&&r.height>0&&r.top>height*.4&&r.top<height){fab.style.bottom=Math.round(height-r.top+12)+'px';fab.style.right=Math.max(16,Math.round(width-r.right+8))+'px';}
 }
 function schedulePosition(){if(!positionFrame)positionFrame=requestAnimationFrame(place);}
 const nav=document.querySelector('.nav');if(nav&&typeof ResizeObserver!=='undefined')new ResizeObserver(schedulePosition).observe(nav);
 window.addEventListener('resize',schedulePosition,{passive:true});window.addEventListener('orientationchange',schedulePosition,{passive:true});
 state=read();fab.dataset.active=String(!!state);updatePresets();schedulePosition();
})();
