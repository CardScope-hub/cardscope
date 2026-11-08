(()=>{
 const C=globalThis.CardTabletopCore,KEY='cardscope.tabletop.v1';if(!C||document.getElementById('tabletop-open'))return;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const button=(text,cls,fn)=>{const b=el('button',cls,text);b.type='button';if(fn)b.onclick=fn;return b;};
 const icons={dice:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" stroke-width="3.5" stroke-linecap="round"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',history:'<path d="M3 11a9 9 0 1 1 2.6 7.3M3 4v7h7M12 7v5l3 2"/>',undo:'<path d="m8 4-5 5 5 5M3 9h10a7 7 0 0 1 7 7v4"/>',plus:'<path d="M12 5v14M5 12h14"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'};
 function icon(name){const n=el('span','life-icon');n.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+icons[name]+'</svg>';return n;}
 let state=null,storageAvailable=true,rollTimer=0,clockTimer=0,positionFrame=0,selectedCount=2,screen='board',historyLimit=40;
 const fab=button('','life-fab');fab.id='tabletop-open';fab.append(icon('dice'));fab.title='Licznik życia';fab.setAttribute('aria-label','Otwórz licznik życia');fab.setAttribute('aria-haspopup','dialog');fab.setAttribute('aria-controls','tabletop-dialog');fab.setAttribute('aria-expanded','false');
 const dialog=el('dialog','life-dialog');dialog.id='tabletop-dialog';dialog.setAttribute('aria-labelledby','life-title');
 const close=button('×','life-close',()=>dialog.close());close.id='tabletop-close';close.setAttribute('aria-label','Zamknij licznik życia');
 const header=el('header','life-heading'),headingText=el('div','life-heading-text'),kicker=el('span','life-kicker','CARDSCOPE / PRZY STOLE'),title=el('h2','','Wasza gra. Wasze zasady.');title.id='life-title';
 const intro=el('p','life-intro','Od pierwszego ruchu do ostatniego punktu.');headingText.append(kicker,title,intro);
 const timerBox=el('div','life-timer'),timerCopy=el('div'),timerLabel=el('span','life-timer-label','CZAS PARTII'),timer=el('output','life-timer-value','00:00');timer.id='life-timer';timer.setAttribute('role','timer');timer.setAttribute('aria-live','off');timer.setAttribute('aria-label','Czas od rozpoczęcia partii');timerCopy.append(timerLabel,timer);timerBox.append(icon('clock'),timerCopy);timerBox.hidden=true;header.append(headingText,timerBox);
 const setup=el('form','life-setup');setup.id='life-setup';setup.noValidate=true;
 const countField=el('fieldset','life-field'),countLegend=el('legend','life-label','01 / Ilu was gra?'),countOptions=el('div','life-count-options'),countButtons=[];countField.append(countLegend,countOptions);
 for(let n=2;n<=6;n++){const b=button(String(n),'life-count',()=>{selectedCount=n;updateCount();});b.dataset.count=String(n);b.setAttribute('aria-label',n+' graczy');countOptions.append(b);countButtons.push(b);}
 const pointsField=el('div','life-field'),lifeLabel=el('label','life-label','02 / Życie na start');lifeLabel.htmlFor='life-start';
 const presets=el('div','life-presets');presets.setAttribute('role','group');presets.setAttribute('aria-label','Początkowe życie');
 const lifeInput=el('input','life-input');lifeInput.id='life-start';lifeInput.name='startingLife';lifeInput.type='text';lifeInput.inputMode='numeric';lifeInput.pattern='[0-9]*';lifeInput.maxLength=4;lifeInput.required=true;lifeInput.value='30';lifeInput.autocomplete='off';lifeInput.setAttribute('aria-label','Własna liczba punktów życia');lifeInput.setAttribute('aria-describedby','life-start-hint life-setup-error');
 const presetButtons=[];for(const n of [20,30,40]){const b=button(String(n),'life-preset',()=>{lifeInput.value=String(n);updatePresets();});b.dataset.life=String(n);presets.append(b);presetButtons.push(b);}presets.append(lifeInput);
 const hint=el('p','life-hint','20, 30, 40… lub własna liczba w ostatnim polu.');hint.id='life-start-hint';pointsField.append(lifeLabel,presets,hint);
 const namesField=el('fieldset','life-field'),namesLegend=el('legend','life-label','03 / Kto jest przy stole?'),names=el('div','life-names'),nameInputs=[],nameLabels=[];namesField.append(namesLegend,names);
 for(let i=0;i<6;i++){const label=el('label','life-name-field'),tag=el('span','life-name-tag','0'+(i+1)),input=el('input','life-input');label.dataset.player=String(i);input.id='life-name-'+i;input.name='player'+i;input.type='text';input.maxLength=24;input.placeholder='Gracz '+(i+1);input.setAttribute('aria-label','Nazwa gracza '+(i+1));input.autocomplete='off';label.htmlFor=input.id;label.append(tag,input);names.append(label);nameInputs.push(input);nameLabels.push(label);}
 const error=el('p','life-error');error.id='life-setup-error';error.setAttribute('role','alert');error.hidden=true;
 const setupActions=el('div','life-setup-actions'),start=el('button','life-primary','Rozpocznij partię');start.id='life-begin';start.type='submit';const resume=button('Wróć do trwającej partii','life-secondary',()=>showMatch());resume.id='life-resume';resume.hidden=true;setupActions.append(start,resume);
 setup.append(countField,pointsField,namesField,error,setupActions,el('p','life-local-note','Wynik i historia zapisują się na tym urządzeniu. Możesz zamknąć licznik i wrócić do gry.'));
 const match=el('div','life-match');match.id='life-match';match.hidden=true;
 const nav=el('div','life-match-nav'),views=el('div','life-view-switch');views.setAttribute('role','group');views.setAttribute('aria-label','Widok partii');
 const boardButton=button('','life-view',()=>showScreen('board'));boardButton.id='life-board-tab';boardButton.setAttribute('aria-controls','life-board');boardButton.append(icon('grid'),el('span','','Licznik'));
 const historyButton=button('','life-view',()=>showScreen('history'));historyButton.id='life-history-tab';historyButton.setAttribute('aria-controls','life-history');const historyCount=el('span','life-history-count','0');historyButton.append(icon('history'),el('span','','Historia'),historyCount);views.append(boardButton,historyButton);
 const undo=button('','life-tool',undoLast);undo.id='life-undo';undo.append(icon('undo'),el('span','','Cofnij'));undo.title='Cofnij ostatnią zmianę życia';nav.append(views,undo);
 const board=el('div','life-board');board.id='life-board';const panels=[];
 function buildPlayers(){
  panels.length=0;board.replaceChildren();board.dataset.count=String(state.players.length);
  for(let i=0;i<state.players.length;i++){
   const panel=el('section','life-player');panel.dataset.player=String(i);panel.setAttribute('aria-labelledby','life-player-name-'+i);
   const who=el('div','life-player-heading'),numberTag=el('span','life-player-tag','0'+(i+1)),playerName=el('h3','life-player-name'),badge=el('span','life-starter','START');playerName.id='life-player-name-'+i;badge.hidden=true;who.append(numberTag,playerName,badge);
   const counter=el('div','life-counter'),minus=button('−','life-step',()=>adjust(i,-1)),plus=button('+','life-step',()=>adjust(i,1));minus.dataset.delta='-1';plus.dataset.delta='1';
   const value=el('output','life-number');value.id='life-value-'+i;value.setAttribute('aria-live','off');counter.append(minus,value,plus);
   const quick=el('div','life-quick'),minus5=button('−5','life-step-small',()=>adjust(i,-5)),plus5=button('+5','life-step-small',()=>adjust(i,5));minus5.dataset.delta='-5';plus5.dataset.delta='5';const latest=el('span','life-last-change','PUNKTY ŻYCIA');quick.append(minus5,latest,plus5);
   panel.append(who,counter,quick);board.append(panel);panels.push({panel,playerName,badge,value,latest,buttons:[minus,plus,minus5,plus5]});
  }
  historyFilter.replaceChildren(el('option','','Wszyscy gracze'));historyFilter.firstChild.value='all';
  state.players.forEach((p,i)=>{const option=el('option','',p.name);option.value=String(i);historyFilter.append(option);});
 }
 const historyView=el('section','life-history');historyView.id='life-history';historyView.hidden=true;historyView.setAttribute('aria-label','Historia partii');
 const historyHeading=el('div','life-history-heading'),historyTitle=el('h3','','Przebieg partii'),historyFilter=el('select');historyFilter.id='life-history-filter';historyFilter.setAttribute('aria-label','Filtruj historię według gracza');historyFilter.onchange=()=>{historyLimit=40;renderHistory();};historyHeading.append(historyTitle,historyFilter);
 const historyNote=el('p','life-history-note'),historyList=el('ol','life-history-list');historyList.id='life-history-list';
 const historyMore=button('Pokaż wcześniejsze','life-secondary',()=>{historyLimit+=40;renderHistory();});historyMore.id='life-history-more';
 historyView.append(historyHeading,historyNote,historyList,historyMore);
 const footer=el('div','life-match-footer'),drawBlock=el('div','life-draw-block'),starts=el('p','life-start-result','Kto zaczyna?');starts.id='life-starter-result';
 const roll=button('','life-roll',rollStarter);roll.id='life-roll';const rollLabel=el('span','','Losuj start');roll.append(icon('dice'),rollLabel);drawBlock.append(starts,roll);
 const newGame=button('','life-tool life-new',()=>showSetup(true));newGame.id='life-new';newGame.append(icon('plus'),el('span','','Nowa partia'));footer.append(drawBlock,newGame);
 match.append(nav,board,historyView,footer);
 const status=el('p','life-status');status.id='life-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const storageNote=el('p','life-storage-note');storageNote.id='life-storage-note';storageNote.setAttribute('role','status');storageNote.hidden=true;
 dialog.append(close,header,setup,match,status,storageNote);document.body.append(fab,dialog);
 function read(){try{const raw=localStorage.getItem(KEY);if(!raw)return null;const parsed=JSON.parse(raw),restored=C.restore(parsed);if(restored&&parsed.version===1){state=restored;persist();}return restored;}catch{return null;}}
 function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));storageAvailable=true;}catch{storageAvailable=false;}storageNote.hidden=storageAvailable;storageNote.textContent=storageAvailable?'':'Nie udało się zapisać partii na urządzeniu. Licznik nadal działa. Nie odświeżaj strony, jeśli chcesz zachować tę grę.';fab.dataset.active=String(!!state);}
 function updatePresets(){for(const b of presetButtons)b.setAttribute('aria-pressed',String(lifeInput.value===b.dataset.life));}
 function updateCount(){for(const b of countButtons)b.setAttribute('aria-pressed',String(selectedCount===Number(b.dataset.count)));nameLabels.forEach((label,i)=>{label.hidden=i>=selectedCount;nameInputs[i].disabled=i>=selectedCount;});}
 function clearRoll(){clearTimeout(rollTimer);rollTimer=0;roll.disabled=false;delete roll.dataset.rolling;}
 function tickClock(){if(!state)return;const text=C.formatDuration(C.elapsed(state));if(timer.textContent!==text)timer.textContent=text;}
 function stopClock(){clearInterval(clockTimer);clockTimer=0;}
 function syncClock(){stopClock();if(dialog.open&&!match.hidden&&!document.hidden){tickClock();clockTimer=setInterval(tickClock,1000);}}
 function showSetup(newMatch=false){
  clearRoll();stopClock();dialog.dataset.lifeStage='setup';setup.hidden=false;match.hidden=true;timerBox.hidden=true;title.textContent=state?'Nowe rozdanie.':'Wasza gra. Wasze zasady.';intro.textContent=state?'Obecny wynik i historię zastąpisz dopiero po rozpoczęciu nowej partii.':'Od pierwszego ruchu do ostatniego punktu.';
  selectedCount=state?.players.length||2;lifeInput.value=String(state?.initial||30);nameInputs.forEach((input,i)=>input.value=state?.players[i]?.name||'');resume.hidden=!state;start.textContent=state?'Rozpocznij nową partię':'Rozpocznij partię';error.hidden=true;error.textContent='';lifeInput.removeAttribute('aria-invalid');status.textContent='';updatePresets();updateCount();resetScroll();if(newMatch)countButtons[selectedCount-2].focus({preventScroll:true});
 }
 function showMatch(){if(!state)return;setup.hidden=true;match.hidden=false;timerBox.hidden=false;dialog.dataset.lifeStage='match';title.textContent='Partia w toku';intro.textContent=state.players.length+' graczy · '+state.initial+' życia na start';timerLabel.textContent=state.timerEstimated?'CZAS OD AKTUALIZACJI':'CZAS PARTII';error.hidden=true;buildPlayers();showScreen('board');render();syncClock();}
 function resetScroll(){const panel=dialog.querySelector(':scope > .cs-modal-panel');if(panel)panel.scrollTop=0;dialog.scrollTop=0;}
 function showScreen(next){screen=next;board.hidden=next!=='board';historyView.hidden=next!=='history';boardButton.setAttribute('aria-pressed',String(next==='board'));historyButton.setAttribute('aria-pressed',String(next==='history'));dialog.dataset.lifeView=next;if(next==='history'){historyLimit=40;renderHistory();}resetScroll();}
 function render(){
  if(!state)return;
  const lastByPlayer=new Map();for(const event of state.events)if(event.kind!=='draw')lastByPlayer.set(event.player,event);
  panels.forEach((p,i)=>{const data=state.players[i];p.playerName.textContent=data.name;p.value.textContent=String(data.life);p.value.dataset.digits=String(String(data.life).length);p.value.setAttribute('aria-label',data.name+': '+data.life+' pkt życia');p.badge.hidden=state.starter!==i;p.panel.dataset.starts=String(state.starter===i);p.panel.dataset.empty=String(data.life<=0);const latest=lastByPlayer.get(i);p.latest.textContent=latest?(latest.kind==='undo'?'Cofnięcie: ':'Ostatnio: ')+(latest.after>latest.before?'+':'−')+Math.abs(latest.after-latest.before):'PUNKTY ŻYCIA';for(const b of p.buttons){const delta=Number(b.dataset.delta);b.setAttribute('aria-label',(delta>0?'Dodaj ':'Odejmij ')+Math.abs(delta)+' pkt życia: '+data.name);b.disabled=data.life+delta<C.MIN||data.life+delta>C.MAX;}});
  starts.textContent=state.starter===null?'Kto wykona pierwszy ruch?':'Zaczyna: '+state.players[state.starter].name;rollLabel.textContent=state.starter===null?'Losuj start':'Losuj ponownie';undo.disabled=!C.undoTarget(state);historyCount.textContent=String(state.events.filter(e=>e.kind!=='draw').length);historyCount.hidden=historyCount.textContent==='0';
  fab.dataset.active='true';fab.setAttribute('aria-label','Wróć do licznika życia');if(screen==='history')renderHistory();tickClock();
 }
 function renderHistory(){
  if(!state)return;const filter=historyFilter.value,all=state.events.filter(e=>filter==='all'||e.player===Number(filter)).slice().reverse(),shown=all.slice(0,historyLimit),undone=new Set(state.events.filter(e=>e.kind==='undo').map(e=>e.target));
  historyNote.textContent=state.historyPartial?'Zachowano dostępną historię poprzedniej wersji. Starsze ruchy nie mają czasu; licznik czasu działa od aktualizacji.':'Najnowsze ruchy są na górze. Czas przy ruchu to czas od początku partii.';
  historyList.replaceChildren();
  for(const event of shown){
   const row=el('li','life-history-row');row.dataset.kind=event.kind;row.dataset.player=String(event.player);row.dataset.event=String(event.id);
   const diff=event.kind==='draw'?null:event.after-event.before,delta=el('span','life-history-delta',diff===null?'✦':(diff>0?'+':'−')+Math.abs(diff));if(diff!==null)delta.dataset.sign=diff>0?'plus':'minus';
   const copy=el('div','life-history-copy'),name=el('strong','',state.players[event.player].name),detail=el('span','',event.kind==='draw'?'Wylosowano do rozpoczęcia':event.before+' → '+event.after+' pkt życia'+(event.kind==='undo'?' · cofnięcie ruchu':''));copy.append(name,detail);
   if(undone.has(event.id))copy.append(el('small','life-undone','COFNIĘTO'));
   const when=el('span','life-history-time',event.at===null?'wcześniej':C.formatDuration(C.elapsed(state,event.at)));when.title=event.at===null?'Ruch sprzed aktualizacji':new Date(event.at).toLocaleString('pl-PL');row.append(delta,copy,when);historyList.append(row);
  }
  historyMore.hidden=all.length<=historyLimit;
  if(!shown.length){const empty=el('li','life-history-empty');empty.append(icon('history'),el('strong','',filter==='all'?'Pierwszy ruch przed wami.':'Ten gracz nie ma jeszcze ruchów.'),el('span','','Dodane i odjęte punkty pojawią się tutaj.'));historyList.append(empty);}
  if(historyMore.hidden){const beginning=el('li','life-history-start');beginning.append(el('span','life-start-dot'),el('span','',state.historyPartial?'Początek dostępnej historii':'Początek partii · po '+state.initial+' pkt życia'),el('span','',state.historyPartial?'wcześniej':'00:00'));historyList.append(beginning);}
 }
 function adjust(player,delta){if(!state)return;try{state=C.change(state,player,delta);persist();render();status.textContent=state.players[player].name+': '+state.players[player].life+' pkt życia.';}catch(e){status.textContent=e.message;}}
 function undoLast(){if(!state)return;const target=C.undoTarget(state);if(!target)return;state=C.undo(state);persist();render();status.textContent='Cofnięto zmianę. '+state.players[target.player].name+': '+state.players[target.player].life+' pkt życia.';}
 function rollStarter(){if(!state||roll.disabled)return;try{state=C.draw(state,()=>crypto.getRandomValues(new Uint32Array(1))[0]);persist();render();status.textContent=starts.textContent+'.';roll.disabled=true;roll.dataset.rolling='true';rollTimer=setTimeout(clearRoll,460);}catch(e){status.textContent=e.message||'Losowanie jest chwilowo niedostępne.';}}
 setup.addEventListener('submit',event=>{event.preventDefault();try{const next=C.create(lifeInput.value,nameInputs.map(n=>n.value),selectedCount);state=next;persist();showMatch();boardButton.focus({preventScroll:true});status.textContent='Nowa partia: '+selectedCount+' graczy, po '+state.initial+' pkt życia.';}catch(e){error.textContent=e.message;error.hidden=false;lifeInput.setAttribute('aria-invalid','true');lifeInput.focus({preventScroll:true});}});
 lifeInput.addEventListener('input',()=>{updatePresets();lifeInput.removeAttribute('aria-invalid');error.hidden=true;});
 fab.onclick=()=>{if(dialog.open)return;if(storageAvailable)state=read()||state;if(state)showMatch();else showSetup();dialog.showModal();fab.setAttribute('aria-expanded','true');syncClock();if(state)boardButton.focus({preventScroll:true});else countButtons[selectedCount-2].focus({preventScroll:true});};
 dialog.addEventListener('close',()=>{clearRoll();stopClock();fab.setAttribute('aria-expanded','false');fab.focus({preventScroll:true});});
 document.addEventListener('visibilitychange',syncClock);window.addEventListener('pagehide',stopClock);window.addEventListener('pageshow',syncClock);
 function place(){positionFrame=0;const nav=document.querySelector('.nav'),r=nav?.getBoundingClientRect(),height=window.innerHeight,width=window.innerWidth;if(r&&r.width>0&&r.height>0&&r.top>height*.4&&r.top<height){fab.style.bottom=Math.round(height-r.top+12)+'px';fab.style.right=Math.max(16,Math.round(width-r.right+8))+'px';}}
 function schedulePosition(){if(!positionFrame)positionFrame=requestAnimationFrame(place);}
 const mainNav=document.querySelector('.nav');if(mainNav&&typeof ResizeObserver!=='undefined')new ResizeObserver(schedulePosition).observe(mainNav);
 window.addEventListener('resize',schedulePosition,{passive:true});window.addEventListener('orientationchange',schedulePosition,{passive:true});
 state=read();fab.dataset.active=String(!!state);updatePresets();updateCount();schedulePosition();
})();
